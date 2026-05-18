//go:build windows

package main

import (
	"fmt"
	"log"
	"net"
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

	// Puerto aleatorio — solo accesible desde localhost
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		log.Fatal("No se pudo abrir puerto:", err)
	}
	port := ln.Addr().(*net.TCPAddr).Port
	ln.Close()

	go func() {
		mux := http.NewServeMux()
		mux.HandleFunc("/", spaHandler(rootDir))
		if err := http.ListenAndServe(fmt.Sprintf("127.0.0.1:%d", port), mux); err != nil {
			log.Fatal(err)
		}
	}()

	// Esperar que el servidor de archivos arranque
	url := fmt.Sprintf("http://127.0.0.1:%d", port)
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
