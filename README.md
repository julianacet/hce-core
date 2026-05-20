# HCE Consultorio

Historia Clínica Electrónica para consultorios médicos independientes en Colombia.

**Normativa:** Res. 1995/1999 · Res. 866/2021 · Res. 2275/2023 (RIPS) · Res. 2706/2025 (CUPS) · Ley 1581/2012

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Base de datos | PostgreSQL 15 |
| Backend | Go + Chi + pgx/v5 |
| Frontend | React 19 + Vite + TypeScript + TanStack Query + React Router v7 |
| Estilos | Tailwind CSS v4 |
| PDF | @react-pdf/renderer |
| Escritorio (Windows) | WebView2 + Go (hce-web.exe) |
| Instalador | Inno Setup 6 |

---

## Módulos

- **Historia clínica** — registro de encuentros, diagnósticos CIE-10, signos vitales y examen físico parametrizables, antecedentes, notas de corrección, inmutabilidad por normativa
- **Fórmula médica** — POS y No-POS, catálogo de medicamentos, PDF con firma del médico
- **Órdenes de exámenes** — laboratorio, imágenes y otros por código CUPS, PDF de orden
- **Consentimientos informados** — plantillas configurables con variables dinámicas, PDF
- **Facturación** — buscador CUPS, tarifas propias, máquina de estados, PDF carta y térmico
- **RIPS** — generación mensual y por factura, formato JSON Res. 2275/2023
- **Agenda** — calendario mensual + vista de día con slots de 30 min, estados de cita
- **Inventario** — insumos con trazabilidad (lote, INVIMA, vencimiento), movimientos
- **Eventos adversos** — clasificación MinSalud, seguimiento y cierre con causa raíz
- **Encuestas de satisfacción** — 7 dimensiones + NPS, resumen agregado
- **Proveedores** — directorio con tipos, condiciones de pago y activación
- **Panel admin** — usuarios, roles, campos clínicos, medicamentos, plantillas, apariencia

---

## Roles

| Rol | Acceso |
|---|---|
| `admin` | Todo (superrol) |
| `medico` | Todo excepto gestión de usuarios |
| `recepcionista` | Agenda, pacientes, facturas, inventario, encuestas |
| `enfermeria` | Pacientes (lectura + antecedentes) |
| `facturador` | Facturas, RIPS, tarifas |

---

## Estructura del repositorio

```
api/                  Go — backend REST
  cmd/main.go         Entrypoint del servidor API
  cmd/web/main.go     Entrypoint del servidor WebView (Windows)
  handlers/           Handlers HTTP por módulo
  middleware/         Auth JWT y control de roles
  models/             Structs compartidos
ui/                   React — frontend
  src/
    api/              Hooks de TanStack Query por módulo
    components/       Componentes reutilizables
    context/          Auth, Tema, Médico
    layouts/          RootLayout, PacienteLayout
    pages/            Una carpeta por pantalla
    router.tsx        Rutas con control de acceso por rol
db/
  init.sql            Esquema completo + triggers de auditoría
  seed_*.sql          Datos de referencia (EPS, DIVIPOLA, CUPS, etc.)
  migration/          Migraciones de esquema (idempotentes, migrate_*.sql)
windows/
  hce.iss             Script Inno Setup
  primera_vez.bat     Configuración inicial de la BD
  iniciar.bat         Arrancar servicios
  detener.bat         Detener servicios
  actualizar.bat      Aplicar migraciones y reiniciar (usado por el auto-update)
  version.txt         Versión instalada actualmente
scripts/
  construir_windows.sh  Compila binarios y empaqueta el instalador
.github/workflows/
  release.yml         CI/CD — publica release al hacer push de un tag v*
docs/
  actualizaciones.md  Guía del sistema de actualizaciones
```

---

## Desarrollo local

### Requisitos
- Docker + Docker Compose
- Go 1.22+
- Node.js 20+

### Arrancar

```bash
# Copiar variables de entorno
cp .env.example .env

# Levantar BD, API y UI
docker compose up -d
```

La app queda disponible en `http://localhost:8080`.
Credenciales iniciales: `admin` / `admin`.

### Desarrollo con hot reload

```bash
# Terminal 1 — backend
cd api && go run ./cmd/main.go

# Terminal 2 — frontend
cd ui && npm run dev
```

### Migraciones de esquema

Al crear un cambio de esquema que deba aplicarse en instalaciones existentes:

```bash
# Crear el script (debe ser idempotente)
touch db/migration/migrate_descripcion.sql

# Aplicar en la BD local
docker compose exec -T hce-db psql -U hce -d hce_provider \
  -f /dev/stdin < db/migration/migrate_descripcion.sql
```

Ver [docs/actualizaciones.md](docs/actualizaciones.md) para la guía completa.

---

## Build del instalador Windows

```bash
# Desde Linux/Mac (requiere mingw-w64)
bash scripts/construir_windows.sh

# Luego en Windows (requiere Inno Setup 6)
ISCC.exe windows\hce.iss /DMyVersion=1.0.0
```

El script compila `hce-api.exe`, `hce-web.exe` y el frontend, y los deja listos en `windows/`.

---

## Publicar una versión

```bash
# Merge a main primero
git checkout main && git merge develop && git push origin main

# Crear y subir el tag — dispara el CI automáticamente
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions compila los binarios, construye el instalador y publica el release con `HCE-Consultorio-Setup.exe` como artifact descargable.

URL de descarga siempre actualizada:
```
https://github.com/julianacet/hce-core/releases/latest/download/HCE-Consultorio-Setup.exe
```
