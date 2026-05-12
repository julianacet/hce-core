package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect crea el pool de conexiones a PostgreSQL y verifica que la BD esté disponible.
// Si timezone es no vacío, se aplica como parámetro de sesión para que todos los
// casts ::date usen esa zona horaria automáticamente.
func Connect(url, timezone string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("error al parsear URL de conexión: %w", err)
	}
	if timezone != "" {
		config.ConnConfig.RuntimeParams["TimeZone"] = timezone
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("error al crear pool de conexiones: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		return nil, fmt.Errorf("no se pudo conectar a la BD: %w", err)
	}

	return pool, nil
}
