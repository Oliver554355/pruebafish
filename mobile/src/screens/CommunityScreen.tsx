import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FEED_PAGE_SIZE, fetchFeed } from '../api/posts';
import { FeedPost, PostCategory } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../categoryStyle';
import { useCurrentLocation } from '../useCurrentLocation';
import { card, colors, radius, spacing, typography } from '../theme';

// Filtro por categoria del mockup (Todos/Animales/Seguridad/Recomendaciones):
// no existe como tal en el backend, se arma agrupando las categorias que ya
// tenemos. Es un filtro puramente de UI sobre lo que ya se cargo del feed.
const FILTER_GROUPS: { key: string; label: string; categories: PostCategory[] | null }[] = [
  { key: 'TODOS', label: 'Todos', categories: null },
  { key: 'ANIMALES', label: 'Animales', categories: ['ANIMAL_PERDIDO', 'ANIMAL_ENCONTRADO', 'ADOPCION'] },
  { key: 'SEGURIDAD', label: 'Seguridad', categories: ['ACCIDENTE', 'INCIDENTE', 'AVISO'] },
  { key: 'RECOMENDACIONES', label: 'Recomendaciones', categories: ['RECOMENDACION'] },
];

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'recién';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

function PostCard({ post, onPress }: { post: FeedPost; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[post.category] }]}>
          <Ionicons name={CATEGORY_ICONS[post.category]} size={12} color={colors.onPrimary} />
          <Text style={styles.badgeText}>{CATEGORY_LABELS[post.category]}</Text>
        </View>
        <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
      </View>
      <Text style={styles.title}>{post.title}</Text>
      {post.description && (
        <Text style={styles.description} numberOfLines={2}>{post.description}</Text>
      )}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{(post.distance / 1000).toFixed(1)} km</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="heart" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{post.reactionCount}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="chatbubble-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{post.commentCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CommunityScreen({ navigation }: any) {
  const { coords, loading: loadingLocation } = useCurrentLocation();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('TODOS');

  const load = useCallback(async () => {
    if (!coords) return;
    setRefreshing(true);
    try {
      const page = await fetchFeed(coords.lat, coords.lng, 5000, 0);
      setPosts(page);
      setHasMore(page.length === FEED_PAGE_SIZE);
    } finally {
      setRefreshing(false);
    }
  }, [coords]);

  const loadMore = useCallback(async () => {
    // FlatList dispara onEndReached apenas monta si todavia no hay contenido
    // (lista vacia = "ya llegue al final"), asi que se bloquea mientras la
    // carga inicial (refreshing) esta en curso para no duplicar la pagina 1.
    if (!coords || loadingMore || !hasMore || refreshing || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const page = await fetchFeed(coords.lat, coords.lng, 5000, posts.length);
      setPosts((prev) => [...prev, ...page]);
      setHasMore(page.length === FEED_PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [coords, loadingMore, hasMore, refreshing, posts.length]);

  useEffect(() => {
    load();
  }, [load]);

  const activeCategories = FILTER_GROUPS.find((g) => g.key === filter)?.categories ?? null;
  const filteredPosts = useMemo(
    () => (activeCategories ? posts.filter((p) => activeCategories.includes(p.category)) : posts),
    [posts, activeCategories]
  );

  if (loadingLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {FILTER_GROUPS.map((g) => {
          const active = g.key === filter;
          return (
            <TouchableOpacity
              key={g.key}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setFilter(g.key)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{g.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No hay publicaciones cerca todavía.</Text>
          </View>
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
  filterBar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterBarContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { ...typography.caption, fontWeight: '600' },
  pillTextActive: { color: colors.onPrimary },
  listContent: { padding: spacing.lg },
  card: { ...card, marginBottom: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { color: colors.onPrimary, fontSize: 11, fontWeight: '700' },
  time: { ...typography.caption },
  title: { ...typography.h3, marginBottom: 4 },
  description: { ...typography.bodyMuted, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', gap: spacing.lg },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.caption },
  emptyText: { color: colors.textMuted },
  footer: { marginVertical: spacing.lg },
});
