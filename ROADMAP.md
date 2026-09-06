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

## Estado actual (hecho)

Backend, módulo por módulo:
- `auth`: registro y login con JWT (bcrypt para passwords).
- `users`: `GET /users/me` protegido.
- `posts`: `POST /posts` (protegido, cualquier categoría del enum
  `PostCategory`) y `GET /posts/nearby` (público, búsqueda por radio en
  metros usando PostGIS).

Todavía NO implementado (a propósito, para no sobre-construir en el primer
paso): negocios/lugares, comentarios, reacciones, reportes/moderación,
animales perdidos/encontrados/adopción como entidades propias (por ahora son
solo categorías de `Post`), eventos, ventas, notificaciones, panel admin,
frontend/mapa, jerarquía geográfica país→región→distrito→zona (por ahora
todo es implícitamente Chosica).

## Próximos pasos sugeridos (uno por sesión, para cuidar tokens)

1. Tabla `locations` con la jerarquía país→región→provincia→distrito→zona,
   y asociar `Post`/`User` a una zona en vez de asumir Chosica siempre.
2. Entidad `Business`/`Place` (directorio de negocios) con su propia ficha,
   reutilizando la misma columna `geog` + índice GIST.
3. `comments` y `reactions` sobre `Post`.
4. `reports` + moderación básica (ocultar contenido reportado).
5. Diferenciar posts temporales (accidentes, decaen en relevancia) de
   permanentes (negocios, parques) — probablemente un campo `expiresAt` o
   lógica de ranking en el feed, no una tabla nueva.
6. Animales: decidir si conviene modelarlos como sub-tipo de `Post` con
   campos JSON opcionales, o tablas propias (`lost_pets`, `found_pets`,
   `adoptions`) — evaluar cuando haya casos de uso reales.
7. Frontend: elegir Flutter vs React Native, y armar la pantalla de mapa
   consumiendo `GET /posts/nearby`.
8. Notificaciones (FCM) cuando haya push cerca del usuario.
9. Negocios verificados + panel de administración de negocio.
10. Ventas, promociones, monetización — dejar para cuando haya comunidad activa.

Cada uno de estos puntos puede pedirse como una sesión aparte ("agreguemos
el módulo de negocios", "ahora comentarios y reacciones") sin tener que
repetir todo el contexto: basta con señalar este archivo.
