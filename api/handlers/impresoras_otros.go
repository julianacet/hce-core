//go:build !windows

package handlers

import (
	"bufio"
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"strings"
)

// GET /sistema/impresoras — lista impresoras via CUPS en Linux/macOS
func getImpresoras(w http.ResponseWriter, r *http.Request) {
	out, err := exec.Command("lpstat", "-a").Output()
	if err != nil {
		responderJSON(w, http.StatusOK, []string{})
		return
	}

	var nombres []string
	sc := bufio.NewScanner(bytes.NewReader(out))
	for sc.Scan() {
		parts := strings.Fields(sc.Text())
		if len(parts) > 0 {
			nombres = append(nombres, parts[0])
		}
	}
	if nombres == nil {
		nombres = []string{}
	}
	responderJSON(w, http.StatusOK, nombres)
}

// POST /sistema/impresoras/termica — en Linux solo actualiza la variable en memoria
func setImpresoraTermica(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Nombre string `json:"nombre"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Nombre) == "" {
		responderError(w, http.StatusBadRequest, "nombre requerido")
		return
	}
	os.Setenv("PRINTER_TERMICA", body.Nombre)
	responderJSON(w, http.StatusOK, map[string]string{"estado": "ok"})
}
