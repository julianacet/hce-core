# Actualizaciones de HCE Consultorio

## Para el desarrollador

### Cómo publicar una nueva versión

1. Asegúrate de que todos los cambios están en `main` y el sistema funciona correctamente.

2. Crea y sube el tag de versión:
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

3. GitHub Actions se encarga del resto automáticamente:
   - Compila `hce-api.exe` y `hce-web.exe` para Windows
   - Construye el frontend (`npm run build`)
   - Empaqueta el instalador con Inno Setup (`HCE-Consultorio-Setup.exe`)
   - Publica el release en GitHub con el instalador como archivo descargable

Puedes ver el progreso en la pestaña **Actions** del repositorio. Si algo falla, el release no se publica.

---

### Convención de versiones

Usa [semver](https://semver.org/): `vMAYOR.MENOR.PARCHE`

| Tipo de cambio | Ejemplo |
|---|---|
| Corrección de bugs sin cambio de esquema | `v1.0.1` |
| Función nueva, migración de esquema | `v1.1.0` |
| Rediseño mayor o ruptura de compatibilidad | `v2.0.0` |

---

### Cómo agregar una migración de esquema

Cada vez que el nuevo release requiera cambios en la base de datos (nueva tabla, nueva columna, nuevo constraint, etc.), crea un archivo en `db/migration/` con el prefijo `migrate_`:

```
db/migration/migrate_nombre_descriptivo.sql
```

**Regla clave: el script debe ser idempotente** — debe poder ejecutarse varias veces sin error ni efecto secundario. Usa los patrones de PostgreSQL que lo permiten:

```sql
-- Agregar columna solo si no existe
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS campo TEXT;

-- Crear tabla solo si no existe
CREATE TABLE IF NOT EXISTS nueva_tabla (...);

-- Crear índice solo si no existe
CREATE INDEX IF NOT EXISTS idx_nombre ON tabla(columna);

-- Modificar constraint: siempre DROP IF EXISTS antes de ADD
ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_rol_check;
ALTER TABLE usuario ADD CONSTRAINT usuario_rol_check
  CHECK (rol IN ('admin', 'medico', 'recepcionista'));

-- Actualizar datos: condición WHERE garantiza idempotencia
UPDATE usuario SET rol = 'recepcionista' WHERE rol = 'auxiliar';
```

El script se ejecutará automáticamente en todas las instalaciones existentes cuando el usuario aplique la actualización. No necesitas hacer nada más.

---

### Qué NO hace la actualización automática

- **No re-ejecuta** `init.sql` ni los seeds de datos de referencia (EPS, DIVIPOLA, etc.).
- **No toca** la carpeta `data/` (datos del paciente en PostgreSQL).
- **No toca** `config.bat` (configuración de la instalación).
- **No reinstala** PostgreSQL portátil.

Solo reemplaza los binarios, el frontend y corre las migraciones pendientes.

---

### Probar el flujo de actualización localmente

Para verificar que una migración funciona antes de publicar el release:

```bash
# Conectarse a la BD local de desarrollo
psql postgresql://hce:admin123@localhost:5432/hce_provider \
  -f db/migration/migrate_nombre.sql

# Verificar que se puede correr dos veces sin error
psql postgresql://hce:admin123@localhost:5432/hce_provider \
  -f db/migration/migrate_nombre.sql
```

Si la segunda ejecución lanza un error, el script no es idempotente — corrígelo antes de publicar.

---

### Estructura de archivos relevantes

```
.github/workflows/release.yml   ← CI que compila y publica el release
windows/version.txt             ← Versión instalada actualmente (se sobreescribe en cada update)
windows/actualizar.bat          ← Corre migraciones y reinicia servicios post-instalación
windows/hce.iss                 ← Script de Inno Setup (configuración del instalador)
db/migration/migrate_*.sql      ← Migraciones de esquema (idempotentes)
api/handlers/sistema.go         ← Endpoints GET /sistema/version y POST /sistema/actualizar
```

---
---

## Para el usuario

### ¿Cómo sé si hay una actualización disponible?

Cuando hay una versión nueva disponible, verás una barra verde en la parte superior de la pantalla con el mensaje:

> **Nueva versión disponible: 1.1.0** (instalada: 1.0.0) `[Actualizar ahora]`

Esto aparece automáticamente. No necesitas buscar actualizaciones manualmente.

> La barra solo aparece si el equipo tiene conexión a internet en el momento de iniciar sesión.

---

### ¿Cómo aplico la actualización?

1. Haz clic en el botón **Actualizar ahora** en la barra verde.

2. El sistema descargará e instalará la nueva versión automáticamente. Verás el mensaje:
   > *Instalando actualización 1.1.0... El sistema se reiniciará en unos segundos.*

3. La ventana de HCE Consultorio se cerrará brevemente y volverá a abrirse con la versión nueva.

El proceso completo tarda entre 1 y 3 minutos dependiendo de la velocidad de internet.

---

### ¿Mis datos se conservan?

**Sí, completamente.** La actualización solo reemplaza el programa — nunca modifica ni elimina los datos de los pacientes, encuentros, facturas ni ningún otro registro clínico.

---

### ¿Qué hago si algo falla durante la actualización?

Si la ventana no vuelve a abrirse después de 5 minutos:

1. Haz doble clic en el acceso directo **HCE Consultorio** del escritorio.
2. Si no abre, abre la carpeta de instalación (normalmente `C:\Program Files\HCE Consultorio`) y ejecuta `iniciar.bat`.
3. Si el problema persiste, ejecuta `detener.bat` y luego `iniciar.bat`.

En ningún caso se pierden datos. La actualización puede repetirse sin riesgo.

---

### ¿Puedo ignorar una actualización?

Sí. Puedes cerrar la barra de actualización haciendo clic en la **X** de la derecha. La barra no volverá a aparecer durante esa sesión, pero sí la próxima vez que inicies el sistema.

No se recomienda posponer actualizaciones por mucho tiempo, especialmente si incluyen correcciones de seguridad o cambios normativos (RIPS, CUPS, etc.).
