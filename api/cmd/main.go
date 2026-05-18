package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"hce/api/handlers"
	appmiddleware "hce/api/middleware"
	"hce/api/repository"
)

func main() {
	// .env.dev tiene prioridad (desarrollo local). En Docker no existe → falla silenciosamente.
	// godotenv.Load no sobreescribe vars ya definidas en el entorno del sistema.
	_ = godotenv.Load("../.env.dev")
	_ = godotenv.Load("../.env")

	dbURL, dbURLExists := os.LookupEnv("DATABASE_URL")
	if !dbURLExists {
		log.Fatal("La variable de entorno DATABASE_URL no existe en el sistema")
	} else if dbURL == "" {
		log.Fatal("La URL de la base de datos no está definida")
	}

	jwtSecreto, jwtSecretoExists := os.LookupEnv("JWT_SECRET")
	if !jwtSecretoExists {
		log.Fatal("La variable de entorno JWT_SECRET no existe en el sistema")
	} else if jwtSecreto == "" {
		log.Fatal("JWT_SECRET no está definida")
	}

	port, portExists := os.LookupEnv("PORT")
	if !portExists {
		log.Fatal("La variable de entorno PORT no existe en el sistema")
	} else if port == "" {
		log.Fatal("PORT no está definida")
	}

	db, err := repository.Connect(dbURL, os.Getenv("APP_TZ"))
	if err != nil {
		log.Fatalf("BD: %v", err)
	}
	defer db.Close()
	log.Println("Conectado a PostgreSQL")

	r := chi.NewRouter()

	r.Use(func(next http.Handler) http.Handler {
		logged := chimiddleware.Logger(next)
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/health" {
				next.ServeHTTP(w, r)
				return
			}
			logged.ServeHTTP(w, r)
		})
	})
	r.Use(chimiddleware.Recoverer)
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1 MB
			next.ServeHTTP(w, r)
		})
	})

	if allowedOrigins, allowedOriginsExists := os.LookupEnv("ALLOWED_ORIGIN"); allowedOriginsExists && allowedOrigins != "" {
		origins := strings.Split(allowedOrigins, ",")
		for i, o := range origins {
			origins[i] = strings.TrimSpace(o)
		}
		r.Use(cors.Handler(cors.Options{
			AllowedOrigins: origins,
			AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
			AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
		}))
	}

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	// Rutas públicas
	r.Mount("/auth", handlers.AuthRouter(db, jwtSecreto))
	// GET /configuracion es intencional sin auth: el frontend lo necesita antes del login
	// para mostrar el nombre y tema del consultorio. No exponer datos sensibles aquí.
	r.Get("/configuracion", handlers.GetConfiguracion(db))
	r.Mount("/divipola", handlers.DivipolaRouter(db))
	r.Mount("/ocupaciones", handlers.OcupacionesRouter(db))
	r.Mount("/eps", handlers.EpsRouter(db))
	r.Mount("/diagnosticos", handlers.DiagnosticosRouter(db))

	// Rutas protegidas — requieren token JWT
	r.Group(func(r chi.Router) {
		r.Use(appmiddleware.RequiereAuth(jwtSecreto))

		// Accesibles por cualquier usuario autenticado (admin, medico, auxiliar)
		r.Mount("/encuentros", handlers.EncuentrosGlobalRouter(db))
		r.Mount("/pacientes", handlers.PacientesRouter(db))
		r.Mount("/facturas", handlers.FacturasRouter(db))
		r.Mount("/campos-clinicos", handlers.CamposClinicosRouter(db))
		r.Mount("/auditoria", handlers.AuditoriaRouter(db))
		r.Mount("/cups", handlers.CupsRouter(db))
		r.Mount("/rips", handlers.RipsMensualRouter(db))
		r.Mount("/consentimientos/plantillas", handlers.PlantillasRouter(db))
		r.Mount("/antecedentes/preguntas", handlers.PreguntasAntecedentesRouter(db))
		r.Mount("/encuestas", handlers.EncuestasRouter(db))
		r.Mount("/dashboard", handlers.DashboardRouter(db))
		r.Mount("/insumos", handlers.InsumosRouter(db))
		r.Mount("/tipos-evento-adverso", handlers.TiposEventoAdversoRouter(db))
		r.Mount("/eventos-adversos", handlers.EventosAdversosRouter(db))
		r.Mount("/proveedores", handlers.ProveedoresRouter(db))
		r.Mount("/tarifas", handlers.TarifasRouter(db))
		r.Mount("/citas", handlers.CitasRouter(db))
		r.Mount("/medicamentos-predefinidos", handlers.MedicamentosPredefinidosRouter(db))
		r.Put("/configuracion/tema", handlers.PutConfiguracionTema(db))
		r.Put("/configuracion/medico", handlers.PutConfiguracionMedico(db))

		// Solo admin
		r.With(appmiddleware.RequiereRol("admin")).Mount("/usuarios", handlers.UsuariosRouter(db))
	})

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("Servidor escuchando en :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("error al iniciar servidor: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Apagando servidor...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("error al apagar servidor: %v", err)
	}
	log.Println("Servidor detenido.")
}
