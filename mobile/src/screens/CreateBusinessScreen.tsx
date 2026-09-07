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
import { createBusiness } from '../api/businesses';
import { BusinessCategory } from '../types';
import { BUSINESS_CATEGORY_LABELS } from '../categoryStyle';
import { useCurrentLocation } from '../useCurrentLocation';

const CATEGORIES = Object.keys(BUSINESS_CATEGORY_LABELS) as BusinessCategory[];

export default function CreateBusinessScreen({ navigation }: any) {
  const { coords } = useCurrentLocation();
  const [category, setCategory] = useState<BusinessCategory>('RESTAURANTE');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!coords) {
      Alert.alert('Ubicación no disponible', 'Esperá a que se detecte tu ubicación.');
      return;
    }
    if (name.trim().length < 3) {
      Alert.alert('Nombre muy corto', 'Escribí al menos 3 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      await createBusiness({
        category,
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        hours: hours.trim() || undefined,
        lat: coords.lat,
        lng: coords.lng,
      });
      Alert.alert('Listo', 'El point se creó correctamente.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        'No se pudo agregar',
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
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategory(cat)}
            style={[
              styles.chip,
              { backgroundColor: category === cat ? '#2563eb' : '#f3f4f6' },
            ]}
          >
            <Text style={{ color: category === cat ? '#fff' : '#374151', fontWeight: '600' }}>
              {BUSINESS_CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre del point"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Descripción (opcional)</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="¿Qué ofrece este lugar?"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Dirección (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Calle y número"
        value={address}
        onChangeText={setAddress}
      />

      <Text style={styles.label}>Teléfono (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="999 999 999"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Horario (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Lun a sáb 9am-8pm"
        value={hours}
        onChangeText={setHours}
      />

      <Text style={styles.hint}>
        Se agrega con tu ubicación actual{coords ? '' : ' (buscando...)'}.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Crear point</Text>
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
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  textarea: { height: 80, textAlignVertical: 'top' },
  hint: { color: '#6b7280', fontSize: 12, marginTop: 12 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
