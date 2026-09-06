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
- **Imágenes**: nunca en Postgres. `Photo` (genérico, mismo patrón
  `postId`/`businessId` opcionales que `Comment`/`Reaction`/`Report`) guarda
  solo la URL; el archivo va a un storage **S3-compatible** vía
  `StorageService` (`backend/src/photos/storage.service.ts`), usando
  `@aws-sdk/client-s3` — funciona igual contra AWS S3 real o contra un
  self-host como **MinIO** (agregado a `docker-compose.yml`), cambiando
  solo variables de entorno (`S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`). Se
  asume bucket público de lectura y se arma la URL directo con
  `S3_PUBLIC_BASE_URL` — no hay URLs firmadas ni control de acceso por
  archivo todavía, eso puede hacer falta si el contenido debe ser privado
  más adelante. Subida vía `multipart/form-data` con `FileInterceptor` +
  `memoryStorage()` (el archivo pasa por memoria, no se escribe a disco,
  antes de subirse al bucket). Límite 5MB, solo JPEG/PNG/WEBP. Permisos:
  igual que en `Business.update`, solo quien es dueño del post/negocio
  puede agregarle fotos — no hay todavía un caso de "colaboradores".
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
- **Negocios verificados**: `Business.ownerId` (nullable) es el dueño real,
  separado de `createdById` (quien lo dio de alta, que puede ser cualquiera
  y no necesariamente el dueño). `BusinessClaim` es la solicitud para pasar
  de uno a otro — no se asigna `ownerId` directo por API, hay que pasar por
  una revisión. Al aprobar una solicitud (`business-claims.service.update`),
  una transacción hace tres cosas atómicamente: setea `ownerId` +
  `verified = true` en el negocio, marca esa solicitud `APROBADO`, y
  rechaza cualquier otra solicitud `PENDIENTE` para el mismo negocio (solo
  puede haber un dueño). Una vez que `ownerId` existe, `businesses.update`
  deja de aceptar al `createdById` original — el dueño verificado manda.
  Aprobar/rechazar es exclusivo de moderadores (mismo `ModeratorGuard` que
  `reports`); no hay verificación real de identidad (RUC, documento) — el
  moderador decide a criterio con el `message` que manda quien reclama.
- **Ventas como extensión 1:1 de `Post`**: `SaleDetails` sigue el mismo
  patrón que `AnimalDetails`/`EventDetails` (fotos, título, descripción,
  ubicación y vendedor ya los da `Post`). `price` es `Decimal(10,2)`, no
  `Float` — es dinero, y los errores de redondeo de punto flotante no son
  aceptables ahí. `sold` es un booleano simple (no un estado "reservado"
  intermedio); marcarlo es `PATCH /posts/:id/mark-sold`, solo el autor.
  Como ahora hay una categoría pensada para "navegar" (marketplace) en vez
  de solo "descubrir cerca", se agregó `?category=` opcional a
  `GET /posts/nearby` y `GET /posts/feed` — antes no existía ese filtro en
  posts (sí en `businesses/nearby`) porque no hacía falta.
- **Guardados genéricos**: `SavedItem` sigue el mismo patrón de FKs
  opcionales que `Comment`/`Reaction`/`Photo` (exactamente uno de
  `postId`/`businessId`). Toggle igual que `Reaction` — guardar de nuevo lo
  saca. Es la unificación de `saved_places`/`saved_posts` (sección 22 del
  brief) en una sola tabla, mismo criterio que ya se aplicó ahí.
- **Seguidores**: `Follow` es una tabla de unión simple (`followerId` →
  `followingId`) con `@@unique` para que "ya lo sigo" sea un solo `exists`.
  Vive en el módulo `users` (no un módulo aparte) porque las rutas son
  `/users/:id/follow`, `/users/:id/followers`, `/users/:id/following` —
  es una relación sobre el propio recurso `User`, no una entidad
  independiente como `Report` o `BusinessClaim`.
- **Reputación calculada, no almacenada**: no hay columna `User.reputation`
  que haya que mantener sincronizada con cada post, reporte o baneo — eso
  se desincroniza tarde o temprano. `usersService.getReputation` la calcula
  al vuelo combinando antigüedad de cuenta, posts/recomendaciones propias,
  interacción recibida (reacciones+comentarios en los posts del usuario), y
  penaliza reportes `REVISADO` contra su contenido y contenido propio que
  terminó `hidden`. Pesos arbitrarios (documentados en
  `users.service.ts`), igual de "punto de partida sin tuning" que los del
  feed — no es un algoritmo validado, es una base razonable. Expuesta en
  `GET /users/:id` (perfil público nuevo: antes solo existía `GET
  /users/me` privado).

## Estado actual (hecho)

Backend, módulo por módulo:
- `auth`: registro y login con JWT (bcrypt para passwords).
- `users`: `GET /users/me` protegido; `PATCH /users/me/followed-categories`;
  `GET /users/:id` (perfil público: contadores + `reputation`, calculada al
  vuelo — ver arriba); `POST /users/:id/follow` (protegido, toggle), `GET
  /users/:id/followers`, `GET /users/:id/following` (públicos).
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
  (edita quien lo creó, o el dueño verificado si ya tiene uno — ver
  `business-claims` abajo).
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
  otra categoría. Igual `VENTA` requiere `sale` (`price`, `currency`,
  `condition` opcional) — ver `SaleDetails` arriba; `PATCH
  /posts/:id/mark-sold` la marca vendida (solo el autor). `GET /posts/:id`
  devuelve la ficha completa (con `animalDetails`/`eventDetails`/
  `saleDetails`, autor, ubicación y fotos). `GET /posts/nearby` sigue
  ordenando solo por distancia (pines de mapa) y excluye vencidos y
  ocultos; `GET /posts/feed` es el feed rankeado (ver arriba). Ambos
  aceptan `?category=` opcional (útil para navegar solo `VENTA` como
  marketplace), y `PATCH /users/me/followed-categories` deja que el
  usuario elija qué categorías seguir para el ranking del feed.
- `photos`: `POST /photos` (protegido, `multipart/form-data` con campo
  `file` + `postId` o `businessId`) sube la imagen al storage S3-compatible
  y crea el registro; `DELETE /photos/:id` borra ambos (solo quien la
  subió). `GET /posts/:id` y `GET /businesses/:id` ahora incluyen `photos`
  en la ficha. `docker-compose.yml` trae MinIO listo para desarrollo local
  (hay que crear el bucket a mano una vez, ver README).
- `business-claims`: `POST /business-claims` (protegido, cualquier usuario,
  `businessId` + `message` opcional) — falla si el negocio ya tiene dueño o
  si ya tenés una solicitud pendiente para ese mismo negocio. `GET
  /business-claims?status=&businessId=` y `PATCH /business-claims/:id`
  (ambos solo moderadores); al aprobar, el negocio queda `verified: true`
  con `ownerId` asignado y pierde vigencia el permiso de edición del
  `createdById` original.
- `saved`: `POST /saved` (protegido, toggle sobre `postId` o `businessId`)
  y `GET /saved` (protegido, lista lo guardado por el usuario actual con el
  post/negocio incluido).

Todavía NO implementado (a propósito, para no sobre-construir en el primer
paso): panel admin (ni siquiera para promover moderadores ni para revisar
`business-claims` desde una UI — todo vía API por ahora), verificación real
de identidad en los reclamos de negocio (hoy es a criterio del moderador),
URLs firmadas o control de acceso por foto (hoy todo bucket público),
vincular el organizador de un evento a un `Business` existente (hoy
`organizerName` es texto libre), promociones destacadas para negocios
verificados, paginación en cualquier listado (`comments`, `businesses`,
`reports`, `business-claims`, `saved` — todos devuelven todo sin límite),
notificaciones, frontend/mapa.

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
8. ~~Fotos (`Photo` + storage S3-compatible)~~ — hecho, sobre posts y
   negocios. MinIO en `docker-compose.yml` para desarrollo/self-host.
9. ~~Negocios verificados (`BusinessClaim`)~~ — hecho: reclamo, aprobación
   por moderador, `ownerId`/`verified` en `Business`. Falta el panel de
   administración de negocio (que el dueño edite promociones, vea
   estadísticas, etc. — sección 6 del brief) una vez haya frontend.
10. ~~Ventas (`SaleDetails`)~~ — hecho, extensión 1:1 de `Post` + filtro por
    categoría en `nearby`/`feed`. Falta: promociones y monetización, que
    siguen siendo de baja prioridad hasta que haya comunidad activa.
11. ~~Seguidores (`Follow`)~~ — hecho: toggle + listados.
12. ~~Guardados (`SavedItem`)~~ — hecho: toggle + listado propio.
13. ~~Reputación~~ — hecho, calculada al vuelo en `GET /users/:id` (perfil
    público nuevo). Pendiente ajustar los pesos con datos reales cuando
    haya usuarios, igual que el ranking del feed.
14. Frontend: elegir Flutter vs React Native, y armar la pantalla de mapa
    consumiendo `GET /posts/nearby` y el feed consumiendo `GET /posts/feed`.
15. Notificaciones (FCM) cuando haya push cerca del usuario.
16. Paginación en los listados que hoy devuelven todo sin límite (ver
    arriba) — antes de que haya suficiente contenido como para que duela.
17. Panel de administración de negocio (dueño verificado edita promociones,
    ve estadísticas) y monetización en general — una vez haya frontend y
    comunidad activa.

Cada uno de estos puntos puede pedirse como una sesión aparte ("agreguemos
el módulo de negocios", "ahora comentarios y reacciones") sin tener que
repetir todo el contexto: basta con señalar este archivo.
