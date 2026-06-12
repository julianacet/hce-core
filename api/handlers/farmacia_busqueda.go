package handlers

import (
	"regexp"
	"strings"
)

var rePunctMed = regexp.MustCompile(`[^\p{L}\p{N}]+`)

// prepBusquedaMed normaliza el término de búsqueda para medicamentos.
// Convierte a minúsculas y reemplaza cualquier secuencia de caracteres
// no alfanuméricos (signos de puntuación, espacios, guiones, barras…)
// con el comodín % de LIKE. Así "amoxicilina/ácido" y "amoxicilina acido"
// producen el mismo patrón de búsqueda.
func prepBusquedaMed(q string) string {
	q = strings.ToLower(strings.TrimSpace(q))
	q = rePunctMed.ReplaceAllString(q, "%")
	return "%" + strings.Trim(q, "%") + "%"
}
