import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchFollowers, fetchPublicProfile, toggleFollow } from '../api/users';
import { PublicProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { card, colors, radius, spacing, typography } from '../theme';

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
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isMe = userId === user?.id;
  const reputationPct = Math.max(0, Math.min(100, profile.reputation.score));

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{profile.username.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.username}>{profile.username}</Text>

      {!isMe && (
        <TouchableOpacity
          style={[styles.followButton, following && styles.followingButton]}
          onPress={handleToggleFollow}
          disabled={togglingFollow}
        >
          {togglingFollow ? (
            <ActivityIndicator color={following ? colors.text : colors.onPrimary} />
          ) : (
            <Text style={[styles.followButtonText, following && styles.followingButtonText]}>
              {following ? 'Siguiendo' : 'Seguir'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.reputationCard}>
        <View style={styles.reputationHeader}>
          <Text style={styles.reputationLabel}>Reputación</Text>
          <Text style={styles.reputationValue}>{profile.reputation.score.toFixed(1)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${reputationPct}%` }]} />
        </View>
      </View>

      <View style={styles.stats}>
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
  container: { flex: 1, padding: spacing.xl, alignItems: 'center', backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  avatarText: { color: colors.onPrimary, fontSize: 28, fontWeight: '800' },
  username: { ...typography.h1, marginTop: spacing.md, marginBottom: spacing.lg },
  followButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
  },
  followingButton: { backgroundColor: colors.surfaceAlt },
  followButtonText: { color: colors.onPrimary, fontWeight: '700' },
  followingButtonText: { color: colors.text },
  reputationCard: { ...card, width: '100%', marginBottom: spacing.lg },
  reputationHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  reputationLabel: { ...typography.h3 },
  reputationValue: { ...typography.h3, color: colors.primary },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },
  stats: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', ...card, paddingVertical: spacing.lg },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { ...typography.h3 },
  statLabel: { ...typography.caption },
});
