import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { fetchNearbyPosts } from '../api/posts';
import { NearbyPost } from '../types';
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
<style>html,body,#map{height:100%;margin:0;padding:0}</style>
</head><body>
<div id="map"></div>
<script>
  const map = L.map('map', { zoomControl: false }).setView([0, 0], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap'
  }).addTo(map);

  let markers = [];
  let userMarker = null;

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
      map.setView([data.lat, data.lng], 15);
      if (userMarker) userMarker.setLatLng([data.lat, data.lng]);
      else userMarker = L.circleMarker([data.lat, data.lng], {
        radius: 7, color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1
      }).addTo(map);
    } else if (data.type === 'posts') {
      markers.forEach(m => map.removeLayer(m));
      markers = data.posts.map(p =>
        L.circleMarker([p.lat, p.lng], {
          radius: 9, color: '#fff', weight: 2, fillColor: p.color, fillOpacity: 0.9
        }).bindPopup('<b>' + p.title + '</b><br>' + p.categoryLabel).addTo(map)
      );
    }
  }
</script>
</body></html>`;
}

export default function MapScreen() {
  const { coords, loading: loadingLocation } = useCurrentLocation();
  const [posts, setPosts] = useState<NearbyPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const webviewRef = useRef<WebView>(null);
  const html = useMemo(buildMapHtml, []);

  const loadPosts = useCallback(async (lat: number, lng: number) => {
    setLoadingPosts(true);
    try {
      setPosts(await fetchNearbyPosts(lat, lng, RADIUS_METERS));
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
      loadPosts(coords.lat, coords.lng);
    }
  }, [coords, loadPosts, postToWebView]);

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

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'region') loadPosts(data.lat, data.lng);
    },
    [loadPosts]
  );

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
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{posts.length} publicaciones cerca</Text>
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
