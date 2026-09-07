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
import { Ionicons } from '@expo/vector-icons';
import { fetchPost, markPostSold } from '../api/posts';
import { fetchComments, createComment, deleteComment } from '../api/comments';
import { fetchReactionSummary, toggleReaction } from '../api/reactions';
import { toggleSaved } from '../api/saved';
import { Comment, PostDetail } from '../types';
import {
  ANIMAL_SEX_LABELS,
  ANIMAL_SPECIES_LABELS,
  CATEGORY_COLORS,
  CATEGORY_ICON_V2,
  CATEGORY_LABELS,
  SALE_CONDITION_LABELS,
} from '../categoryStyle';
import { PixelIconV2 } from '../PixelIconV2';
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

function CommentRow({
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
      <Text style={styles.commentContent}>{comment.content}</Text>
      {isMine && (
        <TouchableOpacity onPress={() => onDelete(comment.id)}>
          <Text style={styles.deleteLink}>Borrar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function PostDetailScreen({ route, navigation }: any) {
  const { postId } = route.params as { postId: string };
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [nextCommentsCursor, setNextCommentsCursor] = useState<string | null>(null);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postData, commentsPage, summary] = await Promise.all([
        fetchPost(postId),
        fetchComments({ postId }),
        fetchReactionSummary({ postId }),
      ]);
      setPost(postData);
      setComments(commentsPage.items);
      setNextCommentsCursor(commentsPage.nextCursor);
      setLikeCount(summary.find((s) => s.type === 'LIKE')?.count ?? 0);
    } catch (err) {
      Alert.alert('Error', 'No se pudo cargar la publicación.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  async function loadMoreComments() {
    if (!nextCommentsCursor || loadingMoreComments) return;
    setLoadingMoreComments(true);
    try {
      const page = await fetchComments({ postId, cursor: nextCommentsCursor });
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
    // Optimista: se refleja al toque, y se corrige si el server falla.
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      const { reacted } = await toggleReaction({ postId });
      setLiked(reacted);
    } catch (err) {
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    }
  }

  async function handleSendComment() {
    if (commentText.trim().length < 1) return;
    setSending(true);
    try {
      const created = await createComment({ content: commentText.trim(), postId });
      setComments((prev) => [
        { ...created, author: { id: user!.id, username: user!.username } },
        ...prev,
      ]);
      setCommentText('');
    } catch (err) {
      Alert.alert('No se pudo comentar', 'Intentá de nuevo en un momento.');
    } finally {
      setSending(false);
    }
  }

  async function handleToggleSave() {
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      const { saved: nowSaved } = await toggleSaved({ postId });
      setSaved(nowSaved);
    } catch (err) {
      setSaved(wasSaved);
    }
  }

  async function handleMarkSold() {
    try {
      await markPostSold(postId);
      setPost((prev) =>
        prev && prev.saleDetails
          ? { ...prev, saleDetails: { ...prev.saleDetails, sold: true } }
          : prev,
      );
    } catch (err) {
      Alert.alert('Error', 'No se pudo marcar como vendida.');
    }
  }

  function handleGetDirections() {
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${post!.lat},${post!.lng}`,
    );
  }

  function handleDeleteComment(id: string) {
    Alert.alert('Borrar comentario', '¿Seguro que querés borrarlo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(id);
            setComments((prev) => prev.filter((c) => c.id !== id));
          } catch (err) {
            Alert.alert('Error', 'No se pudo borrar el comentario.');
          }
        },
      },
    ]);
  }

  if (loading || !post) {
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
          <CommentRow
            comment={item}
            isMine={item.authorId === user?.id}
            onDelete={handleDeleteComment}
            onPressAuthor={(userId) => navigation.navigate('UserProfile', { userId })}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Sin comentarios todavía. ¡Sé el primero!</Text>
        }
        ListHeaderComponent={
          <View>
            <View style={styles.badge}>
              <PixelIconV2 name={CATEGORY_ICON_V2[post.category]} size={26} />
              <Text style={[styles.badgeText, { color: CATEGORY_COLORS[post.category] }]}>
                {CATEGORY_LABELS[post.category]}
              </Text>
            </View>
            <Text style={styles.title}>{post.title}</Text>
            {post.description && <Text style={styles.description}>{post.description}</Text>}
            <TouchableOpacity
              onPress={() => navigation.navigate('UserProfile', { userId: post.author.id })}
            >
              <Text style={styles.author}>Publicado por {post.author.username}</Text>
            </TouchableOpacity>
            <Text style={styles.date}>{formatDate(post.createdAt)}</Text>

            {post.photos.length > 0 && (
              <FlatList
                horizontal
                style={styles.photoRow}
                data={post.photos}
                keyExtractor={(p) => p.id}
                renderItem={({ item }) => (
                  <Image source={{ uri: item.url }} style={styles.photo} />
                )}
              />
            )}

            {post.animalDetails && (
              <View style={styles.detailsBox}>
                <Text style={styles.detailsTitle}>Datos del animal</Text>
                <Text style={styles.detailsRow}>
                  Especie: {ANIMAL_SPECIES_LABELS[post.animalDetails.species]}
                </Text>
                {post.animalDetails.petName && (
                  <Text style={styles.detailsRow}>Nombre: {post.animalDetails.petName}</Text>
                )}
                {post.animalDetails.color && (
                  <Text style={styles.detailsRow}>Color: {post.animalDetails.color}</Text>
                )}
                {post.animalDetails.sex && (
                  <Text style={styles.detailsRow}>
                    Sexo: {ANIMAL_SEX_LABELS[post.animalDetails.sex]}
                  </Text>
                )}
                {post.animalDetails.approxAgeYears != null && (
                  <Text style={styles.detailsRow}>
                    Edad aproximada: {post.animalDetails.approxAgeYears} años
                  </Text>
                )}
                {post.animalDetails.characteristics && (
                  <Text style={styles.detailsRow}>
                    Características: {post.animalDetails.characteristics}
                  </Text>
                )}
                {post.animalDetails.adoptionConditions && (
                  <Text style={styles.detailsRow}>
                    Condiciones de adopción: {post.animalDetails.adoptionConditions}
                  </Text>
                )}
                {post.animalDetails.contactPhone && (
                  <Text style={styles.detailsRow}>
                    Contacto: {post.animalDetails.contactPhone}
                  </Text>
                )}
              </View>
            )}

            {post.eventDetails && (
              <View style={styles.detailsBox}>
                <Text style={styles.detailsTitle}>Datos del evento</Text>
                <Text style={styles.detailsRow}>
                  Fecha: {formatDate(post.eventDetails.startsAt)}
                </Text>
                {post.eventDetails.organizerName && (
                  <Text style={styles.detailsRow}>
                    Organiza: {post.eventDetails.organizerName}
                  </Text>
                )}
              </View>
            )}

            {post.saleDetails && (
              <View style={styles.detailsBox}>
                <Text style={styles.detailsTitle}>Datos de la venta</Text>
                <Text style={styles.priceRow}>
                  {post.saleDetails.currency} {post.saleDetails.price}
                  {post.saleDetails.sold ? '  ·  Vendido' : ''}
                </Text>
                {post.saleDetails.condition && (
                  <Text style={styles.detailsRow}>
                    Condición: {SALE_CONDITION_LABELS[post.saleDetails.condition]}
                  </Text>
                )}
                {!post.saleDetails.sold && post.authorId === user?.id && (
                  <TouchableOpacity style={styles.soldButton} onPress={handleMarkSold}>
                    <Text style={styles.soldButtonText}>Marcar como vendida</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

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

            <Text style={styles.commentsTitle}>Comentarios</Text>
          </View>
        }
        onEndReachedThreshold={0.4}
        onEndReached={loadMoreComments}
        ListFooterComponent={
          loadingMoreComments ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null
        }
      />
      <View style={[styles.inputBar, { paddingBottom: 10 + insets.bottom }]}>
        <TextInput
          style={styles.input}
          placeholder="Escribí un comentario..."
          placeholderTextColor={colors.textFaint}
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSendComment}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <Ionicons name="send" size={18} color={colors.onPrimary} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  listContent: { padding: spacing.lg, paddingBottom: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  badgeText: { fontSize: 13, fontWeight: '700' },
  title: { ...typography.h1, fontSize: 20, marginBottom: spacing.xs },
  description: { ...typography.body, marginBottom: spacing.sm },
  author: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  date: { ...typography.caption, marginTop: 2, marginBottom: spacing.lg },
  photoRow: { marginBottom: spacing.lg },
  photo: { width: 150, height: 110, borderRadius: radius.md, marginRight: spacing.sm },
  detailsBox: { ...card, marginBottom: spacing.lg },
  detailsTitle: { ...typography.h3, marginBottom: spacing.sm },
  detailsRow: { ...typography.bodyMuted, marginBottom: 3 },
  priceRow: { fontSize: 17, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  soldButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  soldButtonText: { color: colors.text, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
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
  commentRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  commentAuthor: { color: colors.text, fontWeight: '600' },
  commentTime: { color: colors.textFaint, fontSize: 11 },
  commentContent: { marginTop: 4, color: colors.textMuted },
  deleteLink: { color: colors.danger, fontSize: 12, marginTop: 6 },
  emptyText: { color: colors.textMuted, paddingVertical: spacing.lg },
  footer: { marginVertical: spacing.lg },
  inputBar: {
    flexDirection: 'row',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'flex-end',
  },
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
