import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { fetchNearbyPosts } from '../api/posts';
import { NearbyPost } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../categoryStyle';
import { useCurrentLocation } from '../useCurrentLocation';

const RADIUS_METERS = 5000;

export default function MapScreen() {
  const { coords, loading: loadingLocation } = useCurrentLocation();
  const [posts, setPosts] = useState<NearbyPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const loadPosts = useCallback(async (lat: number, lng: number) => {
    setLoadingPosts(true);
    try {
      setPosts(await fetchNearbyPosts(lat, lng, RADIUS_METERS));
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    if (coords) loadPosts(coords.lat, coords.lng);
  }, [coords, loadPosts]);

  if (loadingLocation || !coords) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const initialRegion: Region = {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        onRegionChangeComplete={(region) =>
          loadPosts(region.latitude, region.longitude)
        }
      >
        {posts.map((post) => (
          <Marker
            key={post.id}
            coordinate={{ latitude: post.lat, longitude: post.lng }}
            pinColor={CATEGORY_COLORS[post.category]}
            title={post.title}
            description={CATEGORY_LABELS[post.category]}
          />
        ))}
      </MapView>
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
