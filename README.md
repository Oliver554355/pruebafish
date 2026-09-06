# Comunidad Chosica

Plataforma comunitaria local (mapa + red social + directorio de negocios) para
Chosica, Lima, Perú. Ver `ROADMAP.md` para decisiones de arquitectura y las
próximas fases.

## Backend (paso 1 del MVP)

Stack: NestJS + Prisma + PostgreSQL/PostGIS.

Cubre: registro/login (JWT), perfil (`/users/me`), publicaciones
geolocalizadas (`POST /posts`, `GET /posts/nearby`), la jerarquía
geográfica País → Región → Provincia → Distrito → Zona (`GET /locations`) y
el directorio de negocios/lugares (`POST /businesses`, `GET
/businesses/nearby`, `GET /businesses`, `GET /businesses/:id`, `PATCH
/businesses/:id`), y comentarios/reacciones sobre posts o negocios (`POST
/comments`, `GET /comments`, `DELETE /comments/:id`, `POST /reactions`, `GET
/reactions/summary`), y reportes/moderación básica (`POST /reports`, `GET
/reports` y `PATCH /reports/:id` — estos dos últimos solo para usuarios con
`isModerator = true`). Los posts de animales (`ANIMAL_PERDIDO`,
`ANIMAL_ENCONTRADO`, `ADOPCION`) y de eventos (`EVENTO`) llevan datos
propios (`animal`/`event` al crear, `GET /posts/:id` para verlos), y `GET
/posts/feed` arma un feed rankeado (cercanía + recencia + interacción +
categorías seguidas, `PATCH /users/me/followed-categories`) en vez de solo
ordenar por distancia como `/posts/nearby`. Las fotos de posts y negocios
(`POST /photos` con `multipart/form-data`, `DELETE /photos/:id`) se suben a
un storage S3-compatible (MinIO local vía `docker-compose.yml`, o un S3 real
en producción). Cualquiera puede pedir ser el dueño verificado de un
negocio (`POST /business-claims`); un moderador lo aprueba o rechaza
(`GET`/`PATCH /business-claims/:id`) y, al aprobarse, ese negocio pasa a
tener `verified: true` y solo esa persona puede editarlo de ahí en más.
Además: **ventas** (`VENTA` con bloque `sale` al crear, `PATCH
/posts/:id/mark-sold`, y filtro `?category=` en `/posts/nearby` y
`/posts/feed`), **seguidores** (`POST /users/:id/follow` como toggle, `GET
/users/:id/followers`, `GET /users/:id/following`), **guardados** (`POST
/saved` toggle sobre un post o negocio, `GET /saved`) y **reputación**
(`GET /users/:id` trae perfil público + contadores + `reputation`, calculada
al vuelo, no un contador que se pueda desincronizar).

### Levantar en local

```bash
# 1. Base de datos + MinIO (storage de fotos)
docker compose up -d

# 1.b Crear el bucket de MinIO (una sola vez; no se crea solo).
# Opcion facil: abrir http://localhost:9001 (user/pass: chosica/chosica123),
# crear el bucket "chosica-photos" y ponerlo como publico de lectura
# (Access Policy: Public) desde la consola web.
# Opcion CLI (si tenes "mc" instalado):
#   mc alias set local http://localhost:9000 chosica chosica123
#   mc mb local/chosica-photos
#   mc anonymous set download local/chosica-photos

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

# Crear post (usar el accessToken de la respuesta anterior).
# ACCIDENTE vence solo en 6hs (ver DEFAULT_TTL_HOURS); no hace falta mandar expiresAt.
curl -X POST localhost:3000/posts -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"category":"ACCIDENTE","title":"Choque en Carretera Central","lat":-11.93,"lng":-76.70}'

# EVENTO requiere el bloque "event" con la fecha; se usa como expiresAt
# si no se manda uno explicito (el evento deja de listarse cuando ya paso)
curl -X POST localhost:3000/posts -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"category":"EVENTO","title":"Feria en la plaza","lat":-11.93,"lng":-76.70,
       "event":{"startsAt":"2026-09-20T18:00:00Z","organizerName":"Municipalidad"}}'

# Animales requieren el bloque "animal" (especie, nombre, color, etc.)
curl -X POST localhost:3000/posts -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"category":"ANIMAL_PERDIDO","title":"Se perdio Firulais","lat":-11.93,"lng":-76.70,
       "animal":{"species":"PERRO","petName":"Firulais","color":"marron","contactPhone":"999999999"}}'

# Ficha completa de un post (incluye animalDetails/eventDetails si aplica)
curl "localhost:3000/posts/<POST_ID>"

# Ver publicaciones cercanas (ya excluye vencidas y ocultas) — orden simple por distancia
curl "localhost:3000/posts/nearby?lat=-11.93&lng=-76.70&radius=3000"

# Feed rankeado (cercania + recencia + interaccion + categorias seguidas)
curl "localhost:3000/posts/feed?lat=-11.93&lng=-76.70&radius=3000"

# Elegir que categorias seguir (afecta el ranking del feed cuando estas logueado)
curl -X PATCH localhost:3000/users/me/followed-categories -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"categories":["ACCIDENTE","EVENTO"]}'

# Recorrer la jerarquia geografica (sin parentId devuelve el nivel raiz)
curl "localhost:3000/locations"
curl "localhost:3000/locations?parentId=<ID_DE_PERU>"

# Dar de alta un negocio (usa el accessToken de /auth/register o /auth/login)
curl -X POST localhost:3000/businesses -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"category":"RESTAURANTE","name":"El Sabor","lat":-11.93,"lng":-76.70}'

# Negocios cerca de un punto (opcionalmente filtrado por categoria)
curl "localhost:3000/businesses/nearby?lat=-11.93&lng=-76.70&radius=3000&category=RESTAURANTE"

# Comentar un post
curl -X POST localhost:3000/comments -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"postId":"<POST_ID>","content":"Cuidado, sigue habiendo trafico"}'

# Reseñar un negocio (comentario + rating 1-5)
curl -X POST localhost:3000/comments -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"businessId":"<BUSINESS_ID>","content":"Buena sazon","rating":5}'

# Reaccionar (like) a un post — repetir la misma llamada la saca (toggle)
curl -X POST localhost:3000/reactions -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"postId":"<POST_ID>"}'

curl "localhost:3000/reactions/summary?postId=<POST_ID>"

# Reportar un post
curl -X POST localhost:3000/reports -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"postId":"<POST_ID>","reason":"INFORMACION_FALSA","description":"El accidente ya se resolvio"}'

# Todavia no hay panel admin: para poder revisar/ocultar reportes hay que
# promover un usuario a moderador a mano en la base de datos:
#   UPDATE "User" SET "isModerator" = true WHERE email = 'moderador@ejemplo.com';
# Con ese usuario logueado (su <MOD_TOKEN>):
curl "localhost:3000/reports?status=PENDIENTE" -H "Authorization: Bearer <MOD_TOKEN>"

curl -X PATCH localhost:3000/reports/<REPORT_ID> -H "Content-Type: application/json" \
  -H "Authorization: Bearer <MOD_TOKEN>" \
  -d '{"status":"REVISADO","hideContent":true}'

# Subir una foto a un post (solo el autor del post/negocio puede agregarle fotos)
curl -X POST localhost:3000/photos \
  -H "Authorization: Bearer <TOKEN>" \
  -F "postId=<POST_ID>" \
  -F "file=@/ruta/a/foto.jpg"

# Reclamar un negocio (pasa a PENDIENTE hasta que un moderador lo revise)
curl -X POST localhost:3000/business-claims -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"businessId":"<BUSINESS_ID>","message":"Soy el dueño, mi telefono ya esta en la ficha"}'

# El moderador revisa y aprueba (mismo <MOD_TOKEN> de arriba)
curl "localhost:3000/business-claims?status=PENDIENTE" -H "Authorization: Bearer <MOD_TOKEN>"

curl -X PATCH localhost:3000/business-claims/<CLAIM_ID> -H "Content-Type: application/json" \
  -H "Authorization: Bearer <MOD_TOKEN>" \
  -d '{"status":"APROBADO"}'

# Publicar una venta
curl -X POST localhost:3000/posts -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"category":"VENTA","title":"Vendo bicicleta","lat":-11.93,"lng":-76.70,
       "sale":{"price":250,"condition":"USADO"}}'

# Marcarla como vendida (solo el autor)
curl -X PATCH localhost:3000/posts/<POST_ID>/mark-sold -H "Authorization: Bearer <TOKEN>"

# Navegar solo el "marketplace" en el mapa
curl "localhost:3000/posts/nearby?lat=-11.93&lng=-76.70&radius=3000&category=VENTA"

# Seguir a otro usuario — repetir la misma llamada deja de seguirlo (toggle)
curl -X POST localhost:3000/users/<OTHER_USER_ID>/follow -H "Authorization: Bearer <TOKEN>"

# Guardar un post (toggle igual que reactions)
curl -X POST localhost:3000/saved -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"postId":"<POST_ID>"}'

curl "localhost:3000/saved" -H "Authorization: Bearer <TOKEN>"

# Perfil publico con contadores y reputacion
curl "localhost:3000/users/<USER_ID>"
```
