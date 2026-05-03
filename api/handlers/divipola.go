package handlers

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DivipolaHandler struct {
	db *pgxpool.Pool
}

func DivipolaRouter(db *pgxpool.Pool) http.Handler {
	h := &DivipolaHandler{db: db}
	r := chi.NewRouter()
	r.Get("/departamentos", h.getDepartamentos)
	r.Get("/municipios", h.getMunicipios)
	r.Get("/municipios/{codigo}", h.getMunicipio)
	return r
}

type departamento struct {
	Codigo string `json:"codigo"`
	Nombre string `json:"nombre"`
}

type municipio struct {
	Codigo       string `json:"codigo"`
	Nombre       string `json:"nombre"`
	Departamento string `json:"departamento"`
}

func (h *DivipolaHandler) getDepartamentos(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(),
		`SELECT codigo, nombre FROM departamento ORDER BY nombre`)
	if err != nil {
		log.Printf("getDepartamentos: %v", err)
		responderError(w, http.StatusInternalServerError, "error al obtener departamentos")
		return
	}
	defer rows.Close()

	resultado := make([]departamento, 0)
	for rows.Next() {
		var d departamento
		if err := rows.Scan(&d.Codigo, &d.Nombre); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer departamento")
			return
		}
		resultado = append(resultado, d)
	}
	responderJSON(w, http.StatusOK, resultado)
}

func (h *DivipolaHandler) getMunicipios(w http.ResponseWriter, r *http.Request) {
	dep := r.URL.Query().Get("dep")
	if len(dep) != 2 {
		responderError(w, http.StatusBadRequest, "parámetro 'dep' inválido — debe ser código de 2 dígitos")
		return
	}

	rows, err := h.db.Query(r.Context(),
		`SELECT codigo, nombre, departamento FROM municipio WHERE departamento = $1 ORDER BY nombre`,
		dep)
	if err != nil {
		log.Printf("getMunicipios: %v", err)
		responderError(w, http.StatusInternalServerError, "error al obtener municipios")
		return
	}
	defer rows.Close()

	resultado := make([]municipio, 0)
	for rows.Next() {
		var m municipio
		if err := rows.Scan(&m.Codigo, &m.Nombre, &m.Departamento); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer municipio")
			return
		}
		resultado = append(resultado, m)
	}
	responderJSON(w, http.StatusOK, resultado)
}

func (h *DivipolaHandler) getMunicipio(w http.ResponseWriter, r *http.Request) {
	codigo := chi.URLParam(r, "codigo")
	if len(codigo) != 5 {
		responderError(w, http.StatusBadRequest, "código de municipio inválido")
		return
	}

	var m municipio
	err := h.db.QueryRow(r.Context(),
		`SELECT codigo, nombre, departamento FROM municipio WHERE codigo = $1`,
		codigo).Scan(&m.Codigo, &m.Nombre, &m.Departamento)
	if err != nil {
		responderError(w, http.StatusNotFound, "municipio no encontrado")
		return
	}
	responderJSON(w, http.StatusOK, m)
}
