package handlers

import "fmt"

// argList construye listas de parámetros posicionales para queries dinámicas.
// Cada llamada a Add agrega el valor y retorna el placeholder "$N" listo para interpolar.
//
//	var args argList
//	where += " AND columna = " + args.Add(valor)
//	db.Query(ctx, query, args...)
type argList []any

func (a *argList) Add(v any) string {
	*a = append(*a, v)
	return fmt.Sprintf("$%d", len(*a))
}

// Slice retorna los argumentos como []any para pasarlos a pgx.
func (a argList) Slice() []any { return []any(a) }
