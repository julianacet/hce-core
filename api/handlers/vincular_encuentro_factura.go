package handlers

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// vincularFacturaConEncuentro busca el encuentro finalizado más antiguo sin
// factura del paciente y lo enlaza a la factura recién creada (FIFO por
// fecha_atencion). Excluye primeros controles gratuitos según configuración.
// Best-effort: los errores se loguean pero no interrumpen el flujo principal.
func vincularFacturaConEncuentro(ctx context.Context, db *pgxpool.Pool, pacienteDoc, facturaRowID string) {
	_, err := db.Exec(ctx, `
		UPDATE factura
		SET encuentro_id = (
			SELECT ec.id
			FROM encuentro_clinico ec
			WHERE ec.paciente_documento = $1
			  AND ec.es_ultima_version = TRUE AND ec.esta_activo = TRUE
			  AND ec.estado = 'finalizado'
			  AND NOT EXISTS (
			      SELECT 1 FROM factura f
			      WHERE f.encuentro_id = ec.id AND f.es_ultima_version = TRUE
			  )
			  -- Excluir primer control gratuito (config primer_control_gratis = true
			  -- y no existen otros controles previos para el mismo encuentro padre)
			  AND NOT (
			      ec.finalidad_consulta = '11'
			      AND COALESCE(
			          (SELECT (medico->>'primer_control_gratis')::boolean
			           FROM configuracion_sistema WHERE id = 1),
			          TRUE
			      )
			      AND NOT EXISTS (
			          SELECT 1 FROM encuentro_clinico ec2
			          WHERE ec2.encuentro_padre_id = ec.encuentro_padre_id
			            AND ec2.finalidad_consulta = '11'
			            AND ec2.es_ultima_version = TRUE AND ec2.esta_activo = TRUE
			            AND ec2.id != ec.id
			      )
			  )
			ORDER BY ec.fecha_atencion ASC
			LIMIT 1
		)
		WHERE id = $2 AND encuentro_id IS NULL`,
		pacienteDoc, facturaRowID,
	)
	if err != nil {
		log.Printf("vincularFacturaConEncuentro paciente=%s factura=%s: %v", pacienteDoc, facturaRowID, err)
	}
}

// vincularEncuentroConFactura busca la factura más antigua sin encuentro del
// paciente y la enlaza al encuentro recién finalizado (FIFO por fecha_creacion).
// Best-effort: los errores se loguean pero no interrumpen el flujo principal.
func vincularEncuentroConFactura(ctx context.Context, db *pgxpool.Pool, pacienteDoc, encuentroRowID string) {
	_, err := db.Exec(ctx, `
		UPDATE factura
		SET encuentro_id = $2
		WHERE id = (
			SELECT f.id
			FROM factura f
			WHERE f.paciente_documento = $1
			  AND f.es_ultima_version = TRUE AND f.esta_activo = TRUE
			  AND f.encuentro_id IS NULL
			ORDER BY f.fecha_creacion ASC
			LIMIT 1
		)`,
		pacienteDoc, encuentroRowID,
	)
	if err != nil {
		log.Printf("vincularEncuentroConFactura paciente=%s encuentro=%s: %v", pacienteDoc, encuentroRowID, err)
	}
}
