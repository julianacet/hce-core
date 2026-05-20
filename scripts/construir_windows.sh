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

# Compilador C para cross-compilación Windows (necesario para webview/CGO)
MINGW_CC=""
if command -v x86_64-w64-mingw32-gcc &>/dev/null; then
    MINGW_CC="x86_64-w64-mingw32-gcc"
else
    info "Instalando compilador mingw-w64 para cross-compilación Windows..."
    if command -v dnf &>/dev/null; then
        sudo dnf install -y mingw64-gcc
    elif command -v apt-get &>/dev/null; then
        sudo apt-get install -y gcc-mingw-w64-x86-64
    else
        error "No se pudo instalar mingw-w64 automáticamente.
       Instálalo manualmente:
         Fedora/RHEL:    sudo dnf install mingw64-gcc
         Ubuntu/Debian:  sudo apt-get install gcc-mingw-w64-x86-64"
    fi
    MINGW_CC="x86_64-w64-mingw32-gcc"
fi
ok "Compilador C: $MINGW_CC"

# ── Dependencia webview ───────────────────────────────────────────────────────

info "Verificando dependencia webview..."
cd "$API_DIR"
if ! grep -q "webview/webview_go" go.mod 2>/dev/null; then
    info "Agregando github.com/webview/webview_go al módulo..."
    GOOS=windows go get github.com/webview/webview_go
    go mod tidy
fi
ok "webview_go disponible"

# ── 1. Compilar hce-api.exe (sin CGO) ────────────────────────────────────────

info "Compilando hce-api.exe para Windows/amd64..."
cd "$API_DIR"
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o "$WINDOWS_DIR/hce-api.exe" \
    ./cmd/main.go
ok "hce-api.exe generado"

# ── 2. Compilar hce-web.exe (con CGO + webview) ───────────────────────────────

info "Compilando hce-web.exe para Windows/amd64 (webview)..."
cd "$API_DIR"
CC="$MINGW_CC" CGO_ENABLED=1 GOOS=windows GOARCH=amd64 go build \
    -ldflags="-s -w -H=windowsgui" \
    -o "$WINDOWS_DIR/hce-web.exe" \
    ./cmd/web/main.go
ok "hce-web.exe generado (ventana nativa)"

# ── 3. Construir frontend ─────────────────────────────────────────────────────

info "Construyendo frontend..."
cd "$UI_DIR"
VITE_API_URL="${VITE_API_URL_WINDOWS:-http://localhost:8000}" npm run build

info "Copiando dist/ a windows/..."
rm -rf "$WINDOWS_DIR/dist"
cp -r "$UI_DIR/dist" "$WINDOWS_DIR/dist"
ok "Frontend listo en windows/dist/"

# ── 4. Copiar scripts de migración ───────────────────────────────────────────

info "Copiando scripts de migración de datos (Simedic)..."
mkdir -p "$WINDOWS_DIR/migration"
cp "$ROOT/db/migration/migrar_pacientes.py"    "$WINDOWS_DIR/migration/"
cp "$ROOT/db/migration/migrar_consultas.py"    "$WINDOWS_DIR/migration/"
cp "$ROOT/db/migration/migrar_antecedentes.py" "$WINDOWS_DIR/migration/"
ok "Scripts de migración en windows/migration/"

info "Copiando migraciones de esquema de BD..."
# Las migraciones de esquema van en db/migration/ dentro del instalador.
# Se aplican automáticamente en cada actualización (actualizar.bat).
for f in "$ROOT/db/migration"/migrate_*.sql; do
    [[ -f "$f" ]] && cp "$f" "$WINDOWS_DIR/../db/migration/" 2>/dev/null || true
done
ok "Migraciones de esquema listas"

# ── 5. Verificar PostgreSQL portátil ─────────────────────────────────────────

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

# ── 6. Resumen ────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Archivos listos en windows/                 ${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════${NC}"
echo ""
echo -e "  Archivos generados:"
ls -lh "$WINDOWS_DIR"/*.exe 2>/dev/null | awk '{print "    " $NF " (" $5 ")"}' || true
echo ""
echo -e "  Nota: hce-web.exe usa WebView2 (Edge). Requiere Windows 10/11 actualizado."
echo -e "  Si la ventana no abre, instalar el runtime desde:"
echo -e "  ${BOLD}https://developer.microsoft.com/microsoft-edge/webview2/${NC}"
echo ""
echo -e "  Siguiente paso (en Windows con Inno Setup instalado):"
echo -e "    ISCC.exe windows\\hce.iss"
echo ""
echo -e "  Descarga Inno Setup desde: https://jrsoftware.org/isinfo.php"
echo ""
