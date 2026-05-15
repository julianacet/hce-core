#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BOLD='\033[1m'; NC='\033[0m'

ok()    { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

if [[ $EUID -ne 0 ]]; then
  error "Este script debe ejecutarse con sudo: sudo bash desinstalar.sh"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  HCE Consultorio — Desinstalador     ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"
echo ""
warn "Esto detendrá y eliminará los contenedores de HCE Consultorio."
echo ""

read -rp "  ¿También borrar la base de datos (todos los datos del consultorio)? [s/N]: " BORRAR_BD
read -rp "  ¿También borrar las imágenes Docker construidas? [s/N]: " BORRAR_IMAGENES
echo ""
read -rp "  ¿Confirmar desinstalación? [s/N]: " CONFIRMAR
[[ "${CONFIRMAR,,}" == "s" ]] || { echo "Cancelado."; exit 0; }

echo ""

# Bajar contenedores
if [[ -f "$SCRIPT_DIR/docker-compose.yml" ]]; then
  if [[ "${BORRAR_IMAGENES,,}" == "s" ]]; then
    docker compose -f docker-compose.yml down --rmi local 2>/dev/null || true
  else
    docker compose -f docker-compose.yml down 2>/dev/null || true
  fi
  ok "Contenedores detenidos y eliminados"
fi

# Borrar datos de la BD
if [[ "${BORRAR_BD,,}" == "s" ]]; then
  if [[ -d "$SCRIPT_DIR/db/data" ]]; then
    rm -rf "$SCRIPT_DIR/db/data"
    ok "Base de datos eliminada"
  fi
fi

# Borrar archivos de configuración
rm -f "$SCRIPT_DIR/.env"
rm -f "$SCRIPT_DIR/ui/.env"
ok "Archivos de configuración eliminados"

echo ""
echo -e "${GREEN}${BOLD}Desinstalación completada.${NC}"
echo ""
