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
import { fetchPost, markPostSold } from '../api/posts';
import { fetchComments, createComment, deleteComment } from '../api/comments';
import { fetchReactionSummary, toggleReaction } from '../api/reactions';
import { toggleSaved } from '../api/saved';
import { Comment, PostDetail } from '../types';
import {
  ANIMAL_SEX_LABELS,
  ANIMAL_SPECIES_LABELS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  SALE_CONDITION_LABELS,
} from '../categoryStyle';
import { useAuth } from '../context/AuthContext';

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

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postData, commentsData, summary] = await Promise.all([
        fetchPost(postId),
        fetchComments({ postId }),
        fetchReactionSummary({ postId }),
      ]);
      setPost(postData);
      setComments(commentsData);
      setLikeCount(summary.find((s) => s.type === 'LIKE')?.count ?? 0);
    } catch (err) {
      Alert.alert('Error', 'No se pudo cargar la publicación.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

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
            <View
              style={[styles.badge, { backgroundColor: CATEGORY_COLORS[post.category] }]}
            >
              <Text style={styles.badgeText}>{CATEGORY_LABELS[post.category]}</Text>
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
              <TouchableOpacity style={styles.likeButton} onPress={handleToggleLike}>
                <Text style={styles.likeText}>
                  {liked ? '❤️' : '🤍'} {likeCount}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleToggleSave}>
                <Text style={styles.saveText}>{saved ? '🔖 Guardado' : '🏷️ Guardar'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.commentsTitle}>Comentarios</Text>
          </View>
        }
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Escribí un comentario..."
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
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendText}>Enviar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 8 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  description: { color: '#374151', fontSize: 15, marginBottom: 8 },
  author: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  date: { color: '#6b7280', fontSize: 12, marginTop: 2, marginBottom: 14 },
  photoRow: { marginBottom: 14 },
  photo: { width: 150, height: 110, borderRadius: 10, marginRight: 8 },
  detailsBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  detailsTitle: { fontWeight: '700', marginBottom: 6 },
  detailsRow: { color: '#374151', marginBottom: 3 },
  priceRow: { fontSize: 17, fontWeight: '700', color: '#0891b2', marginBottom: 4 },
  soldButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 8,
  },
  soldButtonText: { color: '#fff', fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
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
  commentsTitle: { fontWeight: '700', fontSize: 15, marginBottom: 8 },
  commentRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 10,
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  commentAuthor: { fontWeight: '600' },
  commentTime: { color: '#9ca3af', fontSize: 11 },
  commentContent: { marginTop: 4, color: '#111827' },
  deleteLink: { color: '#dc2626', fontSize: 12, marginTop: 6 },
  emptyText: { color: '#6b7280', paddingVertical: 16 },
  inputBar: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
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
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendText: { color: '#fff', fontWeight: '600' },
});
