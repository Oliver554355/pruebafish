import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchBusiness } from '../api/businesses';
import { fetchComments, createComment, deleteComment } from '../api/comments';
import { fetchReactionSummary, toggleReaction } from '../api/reactions';
import { fetchProducts } from '../api/products';
import { toggleSaved } from '../api/saved';
import { BusinessDetail, Comment, Product } from '../types';
import { BUSINESS_CATEGORY_COLORS, BUSINESS_CATEGORY_ICON_V2, BUSINESS_CATEGORY_LABELS } from '../categoryStyle';
import { PixelIconV2, pixelIconSvgMarkup } from '../PixelIconV2';
import { toKebab } from './MapScreen';
import { useAuth } from '../context/AuthContext';
import { card, colors, radius, spacing, typography } from '../theme';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Stars({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= value ? 'star' : 'star-outline'} size={15} color={colors.warning} />
      ))}
    </View>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.starPicker}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={22} color={colors.warning} />
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
  const [nextCommentsCursor, setNextCommentsCursor] = useState<string | null>(null);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
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
      const [businessData, productsData, commentsPage, summary] = await Promise.all([
        fetchBusiness(businessId),
        fetchProducts(businessId),
        fetchComments({ businessId }),
        fetchReactionSummary({ businessId }),
      ]);
      setBusiness(businessData);
      setProducts(productsData);
      setComments(commentsPage.items);
      setNextCommentsCursor(commentsPage.nextCursor);
      setLikeCount(summary.find((s) => s.type === 'LIKE')?.count ?? 0);
    } catch (err) {
      Alert.alert('Error', 'No se pudo cargar el point.');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  async function loadMoreComments() {
    if (!nextCommentsCursor || loadingMoreComments) return;
    setLoadingMoreComments(true);
    try {
      const page = await fetchComments({ businessId, cursor: nextCommentsCursor });
      setComments((prev) => [...prev, ...page.items]);
      setNextCommentsCursor(page.nextCursor);
    } finally {
      setLoadingMoreComments(false);
    }
  }

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
    // Ruteo nativo dentro de la app (linea recta sobre nuestro propio mapa),
    // no abre Google Maps -- ver MapScreen.tsx.
    navigation.navigate('Main', {
      screen: 'Mapa',
      params: {
        destination: {
          lat: business!.lat,
          lng: business!.lng,
          label: business!.name,
          svg: pixelIconSvgMarkup(`pins/negocio-${toKebab(business!.category)}`, 32),
          w: 32,
          h: (32 * 24) / 20,
        },
      },
    });
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
        <ActivityIndicator color={colors.primary} />
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
              <PixelIconV2 name={BUSINESS_CATEGORY_ICON_V2[business.category]} size={30} />
              <Text style={[styles.categoryTag, { color: BUSINESS_CATEGORY_COLORS[business.category] }]}>
                {BUSINESS_CATEGORY_LABELS[business.category]}
              </Text>
              {business.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                  <Text style={styles.verified}>Verificado</Text>
                </View>
              )}
            </View>
            <Text style={styles.title}>{business.name}</Text>
            {business.description && (
              <Text style={styles.description}>{business.description}</Text>
            )}
            {business.address && (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.meta}>{business.address}</Text>
              </View>
            )}
            {business.phone && (
              <View style={styles.metaRow}>
                <Ionicons name="call-outline" size={14} color={colors.textMuted} />
                <Text style={styles.meta}>{business.phone}</Text>
              </View>
            )}
            {business.hours && (
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={styles.meta}>{business.hours}</Text>
              </View>
            )}

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
              <TouchableOpacity style={styles.actionButton} onPress={handleToggleLike}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? colors.danger : colors.text} />
                <Text style={styles.actionText}>{likeCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleToggleSave}>
                <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={16} color={saved ? colors.primary : colors.text} />
                <Text style={styles.actionText}>{saved ? 'Guardado' : 'Guardar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleGetDirections}>
                <Ionicons name="navigate-outline" size={16} color={colors.text} />
                <Text style={styles.actionText}>Cómo llegar</Text>
              </TouchableOpacity>
            </View>

            {user &&
            (business.ownerId
              ? business.ownerId === user.id
              : business.createdById === user.id) ? (
              <TouchableOpacity
                style={styles.ownerButton}
                onPress={() => navigation.navigate('BusinessPanel', { businessId })}
              >
                <Ionicons name="settings-outline" size={15} color={colors.onPrimary} />
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
        onEndReachedThreshold={0.4}
        onEndReached={loadMoreComments}
        ListFooterComponent={
          loadingMoreComments ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null
        }
      />
      <View style={[styles.inputBar, { paddingBottom: 10 + insets.bottom }]}>
        <View style={styles.inputBarInner}>
          <StarPicker value={myRating} onChange={setMyRating} />
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Escribí tu reseña..."
              placeholderTextColor={colors.textFaint}
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
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <Ionicons name="send" size={18} color={colors.onPrimary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  listContent: { padding: spacing.lg, paddingBottom: spacing.sm },
  photoRow: { marginTop: spacing.sm },
  photo: { width: 130, height: 100, borderRadius: radius.md, marginRight: spacing.sm },
  ownerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
  },
  ownerButtonText: { color: colors.onPrimary, fontWeight: '700' },
  claimButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
  },
  claimButtonText: { color: colors.primary, fontWeight: '600' },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  productPhoto: { width: 48, height: 48, borderRadius: radius.sm },
  productName: { color: colors.text, fontWeight: '600' },
  productPrice: { color: colors.success, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  categoryTag: { fontWeight: '700', fontSize: 13, flex: 1 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verified: { color: colors.success, fontSize: 12, fontWeight: '600' },
  title: { ...typography.h1, fontSize: 20, marginBottom: spacing.xs },
  description: { ...typography.body, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  meta: { ...typography.bodyMuted, fontSize: 13 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  ratingText: { ...typography.caption },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xl },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  commentsTitle: { ...typography.h3, marginBottom: spacing.sm },
  commentRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  commentAuthor: { color: colors.text, fontWeight: '600' },
  commentTime: { color: colors.textFaint, fontSize: 11 },
  commentContent: { marginTop: 4, color: colors.textMuted },
  deleteLink: { color: colors.danger, fontSize: 12, marginTop: 6 },
  emptyText: { color: colors.textMuted, paddingVertical: spacing.lg },
  footer: { marginVertical: spacing.lg },
  inputBar: {
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  inputBarInner: { gap: spacing.xs },
  starPicker: { flexDirection: 'row', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    marginRight: spacing.sm,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
