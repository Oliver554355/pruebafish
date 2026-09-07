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
import { search } from '../api/search';
import { SearchResults } from '../types';
import {
  BUSINESS_CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from '../categoryStyle';

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
      <TextInput
        style={styles.input}
        placeholder="Buscar points, publicaciones, usuarios..."
        value={query}
        onChangeText={setQuery}
        autoFocus
        autoCapitalize="none"
      />

      {loading && <ActivityIndicator style={styles.loading} />}

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
  container: { flex: 1 },
  input: {
    margin: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  loading: { marginBottom: 8 },
  results: { paddingHorizontal: 16, paddingBottom: 32 },
  section: { marginBottom: 20 },
  sectionTitle: { fontWeight: '700', fontSize: 15, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  businessChip: { backgroundColor: '#2563eb' },
  chipText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rowTitle: { fontWeight: '600', fontSize: 15 },
  rowMeta: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  emptyText: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
});
