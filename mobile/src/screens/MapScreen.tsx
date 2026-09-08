import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { fetchNearbyPosts } from '../api/posts';
import { fetchNearbyBusinesses } from '../api/businesses';
import { NearbyBusiness, NearbyPost } from '../types';
import { CATEGORY_LABELS, BUSINESS_CATEGORY_LABELS } from '../categoryStyle';
import { pixelIconSvgMarkup } from '../PixelIconV2';
import { useCurrentLocation } from '../useCurrentLocation';
import { colors, radius, spacing, typography } from '../theme';

const RADIUS_METERS = 5000;
const PIN_SIZE = 32;

// El set de pines viene en svg/pins/post-<categoria>.svg / negocio-<categoria>.svg
// con la categoria en kebab-case (ANIMAL_PERDIDO -> animal-perdido). Se
// exporta para que PostDetail/BusinessDetail arme el mismo pin al mandar a
// "Como llegar" (mismo icono que ya se ve al navegar el mapa normal).
export function toKebab(category: string) {
  return category.toLowerCase().replace(/_/g, '-');
}

// Distancia en linea recta (haversine) -- "Como llegar" no tiene ruteo real
// (no hay SDK de mapas nativo ni API de rutas contratada), asi que en vez de
// mandar a Google Maps se traza una linea recta al destino dentro de la
// propia app y se muestra esta distancia.
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type MapDestination = { lat: number; lng: number; label: string; svg: string; w: number; h: number };

// react-native-maps en Android necesita una API key de Google Maps para que
// el MapView nativo ni siquiera se construya (revienta con
// "IllegalStateException: API key not found" aunque solo quieras dibujar
// teselas propias encima). Para no depender de una cuenta de Google Cloud,
// el mapa se dibuja con Leaflet + teselas oscuras de CARTO dentro de un
// WebView -- mismo enfoque que ya usamos en el dashboard de CyberTracker,
// con teselas "dark_all" para que combine con el tema oscuro de la app.
function buildMapHtml() {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#0B1220}
  .me-dot{width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid #F1F5F9;
    box-shadow:0 0 0 3px rgba(59,130,246,0.35);}
  .me-pulse{width:18px;height:18px;border-radius:50%;background:rgba(59,130,246,0.35);
    animation:pulse 1.8s ease-out infinite;}
  @keyframes pulse{
    0%{transform:scale(1);opacity:0.8}
    100%{transform:scale(3.2);opacity:0}
  }
  .pin{filter:drop-shadow(0 2px 3px rgba(0,0,0,0.5));}
  .dest-ring{width:16px;height:16px;border-radius:50%;border:3px solid #22C55E;
    box-shadow:0 0 0 4px rgba(34,197,94,0.25);}
  .leaflet-popup-content-wrapper{background:#141B2E;color:#F1F5F9;border-radius:12px;}
  .leaflet-popup-tip{background:#141B2E;}
  .leaflet-popup-content b{color:#F1F5F9;}
  .leaflet-popup-content{color:#94A3B8;}
  .leaflet-control-zoom a{background:#141B2E !important;color:#F1F5F9 !important;border-color:#263248 !important;}
</style>
</head><body>
<div id="map"></div>
<script>
  const map = L.map('map', { zoomControl: false }).setView([0, 0], 15);
  // CARTO's dark_all tiles ahora piden API key (dejaron de servir anonimo),
  // asi que se usa el basemap oscuro gratuito de Esri (sin key requerida).
  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16, attribution: '© Esri'
  }).addTo(map);
  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16, attribution: '© Esri'
  }).addTo(map);

  let markers = [];
  let businessMarkers = [];
  let userMarker = null;
  let userPulse = null;
  let routeLine = null;
  let routeDestMarker = null;
  let lastCenter = null;

  const meIcon = L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18] });
  const mePulseIcon = L.divIcon({ className: '', html: '<div class="me-pulse"></div>', iconSize: [18, 18] });

  function pinIcon(svg, w, h) {
    return L.divIcon({
      className: 'pin',
      html: svg,
      iconSize: [w, h],
      iconAnchor: [w / 2, h],
      popupAnchor: [0, -h],
    });
  }

  function post(msg) {
    window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }

  map.on('moveend', () => {
    const c = map.getCenter();
    post({ type: 'region', lat: c.lat, lng: c.lng });
  });

  // Mensajes que llegan desde React Native (ver postToWebView en el componente).
  document.addEventListener('message', handleMessage);
  window.addEventListener('message', handleMessage);
  function handleMessage(e) {
    const data = JSON.parse(e.data);
    if (data.type === 'center') {
      lastCenter = [data.lat, data.lng];
      map.setView(lastCenter, data.zoom || 15);
      if (userPulse) userPulse.setLatLng(lastCenter);
      else userPulse = L.marker(lastCenter, { icon: mePulseIcon, interactive: false, zIndexOffset: 998 }).addTo(map);
      if (userMarker) userMarker.setLatLng(lastCenter);
      else userMarker = L.marker(lastCenter, { icon: meIcon, interactive: false, zIndexOffset: 999 }).addTo(map);
      if (routeLine) routeLine.setLatLngs([lastCenter, routeLine.getLatLngs()[1]]);
    } else if (data.type === 'route') {
      if (routeDestMarker) map.removeLayer(routeDestMarker);
      if (routeLine) map.removeLayer(routeLine);
      const dest = [data.lat, data.lng];
      const origin = lastCenter || dest;
      routeDestMarker = L.marker(dest, { icon: pinIcon(data.svg, data.w, data.h), zIndexOffset: 1000 })
        .bindPopup('<b>' + data.label + '</b>')
        .addTo(map);
      routeLine = L.polyline([origin, dest], {
        color: '#22C55E', weight: 4, opacity: 0.85, dashArray: '2 10', lineCap: 'round'
      }).addTo(map);
      map.fitBounds(L.latLngBounds([origin, dest]), { padding: [56, 56] });
    } else if (data.type === 'clearRoute') {
      if (routeDestMarker) { map.removeLayer(routeDestMarker); routeDestMarker = null; }
      if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
    } else if (data.type === 'posts') {
      markers.forEach(m => map.removeLayer(m));
      markers = data.posts.map(p =>
        L.marker([p.lat, p.lng], { icon: pinIcon(p.svg, p.w, p.h) })
          .bindPopup('<b>' + p.title + '</b><br>' + p.categoryLabel)
          .addTo(map)
      );
    } else if (data.type === 'businesses') {
      businessMarkers.forEach(m => map.removeLayer(m));
      businessMarkers = data.businesses.map(b =>
        L.marker([b.lat, b.lng], { icon: pinIcon(b.svg, b.w, b.h) })
          .bindPopup('<b>' + b.name + '</b><br>' + b.categoryLabel)
          .on('click', () => post({ type: 'businessClick', id: b.id }))
          .addTo(map)
      );
    }
  }
</script>
</body></html>`;
}

export default function MapScreen({ navigation, route }: any) {
  const { coords, loading: loadingLocation } = useCurrentLocation();
  const [posts, setPosts] = useState<NearbyPost[]>([]);
  const [businesses, setBusinesses] = useState<NearbyBusiness[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [recentering, setRecentering] = useState(false);
  const webviewRef = useRef<WebView>(null);
  const html = useMemo(buildMapHtml, []);
  const destination: MapDestination | undefined = route?.params?.destination;

  const loadNearby = useCallback(async (lat: number, lng: number) => {
    setLoadingPosts(true);
    try {
      const [postsData, businessesData] = await Promise.all([
        fetchNearbyPosts(lat, lng, RADIUS_METERS),
        fetchNearbyBusinesses(lat, lng, RADIUS_METERS),
      ]);
      setPosts(postsData);
      setBusinesses(businessesData);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const postToWebView = useCallback((msg: unknown) => {
    webviewRef.current?.postMessage(JSON.stringify(msg));
  }, []);

  useEffect(() => {
    if (coords) {
      postToWebView({ type: 'center', lat: coords.lat, lng: coords.lng });
      loadNearby(coords.lat, coords.lng);
    }
  }, [coords, loadNearby, postToWebView]);

  useEffect(() => {
    postToWebView({
      type: 'posts',
      posts: posts.map((p) => {
        const svg = pixelIconSvgMarkup(`pins/post-${toKebab(p.category)}`, PIN_SIZE);
        return {
          lat: p.lat,
          lng: p.lng,
          title: p.title,
          categoryLabel: CATEGORY_LABELS[p.category],
          svg,
          w: PIN_SIZE,
          h: (PIN_SIZE * 24) / 20,
        };
      }),
    });
  }, [posts, postToWebView]);

  useEffect(() => {
    postToWebView({
      type: 'businesses',
      businesses: businesses.map((b) => {
        const svg = pixelIconSvgMarkup(`pins/negocio-${toKebab(b.category)}`, PIN_SIZE);
        return {
          id: b.id,
          lat: b.lat,
          lng: b.lng,
          name: b.name,
          categoryLabel: BUSINESS_CATEGORY_LABELS[b.category] ?? b.category,
          svg,
          w: PIN_SIZE,
          h: (PIN_SIZE * 24) / 20,
        };
      }),
    });
  }, [businesses, postToWebView]);

  useEffect(() => {
    if (destination) {
      postToWebView({ type: 'route', ...destination });
    } else {
      postToWebView({ type: 'clearRoute' });
    }
  }, [destination, postToWebView]);

  function handleCloseRoute() {
    navigation.setParams({ destination: undefined });
  }

  const routeDistanceKm = destination && coords
    ? (haversineMeters(coords.lat, coords.lng, destination.lat, destination.lng) / 1000).toFixed(1)
    : null;

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'region') loadNearby(data.lat, data.lng);
      else if (data.type === 'businessClick') {
        navigation.navigate('BusinessDetail', { businessId: data.id });
      }
    },
    [loadNearby, navigation]
  );

  async function handleRecenter() {
    setRecentering(true);
    try {
      const position = await Location.getCurrentPositionAsync({});
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      postToWebView({ type: 'center', lat, lng, zoom: 16 });
      loadNearby(lat, lng);
    } catch {
      // Si falla (ubicación deshabilitada, etc.) simplemente no recentra.
    } finally {
      setRecentering(false);
    }
  }

  if (loadingLocation || !coords) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        style={StyleSheet.absoluteFill}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onMessage}
        onLoadEnd={() => {
          postToWebView({ type: 'center', lat: coords.lat, lng: coords.lng });
          if (destination) postToWebView({ type: 'route', ...destination });
        }}
      />
      {loadingPosts && (
        <View style={styles.loadingBadge}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      <TouchableOpacity style={styles.recenterButton} onPress={handleRecenter} disabled={recentering}>
        {recentering ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="locate" size={22} color={colors.primary} />
        )}
      </TouchableOpacity>
      {destination ? (
        <View style={styles.routeCard}>
          <View style={styles.routeCardInfo}>
            <Text style={styles.routeCardLabel} numberOfLines={1}>{destination.label}</Text>
            {routeDistanceKm && (
              <Text style={styles.routeCardDistance}>{routeDistanceKm} km en línea recta</Text>
            )}
          </View>
          <TouchableOpacity style={styles.routeCardClose} onPress={handleCloseRoute}>
            <Ionicons name="close" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {posts.length} publicaciones · {businesses.length} points cerca
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  loadingBadge: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  countBadge: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  countText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  routeCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    elevation: 3,
  },
  routeCardInfo: { flex: 1 },
  routeCardLabel: { ...typography.h3, fontSize: 14 },
  routeCardDistance: { ...typography.caption, color: colors.success, marginTop: 2 },
  routeCardClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
