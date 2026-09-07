import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchBusinessClaims, reviewBusinessClaim } from '../api/businessClaims';
import { BusinessClaim } from '../types';
import { card, colors, radius, spacing, typography } from '../theme';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ModerationScreen() {
  const [claims, setClaims] = useState<BusinessClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setClaims(await fetchBusinessClaims('PENDIENTE'));
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReview(id: string, status: 'APROBADO' | 'RECHAZADO') {
    setReviewingId(id);
    try {
      await reviewBusinessClaim(id, status);
      setClaims((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      Alert.alert(
        'No se pudo procesar',
        err?.response?.data?.message ?? 'Intentá de nuevo en un momento.',
      );
    } finally {
      setReviewingId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <View style={[styles.tab, styles.tabActive]}>
          <Text style={styles.tabTextActive}>Solicitudes de dueño</Text>
        </View>
      </View>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={claims}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No hay solicitudes pendientes.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="storefront-outline" size={18} color={colors.primary} />
              <Text style={styles.businessName}>{item.business.name}</Text>
            </View>
            <Text style={styles.meta}>
              Solicitado por {item.user.username} · {formatDate(item.createdAt)}
            </Text>
            {item.message && <Text style={styles.message}>"{item.message}"</Text>}
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.button, styles.rejectButton]}
                onPress={() => handleReview(item.id, 'RECHAZADO')}
                disabled={reviewingId === item.id}
              >
                <Text style={styles.rejectButtonText}>Rechazar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => handleReview(item.id, 'APROBADO')}
                disabled={reviewingId === item.id}
              >
                {reviewingId === item.id ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <Text style={styles.buttonText}>Aprobar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyText: { color: colors.textMuted },
  tabBar: { flexDirection: 'row', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabTextActive: { ...typography.caption, color: colors.onPrimary, fontWeight: '700' },
  listContent: { padding: spacing.lg },
  card: { ...card, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  businessName: { ...typography.h3 },
  meta: { ...typography.caption, marginTop: spacing.xs },
  message: { ...typography.bodyMuted, marginTop: spacing.sm, fontStyle: 'italic' },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  button: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  buttonText: { color: colors.onPrimary, fontWeight: '700' },
  rejectButton: { backgroundColor: colors.surfaceAlt },
  rejectButtonText: { color: colors.danger, fontWeight: '700' },
});
