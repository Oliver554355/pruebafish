import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchFollowers, fetchFollowing } from '../api/users';
import { FollowEntry } from '../types';
import { useAuth } from '../context/AuthContext';

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
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
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
          >
            <Text style={styles.username}>{person.username}</Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#6b7280' },
  listContent: { padding: 16 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  username: { fontWeight: '600', fontSize: 15 },
});
