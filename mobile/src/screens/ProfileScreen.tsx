import React, { useEffect, useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { fetchPublicProfile, updateProfile } from '../api/users';
import { PublicProfile } from '../types';
import { card, colors, radius, spacing, typography } from '../theme';

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

  const reputationPct = profile ? Math.max(0, Math.min(100, profile.reputation.score)) : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
      </View>

      {editing ? (
        <View style={styles.editBox}>
          <TextInput
            style={styles.input}
            placeholder="Nombre de usuario"
            placeholderTextColor={colors.textFaint}
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
                <ActivityIndicator color={colors.onPrimary} />
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
          <TouchableOpacity onPress={startEditing} style={styles.editLinkRow}>
            <Ionicons name="pencil" size={13} color={colors.primary} />
            <Text style={styles.editLink}>Editar perfil</Text>
          </TouchableOpacity>
        </>
      )}

      {profile ? (
        <>
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
            <Stat label="Publicaciones" value={profile.postsCount} icon="document-text-outline" />
            <TouchableOpacity
              style={styles.stat}
              onPress={() => navigation.navigate('FollowList', { userId: user.id, mode: 'followers' })}
            >
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <Text style={styles.statValue}>{profile.followersCount}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => navigation.navigate('FollowList', { userId: user.id, mode: 'following' })}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.primary} />
              <Text style={styles.statValue}>{profile.followingCount}</Text>
              <Text style={styles.statLabel}>Siguiendo</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <ActivityIndicator style={styles.statsLoading} color={colors.primary} />
      )}

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('Saved')}
      >
        <Ionicons name="bookmark-outline" size={18} color={colors.text} />
        <Text style={styles.menuItemText}>Guardados</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, alignItems: 'center', backgroundColor: colors.bg },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  avatarText: { color: colors.onPrimary, fontSize: 32, fontWeight: '800' },
  username: { ...typography.h1, marginTop: spacing.lg },
  email: { ...typography.bodyMuted, marginBottom: spacing.sm },
  editLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xl },
  editLink: { color: colors.primary, fontWeight: '600' },
  editBox: { width: '100%', marginTop: spacing.lg, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  error: { color: colors.danger, marginBottom: spacing.sm },
  editButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
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
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.xl,
    ...card,
    paddingVertical: spacing.lg,
  },
  statsLoading: { marginVertical: spacing.xl },
  stat: { alignItems: 'center', flex: 1, gap: 4 },
  statValue: { ...typography.h3 },
  statLabel: { ...typography.caption },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  menuItemText: { ...typography.body, flex: 1, fontWeight: '600' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.onPrimary, fontWeight: '700' },
  cancelButton: { backgroundColor: colors.surfaceAlt },
  cancelButtonText: { color: colors.text, fontWeight: '600' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    width: '100%',
    marginTop: spacing.sm,
  },
  logoutButtonText: { color: colors.danger, fontWeight: '700' },
});
