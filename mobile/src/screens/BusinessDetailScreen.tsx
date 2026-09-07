import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchBusiness } from '../api/businesses';
import { fetchComments, createComment, deleteComment } from '../api/comments';
import { fetchReactionSummary, toggleReaction } from '../api/reactions';
import { BusinessDetail, Comment } from '../types';
import { BUSINESS_CATEGORY_LABELS } from '../categoryStyle';
import { useAuth } from '../context/AuthContext';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Stars({ value }: { value: number }) {
  return <Text style={styles.stars}>{'★'.repeat(value)}{'☆'.repeat(5 - value)}</Text>;
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.starPicker}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Text style={styles.starPickerStar}>{n <= value ? '★' : '☆'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ReviewRow({
  comment,
  isMine,
  onDelete,
}: {
  comment: Comment;
  isMine: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={styles.commentRow}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentAuthor}>{comment.author.username}</Text>
        <Text style={styles.commentTime}>{formatDate(comment.createdAt)}</Text>
      </View>
      {comment.rating != null && <Stars value={comment.rating} />}
      <Text style={styles.commentContent}>{comment.content}</Text>
      {isMine && (
        <TouchableOpacity onPress={() => onDelete(comment.id)}>
          <Text style={styles.deleteLink}>Borrar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function BusinessDetailScreen({ route }: any) {
  const { businessId } = route.params as { businessId: string };
  const { user } = useAuth();

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [myRating, setMyRating] = useState(5);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [businessData, commentsData, summary] = await Promise.all([
        fetchBusiness(businessId),
        fetchComments({ businessId }),
        fetchReactionSummary({ businessId }),
      ]);
      setBusiness(businessData);
      setComments(commentsData);
      setLikeCount(summary.find((s) => s.type === 'LIKE')?.count ?? 0);
    } catch (err) {
      Alert.alert('Error', 'No se pudo cargar el negocio.');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleLike() {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      const { reacted } = await toggleReaction({ businessId });
      setLiked(reacted);
    } catch (err) {
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    }
  }

  async function handleSendReview() {
    if (reviewText.trim().length < 1) return;
    setSending(true);
    try {
      const created = await createComment({
        content: reviewText.trim(),
        businessId,
        rating: myRating,
      });
      setComments((prev) => [
        { ...created, author: { id: user!.id, username: user!.username } },
        ...prev,
      ]);
      setReviewText('');
      load(); // refresca el promedio de calificación
    } catch (err) {
      Alert.alert('No se pudo enviar la reseña', 'Intentá de nuevo en un momento.');
    } finally {
      setSending(false);
    }
  }

  function handleDeleteComment(id: string) {
    Alert.alert('Borrar reseña', '¿Seguro que querés borrarla?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(id);
            setComments((prev) => prev.filter((c) => c.id !== id));
            load();
          } catch (err) {
            Alert.alert('Error', 'No se pudo borrar la reseña.');
          }
        },
      },
    ]);
  }

  if (loading || !business) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.listContent}
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReviewRow
            comment={item}
            isMine={item.authorId === user?.id}
            onDelete={handleDeleteComment}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Sin reseñas todavía. ¡Sé el primero!</Text>
        }
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <Text style={styles.categoryTag}>{BUSINESS_CATEGORY_LABELS[business.category]}</Text>
              {business.verified && <Text style={styles.verified}>✓ verificado</Text>}
            </View>
            <Text style={styles.title}>{business.name}</Text>
            {business.description && (
              <Text style={styles.description}>{business.description}</Text>
            )}
            {business.address && <Text style={styles.meta}>📍 {business.address}</Text>}
            {business.phone && <Text style={styles.meta}>📞 {business.phone}</Text>}
            {business.hours && <Text style={styles.meta}>🕒 {business.hours}</Text>}

            <View style={styles.ratingRow}>
              {business.rating.average != null ? (
                <>
                  <Stars value={Math.round(business.rating.average)} />
                  <Text style={styles.ratingText}>
                    {business.rating.average.toFixed(1)} ({business.rating.count})
                  </Text>
                </>
              ) : (
                <Text style={styles.ratingText}>Sin calificaciones todavía</Text>
              )}
            </View>

            <TouchableOpacity style={styles.likeButton} onPress={handleToggleLike}>
              <Text style={styles.likeText}>{liked ? '❤️' : '🤍'} {likeCount}</Text>
            </TouchableOpacity>

            <Text style={styles.commentsTitle}>Reseñas</Text>
          </View>
        }
      />
      <View style={styles.inputBar}>
        <View style={styles.inputBarInner}>
          <StarPicker value={myRating} onChange={setMyRating} />
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Escribí tu reseña..."
              value={reviewText}
              onChangeText={setReviewText}
              multiline
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendReview}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendText}>Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  categoryTag: { color: '#2563eb', fontWeight: '600', fontSize: 13 },
  verified: { color: '#16a34a', fontSize: 12, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  description: { color: '#374151', fontSize: 15, marginBottom: 8 },
  meta: { color: '#6b7280', fontSize: 13, marginBottom: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  stars: { color: '#f59e0b', fontSize: 16 },
  ratingText: { color: '#6b7280', fontSize: 13 },
  likeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 14,
    marginBottom: 20,
  },
  likeText: { fontSize: 15, fontWeight: '600' },
  commentsTitle: { fontWeight: '700', fontSize: 15, marginBottom: 8 },
  commentRow: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingVertical: 10 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  commentAuthor: { fontWeight: '600' },
  commentTime: { color: '#9ca3af', fontSize: 11 },
  commentContent: { marginTop: 4, color: '#111827' },
  deleteLink: { color: '#dc2626', fontSize: 12, marginTop: 6 },
  emptyText: { color: '#6b7280', paddingVertical: 16 },
  inputBar: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  inputBarInner: { gap: 6 },
  starPicker: { flexDirection: 'row', gap: 4 },
  starPickerStar: { fontSize: 24, color: '#f59e0b' },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: { backgroundColor: '#2563eb', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendText: { color: '#fff', fontWeight: '600' },
});
