import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { fetchPublicProfile } from '../api/users';
import { PublicProfile } from '../types';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  useEffect(() => {
    if (user) fetchPublicProfile(user.id).then(setProfile);
  }, [user]);

  if (!user) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.username}>{user.username}</Text>
      <Text style={styles.email}>{user.email}</Text>

      {profile ? (
        <View style={styles.stats}>
          <Stat label="Reputación" value={profile.reputation.score.toFixed(1)} />
          <Stat label="Publicaciones" value={profile.postsCount} />
          <Stat label="Seguidores" value={profile.followersCount} />
          <Stat label="Siguiendo" value={profile.followingCount} />
        </View>
      ) : (
        <ActivityIndicator style={styles.stats} />
      )}

      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </TouchableOpacity>
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
  username: { fontSize: 22, fontWeight: '700', marginTop: 24 },
  email: { color: '#6b7280', marginBottom: 24 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { color: '#6b7280', fontSize: 12 },
  button: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: { color: '#dc2626', fontWeight: '600' },
});
