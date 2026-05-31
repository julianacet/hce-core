//go:build windows

package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"

	webview "github.com/webview/webview_go"
)

const createNoWindow = 0x08000000

func main() {
	exe, _ := os.Executable()
	exeDir := filepath.Dir(exe)

	logDir := filepath.Join(exeDir, "logs")
	os.MkdirAll(logDir, 0755)

	if lf, err := os.OpenFile(filepath.Join(logDir, "app.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644); err == nil {
		log.SetOutput(lf)
	}

	cfg, err := parseConfig(filepath.Join(exeDir, "config.bat"))
	if err != nil {
		fatalDialog("No se encontró config.bat.\nPor favor reinstala la aplicación.")
	}

	mode := cfgVal(cfg, "MODE", "servidor")

	if mode == "cliente" {
		runModoCliente()
	} else {
		runModoServidor(exeDir, cfg, logDir)
	}
}

// runModoServidor arranca PostgreSQL + API y abre la ventana apuntando a localhost.
func runModoServidor(exeDir string, cfg map[string]string, logDir string) {
	pgCtl := filepath.Join(exeDir, "pgsql", "bin", "pg_ctl.exe")
	dataDir := filepath.Join(exeDir, "data")

	if err := startPostgres(pgCtl, dataDir, logDir); err != nil {
		fatalDialog("No se pudo iniciar la base de datos:\n" + err.Error() + "\n\nRevisa logs\\postgres.log")
	}

	apiPort := cfgVal(cfg, "PORT", "8000")
	if !checkHealth(apiPort) {
		if err := startAPI(filepath.Join(exeDir, "hce-api.exe"), exeDir, cfg, logDir); err != nil {
			fatalDialog("No se pudo iniciar el servidor:\n" + err.Error() + "\n\nRevisa logs\\api.log")
		}
		if !waitForHealth(apiPort, 30) {
			fatalDialog("El servidor no respondió en 30 segundos.\nRevisa logs\\api.log")
		}
	}

	// El API ahora sirve también el frontend — un solo puerto
	openWebview("http://localhost:"+apiPort, "HCE Consultorio")
}

// runModoCliente descubre el servidor en la red local vía UDP y abre la ventana.
func runModoCliente() {
	for {
		url, err := discoverServer(15 * time.Second)
		if err != nil {
			if !errorDialogConReintento("No se encontró el servidor HCE en la red.\n\nAsegúrate de que el equipo del consultorio esté encendido y en la misma red.") {
				return
			}
			continue
		}
		openWebview(url, "HCE Consultorio")
		return
	}
}

// discoverServer escucha el broadcast UDP del servidor hasta timeout.
// Retorna la URL completa del servidor (ej. "http://192.168.1.10:8000").
func discoverServer(timeout time.Duration) (string, error) {
	conn, err := net.ListenPacket("udp4", ":45678")
	if err != nil {
		return "", fmt.Errorf("no se pudo escuchar en puerto UDP 45678: %w", err)
	}
	defer conn.Close()

	conn.SetDeadline(time.Now().Add(timeout))

	buf := make([]byte, 512)
	for {
		n, addr, err := conn.ReadFrom(buf)
		if err != nil {
			return "", fmt.Errorf("tiempo de espera agotado")
		}

		var msg struct {
			App  string `json:"app"`
			Port string `json:"port"`
		}
		if json.Unmarshal(buf[:n], &msg) != nil || msg.App != "hce" {
			continue
		}

		serverIP := addr.(*net.UDPAddr).IP.String()
		return fmt.Sprintf("http://%s:%s", serverIP, msg.Port), nil
	}
}

func openWebview(url, title string) {
	w := webview.New(false)
	defer w.Destroy()
	w.SetTitle(title)
	w.SetSize(1280, 800, webview.HintNone)
	w.Navigate(url)
	w.Run()
}

// parseConfig lee líneas `set "KEY=VALUE"` de config.bat
func parseConfig(path string) (map[string]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	cfg := make(map[string]string)
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if !strings.HasPrefix(strings.ToLower(line), "set \"") {
			continue
		}
		inner := line[5:]
		inner = strings.TrimSuffix(inner, "\"")
		idx := strings.Index(inner, "=")
		if idx < 0 {
			continue
		}
		cfg[inner[:idx]] = inner[idx+1:]
	}
	return cfg, sc.Err()
}

func cfgVal(cfg map[string]string, key, def string) string {
	if v, ok := cfg[key]; ok && v != "" {
		return v
	}
	return def
}

func startPostgres(pgCtl, dataDir, logDir string) error {
	if hiddenCmd(pgCtl, "status", "-D", dataDir).Run() == nil {
		return nil
	}
	return hiddenCmd(pgCtl, "start", "-D", dataDir,
		"-l", filepath.Join(logDir, "postgres.log"), "-w", "-t", "30").Run()
}

func startAPI(apiExe, workDir string, cfg map[string]string, logDir string) error {
	cmd := exec.Command(apiExe)
	cmd.Dir = workDir
	cmd.Env = buildEnv(cfg)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: createNoWindow}

	if lf, err := os.OpenFile(filepath.Join(logDir, "api.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644); err == nil {
		cmd.Stdout = lf
		cmd.Stderr = lf
	}
	return cmd.Start()
}

func buildEnv(cfg map[string]string) []string {
	env := os.Environ()
	for k, v := range cfg {
		env = append(env, k+"="+v)
	}
	return env
}

func checkHealth(port string) bool {
	resp, err := http.Get("http://localhost:" + port + "/health")
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode == 200
}

func waitForHealth(port string, secs int) bool {
	for i := 0; i < secs; i++ {
		if checkHealth(port) {
			return true
		}
		time.Sleep(time.Second)
	}
	return false
}

func hiddenCmd(name string, args ...string) *exec.Cmd {
	cmd := exec.Command(name, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: createNoWindow}
	return cmd
}

func fatalDialog(msg string) {
	m, _ := syscall.UTF16PtrFromString(msg)
	t, _ := syscall.UTF16PtrFromString("HCE Consultorio")
	syscall.NewLazyDLL("user32.dll").NewProc("MessageBoxW").Call(
		0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x10,
	)
	os.Exit(1)
}

// errorDialogConReintento muestra un diálogo Sí/No. Retorna true si el usuario elige Sí (reintentar).
func errorDialogConReintento(msg string) bool {
	texto := msg + "\n\n¿Desea intentar de nuevo?"
	m, _ := syscall.UTF16PtrFromString(texto)
	t, _ := syscall.UTF16PtrFromString("HCE Consultorio")
	ret, _, _ := syscall.NewLazyDLL("user32.dll").NewProc("MessageBoxW").Call(
		0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)),
		0x34, // MB_YESNO | MB_ICONWARNING
	)
	return ret == 6 // IDYES
}
