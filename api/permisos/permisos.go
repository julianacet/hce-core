// Package permisos es el registro único de qué rol puede acceder a qué recurso.
// RequiereRol lo consulta para aplicar la restricción real en el backend, y
// ParaRol se expone al frontend al hacer login para que deje de mantener su
// propia copia de esta misma información.
//
// Los datos viven en la tabla rol_permiso (Postgres) y se cachean en memoria,
// porque RequiereRol corre en cada request protegido. La caché se recarga
// periódicamente en segundo plano — un cambio hecho directo en la BD (o, más
// adelante, desde el panel de administración) se refleja solo, sin reiniciar.
package permisos

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const intervaloRecarga = 60 * time.Second

// catalogoRecursos son todas las claves de recurso válidas del sistema — la
// lista de "qué páginas/acciones existen", separada de "qué roles las
// tienen" (eso vive en rol_permiso). Hace falta por separado porque un
// recurso sin ninguna fila en la tabla (p. ej. admin.usuarios e historial,
// exclusivos de admin) no aparecería solo al agrupar filas, y admin debe
// verlas todas igual. Agregar un recurso nuevo siempre requiere tocar este
// archivo — el catálogo nunca es 100% configurable sin código, porque cada
// clave corresponde a un puedeAcceder("...") puesto a mano en una página.
var catalogoRecursos = []string{
	"pacientes", "nueva-consulta", "agenda", "consentimientos", "facturas",
	"rips-mensual", "tarifas", "inventario", "proveedores", "eventos-adversos",
	"encuestas", "farmacia",
	"admin", "admin.perfil", "admin.apariencia", "admin.antecedentes",
	"admin.consentimientos", "admin.eventos", "admin.campos", "admin.medicamentos",
	"admin.examenes", "admin.sistema", "admin.usuarios",
	"historial",
}

var (
	mu    sync.RWMutex
	cache map[string][]string // recurso -> roles no-admin permitidos
	db    *pgxpool.Pool
)

// Init conecta el paquete a la base de datos, carga la caché inicial desde
// rol_permiso y arranca un refresco periódico en segundo plano.
func Init(pool *pgxpool.Pool) error {
	db = pool
	if err := recargar(context.Background()); err != nil {
		return err
	}
	go func() {
		ticker := time.NewTicker(intervaloRecarga)
		defer ticker.Stop()
		for range ticker.C {
			if err := recargar(context.Background()); err != nil {
				log.Printf("permisos: error al recargar caché: %v", err)
			}
		}
	}()
	return nil
}

func recargar(ctx context.Context) error {
	rows, err := db.Query(ctx, "SELECT rol, recurso FROM rol_permiso")
	if err != nil {
		return err
	}
	defer rows.Close()

	nuevo := make(map[string][]string)
	for rows.Next() {
		var rol, recurso string
		if err := rows.Scan(&rol, &recurso); err != nil {
			return err
		}
		nuevo[recurso] = append(nuevo[recurso], rol)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	mu.Lock()
	cache = nuevo
	mu.Unlock()
	return nil
}

// Roles expone los roles no-admin de un recurso, listos para pasar a
// RequiereRol(...).
func Roles(recurso string) []string {
	mu.RLock()
	defer mu.RUnlock()
	roles := cache[recurso]
	copia := make([]string, len(roles))
	copy(copia, roles)
	return copia
}

// ParaRol devuelve las claves de recurso a las que un rol tiene acceso.
// admin recibe siempre el catálogo completo, sin pasar por la caché.
func ParaRol(rol string) []string {
	if rol == "admin" {
		claves := make([]string, len(catalogoRecursos))
		copy(claves, catalogoRecursos)
		return claves
	}

	mu.RLock()
	defer mu.RUnlock()

	var claves []string
	for recurso, roles := range cache {
		for _, r := range roles {
			if r == rol {
				claves = append(claves, recurso)
				break
			}
		}
	}
	return claves
}
