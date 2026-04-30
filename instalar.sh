#!/usr/bin/env bash
set -euo pipefail

# ── Colores ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}[•]${NC} $*"; }
ok()      { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*"; exit 1; }
titulo()  { echo -e "\n${BOLD}$*${NC}"; }

# ── Verificaciones previas ────────────────────────────────────────────────────

titulo "╔══════════════════════════════════════╗"
titulo "║   HCE Consultorio — Instalador Linux ║"
titulo "╚══════════════════════════════════════╝"
echo ""

# Debe correrse con sudo o como root
if [[ $EUID -ne 0 ]]; then
  error "Este script debe ejecutarse con sudo: sudo bash instalar.sh"
fi

# Detectar directorio del script (donde está el código fuente)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -f "docker-compose.yml" ]]; then
  error "No se encontró docker-compose.yml. Ejecuta el script desde la carpeta raíz del proyecto."
fi

# ── Instalar Docker si no está ────────────────────────────────────────────────

titulo "1. Verificando Docker..."

if command -v docker &>/dev/null && docker compose version &>/dev/null; then
  ok "Docker ya está instalado ($(docker --version))"
else
  info "Docker no encontrado. Instalando..."

  if command -v apt-get &>/dev/null; then
    # Debian / Ubuntu
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg \
      | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/$(. /etc/os-release && echo "$ID") \
      $(lsb_release -cs) stable" \
      | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  elif command -v dnf &>/dev/null; then
    # Fedora / RHEL
    dnf -y -q install dnf-plugins-core
    dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
    dnf -y -q install docker-ce docker-ce-cli containerd.io docker-compose-plugin
  elif command -v yum &>/dev/null; then
    # CentOS
    yum install -y -q yum-utils
    yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    yum install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
  else
    error "Distribución no reconocida. Instala Docker manualmente: https://docs.docker.com/engine/install/"
  fi

  systemctl enable --now docker
  ok "Docker instalado correctamente"
fi

# Agregar usuario actual al grupo docker (evita necesitar sudo después)
USUARIO_REAL="${SUDO_USER:-$USER}"
if ! groups "$USUARIO_REAL" | grep -q docker; then
  usermod -aG docker "$USUARIO_REAL"
  warn "Usuario '$USUARIO_REAL' agregado al grupo docker. Los cambios aplican en la próxima sesión."
fi

# ── Configuración ─────────────────────────────────────────────────────────────

titulo "2. Configuración del sistema..."
echo ""

# Nombre del consultorio (proyecto)
read -rp "  Nombre corto del consultorio (sin espacios, ej: mi-consultorio): " NOMBRE_PROYECTO
NOMBRE_PROYECTO="${NOMBRE_PROYECTO:-hce}"
NOMBRE_PROYECTO="${NOMBRE_PROYECTO// /-}"

# Puerto de acceso
read -rp "  Puerto de acceso en el navegador [80]: " UI_PORT
UI_PORT="${UI_PORT:-80}"

# Puerto del backend
read -rp "  Puerto del backend API [8000]: " API_PORT
API_PORT="${API_PORT:-8000}"

# Contraseña de la base de datos
while true; do
  read -rsp "  Contraseña para la base de datos (mín. 8 caracteres): " DB_PASS
  echo ""
  if [[ ${#DB_PASS} -ge 8 ]]; then break
  else warn "La contraseña debe tener al menos 8 caracteres."; fi
done

# Generar JWT_SECRET aleatorio
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')

ok "Configuración lista"

# ── Crear archivos .env ───────────────────────────────────────────────────────

titulo "3. Creando archivos de configuración..."

cat > "$SCRIPT_DIR/.env" <<EOF
COMPOSE_PROJECT_NAME=${NOMBRE_PROYECTO}

DB_USER=hce
DB_PASSWORD=${DB_PASS}
DB_NAME=hce_provider
DB_PORT=5432

DATABASE_URL=postgresql://hce:${DB_PASS}@${NOMBRE_PROYECTO}-db:5432/hce_provider?sslmode=disable
JWT_SECRET=${JWT_SECRET}
PORT=${API_PORT}
ALLOWED_ORIGIN=http://localhost:${UI_PORT}

VITE_API_URL=http://localhost:${API_PORT}
UI_PORT=${UI_PORT}
EOF

cat > "$SCRIPT_DIR/ui/.env" <<EOF
VITE_API_URL=http://localhost:${API_PORT}
EOF

ok "Archivos .env creados"

# ── Construir e iniciar ───────────────────────────────────────────────────────

titulo "4. Construyendo e iniciando los servicios..."
info "Esto puede tomar unos minutos la primera vez..."
echo ""

docker compose up -d --build

echo ""
ok "Servicios iniciados"

# ── Esperar que la BD esté lista ──────────────────────────────────────────────

titulo "5. Esperando que la base de datos esté lista..."

MAX_INTENTOS=30
INTENTO=0
until docker compose exec -T hce-db pg_isready -U hce -d hce_provider &>/dev/null; do
  INTENTO=$((INTENTO + 1))
  if [[ $INTENTO -ge $MAX_INTENTOS ]]; then
    error "La base de datos no respondió después de ${MAX_INTENTOS} segundos. Revisa los logs: docker compose logs hce-db"
  fi
  sleep 1
done

ok "Base de datos lista"

# ── Verificar que el backend responda ─────────────────────────────────────────

titulo "6. Verificando el backend..."

MAX_INTENTOS=20
INTENTO=0
until curl -sf "http://localhost:${API_PORT}/health" &>/dev/null; do
  INTENTO=$((INTENTO + 1))
  if [[ $INTENTO -ge $MAX_INTENTOS ]]; then
    warn "El backend aún no responde. Puede tardar unos segundos más."
    break
  fi
  sleep 1
done

ok "Backend respondiendo en http://localhost:${API_PORT}"

# ── Resumen final ─────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ¡Instalación completada exitosamente!   ${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════${NC}"
echo ""
echo -e "  Abre el navegador en:  ${BOLD}http://localhost:${UI_PORT}${NC}"
echo ""
echo -e "  Credenciales iniciales:"
echo -e "    Usuario:    ${BOLD}admin${NC}"
echo -e "    Contraseña: ${BOLD}admin${NC}"
echo ""
echo -e "  ${YELLOW}${BOLD}⚠ Cambia la contraseña del admin al ingresar por primera vez.${NC}"
echo -e "  Panel admin → Usuarios → Editar → nueva contraseña"
echo ""
echo -e "  Comandos útiles:"
echo -e "    Ver logs:      ${BOLD}docker compose logs -f${NC}"
echo -e "    Detener:       ${BOLD}docker compose down${NC}"
echo -e "    Reiniciar:     ${BOLD}docker compose restart${NC}"
echo ""
