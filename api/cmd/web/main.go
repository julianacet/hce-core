package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
)

var rootDir string

func main() {
	rootDir = os.Getenv("WEB_DIR")
	if rootDir == "" {
		rootDir = "dist"
	}
	port := os.Getenv("WEB_PORT")
	if port == "" {
		port = "8080"
	}

	http.Handle("/", http.HandlerFunc(spaHandler))

	log.Printf("Sirviendo %s en :%s", rootDir, port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func spaHandler(w http.ResponseWriter, r *http.Request) {
	path := filepath.Join(rootDir, filepath.Clean("/"+r.URL.Path))
	if _, err := os.Stat(path); os.IsNotExist(err) {
		http.ServeFile(w, r, filepath.Join(rootDir, "index.html"))
		return
	}
	http.FileServer(http.Dir(rootDir)).ServeHTTP(w, r)
}
