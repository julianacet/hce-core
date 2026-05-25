package main

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"strings"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"hce/api/handlers"
	appmiddleware "hce/api/middleware"
	"hce/api/repository"
)

func main() {
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
			r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
			next.ServeHTTP(w, r)
		})
	})

	// CORS — solo se activa si ALLOWED_ORIGIN está definida (Docker/dev remoto).
	// En Windows el frontend se sirve desde el mismo origen, no es necesario.
	if allowedOrigins := os.Getenv("ALLOWED_ORIGIN"); allowedOrigins != "" {
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

	// Todas las rutas del API bajo /api/
	r.Route("/api", func(r chi.Router) {
		// Rutas públicas
		r.Mount("/auth", handlers.AuthRouter(db, jwtSecreto))
		// GET /api/configuracion es público: el frontend lo necesita antes del login
		r.Get("/configuracion", handlers.GetConfiguracion(db))
		r.Mount("/divipola", handlers.DivipolaRouter(db))
		r.Mount("/ocupaciones", handlers.OcupacionesRouter(db))
		r.Mount("/eps", handlers.EpsRouter(db))
		r.Mount("/diagnosticos", handlers.DiagnosticosRouter(db))

		// Rutas protegidas — requieren token JWT
		r.Group(func(r chi.Router) {
			r.Use(appmiddleware.RequiereAuth(jwtSecreto))

			r.Mount("/encuentros", handlers.EncuentrosGlobalRouter(db))
			r.Mount("/pacientes", handlers.PacientesRouter(db))
			r.Mount("/facturas", handlers.FacturasRouter(db))
			r.Mount("/campos-clinicos", handlers.CamposClinicosRouter(db))
			r.Mount("/auditoria", handlers.AuditoriaRouter(db))
			r.Mount("/cups", handlers.CupsRouter(db))
			r.Mount("/rips", handlers.RipsMensualRouter(db))
			r.Mount("/consentimientos/plantillas", handlers.PlantillasRouter(db))
			r.Mount("/consentimientos/generados", handlers.ConsentimientoGeneradoRouter(db))
			r.With(appmiddleware.RequiereRol("medico")).Mount("/antecedentes/preguntas", handlers.PreguntasAntecedentesRouter(db))
			r.Mount("/encuestas", handlers.EncuestasRouter(db))
			r.Mount("/dashboard", handlers.DashboardRouter(db))
			r.Mount("/insumos", handlers.InsumosRouter(db))
			r.Mount("/tipos-evento-adverso", handlers.TiposEventoAdversoRouter(db))
			r.Mount("/eventos-adversos", handlers.EventosAdversosRouter(db))
			r.Mount("/proveedores", handlers.ProveedoresRouter(db))
			r.Mount("/tarifas", handlers.TarifasRouter(db))
			r.Mount("/examenes-predefinidos", handlers.ExamenesPredefinidosRouter(db))
			r.Mount("/citas", handlers.CitasRouter(db))
			r.Mount("/medicamentos-predefinidos", handlers.MedicamentosPredefinidosRouter(db))
			r.With(appmiddleware.RequiereRol("medico")).Put("/configuracion/tema", handlers.PutConfiguracionTema(db))
			r.With(appmiddleware.RequiereRol("medico")).Put("/configuracion/medico", handlers.PutConfiguracionMedico(db))
			r.With(appmiddleware.RequiereRol("medico")).Mount("/sistema", handlers.SistemaRouter())

			// Solo admin
			r.With(appmiddleware.RequiereRol("admin")).Mount("/usuarios", handlers.UsuariosRouter(db))
		})
	})

	// Frontend SPA — sirve ui/dist si está disponible
	if staticDir := findStaticDir(); staticDir != "" {
		log.Printf("Sirviendo frontend desde %s", staticDir)
		r.Get("/*", spaHandler(staticDir))
	}

	// Broadcast UDP para que los clientes en la red local puedan descubrir este servidor
	go startBroadcast(port)

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

// findStaticDir busca la carpeta dist del frontend en ubicaciones conocidas.
func findStaticDir() string {
	if d := os.Getenv("STATIC_DIR"); d != "" {
		if dirExists(d) {
			return d
		}
	}
	// Producción Windows: dist/ está junto al ejecutable
	if exe, err := os.Executable(); err == nil {
		if d := filepath.Join(filepath.Dir(exe), "dist"); dirExists(d) {
			return d
		}
	}
	// Desarrollo: running desde api/ o api/cmd/
	for _, d := range []string{"./dist", "../ui/dist"} {
		if dirExists(d) {
			return d
		}
	}
	return ""
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

// spaHandler sirve archivos estáticos y cae en index.html para rutas de React Router.
func spaHandler(rootDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(rootDir, filepath.Clean("/"+r.URL.Path))
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			http.FileServer(http.Dir(rootDir)).ServeHTTP(w, r)
			return
		}
		http.ServeFile(w, r, filepath.Join(rootDir, "index.html"))
	}
}

// startBroadcast emite un paquete UDP broadcast cada 3s para que los clientes
// en la red local puedan descubrir automáticamente este servidor.
func startBroadcast(port string) {
	conn, err := net.ListenPacket("udp4", ":0")
	if err != nil {
		log.Printf("broadcast UDP: no se pudo abrir socket: %v", err)
		return
	}
	defer conn.Close()

	msg, _ := json.Marshal(map[string]string{"app": "hce", "port": port})
	dest := &net.UDPAddr{IP: net.IPv4bcast, Port: 45678}

	tick := time.NewTicker(3 * time.Second)
	defer tick.Stop()
	for range tick.C {
		if _, err := conn.WriteTo(msg, dest); err != nil {
			log.Printf("broadcast UDP: %v", err)
		}
	}
}
