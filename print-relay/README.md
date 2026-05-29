# hce-print-relay

Servidor HTTP mínimo que corre **nativamente en Windows** y hace de puente entre los containers Docker (hce-core y hce-farmacia) y la impresora térmica USB.

## Por qué existe

Los containers de Docker corren Linux incluso en Windows (via Docker Desktop + WSL2).
El código Go detecta el SO con `runtime.GOOS`, que dentro del container devuelve `"linux"`,
nunca `"windows"`. Por eso la ruta de WinSpool no se activa en Docker.

Este relay corre fuera del container, como proceso nativo de Windows, y sí puede
llamar a WinSpool para mandar los bytes ESC/POS a la impresora USB.

## Compilar

En una terminal de Windows con Go instalado:

```powershell
cd print-relay

# Con ventana de consola visible (recomendado para ver logs)
go build -ldflags="-s -w" -o hce-print-relay.exe .

# Sin ventana de consola (para producción silenciosa)
go build -ldflags="-s -w -H windowsgui" -o hce-print-relay.exe .
```

## Ejecutar

```powershell
# Puerto por defecto: 8765
.\hce-print-relay.exe

# Puerto personalizado
$env:RELAY_PORT="9000"; .\hce-print-relay.exe
```

Dejarlo corriendo en segundo plano. Para que arranque automáticamente con Windows,
se puede registrar como tarea en el Programador de tareas o como servicio con NSSM.

## Cómo usarlo con Docker

### 1. Configurar variables de entorno para Windows

Copiar `.env.windows.example` a `.env.windows` en cada proyecto y completar las
credenciales (son las mismas que en Linux, más los ajustes de Windows):

```powershell
# hce-core
copy .env.windows.example .env.windows

# hce-farmacia
copy .env.windows.example .env.windows
```

Ajustar en cada `.env.windows`:
- `PRINTER_TERMICA` → nombre exacto de la impresora en Windows
- `DB_PASSWORD`, `JWT_SECRET` → las mismas credenciales que en Linux

### 2. Levantar los containers

```powershell
# hce-core
docker compose --env-file .env.windows -f docker-compose.yml -f docker-compose.windows.yml up -d --build

# hce-farmacia
docker compose --env-file .env.windows -f docker-compose.yml -f docker-compose.windows.yml up -d --build
```

El override de Windows configura automáticamente en los containers:
- `PRINTER_MODE=http` — activa la ruta HTTP en vez de CUPS
- `PRINTER_HTTP_URL=http://host.docker.internal:8765` — apunta al relay
- `ALLOWED_ORIGIN=http://localhost:8090` — CORS correcto para la UI en 8090

El `.env.windows` configura en Docker Compose:
- `UI_PORT=8090` — evita conflicto con IIS / puerto 80
- `DOCKER_ALLOWED_ORIGIN=http://localhost:8090` — consistente con el puerto de la UI

## Verificar que funciona

```powershell
# Desde Windows
curl http://localhost:8765/health

# Desde dentro de un container
curl http://host.docker.internal:8765/health
```

## Nombre de la impresora en Windows

El nombre debe ser exactamente como aparece en
**Panel de control → Dispositivos e impresoras**.

Por ejemplo, si aparece como `"POS-5890K"`, usar ese string en `PRINTER_TERMICA`.
