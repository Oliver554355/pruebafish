import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BUSINESSES_PAGE_SIZE, fetchNearbyBusinesses } from '../api/businesses';
import { NearbyBusiness } from '../types';
import { BUSINESS_CATEGORY_LABELS } from '../categoryStyle';
import { useCurrentLocation } from '../useCurrentLocation';

function BusinessCard({
  business,
  onPress,
}: {
  business: NearbyBusiness;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{business.name}</Text>
        {business.verified && <Text style={styles.verified}>✓ verificado</Text>}
      </View>
      <Text style={styles.category}>{BUSINESS_CATEGORY_LABELS[business.category]}</Text>
      {business.address && <Text style={styles.address}>{business.address}</Text>}
      <Text style={styles.meta}>{(business.distance / 1000).toFixed(1)} km</Text>
    </TouchableOpacity>
  );
}

export default function ExploreScreen({ navigation }: any) {
  const { coords, loading: loadingLocation } = useCurrentLocation();
  const [businesses, setBusinesses] = useState<NearbyBusiness[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async () => {
    if (!coords) return;
    setRefreshing(true);
    try {
      const page = await fetchNearbyBusinesses(coords.lat, coords.lng, 5000, undefined, 0);
      setBusinesses(page);
      setHasMore(page.length === BUSINESSES_PAGE_SIZE);
    } finally {
      setRefreshing(false);
    }
  }, [coords]);

  const loadMore = useCallback(async () => {
    if (!coords || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchNearbyBusinesses(
        coords.lat,
        coords.lng,
        5000,
        undefined,
        businesses.length,
      );
      setBusinesses((prev) => [...prev, ...page]);
      setHasMore(page.length === BUSINESSES_PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [coords, loadingMore, hasMore, businesses.length]);

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
    <View style={styles.flex}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={businesses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BusinessCard
            business={item}
            onPress={() => navigation.navigate('BusinessDetail', { businessId: item.id })}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              No hay points cargados cerca todavía.
            </Text>
          </View>
        }
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} /> : null}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateBusiness')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  listContent: { padding: 16 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '600', marginTop: -2 },
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
  footer: { marginVertical: 16 },
});
