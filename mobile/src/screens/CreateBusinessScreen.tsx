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
import { Ionicons } from '@expo/vector-icons';
import { createBusiness } from '../api/businesses';
import { BusinessCategory } from '../types';
import { BUSINESS_CATEGORY_COLORS, BUSINESS_CATEGORY_ICONS, BUSINESS_CATEGORY_LABELS } from '../categoryStyle';
import { useCurrentLocation } from '../useCurrentLocation';
import { colors, radius, spacing, typography } from '../theme';

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
        {CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={[styles.chip, active && { backgroundColor: BUSINESS_CATEGORY_COLORS[cat], borderColor: BUSINESS_CATEGORY_COLORS[cat] }]}
            >
              <Ionicons name={BUSINESS_CATEGORY_ICONS[cat]} size={13} color={active ? colors.onPrimary : colors.textMuted} />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {BUSINESS_CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre del point"
        placeholderTextColor={colors.textFaint}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Descripción (opcional)</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="¿Qué ofrece este lugar?"
        placeholderTextColor={colors.textFaint}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Dirección (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Calle y número"
        placeholderTextColor={colors.textFaint}
        value={address}
        onChangeText={setAddress}
      />

      <Text style={styles.label}>Teléfono (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="999 999 999"
        placeholderTextColor={colors.textFaint}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Horario (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Lun a sáb 9am-8pm"
        placeholderTextColor={colors.textFaint}
        value={hours}
        onChangeText={setHours}
      />

      <Text style={styles.hint}>
        Se agrega con tu ubicación actual{coords ? '' : ' (buscando...)'}.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>Crear point</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.bg, flexGrow: 1 },
  label: { ...typography.h3, fontSize: 13, marginTop: spacing.lg, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { ...typography.caption, fontWeight: '600' },
  chipTextActive: { color: colors.onPrimary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  hint: { ...typography.caption, marginTop: spacing.md },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 15,
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  buttonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
});
