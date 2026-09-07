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
import { fetchSaved } from '../api/saved';
import { SavedItem } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS, BUSINESS_CATEGORY_LABELS } from '../categoryStyle';

export default function SavedScreen({ navigation }: any) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
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
          >
            <View
              style={[styles.badge, { backgroundColor: CATEGORY_COLORS[item.post.category] }]}
            >
              <Text style={styles.badgeText}>{CATEGORY_LABELS[item.post.category]}</Text>
            </View>
            <Text style={styles.title}>{item.post.title}</Text>
          </TouchableOpacity>
        ) : item.business ? (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('BusinessDetail', { businessId: item.business!.id })}
          >
            <View style={styles.badgeBusiness}>
              <Text style={styles.badgeText}>{BUSINESS_CATEGORY_LABELS[item.business.category]}</Text>
            </View>
            <Text style={styles.title}>{item.business.name}</Text>
          </TouchableOpacity>
        ) : null
      }
      onEndReachedThreshold={0.4}
      onEndReached={loadMore}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} /> : null}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#6b7280' },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeBusiness: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700' },
  footer: { marginVertical: 16 },
});
