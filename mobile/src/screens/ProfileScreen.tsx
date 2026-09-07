import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { fetchPublicProfile, updateProfile } from '../api/users';
import { PublicProfile } from '../types';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchPublicProfile(user.id).then(setProfile);
  }, [user]);

  function startEditing() {
    setUsername(user!.username);
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateProfile({ username: trimmed });
      await refreshUser();
      setEditing(false);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? 'No se pudo actualizar el perfil',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <View style={styles.container}>
      {editing ? (
        <View style={styles.editBox}>
          <TextInput
            style={styles.input}
            placeholder="Nombre de usuario"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.editButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setEditing(false)}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <TouchableOpacity onPress={startEditing}>
            <Text style={styles.editLink}>Editar perfil</Text>
          </TouchableOpacity>
        </>
      )}

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

      {user.isModerator && (
        <TouchableOpacity
          style={styles.moderationButton}
          onPress={() => navigation.navigate('Moderation')}
        >
          <Text style={styles.moderationButtonText}>Moderación</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
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
  email: { color: '#6b7280', marginBottom: 8 },
  editLink: { color: '#2563eb', fontWeight: '600', marginBottom: 24 },
  editBox: { width: '100%', marginTop: 24, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  error: { color: '#dc2626', marginBottom: 8 },
  editButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
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
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  cancelButton: { backgroundColor: '#f3f4f6' },
  cancelButtonText: { color: '#374151', fontWeight: '600' },
  moderationButton: {
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 12,
  },
  moderationButtonText: { color: '#111827', fontWeight: '600' },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  logoutButtonText: { color: '#dc2626', fontWeight: '600' },
});
