-- Ejecutar una sola vez despues de "prisma migrate dev":
--   psql "$DATABASE_URL" -f prisma/postgis-extensions.sql
--
-- Agrega una columna geografica generada a partir de lat/lng y su indice
-- espacial, para que las busquedas "que hay cerca de mi" usen GIST en vez
-- de comparar todas las filas.

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED;

CREATE INDEX IF NOT EXISTS post_geog_idx ON "Post" USING GIST (geog);

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED;

CREATE INDEX IF NOT EXISTS business_geog_idx ON "Business" USING GIST (geog);

-- "User" es distinto: lastLat/lastLng son nullable (no todos los usuarios
-- mandaron su ubicacion todavia), asi que la columna generada da NULL en
-- vez de romper cuando faltan. Se usa para notificaciones push de "algo
-- paso cerca tuyo" (ver notifications.service.ts).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE WHEN "lastLat" IS NOT NULL AND "lastLng" IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint("lastLng", "lastLat"), 4326)::geography
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS user_geog_idx ON "User" USING GIST (geog);
