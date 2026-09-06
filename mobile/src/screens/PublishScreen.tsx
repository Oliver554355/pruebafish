import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { createPost } from '../api/posts';
import { PostCategory } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../categoryStyle';
import { useCurrentLocation } from '../useCurrentLocation';

// ANIMAL_*, EVENTO y VENTA requieren un formulario propio (especie,
// fecha del evento, precio, etc. — ver backend/src/posts/dto). Hasta que
// existan esas pantallas, esta version solo cubre las categorias "simples"
// que no llevan datos extra.
const SIMPLE_CATEGORIES: PostCategory[] = [
  'ACCIDENTE',
  'INCIDENTE',
  'RECOMENDACION',
  'AVISO',
  'OTRO',
];

export default function PublishScreen({ navigation }: any) {
  const { coords } = useCurrentLocation();
  const [category, setCategory] = useState<PostCategory>('ACCIDENTE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!coords) {
      Alert.alert('Ubicación no disponible', 'Esperá a que se detecte tu ubicación.');
      return;
    }
    if (title.trim().length < 3) {
      Alert.alert('Título muy corto', 'Escribí al menos 3 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      await createPost({
        category,
        title: title.trim(),
        description: description.trim() || undefined,
        lat: coords.lat,
        lng: coords.lng,
      });
      setTitle('');
      setDescription('');
      Alert.alert('Listo', 'Tu publicación se creó correctamente.');
      navigation.navigate('Comunidad');
    } catch (err: any) {
      Alert.alert(
        'No se pudo publicar',
        err?.response?.data?.message ?? 'Intentá de nuevo en un momento.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Categoría</Text>
      <View style={styles.chips}>
        {SIMPLE_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategory(cat)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  category === cat ? CATEGORY_COLORS[cat] : '#f3f4f6',
              },
            ]}
          >
            <Text
              style={{
                color: category === cat ? '#fff' : '#374151',
                fontWeight: '600',
              }}
            >
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Título</Text>
      <TextInput
        style={styles.input}
        placeholder="¿Qué está pasando?"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Descripción (opcional)</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Agregá más detalles..."
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.hint}>
        Se publica con tu ubicación actual{coords ? '' : ' (buscando...)'}.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Publicar</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { fontWeight: '600', marginTop: 16, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  hint: { color: '#6b7280', fontSize: 12, marginTop: 12 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
