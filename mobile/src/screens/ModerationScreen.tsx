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
import { fetchBusinessClaims, reviewBusinessClaim } from '../api/businessClaims';
import { BusinessClaim } from '../types';

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
        <ActivityIndicator />
      </View>
    );
  }

  return (
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
        />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay solicitudes pendientes.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.businessName}>{item.business.name}</Text>
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
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Aprobar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#6b7280' },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  businessName: { fontSize: 16, fontWeight: '700' },
  meta: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  message: { color: '#374151', marginTop: 8, fontStyle: 'italic' },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  button: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  rejectButton: { backgroundColor: '#f3f4f6' },
  rejectButtonText: { color: '#dc2626', fontWeight: '600' },
});
