# Story Forge Backend

Slim + Eloquent backend for Story Forge.

## Endpoints

Base URL is `API_BASE_PATH` (default expected: `/story_forge/api`).

- `GET /health`
- `GET /stories` (public)
- `GET /stories/{id}` (public)
- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/current-user` (JWT)
- `GET /auth/validate-session` (JWT)
- `POST /stories` (JWT)
- `PUT /stories/{id}` (JWT)
- `DELETE /stories/{id}` (JWT)
- `POST /stories/{id}/paragraphs` (JWT)
- `DELETE /stories/{id}/paragraphs/{paragraph_id}` (JWT)
- `GET /stories/{story_id}/samples` (JWT)
- `POST /stories/{story_id}/samples` (JWT)
- `GET /writing-samples` (JWT)
- `PUT /writing-samples/{id}/review` (JWT)

## Environment

Copy `.env.example` to `.env` and set:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRATION`
- `CORS_ORIGIN`
- `API_BASE_PATH`

## Local Run

```bash
composer install
mysql -u root -p < database/init.sql
php -S localhost:8001 -t public/
```
