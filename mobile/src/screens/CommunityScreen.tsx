import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchFeed } from '../api/posts';
import { FeedPost } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../categoryStyle';
import { useCurrentLocation } from '../useCurrentLocation';

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'recién';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

function PostCard({ post }: { post: FeedPost }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.badge,
            { backgroundColor: CATEGORY_COLORS[post.category] },
          ]}
        >
          <Text style={styles.badgeText}>{CATEGORY_LABELS[post.category]}</Text>
        </View>
        <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
      </View>
      <Text style={styles.title}>{post.title}</Text>
      {post.description && (
        <Text style={styles.description}>{post.description}</Text>
      )}
      <Text style={styles.meta}>
        📍 {(post.distance / 1000).toFixed(1)} km · ❤️ {post.reactionCount} ·
        💬 {post.commentCount}
      </Text>
    </View>
  );
}

export default function CommunityScreen() {
  const { coords, loading: loadingLocation } = useCurrentLocation();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!coords) return;
    setRefreshing(true);
    try {
      setPosts(await fetchFeed(coords.lat, coords.lng, 5000));
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
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PostCard post={item} />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            No hay publicaciones cerca todavía.
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
    marginBottom: 8,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  time: { color: '#6b7280', fontSize: 12 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  description: { color: '#374151', marginBottom: 8 },
  meta: { color: '#6b7280', fontSize: 12 },
  emptyText: { color: '#6b7280' },
});
