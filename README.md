# OdontoCix

SaaS de gestión odontológica multi-tenant.

## Stack

- **Backend**: Laravel 11 API + Sanctum + PostgreSQL (Neon)
- **Panel**: React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- **Landing**: Astro + Tailwind + React islands
- **Multi-tenant**: Single-db con `tenant_id` + scopes

## Requisitos

- PHP 8.3+
- Composer
- Node.js 18+
- Redis (local via Docker o Railway)

## Setup local

```bash
# 1. Clonar
git clone <repo-url> && cd odontocix

# 2. Redis
docker compose up -d

# 3. API
cd api
cp .env.example .env   # completar DB_URL, RESEND_API_KEY, RENIEC_API_TOKEN
composer install
php artisan migrate
php artisan serve &

# 4. Panel
cd apps/panel
npm install
npm run dev &

# 5. Landing
cd apps/landing
npm install
npm run dev
```

- API: http://localhost:8000
- Panel: http://localhost:5173
- Landing: http://localhost:4321
