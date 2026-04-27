# hce-core
Modular Electronic Health Record (EHR) core designed for independent medical practices in Colombia

Compliance: 🇨🇴 Colombian Ministry of Health Standards (Res. 1995/1999 & Res. 2275/2023)

## Repository map

hce-stack/
├── docker-compose.yml
├── .env                 # Variables de entorno (claves DB, rutas)
├── db/                  # Repo: hce-db
│   ├── init.sql         # Esquema inicial y Triggers
│   ├── seeds/           # Datos CIE-10 y RIPS
│   └── backups/         # Mapeado a Google Drive en Windows
├── api/                 # Repo: hce-logic (Python/FastAPI o Node)
│   ├── main.py
│   ├── reports/         # Generador de JSON para RIPS
│   └── formulas/        # Lógica de generación de PDF
└── ui/                  # Repo: hce-ui (React/Vue/Svelte)
    └── src/
