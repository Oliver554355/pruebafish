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
import { Ionicons } from '@expo/vector-icons';
import { BUSINESSES_PAGE_SIZE, fetchNearbyBusinesses } from '../api/businesses';
import { NearbyBusiness } from '../types';
import { BUSINESS_CATEGORY_COLORS, BUSINESS_CATEGORY_PIXEL_ICON, BUSINESS_CATEGORY_LABELS } from '../categoryStyle';
import { PixelIcon } from '../PixelIcon';
import { useCurrentLocation } from '../useCurrentLocation';
import { card, colors, radius, spacing, typography } from '../theme';

function BusinessCard({
  business,
  onPress,
}: {
  business: NearbyBusiness;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.icon, { backgroundColor: BUSINESS_CATEGORY_COLORS[business.category] }]}>
        <PixelIcon name={BUSINESS_CATEGORY_PIXEL_ICON[business.category]} size={22} color={colors.onPrimary} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.name} numberOfLines={1}>{business.name}</Text>
          {business.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={13} color={colors.success} />
              <Text style={styles.verified}>Verificado</Text>
            </View>
          )}
        </View>
        <Text style={styles.category}>{BUSINESS_CATEGORY_LABELS[business.category]}</Text>
        {business.address && <Text style={styles.address} numberOfLines={1}>{business.address}</Text>}
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.meta}>{(business.distance / 1000).toFixed(1)} km</Text>
        </View>
      </View>
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
    // FlatList dispara onEndReached apenas monta si todavia no hay contenido
    // (lista vacia = "ya llegue al final"), asi que se bloquea mientras la
    // carga inicial (refreshing) esta en curso para no duplicar la pagina 1.
    if (!coords || loadingMore || !hasMore || refreshing || businesses.length === 0) return;
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
  }, [coords, loadingMore, hasMore, refreshing, businesses.length]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadingLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
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
          <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />
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
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateBusiness')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  listContent: { padding: spacing.lg },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  card: { ...card, marginBottom: spacing.md, flexDirection: 'row', gap: spacing.md },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: { ...typography.h3, flex: 1 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verified: { color: colors.success, fontSize: 11, fontWeight: '700' },
  category: { color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 2 },
  address: { ...typography.bodyMuted, marginTop: spacing.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  meta: { ...typography.caption },
  emptyText: { color: colors.textMuted },
  footer: { marginVertical: spacing.lg },
});
