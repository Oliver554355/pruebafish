import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchBusiness } from '../api/businesses';
import { fetchComments, createComment, deleteComment } from '../api/comments';
import { fetchReactionSummary, toggleReaction } from '../api/reactions';
import { fetchProducts } from '../api/products';
import { toggleSaved } from '../api/saved';
import { BusinessDetail, Comment, Product } from '../types';
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
  onPressAuthor,
}: {
  comment: Comment;
  isMine: boolean;
  onDelete: (id: string) => void;
  onPressAuthor: (userId: string) => void;
}) {
  return (
    <View style={styles.commentRow}>
      <View style={styles.commentHeader}>
        <TouchableOpacity onPress={() => onPressAuthor(comment.authorId)}>
          <Text style={styles.commentAuthor}>{comment.author.username}</Text>
        </TouchableOpacity>
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

export default function BusinessDetailScreen({ route, navigation }: any) {
  const { businessId } = route.params as { businessId: string };
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [myRating, setMyRating] = useState(5);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [businessData, productsData, commentsData, summary] = await Promise.all([
        fetchBusiness(businessId),
        fetchProducts(businessId),
        fetchComments({ businessId }),
        fetchReactionSummary({ businessId }),
      ]);
      setBusiness(businessData);
      setProducts(productsData);
      setComments(commentsData);
      setLikeCount(summary.find((s) => s.type === 'LIKE')?.count ?? 0);
    } catch (err) {
      Alert.alert('Error', 'No se pudo cargar el point.');
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

  async function handleToggleSave() {
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      const { saved: nowSaved } = await toggleSaved({ businessId });
      setSaved(nowSaved);
    } catch (err) {
      setSaved(wasSaved);
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

  function handleGetDirections() {
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${business!.lat},${business!.lng}`,
    );
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
            onPressAuthor={(userId) => navigation.navigate('UserProfile', { userId })}
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

            {business.photos.length > 0 && (
              <FlatList
                horizontal
                style={styles.photoRow}
                data={business.photos}
                keyExtractor={(p) => p.id}
                renderItem={({ item }) => (
                  <Image source={{ uri: item.url }} style={styles.photo} />
                )}
              />
            )}

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

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.likeButton} onPress={handleToggleLike}>
                <Text style={styles.likeText}>{liked ? '❤️' : '🤍'} {likeCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleToggleSave}>
                <Text style={styles.saveText}>{saved ? '🔖 Guardado' : '🏷️ Guardar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.directionsButton} onPress={handleGetDirections}>
                <Text style={styles.directionsText}>🧭 Cómo llegar</Text>
              </TouchableOpacity>
            </View>

            {user && business.ownerId === user.id ? (
              <TouchableOpacity
                style={styles.ownerButton}
                onPress={() => navigation.navigate('BusinessPanel', { businessId })}
              >
                <Text style={styles.ownerButtonText}>Panel del point</Text>
              </TouchableOpacity>
            ) : (
              user &&
              !business.verified && (
                <TouchableOpacity
                  style={styles.claimButton}
                  onPress={() =>
                    navigation.navigate('ClaimBusiness', {
                      businessId,
                      businessName: business.name,
                    })
                  }
                >
                  <Text style={styles.claimButtonText}>Reclamar este point</Text>
                </TouchableOpacity>
              )
            )}

            {products.length > 0 && (
              <>
                <Text style={styles.commentsTitle}>Menú / Productos</Text>
                {products.map((product) => (
                  <View key={product.id} style={styles.productRow}>
                    {product.photos[0] && (
                      <Image source={{ uri: product.photos[0].url }} style={styles.productPhoto} />
                    )}
                    <View style={styles.flex}>
                      <Text style={styles.productName}>{product.name}</Text>
                      {product.description && (
                        <Text style={styles.meta}>{product.description}</Text>
                      )}
                    </View>
                    {product.price != null && (
                      <Text style={styles.productPrice}>S/ {product.price}</Text>
                    )}
                  </View>
                ))}
              </>
            )}

            <Text style={styles.commentsTitle}>Reseñas</Text>
          </View>
        }
      />
      <View style={[styles.inputBar, { paddingBottom: 10 + insets.bottom }]}>
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
  photoRow: { marginTop: 10 },
  photo: { width: 130, height: 100, borderRadius: 10, marginRight: 8 },
  ownerButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: -6,
    marginBottom: 20,
  },
  ownerButtonText: { color: '#fff', fontWeight: '600' },
  claimButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: -6,
    marginBottom: 20,
  },
  claimButtonText: { color: '#2563eb', fontWeight: '600' },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  productPhoto: { width: 48, height: 48, borderRadius: 8 },
  productName: { fontWeight: '600' },
  productPrice: { color: '#16a34a', fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  categoryTag: { color: '#2563eb', fontWeight: '600', fontSize: 13 },
  verified: { color: '#16a34a', fontSize: 12, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  description: { color: '#374151', fontSize: 15, marginBottom: 8 },
  meta: { color: '#6b7280', fontSize: 13, marginBottom: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  stars: { color: '#f59e0b', fontSize: 16 },
  ratingText: { color: '#6b7280', fontSize: 13 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, marginBottom: 20 },
  likeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  likeText: { fontSize: 15, fontWeight: '600' },
  saveButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveText: { fontSize: 15, fontWeight: '600' },
  directionsButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  directionsText: { fontSize: 15, fontWeight: '600' },
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
