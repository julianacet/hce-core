//go:build windows

package handlers

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// GET /sistema/impresoras — lista impresoras instaladas en Windows
func getImpresoras(w http.ResponseWriter, r *http.Request) {
	out, err := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command",
		"Get-WmiObject Win32_Printer | Select-Object -ExpandProperty Name",
	).Output()
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al listar impresoras")
		return
	}

	var nombres []string
	sc := bufio.NewScanner(bytes.NewReader(out))
	for sc.Scan() {
		n := strings.TrimSpace(sc.Text())
		if n != "" {
			nombres = append(nombres, n)
		}
	}
	if nombres == nil {
		nombres = []string{}
	}
	responderJSON(w, http.StatusOK, nombres)
}

// POST /sistema/impresoras/termica — guarda el nombre en config.bat y actualiza el proceso
func setImpresoraTermica(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Nombre string `json:"nombre"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Nombre) == "" {
		responderError(w, http.StatusBadRequest, "nombre requerido")
		return
	}

	// Actualizar la variable en el proceso actual (sin reiniciar)
	os.Setenv("PRINTER_TERMICA", body.Nombre)

	// Persistir en config.bat para que sobreviva reinicios
	exe, err := os.Executable()
	if err != nil {
		responderJSON(w, http.StatusOK, map[string]string{"estado": "ok_sin_persistir"})
		return
	}
	configPath := filepath.Join(filepath.Dir(exe), "config.bat")
	if err := actualizarConfigBat(configPath, "PRINTER_TERMICA", body.Nombre); err != nil {
		responderError(w, http.StatusInternalServerError, "error al guardar en config.bat")
		return
	}

	responderJSON(w, http.StatusOK, map[string]string{"estado": "ok"})
}

// actualizarConfigBat reemplaza o agrega set "KEY=VALUE" en config.bat
func actualizarConfigBat(path, key, value string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	linea := fmt.Sprintf(`set "%s=%s"`, key, value)
	prefijo := fmt.Sprintf(`set "%s=`, key)

	var salida []string
	encontrado := false
	sc := bufio.NewScanner(bytes.NewReader(data))
	for sc.Scan() {
		linea_orig := sc.Text()
		if strings.HasPrefix(strings.ToLower(strings.TrimSpace(linea_orig)), strings.ToLower(prefijo)) {
			salida = append(salida, linea)
			encontrado = true
		} else {
			salida = append(salida, linea_orig)
		}
	}
	if !encontrado {
		salida = append(salida, linea)
	}

	return os.WriteFile(path, []byte(strings.Join(salida, "\r\n")), 0644)
}
