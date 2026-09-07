import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { search } from '../api/search';
import { SearchResults } from '../types';
import {
  BUSINESS_CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from '../categoryStyle';
import { colors, radius, spacing, typography } from '../theme';

const DEBOUNCE_MS = 400;

function matchingCategoryLabels(query: string) {
  const q = query.toLowerCase();
  const posts = Object.entries(CATEGORY_LABELS).filter(([, label]) =>
    label.toLowerCase().includes(q),
  );
  const businesses = Object.entries(BUSINESS_CATEGORY_LABELS).filter(([, label]) =>
    label.toLowerCase().includes(q),
  );
  return { posts, businesses };
}

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await search(trimmed));
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const categoryMatches = query.trim().length >= 2 ? matchingCategoryLabels(query) : null;
  const hasResults =
    results && (results.posts.length > 0 || results.businesses.length > 0 || results.users.length > 0);
  const hasCategoryMatches =
    categoryMatches && (categoryMatches.posts.length > 0 || categoryMatches.businesses.length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Buscar points, publicaciones, usuarios..."
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="none"
        />
      </View>

      {loading && <ActivityIndicator style={styles.loading} color={colors.primary} />}

      <ScrollView contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled">
        {hasCategoryMatches && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <View style={styles.chips}>
              {categoryMatches!.posts.map(([key, label]) => (
                <View key={`p-${key}`} style={[styles.chip, { backgroundColor: CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS] }]}>
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              ))}
              {categoryMatches!.businesses.map(([key, label]) => (
                <View key={`b-${key}`} style={[styles.chip, styles.businessChip]}>
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {results && results.businesses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Points</Text>
            {results.businesses.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.row}
                onPress={() => navigation.navigate('BusinessDetail', { businessId: b.id })}
                activeOpacity={0.85}
              >
                <Text style={styles.rowTitle}>{b.name}</Text>
                <Text style={styles.rowMeta}>
                  {BUSINESS_CATEGORY_LABELS[b.category]}
                  {b.verified ? ' · ✓ verificado' : ''}
                  {b.address ? ` · ${b.address}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {results && results.posts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Publicaciones</Text>
            {results.posts.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.row}
                onPress={() => navigation.navigate('PostDetail', { postId: p.id })}
                activeOpacity={0.85}
              >
                <Text style={styles.rowTitle}>{p.title}</Text>
                <Text style={styles.rowMeta}>{CATEGORY_LABELS[p.category]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {results && results.users.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Usuarios</Text>
            {results.users.map((u) => (
              <TouchableOpacity
                key={u.id}
                style={styles.row}
                onPress={() => navigation.navigate('UserProfile', { userId: u.id })}
                activeOpacity={0.85}
              >
                <Text style={styles.rowTitle}>{u.username}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {query.trim().length >= 2 && !loading && !hasResults && !hasCategoryMatches && (
          <Text style={styles.emptyText}>Sin resultados para "{query.trim()}".</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: 12, color: colors.text, fontSize: 15 },
  loading: { marginBottom: spacing.sm },
  results: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  section: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  businessChip: { backgroundColor: colors.primary },
  chipText: { color: colors.onPrimary, fontWeight: '600', fontSize: 12 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTitle: { color: colors.text, fontWeight: '600', fontSize: 15 },
  rowMeta: { ...typography.caption, marginTop: 4 },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
