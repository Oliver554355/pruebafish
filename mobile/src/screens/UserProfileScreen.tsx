import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchFollowers, fetchPublicProfile, toggleFollow } from '../api/users';
import { PublicProfile } from '../types';
import { useAuth } from '../context/AuthContext';

export default function UserProfileScreen({ route, navigation }: any) {
  const { userId } = route.params as { userId: string };
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingFollow, setTogglingFollow] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, followers] = await Promise.all([
        fetchPublicProfile(userId),
        fetchFollowers(userId),
      ]);
      setProfile(profileData);
      setFollowing(followers.some((f) => f.follower?.id === user?.id));
    } finally {
      setLoading(false);
    }
  }, [userId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleFollow() {
    setTogglingFollow(true);
    try {
      const { following: nowFollowing } = await toggleFollow(userId);
      setFollowing(nowFollowing);
      setProfile((prev) =>
        prev
          ? { ...prev, followersCount: prev.followersCount + (nowFollowing ? 1 : -1) }
          : prev,
      );
    } finally {
      setTogglingFollow(false);
    }
  }

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const isMe = userId === user?.id;

  return (
    <View style={styles.container}>
      <Text style={styles.username}>{profile.username}</Text>

      {!isMe && (
        <TouchableOpacity
          style={[styles.followButton, following && styles.followingButton]}
          onPress={handleToggleFollow}
          disabled={togglingFollow}
        >
          {togglingFollow ? (
            <ActivityIndicator color={following ? '#374151' : '#fff'} />
          ) : (
            <Text style={[styles.followButtonText, following && styles.followingButtonText]}>
              {following ? 'Siguiendo' : 'Seguir'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.stats}>
        <Stat label="Reputación" value={profile.reputation.score.toFixed(1)} />
        <Stat label="Publicaciones" value={profile.postsCount} />
        <TouchableOpacity
          style={styles.stat}
          onPress={() => navigation.navigate('FollowList', { userId, mode: 'followers' })}
        >
          <Text style={styles.statValue}>{profile.followersCount}</Text>
          <Text style={styles.statLabel}>Seguidores</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.stat}
          onPress={() => navigation.navigate('FollowList', { userId, mode: 'following' })}
        >
          <Text style={styles.statValue}>{profile.followingCount}</Text>
          <Text style={styles.statLabel}>Siguiendo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  username: { fontSize: 22, fontWeight: '700', marginTop: 8, marginBottom: 20 },
  followButton: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 10,
    marginBottom: 28,
  },
  followingButton: { backgroundColor: '#f3f4f6' },
  followButtonText: { color: '#fff', fontWeight: '600' },
  followingButtonText: { color: '#374151' },
  stats: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { color: '#6b7280', fontSize: 12 },
});
