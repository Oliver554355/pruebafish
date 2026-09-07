import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchSaved } from '../api/saved';
import { SavedItem } from '../types';
import {
  BUSINESS_CATEGORY_COLORS,
  BUSINESS_CATEGORY_ICON_V2,
  BUSINESS_CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_ICON_V2,
  CATEGORY_LABELS,
} from '../categoryStyle';
import { PixelIconV2 } from '../PixelIconV2';
import { card, colors, radius, spacing, typography } from '../theme';

type Tab = 'ALL' | 'POSTS' | 'BUSINESSES';

export default function SavedScreen({ navigation }: any) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tab, setTab] = useState<Tab>('ALL');

  const load = useCallback(async () => {
    try {
      const page = await fetchSaved();
      setItems(page.items);
      setNextCursor(page.nextCursor);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchSaved(nextCursor);
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (tab === 'POSTS') return items.filter((i) => i.post);
    if (tab === 'BUSINESSES') return items.filter((i) => i.business);
    return items;
  }, [items, tab]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {(
          [
            { key: 'ALL', label: 'Todo' },
            { key: 'POSTS', label: 'Publicaciones' },
            { key: 'BUSINESSES', label: 'Points' },
          ] as { key: Tab; label: string }[]
        ).map((t) => {
          const active = t.key === tab;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No guardaste nada todavía.</Text>
          </View>
        }
        renderItem={({ item }) =>
          item.post ? (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('PostDetail', { postId: item.post!.id })}
              activeOpacity={0.85}
            >
              <PixelIconV2 name={CATEGORY_ICON_V2[item.post.category]} size={44} />
              <View style={styles.cardBody}>
                <Text style={[styles.category, { color: CATEGORY_COLORS[item.post.category] }]}>
                  {CATEGORY_LABELS[item.post.category]}
                </Text>
                <Text style={styles.title} numberOfLines={2}>{item.post.title}</Text>
              </View>
            </TouchableOpacity>
          ) : item.business ? (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('BusinessDetail', { businessId: item.business!.id })}
              activeOpacity={0.85}
            >
              <PixelIconV2 name={BUSINESS_CATEGORY_ICON_V2[item.business.category]} size={44} />
              <View style={styles.cardBody}>
                <Text style={[styles.category, { color: BUSINESS_CATEGORY_COLORS[item.business.category] }]}>
                  {BUSINESS_CATEGORY_LABELS[item.business.category]}
                </Text>
                <Text style={styles.title} numberOfLines={2}>{item.business.name}</Text>
              </View>
            </TouchableOpacity>
          ) : null
        }
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyText: { color: colors.textMuted },
  tabBar: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { ...typography.caption, fontWeight: '600' },
  tabTextActive: { color: colors.onPrimary },
  listContent: { padding: spacing.lg },
  card: { ...card, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardBody: { flex: 1 },
  category: { ...typography.caption, fontWeight: '700', marginBottom: 2 },
  title: { ...typography.h3 },
  footer: { marginVertical: spacing.lg },
});
