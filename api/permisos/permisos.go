// Package permisos es el registro único de qué rol puede acceder a qué recurso.
// RequiereRol lo consulta para aplicar la restricción real en el backend, y
// ParaRol se expone al frontend al hacer login para que deje de mantener su
// propia copia de esta misma información.
package permisos

// Registro mapea cada recurso a los roles no-admin permitidos. admin nunca se
// lista explícitamente: RequiereRol ya lo trata como bypass automático.
var Registro = map[string][]string{
	"pacientes":        {"medico", "recepcionista", "enfermeria"},
	"nueva-consulta":   {"medico"},
	"agenda":           {"medico", "recepcionista", "enfermeria"},
	"consentimientos":  {"medico", "recepcionista"},
	"facturas":         {"medico", "recepcionista", "facturador"},
	"rips-mensual":     {"medico", "facturador"},
	"tarifas":          {"medico", "facturador"},
	"inventario":       {"medico", "recepcionista", "enfermeria"},
	"proveedores":      {"medico"},
	"eventos-adversos": {"medico", "enfermeria"},
	"encuestas":        {"medico", "recepcionista"},
	"farmacia":         {"farmacia", "medico", "recepcionista", "enfermeria", "facturador"},

	// entrar a /admin (ver al menos una pestaña, p.ej. perfil/apariencia/
	// antecedentes/consentimientos/catálogos)
	"admin": {"medico"},
	// pestaña "Usuarios" dentro de /admin — exclusiva de admin
	"admin.usuarios": {},
	// log de auditoría — exclusivo de admin
	"historial": {},
}

// Roles expone los roles no-admin de un recurso, listos para pasar a
// RequiereRol(...).
func Roles(recurso string) []string {
	return Registro[recurso]
}

// ParaRol devuelve las claves de recurso a las que un rol tiene acceso.
// admin recibe siempre el registro completo.
func ParaRol(rol string) []string {
	if rol == "admin" {
		claves := make([]string, 0, len(Registro))
		for recurso := range Registro {
			claves = append(claves, recurso)
		}
		return claves
	}

	var claves []string
	for recurso, roles := range Registro {
		for _, r := range roles {
			if r == rol {
				claves = append(claves, recurso)
				break
			}
		}
	}
	return claves
}
