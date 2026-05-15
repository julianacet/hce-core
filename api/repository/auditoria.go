package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type contextKey string

const usuarioAuditKey contextKey = "auditoria_usuario_id"

// ContextConUsuario devuelve un nuevo contexto con el ID del usuario para auditoría.
// Usar en el middleware de auth para propagar el ID a las transacciones.
func ContextConUsuario(ctx context.Context, usuarioID string) context.Context {
	return context.WithValue(ctx, usuarioAuditKey, usuarioID)
}

// UsuarioDesdeContextoAudit extrae el ID del usuario de auditoría del contexto.
func usuarioDesdeContexto(ctx context.Context) string {
	id, _ := ctx.Value(usuarioAuditKey).(string)
	return id
}

// ExecTx ejecuta fn dentro de una transacción que primero setea
// app.usuario_id para que los triggers de auditoría registren quién hizo el cambio.
// Si el contexto no tiene usuario (ej. operaciones del sistema), la variable queda vacía.
func ExecTx(ctx context.Context, pool *pgxpool.Pool, fn func(tx pgx.Tx) error) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("iniciar transacción: %w", err)
	}
	defer tx.Rollback(ctx)

	if uid := usuarioDesdeContexto(ctx); uid != "" {
		if _, err := tx.Exec(ctx, "SET LOCAL \"app.usuario_id\" = $1", uid); err != nil {
			return fmt.Errorf("set usuario_id: %w", err)
		}
	}

	if err := fn(tx); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
