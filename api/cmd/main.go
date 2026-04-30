package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"hce/api/handlers"
	appmiddleware "hce/api/middleware"
	"hce/api/repository"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL no está definida")
	}

	jwtSecreto := os.Getenv("JWT_SECRET")
	if jwtSecreto == "" {
		log.Fatal("JWT_SECRET no está definida")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	db, err := repository.Connect(dbURL)
	if err != nil {
		log.Fatalf("BD: %v", err)
	}
	defer db.Close()
	log.Println("Conectado a PostgreSQL")

	r := chi.NewRouter()

	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)

	if allowedOrigin := os.Getenv("ALLOWED_ORIGIN"); allowedOrigin != "" {
		r.Use(cors.Handler(cors.Options{
			AllowedOrigins: []string{allowedOrigin},
			AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
		}))
	}

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	// Rutas públicas
	r.Mount("/auth", handlers.AuthRouter(db, jwtSecreto))

	// Rutas protegidas — requieren token JWT
	r.Group(func(r chi.Router) {
		r.Use(appmiddleware.RequiereAuth(jwtSecreto))

		// Accesibles por cualquier usuario autenticado (admin, medico, auxiliar)
		r.Mount("/pacientes", handlers.PacientesRouter(db))
		r.Mount("/auditoria", handlers.AuditoriaRouter(db))
		r.Mount("/cups", handlers.CupsRouter(db))
		r.Mount("/rips", handlers.RipsMensualRouter(db))
		r.Mount("/consentimientos/plantillas", handlers.PlantillasRouter(db))
		r.Mount("/encuestas", handlers.EncuestasRouter(db))
		r.Mount("/dashboard", handlers.DashboardRouter(db))
		r.Mount("/insumos", handlers.InsumosRouter(db))

		// Solo admin
		r.With(appmiddleware.RequiereRol("admin")).Mount("/usuarios", handlers.UsuariosRouter(db))
		// r.With(appmiddleware.RequiereRol("admin")).Mount("/cups", handlers.CupsRouter(db))
	})

	log.Printf("Servidor escuchando en :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("error al iniciar servidor: %v", err)
	}
}
