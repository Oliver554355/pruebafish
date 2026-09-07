-- Renombrar en vez de drop+add para no perder las fotos ya subidas.
-- El bucket pasa a ser privado (ver StorageService), asi que "url" (que
-- guardaba la URL publica permanente) deja de tener sentido: de aca en
-- mas solo se guarda la key, y la API arma una URL firmada al vuelo.
ALTER TABLE "Photo" RENAME COLUMN "url" TO "key";

-- Las filas existentes tenian la URL publica completa
-- (ej. "http://host:9000/bucket/<key>"): nos quedamos solo con lo que
-- va despues de la ultima "/", que es la key real dentro del bucket.
UPDATE "Photo" SET "key" = regexp_replace("key", '^.*/', '');
