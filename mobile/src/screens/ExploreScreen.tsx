import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchNearbyBusinesses } from '../api/businesses';
import { NearbyBusiness } from '../types';
import { useCurrentLocation } from '../useCurrentLocation';

function BusinessCard({ business }: { business: NearbyBusiness }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{business.name}</Text>
        {business.verified && <Text style={styles.verified}>✓ verificado</Text>}
      </View>
      <Text style={styles.category}>{business.category}</Text>
      {business.address && <Text style={styles.address}>{business.address}</Text>}
      <Text style={styles.meta}>{(business.distance / 1000).toFixed(1)} km</Text>
    </View>
  );
}

export default function ExploreScreen() {
  const { coords, loading: loadingLocation } = useCurrentLocation();
  const [businesses, setBusinesses] = useState<NearbyBusiness[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!coords) return;
    setRefreshing(true);
    try {
      setBusinesses(await fetchNearbyBusinesses(coords.lat, coords.lng, 5000));
    } finally {
      setRefreshing(false);
    }
  }, [coords]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadingLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={businesses}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <BusinessCard business={item} />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            No hay negocios cargados cerca todavía.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 16, fontWeight: '700' },
  verified: { color: '#16a34a', fontSize: 12, fontWeight: '600' },
  category: { color: '#2563eb', fontSize: 12, marginTop: 2 },
  address: { color: '#374151', marginTop: 6 },
  meta: { color: '#6b7280', fontSize: 12, marginTop: 8 },
  emptyText: { color: '#6b7280' },
});
