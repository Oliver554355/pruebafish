import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchFollowers, fetchFollowing } from '../api/users';
import { FollowEntry } from '../types';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

export default function FollowListScreen({ route, navigation }: any) {
  const { userId, mode } = route.params as { userId: string; mode: 'followers' | 'following' };
  const { user } = useAuth();
  const [entries, setEntries] = useState<FollowEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetcher = mode === 'followers' ? fetchFollowers : fetchFollowing;
    fetcher(userId)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [userId, mode]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={entries}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {mode === 'followers' ? 'Todavía no tiene seguidores.' : 'Todavía no sigue a nadie.'}
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const person = mode === 'followers' ? item.follower! : item.following!;
        return (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              person.id === user?.id
                ? navigation.navigate('Main', { screen: 'Perfil' })
                : navigation.navigate('UserProfile', { userId: person.id })
            }
            activeOpacity={0.85}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{person.username.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.username}>{person.username}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, backgroundColor: colors.bg },
  emptyText: { color: colors.textMuted },
  listContent: { padding: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.onPrimary, fontWeight: '700' },
  username: { flex: 1, color: colors.text, fontWeight: '600', fontSize: 15 },
});
