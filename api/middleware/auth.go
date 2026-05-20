package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"hce/api/repository"
)

type contextKey string

const UsuarioKey contextKey = "usuario"

type ClaimsUsuario struct {
	ID       string `json:"id"`
	Nombre   string `json:"nombre"`
	Rol      string `json:"rol"`
	jwt.RegisteredClaims
}

// RequiereAuth valida el token JWT en el header Authorization.
// Uso: r.Use(middleware.RequiereAuth(secreto))
func RequiereAuth(secreto string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				http.Error(w, `{"error":"no autorizado"}`, http.StatusUnauthorized)
				return
			}

			tokenStr := strings.TrimPrefix(header, "Bearer ")
			claims := &ClaimsUsuario{}

			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("algoritmo inesperado: %v", t.Header["alg"])
				}
				return []byte(secreto), nil
			})
			if err != nil || !token.Valid {
				http.Error(w, `{"error":"token inválido o expirado"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UsuarioKey, claims)
			ctx = repository.ContextConUsuario(ctx, claims.ID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UsuarioDesdeContexto extrae el usuario autenticado del contexto del request.
func UsuarioDesdeContexto(ctx context.Context) *ClaimsUsuario {
	claims, _ := ctx.Value(UsuarioKey).(*ClaimsUsuario)
	return claims
}

// RequiereRol rechaza el request si el usuario no tiene alguno de los roles indicados.
// Admin siempre pasa, independientemente de los roles listados.
// Debe usarse después de RequiereAuth.
func RequiereRol(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			u := UsuarioDesdeContexto(r.Context())
			if u == nil {
				http.Error(w, `{"error":"no autorizado"}`, http.StatusUnauthorized)
				return
			}
			if u.Rol == "admin" {
				next.ServeHTTP(w, r)
				return
			}
			for _, rol := range roles {
				if u.Rol == rol {
					next.ServeHTTP(w, r)
					return
				}
			}
			http.Error(w, `{"error":"acceso denegado"}`, http.StatusForbidden)
		})
	}
}
