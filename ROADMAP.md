# Roadmap y decisiones de arquitectura

Este archivo existe para que cualquier sesión futura (con Claude o sin él)
pueda retomar el proyecto sin releer el brief completo. El brief original
completo (visión, las 30 secciones de requisitos) vive en el historial de
conversación de la sesión que arrancó este repo; lo que importa para seguir
programando está resumido acá.

## Decisiones ya tomadas

- **Arquitectura**: monolito modular (no microservicios) para poder iterar
  rápido ahora y separar en servicios el día que el tráfico lo justifique.
- **Backend**: NestJS + Prisma + PostgreSQL con extensión PostGIS.
- **Geolocalización**: cada `Post` tiene `lat`/`lng` (fuente de verdad para
  Prisma) más una columna generada `geog geography(Point,4326)` con índice
  GIST (ver `backend/prisma/postgis-extensions.sql`), para que "qué hay
  cerca de mí" escale con índice espacial en vez de escanear toda la tabla.
- **IDs**: UUID en vez de enteros autoincrementales (más simple de
  fusionar/escalar horizontalmente después).
- **Auth**: JWT sin estado (permite correr varias instancias del backend
  detrás de un load balancer sin sesiones compartidas).
- **Imágenes**: no van a la base de datos; se subirán a un bucket externo
  (S3/Cloudinary) cuando se implemente esa parte.
- **Mapas**: pendiente elegir Mapbox vs Google Maps vs OSM — evaluar cuando
  se construya el frontend/mapa.
- **Jerarquía geográfica**: una sola tabla auto-referenciada `Location`
  (`type` + `parentId`: PAIS → REGION → PROVINCIA → DISTRITO → ZONA) en vez
  de una tabla por nivel. Agregar Ate, Santa Anita o una ciudad nueva es
  insertar filas, no migrar el esquema. `Post.locationId` es opcional: la
  búsqueda por cercanía ya funciona solo con lat/lng, la zona es metadata
  adicional (para filtros/breadcrumbs futuros).
- **Comentarios/reacciones genéricos**: `Comment` y `Reaction` cuelgan de
  `Post` o `Business` mediante dos FKs opcionales (`postId`/`businessId`),
  validando en el servicio que se use exactamente una — no una tabla por
  tipo de contenido, y no un `targetType`/`targetId` sin FK real (perdería
  integridad referencial y el cascade on delete). Las reseñas de negocio
  ("Calificación 4.6/5") son simplemente un `Comment` con `rating` (1-5); el
  promedio se calcula al vuelo en `businesses.findOne`, sin tabla `reviews`.
- **Moderación**: `Report` sigue el mismo patrón (FKs opcionales a
  `post`/`business`/`comment`, exactamente una). No hay panel admin
  todavía: el rol se guarda como `User.isModerator` (default `false`) y se
  activa con un `UPDATE` manual en la base de datos — un
  `ModeratorGuard` (`backend/src/auth/moderator.guard.ts`) verifica ese
  campo contra la base en cada request (no queda en el JWT) para que
  revocar el rol tenga efecto inmediato. `Post`, `Business` y `Comment`
  tienen `hidden` (default `false`); los endpoints públicos
  (`nearby`, `findMany`) ya lo filtran. Cuando exista panel admin
  (roadmap #9), este guard es la base para proteger sus rutas.
- **Temporal vs. permanente**: en vez de una tabla/flag "es temporal",
  `Post.expiresAt` (nullable) es la unica pieza necesaria: null = permanente
  (recomendaciones, avisos sin vencimiento), con fecha = deja de listarse en
  `nearby` pasada esa fecha. `DEFAULT_TTL_HOURS` en `posts.service.ts` le
  pone un vencimiento automatico a categorias que naturalmente decaen
  (ACCIDENTE/INCIDENTE: 6h, AVISO: 24h) si el usuario no manda uno; EVENTO
  no tiene default porque su fecha la define quien publica. `Business`
  (negocios, parques) no tiene este campo — es permanente por estar en su
  propia tabla, no necesita distinguirse via un flag.
- **Animales y eventos como extensión 1:1 de `Post`** (no tablas propias
  `lost_pets`/`found_pets`/`adoptions`, ni sub-tipo con JSON): `AnimalDetails`
  y `EventDetails` cuelgan de `Post` por `postId`, cada una solo con los
  campos que le son propios. `Post` sigue siendo el dueño de ubicación,
  comentarios, reacciones, reportes y vencimiento — no hay que duplicar
  nada de eso para cada tipo de contenido. Validación de "cuál va con cuál"
  (animal solo con categorías de animales, event solo con `EVENTO`) vive en
  `posts.service.create`, igual que el patrón ya usado en `Comment`/`Report`.
- **Feed rankeado separado de `nearby`**: `GET /posts/nearby` sigue siendo
  el simple (para pines de mapa); `GET /posts/feed` es nuevo y aplica un
  score compuesto (proximidad 40% + recencia 30% + interacción 20% +
  categorías seguidas 10%, ver comentario en `posts.service.feed`). Los
  pesos son un punto de partida arbitrario, no el resultado de ningún
  tuning — ajustarlos no requiere cambiar el esquema. La personalización
  (`User.followedCategories`, un array nativo de Postgres, sin tabla de
  unión) es opcional: el endpoint es público y solo se activa si hay JWT
  válido, vía `OptionalJwtAuthGuard` (no tira 401 si no hay token).

## Estado actual (hecho)

Backend, módulo por módulo:
- `auth`: registro y login con JWT (bcrypt para passwords).
- `users`: `GET /users/me` protegido.
- `posts`: `POST /posts` (protegido, cualquier categoría del enum
  `PostCategory`, con `locationId` opcional) y `GET /posts/nearby` (público,
  búsqueda por radio en metros usando PostGIS).
- `locations`: `GET /locations` (nivel raíz, o hijos con `?parentId=`) y
  `GET /locations/:id` (con padre e hijos). Seed (`npm run prisma:seed`)
  carga Perú → Lima (región) → Lima (provincia) → Lurigancho-Chosica →
  Chosica.
- `businesses`: directorio de negocios/lugares (`RESTAURANTE`, `TIENDA`,
  `HOSTAL`, `PARQUE`, `TURISMO`, `FARMACIA`, `SALUD`, `EDUCACION`,
  `BANCO_CAJERO`, `PARADA`, `OTRO`). `POST /businesses` (protegido, cualquier
  usuario logueado da de alta un lugar — sin restricción de admin todavía),
  `GET /businesses/nearby` (público, misma búsqueda por radio con PostGIS
  que `posts`, con filtro opcional de categoría), `GET /businesses` (listado
  plano por categoría/zona), `GET /businesses/:id`, `PATCH /businesses/:id`
  (solo quien lo creó puede editarlo — no hay "negocio verificado" todavía).
- `comments`: `POST /comments` (protegido, `postId` o `businessId` +
  `content`, y `rating` 1-5 opcional solo si es de un negocio), `GET
  /comments?postId=` o `?businessId=` (público), `DELETE /comments/:id`
  (solo el autor). `GET /businesses/:id` ahora devuelve `rating: {average,
  count}` calculado de esos comentarios.
- `reactions`: `POST /reactions` (protegido, toggle: reaccionar de nuevo
  quita la reacción) y `GET /reactions/summary?postId=` o `?businessId=`
  (público, conteo por tipo). Por ahora solo existe `LIKE`; el enum
  `ReactionType` se puede ampliar sin tocar la estructura de la tabla.
- `reports`: `POST /reports` (protegido, cualquier usuario, contra `post`,
  `business` o `comment` + `reason` + `description` opcional), `GET
  /reports?status=` y `PATCH /reports/:id` (ambos solo para moderadores).
  El PATCH cambia el `status` (`PENDIENTE`/`REVISADO`/`DESESTIMADO`) y,
  si se manda `hideContent: true`, oculta el contenido reportado
  (`hidden = true`), que desaparece de los listados/búsquedas públicas.
  Promover un moderador todavía es manual (ver README) — no hay panel
  admin.
- `posts` ahora también soporta `expiresAt` (opcional al crear; automático
  para ACCIDENTE/INCIDENTE/AVISO si no se manda uno). Los posts de
  categorías de animales (`ANIMAL_PERDIDO`, `ANIMAL_ENCONTRADO`,
  `ADOPCION`) requieren un bloque `animal` (especie, nombre, color,
  características, sexo, edad aproximada, condiciones de adopción,
  contacto) y los `EVENTO` requieren `event` (fecha/hora `startsAt`,
  organizador) — ambos validados en el servicio, prohibidos en cualquier
  otra categoría. `GET /posts/:id` devuelve la ficha completa (con
  `animalDetails`/`eventDetails`, autor y ubicación). `GET /posts/nearby`
  sigue ordenando solo por distancia (pines de mapa) y excluye vencidos y
  ocultos; `GET /posts/feed` es el feed rankeado (ver arriba), y
  `PATCH /users/me/followed-categories` deja que el usuario elija qué
  categorías seguir para ese ranking.

Todavía NO implementado (a propósito, para no sobre-construir en el primer
paso): fotos en ningún modelo (`Post`, `Business`, `AnimalDetails`, etc. —
falta decidir e integrar S3/Cloudinary), panel admin (ni siquiera para
promover moderadores), vincular el organizador de un evento a un `Business`
existente (hoy `organizerName` es texto libre), ventas, notificaciones,
frontend/mapa.

## Próximos pasos sugeridos (uno por sesión, para cuidar tokens)

1. ~~Tabla `locations` con la jerarquía país→región→provincia→distrito→zona~~ — hecho.
2. ~~Entidad `Business`/`Place` (directorio de negocios)~~ — hecho.
3. ~~`comments` y `reactions` sobre `Post` y `Business`~~ — hecho (incluye
   calificación de negocios vía `Comment.rating`).
4. ~~`reports` + moderación básica (ocultar contenido reportado)~~ — hecho.
5. ~~Diferenciar posts temporales de permanentes~~ — hecho vía
   `Post.expiresAt` + TTL por categoría.
6. ~~Animales (`AnimalDetails`) y eventos (`EventDetails`) con campos
   propios~~ — hecho, como extensión 1:1 de `Post`.
7. ~~Ranking de feed (`GET /posts/feed`)~~ — hecho: proximidad + recencia +
   interacción + categorías seguidas. Pendiente afinar pesos con datos
   reales cuando haya usuarios.
8. Frontend: elegir Flutter vs React Native, y armar la pantalla de mapa
   consumiendo `GET /posts/nearby` y el feed consumiendo `GET /posts/feed`.
9. Notificaciones (FCM) cuando haya push cerca del usuario.
10. Negocios verificados + panel de administración de negocio.
11. Ventas, promociones, monetización — dejar para cuando haya comunidad activa.
12. Imágenes (S3/Cloudinary) — hace falta para negocios, posts y animales,
    quedó pendiente en todos los módulos hasta ahora.

Cada uno de estos puntos puede pedirse como una sesión aparte ("agreguemos
el módulo de negocios", "ahora comentarios y reacciones") sin tener que
repetir todo el contexto: basta con señalar este archivo.
