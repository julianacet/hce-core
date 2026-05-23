//go:build windows

package main

import (
	"bufio"
	"log"
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

	webPort := cfgVal(cfg, "WEB_PORT", "8080")
	rootDir := filepath.Join(exeDir, "dist")
	go func() {
		mux := http.NewServeMux()
		mux.HandleFunc("/", spaHandler(rootDir))
		if err := http.ListenAndServe("127.0.0.1:"+webPort, mux); err != nil {
			log.Println("servidor web:", err)
		}
	}()

	url := "http://localhost:" + webPort
	for range 20 {
		time.Sleep(100 * time.Millisecond)
		if resp, err := http.Get(url); err == nil {
			resp.Body.Close()
			break
		}
	}

	w := webview.New(false)
	defer w.Destroy()
	w.SetTitle("HCE Consultorio")
	w.SetSize(1280, 800, webview.HintNone)
	w.Navigate(url)
	w.Run()
	// Los servicios (PostgreSQL + API) siguen en segundo plano al cerrar la ventana
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
		inner := line[5:]                       // quitar: set "
		inner = strings.TrimSuffix(inner, "\"") // quitar: "  final
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
	for _, k := range []string{"DATABASE_URL", "JWT_SECRET", "PORT", "ALLOWED_ORIGIN", "APP_TZ", "TZ", "PRINTER_TERMICA"} {
		if v, ok := cfg[k]; ok {
			env = append(env, k+"="+v)
		}
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

func spaHandler(rootDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(rootDir, filepath.Clean("/"+r.URL.Path))
		if _, err := os.Stat(path); os.IsNotExist(err) {
			http.ServeFile(w, r, filepath.Join(rootDir, "index.html"))
			return
		}
		http.FileServer(http.Dir(rootDir)).ServeHTTP(w, r)
	}
}
