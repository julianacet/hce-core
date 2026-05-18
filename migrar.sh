#!/usr/bin/env bash
set -euo pipefail

# ── Colores ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()   { echo -e "${BLUE}[•]${NC} $*"; }
ok()     { echo -e "${GREEN}[✓]${NC} $*"; }
warn()   { echo -e "${YELLOW}[!]${NC} $*"; }
error()  { echo -e "${RED}[✗]${NC} $*"; exit 1; }
titulo() { echo -e "\n${BOLD}$*${NC}"; }
saltar() { echo -e "${YELLOW}[—]${NC} $* — omitido (archivo no encontrado)"; }

# ── Rutas ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SIMEDIC_DIR="$SCRIPT_DIR/db/migration/simedic"
MIGRATION_DIR="$SCRIPT_DIR/db/migration"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# ── Encabezado ────────────────────────────────────────────────────────────────
titulo "╔══════════════════════════════════════╗"
titulo "║  HCE Consultorio — Migración Simedic ║"
titulo "╚══════════════════════════════════════╝"
echo ""

# ── Verificaciones previas ────────────────────────────────────────────────────

if [[ $EUID -ne 0 ]]; then
  error "Ejecutar con sudo: sudo bash migrar.sh"
fi

if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
  error "No se encontró .env. Asegúrate de haber ejecutado instalar.sh primero."
fi

# Leer configuración
# shellcheck disable=SC1090
set -a; source "$SCRIPT_DIR/.env"; set +a

DB_CONTAINER="${COMPOSE_PROJECT_NAME:-hce}-db"

info "Contenedor BD: $DB_CONTAINER"
info "Archivos xlsx esperados en: $SIMEDIC_DIR"
echo ""

# Verificar que el contenedor esté corriendo
if ! docker inspect "$DB_CONTAINER" &>/dev/null; then
  error "El contenedor '$DB_CONTAINER' no existe. Ejecuta: docker compose up -d"
fi
if [[ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER")" != "true" ]]; then
  error "El contenedor '$DB_CONTAINER' no está corriendo. Ejecuta: docker compose start"
fi
ok "Contenedor de BD activo"

# Verificar Python3
if ! command -v python3 &>/dev/null; then
  error "Python3 no encontrado. Instala con: dnf install python3  o  apt install python3"
fi
ok "Python3 $(python3 --version 2>&1 | awk '{print $2}')"

# Instalar openpyxl si falta
if ! python3 -c "import openpyxl" 2>/dev/null; then
  info "Instalando openpyxl..."
  pip3 install -q openpyxl || python3 -m pip install -q openpyxl
fi
ok "openpyxl disponible"

# ── 1. Pacientes ──────────────────────────────────────────────────────────────
titulo "1. Pacientes"

XLSX_PAC="$SIMEDIC_DIR/pacientes.xlsx"
if [[ ! -f "$XLSX_PAC" ]]; then
  saltar "pacientes.xlsx"
else
  info "Transformando pacientes.xlsx..."
  python3 "$MIGRATION_DIR/migrar_pacientes.py" "$XLSX_PAC" \
    --csv "$TMP_DIR/pacientes.csv"

  info "Cargando en BD..."
  docker cp "$TMP_DIR/pacientes.csv" "$DB_CONTAINER:/tmp/pacientes.csv"
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
    COPY paciente (
      tipo_documento, numero_documento,
      nombre_primero, nombre_segundo,
      apellido_primero, apellido_segundo,
      fecha_nacimiento, genero,
      codigo_municipio_residencia, zona_residencia,
      tipo_usuario, codigo_etnia, codigo_discapacidad, codigo_pais_origen,
      direccion, telefono, correo_electronico, codigo_eps,
      politica_datos_aceptada, creado_por
    ) FROM '/tmp/pacientes.csv' CSV HEADER NULL '';
  "
  ok "Pacientes migrados"
fi

# ── 2. Consultas (encuentros + diagnósticos) ──────────────────────────────────
titulo "2. Consultas"

XLSX_HIS="$SIMEDIC_DIR/historiacli.xlsx"
if [[ ! -f "$XLSX_HIS" ]]; then
  saltar "historiacli.xlsx"
else
  info "Transformando historiacli.xlsx..."
  python3 "$MIGRATION_DIR/migrar_consultas.py" "$XLSX_HIS" \
    --csv "$TMP_DIR/consultas_migradas"

  info "Cargando encuentros..."
  docker cp "$TMP_DIR/consultas_migradas_encuentros.csv" "$DB_CONTAINER:/tmp/encuentros.csv"
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
    COPY encuentro_clinico (
      id, encuentro_id, estado, paciente_documento,
      fecha_atencion, finalidad_consulta, causa_externa, via_ingreso,
      motivo_consulta, descripcion_ingreso,
      signos_vitales, examen_fisico,
      codigo_diagnostico_principal, descripcion_diagnostico,
      tipo_diagnostico_principal, plan_manejo,
      creado_por, id_sistema_anterior
    ) FROM '/tmp/encuentros.csv' CSV HEADER NULL '';
  "

  info "Cargando diagnósticos..."
  docker cp "$TMP_DIR/consultas_migradas_diagnosticos.csv" "$DB_CONTAINER:/tmp/diagnosticos.csv"
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
    COPY encuentro_diagnostico (
      id, encuentro_clinico_id, tipo, codigo, descripcion, orden
    ) FROM '/tmp/diagnosticos.csv' CSV HEADER NULL '';
  "
  ok "Consultas migradas"
fi

# ── 3. Antecedentes ───────────────────────────────────────────────────────────
titulo "3. Antecedentes"

XLSX_ANT="$SIMEDIC_DIR/consantceodon.xlsx"
XLSX_GIN="$SIMEDIC_DIR/cons-gineco.xlsx"

if [[ ! -f "$XLSX_ANT" && ! -f "$XLSX_GIN" ]]; then
  saltar "consantceodon.xlsx / cons-gineco.xlsx"
else
  if [[ ! -f "$XLSX_ANT" ]]; then warn "consantceodon.xlsx no encontrado — solo se migra ginecológico"; fi
  if [[ ! -f "$XLSX_GIN" ]]; then warn "cons-gineco.xlsx no encontrado — solo se migran antecedentes generales"; fi

  info "Transformando antecedentes..."
  python3 "$MIGRATION_DIR/migrar_antecedentes.py" \
    --dir "$SIMEDIC_DIR" \
    --csv "$TMP_DIR/antecedentes.csv"

  info "Cargando en BD..."
  docker cp "$TMP_DIR/antecedentes.csv" "$DB_CONTAINER:/tmp/antecedentes.csv"
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
    COPY antecedente_respuesta (
      id, numero_documento, pregunta_id, valor, detalle
    ) FROM '/tmp/antecedentes.csv' CSV HEADER NULL '';
  "
  ok "Antecedentes migrados"
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}       Migración completada               ${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════${NC}"
echo ""
echo -e "  Actualiza el autor de los registros migrados si es necesario:"
echo -e "    ${BOLD}docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME${NC}"
echo -e "    ${BOLD}UPDATE encuentro_clinico SET creado_por='<usuario>' WHERE creado_por='migracion';${NC}"
echo ""
