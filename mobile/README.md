# Comunidad Chosica — app móvil

React Native + Expo + TypeScript. Sin diseño visual todavía (colores,
logo, tipografía) — esto es un esqueleto funcional para validar que el
flujo completo (auth, mapa, feed, publicar, negocios, perfil) funciona
contra el backend real. Ver `../ROADMAP.md` para el estado general del
proyecto.

## Pantallas (brief sección 23)

- **Mapa**: pines de `GET /posts/nearby`, coloreados por categoría.
- **Comunidad**: feed rankeado (`GET /posts/feed`).
- **Publicar**: crea un post con categorías "simples" (`ACCIDENTE`,
  `INCIDENTE`, `RECOMENDACION`, `AVISO`, `OTRO`). Animales/eventos/ventas
  necesitan un formulario propio (campos extra) que todavía no existe acá
  — el backend ya los soporta (`POST /posts` con `animal`/`event`/`sale`),
  falta la pantalla.
- **Explorar**: negocios cercanos (`GET /businesses/nearby`).
- **Perfil**: `GET /users/me` + `GET /users/:id` (reputación, contadores) +
  cerrar sesión.

## Probar con Expo Go esta noche

Expo Go es solo para **desarrollo** (ver la app en tu celular mientras se
programa, sin compilar). Instalación real (APK/IPA) es un paso posterior
con `eas build` — no hace falta todavía para probar que funciona.

### 1. Backend accesible en la red local

Expo Go corre en tu celular, no en la computadora — `localhost` en el
`.env` de la app apuntaría al propio celular, no al backend. Necesitás la
IP de la computadora que corre el backend en la red local (ej.
`192.168.1.50`):

```bash
# Linux/Mac
hostname -I   # o: ip addr | grep inet

# El backend tambien tiene que escuchar en todas las interfaces, no solo
# localhost. Si backend/src/main.ts usa app.listen(PORT), Nest ya escucha
# en 0.0.0.0 por defecto — no hace falta cambiar nada ahi.
```

Confirmá que el firewall del servidor deja pasar el puerto 3000 (y 5432/
9000 si accedés a Postgres/MinIO desde otra maquina).

### 2. Instalar Expo Go en el celular

Desde Play Store / App Store, buscar "Expo Go". El celular y la
computadora tienen que estar en la **misma red WiFi**.

### 3. Configurar y correr la app

```bash
cd mobile
cp .env.example .env
# Editar .env: EXPO_PUBLIC_API_URL=http://<IP_DE_TU_COMPUTADORA>:3000

npm install
npx expo start
```

Esto muestra un QR en la terminal. Escanealo con la cámara del celular
(iOS) o desde la app Expo Go (Android) — se abre la app dentro de Expo Go.

Si el celular no puede resolver la IP local (redes con "AP isolation",
WiFi de oficina, etc.), correr `npx expo start --tunnel` en su lugar
(más lento, pero funciona sin estar en la misma red).

### 4. Probar el flujo completo

1. Registrate desde la pantalla de login (o usá un usuario ya creado
   por `curl` siguiendo `../backend/README.md`).
2. Dale permiso de ubicación cuando lo pida (si lo negás, cae a Chosica
   como fallback — ver `src/useCurrentLocation.ts`).
3. Mapa: debería mostrar pines de posts que ya hayas creado por `curl`.
4. Publicar: crear un post de prueba y verlo aparecer en Comunidad.
5. Explorar: si cargaste negocios por `curl`, deberían listarse.
6. Perfil: ver reputación y contadores, cerrar sesión y volver a entrar.

## Pendiente (ver `../ROADMAP.md`)

- Elegir Mapbox vs Google Maps vs Apple Maps por defecto (hoy usa el mapa
  nativo de cada plataforma vía `react-native-maps` sin proveedor forzado
  — funciona en Expo Go sin configurar API keys, pero no es una decisión
  final).
- Formularios de animales/eventos/ventas en Publicar.
- Fotos (subida a `POST /photos`) — el backend ya lo soporta, la UI no.
- Reacciones, comentarios, guardados, seguir usuarios — todo existe en el
  backend, ninguno tiene pantalla todavía.
- Diseño visual real (colores, logo, tipografía) — hoy es deliberadamente
  genérico.
