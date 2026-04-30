#!/usr/bin/env bash
# Compila los binarios para Windows y prepara los archivos para el instalador Inno Setup.
# Ejecutar desde la raíz del proyecto: bash scripts/construir_windows.sh
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'
info()  { echo -e "${BLUE}[•]${NC} $*"; }
ok()    { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WINDOWS_DIR="$ROOT/windows"
API_DIR="$ROOT/api"
UI_DIR="$ROOT/ui"

echo ""
echo -e "${BOLD}══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  HCE Consultorio — Build Windows             ${NC}"
echo -e "${BOLD}══════════════════════════════════════════════${NC}"
echo ""

# ── Verificar herramientas ────────────────────────────────────────────────────

command -v go   &>/dev/null || error "Go no encontrado. Instala Go: https://go.dev/dl/"
command -v npm  &>/dev/null || error "npm no encontrado. Instala Node.js: https://nodejs.org/"

# ── 1. Compilar binarios Windows ──────────────────────────────────────────────

info "Compilando hce-api.exe para Windows/amd64..."
cd "$API_DIR"
GOOS=windows GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o "$WINDOWS_DIR/hce-api.exe" \
    ./cmd/main.go
ok "hce-api.exe generado"

info "Compilando hce-web.exe para Windows/amd64..."
GOOS=windows GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o "$WINDOWS_DIR/hce-web.exe" \
    ./cmd/web/main.go
ok "hce-web.exe generado"

# ── 2. Construir frontend ─────────────────────────────────────────────────────

info "Construyendo frontend..."
cd "$UI_DIR"

# Para Windows, el usuario accede desde la misma máquina; localhost es correcto.
# Sobrescribir si se quiere apuntar a otro servidor.
VITE_API_URL="${VITE_API_URL_WINDOWS:-http://localhost:8000}" npm run build

info "Copiando dist/ a windows/..."
rm -rf "$WINDOWS_DIR/dist"
cp -r "$UI_DIR/dist" "$WINDOWS_DIR/dist"
ok "Frontend listo en windows/dist/"

# ── 3. Verificar PostgreSQL portátil ─────────────────────────────────────────

echo ""
if [[ -d "$WINDOWS_DIR/pgsql/bin" ]]; then
    ok "PostgreSQL portátil encontrado en windows/pgsql/"
else
    warn "PostgreSQL portátil NO encontrado."
    echo ""
    echo -e "  Descarga el ZIP de binarios de PostgreSQL 16 para Windows:"
    echo -e "  ${BOLD}https://www.enterprisedb.com/download-postgresql-binaries${NC}"
    echo ""
    echo -e "  Selecciona: Windows x86-64 → versión 16.x → 'ZIP Archive'"
    echo -e "  Extrae el contenido (carpeta 'pgsql/') dentro de windows/"
    echo ""
    echo -e "  Estructura esperada:"
    echo -e "    windows/pgsql/bin/initdb.exe"
    echo -e "    windows/pgsql/bin/postgres.exe"
    echo -e "    windows/pgsql/bin/psql.exe"
    echo -e "    windows/pgsql/bin/pg_ctl.exe"
    echo ""
fi

# ── 4. Resumen ────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Archivos listos en windows/                 ${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════${NC}"
echo ""
echo -e "  Archivos generados:"
ls -lh "$WINDOWS_DIR"/*.exe 2>/dev/null | awk '{print "    " $NF " (" $5 ")"}' || true
echo ""
echo -e "  Siguiente paso (en Windows con Inno Setup instalado):"
echo -e "    ISCC.exe windows\\hce.iss"
echo ""
echo -e "  Descarga Inno Setup desde: https://jrsoftware.org/isinfo.php"
echo ""
