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
import { fetchPost } from '../api/posts';
import { fetchComments, createComment, deleteComment } from '../api/comments';
import { fetchReactionSummary, toggleReaction } from '../api/reactions';
import { Comment, NearbyPost } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../categoryStyle';
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
      <Text style={styles.commentContent}>{comment.content}</Text>
      {isMine && (
        <TouchableOpacity onPress={() => onDelete(comment.id)}>
          <Text style={styles.deleteLink}>Borrar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function PostDetailScreen({ route }: any) {
  const { postId } = route.params as { postId: string };
  const { user } = useAuth();

  const [post, setPost] = useState<NearbyPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
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
            <Text style={styles.date}>{formatDate(post.createdAt)}</Text>

            <TouchableOpacity style={styles.likeButton} onPress={handleToggleLike}>
              <Text style={styles.likeText}>
                {liked ? '❤️' : '🤍'} {likeCount}
              </Text>
            </TouchableOpacity>

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
  date: { color: '#6b7280', fontSize: 12, marginBottom: 14 },
  likeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  likeText: { fontSize: 15, fontWeight: '600' },
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
