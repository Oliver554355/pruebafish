# Comunidad Chosica

Plataforma comunitaria local (mapa + red social + directorio de negocios) para
Chosica, Lima, Perú. Ver `ROADMAP.md` para decisiones de arquitectura y las
próximas fases.

## Backend (paso 1 del MVP)

Stack: NestJS + Prisma + PostgreSQL/PostGIS.

Cubre: registro/login (JWT), perfil (`/users/me`), publicaciones
geolocalizadas (`POST /posts`, `GET /posts/nearby`) y la jerarquía
geográfica País → Región → Provincia → Distrito → Zona (`GET /locations`).

### Levantar en local

```bash
# 1. Base de datos
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run prisma:migrate         # crea las tablas
psql "$DATABASE_URL" -f prisma/postgis-extensions.sql   # habilita PostGIS + indice geoespacial
npm run prisma:seed            # carga Perú > Lima > Lima > Lurigancho-Chosica > Chosica
npm run start:dev
```

### Probar rápido

```bash
# Registro
curl -X POST localhost:3000/auth/register -H "Content-Type: application/json" \
  -d '{"email":"a@a.com","username":"ana","password":"12345678"}'

# Crear post (usar el accessToken de la respuesta anterior)
curl -X POST localhost:3000/posts -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"category":"ACCIDENTE","title":"Choque en Carretera Central","lat":-11.93,"lng":-76.70}'

# Ver publicaciones cercanas
curl "localhost:3000/posts/nearby?lat=-11.93&lng=-76.70&radius=3000"

# Recorrer la jerarquia geografica (sin parentId devuelve el nivel raiz)
curl "localhost:3000/locations"
curl "localhost:3000/locations?parentId=<ID_DE_PERU>"
```
