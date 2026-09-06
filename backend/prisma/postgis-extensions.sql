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
