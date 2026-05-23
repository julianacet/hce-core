//go:build windows

package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	webview "github.com/webview/webview_go"
)

func main() {
	rootDir := os.Getenv("WEB_DIR")
	if rootDir == "" {
		exe, _ := os.Executable()
		rootDir = filepath.Join(filepath.Dir(exe), "dist")
	}

	webPort := os.Getenv("WEB_PORT")
	if webPort == "" {
		webPort = "8080"
	}

	addr := fmt.Sprintf("127.0.0.1:%s", webPort)
	go func() {
		mux := http.NewServeMux()
		mux.HandleFunc("/", spaHandler(rootDir))
		if err := http.ListenAndServe(addr, mux); err != nil {
			log.Fatal(err)
		}
	}()

	// Esperar que el servidor de archivos arranque
	url := fmt.Sprintf("http://localhost:%s", webPort)
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
