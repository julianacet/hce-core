// hce-print-relay — servidor HTTP mínimo que recibe bytes ESC/POS desde los
// containers Docker y los envía a la impresora térmica via WinSpool (RAW).
//
// Los containers de hce-core y hce-farmacia le hacen POST a:
//
//	http://host.docker.internal:8765/print?printer=NOMBRE_IMPRESORA
//
// con los bytes ESC/POS en el body.
//
// Compilar en Windows:
//
//	go build -ldflags="-s -w -H windowsgui" -o hce-print-relay.exe .
//
// O sin ocultar la consola (útil para ver logs):
//
//	go build -ldflags="-s -w" -o hce-print-relay.exe .

package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

func main() {
	if runtime.GOOS != "windows" {
		log.Fatal("hce-print-relay solo funciona en Windows")
	}

	port := os.Getenv("RELAY_PORT")
	if port == "" {
		port = "8765"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/print", handlePrint)
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "ok")
	})

	log.Printf("HCE Print Relay escuchando en :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

func handlePrint(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método no permitido", http.StatusMethodNotAllowed)
		return
	}

	printerName := r.URL.Query().Get("printer")
	if printerName == "" {
		http.Error(w, "parámetro 'printer' requerido", http.StatusBadRequest)
		return
	}

	data, err := io.ReadAll(r.Body)
	if err != nil || len(data) == 0 {
		http.Error(w, "error al leer datos ESC/POS", http.StatusBadRequest)
		return
	}

	tmp, err := os.CreateTemp("", "hce-relay-*.bin")
	if err != nil {
		http.Error(w, "error al crear archivo temporal", http.StatusInternalServerError)
		return
	}
	defer os.Remove(tmp.Name())
	tmp.Write(data)
	tmp.Close()

	if err := enviarWinSpool(printerName, tmp.Name()); err != nil {
		log.Printf("[ERROR] impresora '%s': %v", printerName, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("[OK] impreso en '%s' (%d bytes)", printerName, len(data))
	fmt.Fprintln(w, "ok")
}

// enviarWinSpool envía el archivo en modo RAW a la impresora usando WinSpool
// a través de PowerShell (sin necesitar drivers adicionales).
func enviarWinSpool(printerName, filePath string) error {
	// Escapar para PowerShell
	psPath := strings.ReplaceAll(filePath, `\`, `\\`)
	psPrinter := strings.ReplaceAll(printerName, `'`, `''`)

	script := fmt.Sprintf(`
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class WinPrint {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
  public class DOCINFO {
    public string pDocName;
    public string pOutputFile;
    public string pDataType;
  }
  [DllImport("winspool.drv", CharSet = CharSet.Auto, SetLastError = true)]
  public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", CharSet = CharSet.Auto, SetLastError = true)]
  public static extern int StartDocPrinter(IntPtr h, int lv,
    [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr h, IntPtr p, int n, out int w);
}
'@
$hp = [IntPtr]::Zero
[WinPrint]::OpenPrinter('%s', [ref]$hp, [IntPtr]::Zero) | Out-Null
if ($hp -eq [IntPtr]::Zero) { throw "No se pudo abrir la impresora '%s'" }
$di = New-Object WinPrint+DOCINFO
$di.pDocName  = 'HCE'
$di.pDataType = 'RAW'
[WinPrint]::StartDocPrinter($hp, 1, $di) | Out-Null
[WinPrint]::StartPagePrinter($hp) | Out-Null
$bytes = [IO.File]::ReadAllBytes('%s')
$ptr = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
[Runtime.InteropServices.Marshal]::Copy($bytes, 0, $ptr, $bytes.Length)
$w = 0
[WinPrint]::WritePrinter($hp, $ptr, $bytes.Length, [ref]$w) | Out-Null
[Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)
[WinPrint]::EndPagePrinter($hp) | Out-Null
[WinPrint]::EndDocPrinter($hp) | Out-Null
[WinPrint]::ClosePrinter($hp) | Out-Null
`, psPrinter, psPrinter, psPath)

	out, err := exec.Command(
		"powershell", "-NoProfile", "-NonInteractive", "-Command", script,
	).CombinedOutput()
	if err != nil {
		return fmt.Errorf("WinSpool: %s", strings.TrimSpace(string(out)))
	}
	return nil
}
