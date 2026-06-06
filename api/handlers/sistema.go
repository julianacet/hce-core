package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

const githubRepo = "julianacet/hce-core"

func SistemaRouter() http.Handler {
	r := chi.NewRouter()
	r.Get("/version", getVersion)
	r.Post("/actualizar", postActualizar)
	r.Post("/abrir-pdf", abrirPDF)
	r.Get("/impresoras", getImpresoras)
	r.Post("/impresoras/termica", setImpresoraTermica)
	return r
}

// POST /sistema/abrir-pdf — recibe bytes del PDF y los abre con el visor del SO
func abrirPDF(w http.ResponseWriter, r *http.Request) {
	data, err := io.ReadAll(io.LimitReader(r.Body, 50<<20)) // 50 MB máx
	if err != nil || len(data) == 0 {
		responderError(w, http.StatusBadRequest, "cuerpo vacío o error de lectura")
		return
	}

	tmp, err := os.CreateTemp("", "hce-*.pdf")
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al crear archivo temporal")
		return
	}
	tmpPath := tmp.Name()
	if _, err = tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		responderError(w, http.StatusInternalServerError, "error al escribir archivo temporal")
		return
	}
	tmp.Close()

	if err = abrirArchivoSO(tmpPath); err != nil {
		os.Remove(tmpPath)
		responderError(w, http.StatusInternalServerError, "error al abrir visor de PDF")
		return
	}

	// Limpiar el temp después de 2 minutos
	go func() {
		time.Sleep(2 * time.Minute)
		os.Remove(tmpPath)
	}()

	responderJSON(w, http.StatusOK, map[string]string{"estado": "abriendo"})
}

type VersionInfo struct {
	Actual           string `json:"actual"`
	Disponible       string `json:"disponible,omitempty"`
	HayActualizacion bool   `json:"hay_actualizacion"`
	UrlDescarga      string `json:"url_descarga,omitempty"`
	Error            string `json:"error,omitempty"`
	Plataforma       string `json:"plataforma"`
}

// GET /sistema/version
func getVersion(w http.ResponseWriter, r *http.Request) {
	actual := leerVersionLocal()

	info := VersionInfo{Actual: actual, Plataforma: runtime.GOOS}

	gh, err := consultarGitHub()
	if err != nil {
		info.Error = "sin conexión a GitHub"
		responderJSON(w, http.StatusOK, info)
		return
	}

	info.Disponible = gh.version
	info.UrlDescarga = gh.urlDescarga
	info.HayActualizacion = gh.version != "" && gh.version != actual

	responderJSON(w, http.StatusOK, info)
}

// POST /sistema/actualizar   body: {"url":"https://..."}
func postActualizar(w http.ResponseWriter, r *http.Request) {
	if runtime.GOOS != "windows" {
		responderError(w, http.StatusBadRequest, "actualización automática solo disponible en instalaciones Windows")
		return
	}

	var body struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.URL == "" {
		responderError(w, http.StatusBadRequest, "url requerida")
		return
	}

	// Descargar el instalador a %TEMP%
	tmp, err := os.CreateTemp("", "hce-setup-*.exe")
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al crear archivo temporal")
		return
	}
	tmpPath := tmp.Name()
	tmp.Close()

	client := &http.Client{Timeout: 10 * time.Minute}
	resp, err := client.Get(body.URL)
	if err != nil {
		os.Remove(tmpPath)
		responderError(w, http.StatusBadGateway, "error al descargar actualización")
		return
	}
	defer resp.Body.Close()

	f, err := os.OpenFile(tmpPath, os.O_WRONLY, 0755)
	if err != nil {
		os.Remove(tmpPath)
		responderError(w, http.StatusInternalServerError, "error al guardar instalador")
		return
	}
	if _, err = io.Copy(f, resp.Body); err != nil {
		f.Close()
		os.Remove(tmpPath)
		responderError(w, http.StatusInternalServerError, "error al guardar instalador")
		return
	}
	f.Close()

	// Lanzar el instalador detached: espera 3s para que el API pueda responder,
	// luego corre el instalador que cerrará hce-api.exe y hce-web.exe.
	script := fmt.Sprintf(
		`Start-Sleep -Seconds 3; Start-Process '%s' -ArgumentList '/VERYSILENT','/NORESTART','/CLOSEAPPLICATIONS' -Wait; Remove-Item '%s' -ErrorAction SilentlyContinue`,
		tmpPath, tmpPath,
	)
	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script)
	cmd.Start() // intencionalmente sin Wait()

	responderJSON(w, http.StatusOK, map[string]string{"estado": "instalando"})
}

// ── helpers ───────────────────────────────────────────────────────────────────

func leerVersionLocal() string {
	exe, err := os.Executable()
	if err != nil {
		return "dev"
	}
	data, err := os.ReadFile(filepath.Join(filepath.Dir(exe), "version.txt"))
	if err != nil {
		return "dev"
	}
	return strings.TrimSpace(string(data))
}

type ghRelease struct {
	version     string
	urlDescarga string
}

func consultarGitHub() (ghRelease, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/releases/latest", githubRepo)
	client := &http.Client{Timeout: 5 * time.Second}

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := client.Do(req)
	if err != nil {
		return ghRelease{}, err
	}
	defer resp.Body.Close()

	var payload struct {
		TagName string `json:"tag_name"`
		Assets  []struct {
			Name               string `json:"name"`
			BrowserDownloadURL string `json:"browser_download_url"`
		} `json:"assets"`
	}
	if err = json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return ghRelease{}, err
	}

	version := strings.TrimPrefix(payload.TagName, "v")
	urlDescarga := ""
	for _, a := range payload.Assets {
		if strings.HasSuffix(a.Name, ".exe") {
			urlDescarga = a.BrowserDownloadURL
			break
		}
	}

	return ghRelease{version: version, urlDescarga: urlDescarga}, nil
}
