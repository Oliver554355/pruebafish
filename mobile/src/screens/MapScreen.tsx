import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { fetchNearbyPosts } from '../api/posts';
import { fetchNearbyBusinesses } from '../api/businesses';
import { NearbyBusiness, NearbyPost } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../categoryStyle';
import { useCurrentLocation } from '../useCurrentLocation';

const RADIUS_METERS = 5000;

// react-native-maps en Android necesita una API key de Google Maps para que
// el MapView nativo ni siquiera se construya (revienta con
// "IllegalStateException: API key not found" aunque solo quieras dibujar
// teselas propias encima). Para no depender de una cuenta de Google Cloud,
// el mapa se dibuja con Leaflet + OpenStreetMap dentro de un WebView --
// mismo enfoque que ya usamos en el dashboard de CyberTracker.
function buildMapHtml() {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{height:100%;margin:0;padding:0}
  .me-dot{width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;
    box-shadow:0 0 0 3px rgba(37,99,235,0.35);}
  .me-pulse{width:18px;height:18px;border-radius:50%;background:rgba(37,99,235,0.35);
    animation:pulse 1.8s ease-out infinite;}
  @keyframes pulse{
    0%{transform:scale(1);opacity:0.8}
    100%{transform:scale(3.2);opacity:0}
  }
  .point-pin{font-size:26px;line-height:26px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));}
</style>
</head><body>
<div id="map"></div>
<script>
  const map = L.map('map', { zoomControl: false }).setView([0, 0], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap'
  }).addTo(map);

  let markers = [];
  let businessMarkers = [];
  let userMarker = null;
  let userPulse = null;

  const meIcon = L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18] });
  const mePulseIcon = L.divIcon({ className: '', html: '<div class="me-pulse"></div>', iconSize: [18, 18] });
  const pointIcon = L.divIcon({ className: '', html: '<div class="point-pin">📍</div>', iconSize: [26, 26], iconAnchor: [13, 24] });

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
      map.setView([data.lat, data.lng], data.zoom || 15);
      if (userPulse) userPulse.setLatLng([data.lat, data.lng]);
      else userPulse = L.marker([data.lat, data.lng], { icon: mePulseIcon, interactive: false, zIndexOffset: 998 }).addTo(map);
      if (userMarker) userMarker.setLatLng([data.lat, data.lng]);
      else userMarker = L.marker([data.lat, data.lng], { icon: meIcon, interactive: false, zIndexOffset: 999 }).addTo(map);
    } else if (data.type === 'posts') {
      markers.forEach(m => map.removeLayer(m));
      markers = data.posts.map(p =>
        L.circleMarker([p.lat, p.lng], {
          radius: 9, color: '#fff', weight: 2, fillColor: p.color, fillOpacity: 0.9
        }).bindPopup('<b>' + p.title + '</b><br>' + p.categoryLabel).addTo(map)
      );
    } else if (data.type === 'businesses') {
      businessMarkers.forEach(m => map.removeLayer(m));
      businessMarkers = data.businesses.map(b =>
        L.marker([b.lat, b.lng], { icon: pointIcon })
          .bindPopup('<b>' + b.name + '</b><br>' + b.categoryLabel)
          .on('click', () => post({ type: 'businessClick', id: b.id }))
          .addTo(map)
      );
    }
  }
</script>
</body></html>`;
}

export default function MapScreen({ navigation }: any) {
  const { coords, loading: loadingLocation } = useCurrentLocation();
  const [posts, setPosts] = useState<NearbyPost[]>([]);
  const [businesses, setBusinesses] = useState<NearbyBusiness[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [recentering, setRecentering] = useState(false);
  const webviewRef = useRef<WebView>(null);
  const html = useMemo(buildMapHtml, []);

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
      posts: posts.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        title: p.title,
        categoryLabel: CATEGORY_LABELS[p.category],
        color: CATEGORY_COLORS[p.category],
      })),
    });
  }, [posts, postToWebView]);

  useEffect(() => {
    postToWebView({
      type: 'businesses',
      businesses: businesses.map((b) => ({
        id: b.id,
        lat: b.lat,
        lng: b.lng,
        name: b.name,
        categoryLabel: b.category,
      })),
    });
  }, [businesses, postToWebView]);

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
        <ActivityIndicator />
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
        onLoadEnd={() =>
          postToWebView({ type: 'center', lat: coords.lat, lng: coords.lng })
        }
      />
      {loadingPosts && (
        <View style={styles.loadingBadge}>
          <ActivityIndicator size="small" />
        </View>
      )}
      <TouchableOpacity style={styles.recenterButton} onPress={handleRecenter} disabled={recentering}>
        {recentering ? (
          <ActivityIndicator size="small" color="#2563eb" />
        ) : (
          <Text style={styles.recenterIcon}>◎</Text>
        )}
      </TouchableOpacity>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>
          {posts.length} publicaciones · {businesses.length} points cerca
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingBadge: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    elevation: 2,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  recenterIcon: { fontSize: 22, color: '#2563eb' },
  countBadge: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  countText: { color: '#fff', fontWeight: '600' },
});
