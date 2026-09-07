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
import { createPost } from '../api/posts';
import {
  AnimalSex,
  AnimalSpecies,
  PostCategory,
  SaleCondition,
} from '../types';
import {
  ANIMAL_SEX_LABELS,
  ANIMAL_SPECIES_LABELS,
  CATEGORY_COLORS,
  CATEGORY_PIXEL_ICON,
  CATEGORY_LABELS,
  SALE_CONDITION_LABELS,
} from '../categoryStyle';
import { PixelIcon } from '../PixelIcon';
import { useCurrentLocation } from '../useCurrentLocation';
import { colors, radius, spacing, typography } from '../theme';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as PostCategory[];
const ANIMAL_CATEGORIES: PostCategory[] = ['ANIMAL_PERDIDO', 'ANIMAL_ENCONTRADO', 'ADOPCION'];
const ANIMAL_SPECIES_LIST = Object.keys(ANIMAL_SPECIES_LABELS) as AnimalSpecies[];
const ANIMAL_SEX_LIST = Object.keys(ANIMAL_SEX_LABELS) as AnimalSex[];
const SALE_CONDITION_LIST = Object.keys(SALE_CONDITION_LABELS) as SaleCondition[];

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default function PublishScreen({ navigation }: any) {
  const { coords } = useCurrentLocation();
  const [category, setCategory] = useState<PostCategory | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Animales (ANIMAL_PERDIDO / ANIMAL_ENCONTRADO / ADOPCION)
  const [species, setSpecies] = useState<AnimalSpecies>('PERRO');
  const [petName, setPetName] = useState('');
  const [color, setColor] = useState('');
  const [characteristics, setCharacteristics] = useState('');
  const [sex, setSex] = useState<AnimalSex | undefined>(undefined);
  const [approxAgeYears, setApproxAgeYears] = useState('');
  const [adoptionConditions, setAdoptionConditions] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Evento
  const [eventDate, setEventDate] = useState(todayISODate());
  const [eventTime, setEventTime] = useState('');
  const [organizerName, setOrganizerName] = useState('');

  // Venta
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<SaleCondition | undefined>(undefined);

  const isAnimal = category ? ANIMAL_CATEGORIES.includes(category) : false;
  const isEvent = category === 'EVENTO';
  const isSale = category === 'VENTA';

  async function handleSubmit() {
    if (!category) return;
    if (!coords) {
      Alert.alert('Ubicación no disponible', 'Esperá a que se detecte tu ubicación.');
      return;
    }
    if (title.trim().length < 3) {
      Alert.alert('Título muy corto', 'Escribí al menos 3 caracteres.');
      return;
    }

    let eventStartsAt: string | undefined;
    if (isEvent) {
      if (!eventTime.match(/^\d{1,2}:\d{2}$/)) {
        Alert.alert('Hora inválida', 'Escribí la hora del evento en formato HH:MM, ej. 19:00.');
        return;
      }
      const parsed = new Date(`${eventDate}T${eventTime}:00`);
      if (isNaN(parsed.getTime())) {
        Alert.alert('Fecha inválida', 'Revisá la fecha (AAAA-MM-DD) y la hora (HH:MM).');
        return;
      }
      eventStartsAt = parsed.toISOString();
    }

    let salePrice: number | undefined;
    if (isSale) {
      salePrice = Number(price.replace(',', '.'));
      if (!salePrice || salePrice <= 0) {
        Alert.alert('Precio inválido', 'Escribí un precio mayor a 0.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await createPost({
        category,
        title: title.trim(),
        description: description.trim() || undefined,
        lat: coords.lat,
        lng: coords.lng,
        animal: isAnimal
          ? {
              species,
              petName: petName.trim() || undefined,
              color: color.trim() || undefined,
              characteristics: characteristics.trim() || undefined,
              sex,
              approxAgeYears: approxAgeYears.trim()
                ? Number(approxAgeYears.replace(',', '.'))
                : undefined,
              adoptionConditions:
                category === 'ADOPCION' ? adoptionConditions.trim() || undefined : undefined,
              contactPhone: contactPhone.trim() || undefined,
            }
          : undefined,
        event: isEvent
          ? { startsAt: eventStartsAt!, organizerName: organizerName.trim() || undefined }
          : undefined,
        sale: isSale ? { price: salePrice!, condition } : undefined,
      });
      setTitle('');
      setDescription('');
      setPetName('');
      setColor('');
      setCharacteristics('');
      setApproxAgeYears('');
      setAdoptionConditions('');
      setContactPhone('');
      setEventTime('');
      setOrganizerName('');
      setPrice('');
      setCondition(undefined);
      setCategory(null);
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

  // Paso 1: grid de categorias (equivalente al "¿Que quieres publicar?" del
  // mockup). Al elegir una se pasa al formulario especifico de esa categoria.
  if (!category) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.stepTitle}>¿Qué querés publicar?</Text>
        <Text style={styles.stepSubtitle}>Elegí una categoría para empezar</Text>
        <View style={styles.grid}>
          {ALL_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={styles.gridCell}
              onPress={() => setCategory(cat)}
              activeOpacity={0.85}
            >
              <View style={[styles.gridIcon, { backgroundColor: CATEGORY_COLORS[cat] }]}>
                <PixelIcon name={CATEGORY_PIXEL_ICON[cat]} size={24} color={colors.onPrimary} />
              </View>
              <Text style={styles.gridLabel}>{CATEGORY_LABELS[cat]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.selectedCategoryRow} onPress={() => setCategory(null)}>
        <View style={[styles.selectedIcon, { backgroundColor: CATEGORY_COLORS[category] }]}>
          <PixelIcon name={CATEGORY_PIXEL_ICON[category]} size={20} color={colors.onPrimary} />
        </View>
        <Text style={styles.selectedLabel}>{CATEGORY_LABELS[category]}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        <Text style={styles.changeLabel}>Cambiar</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Título</Text>
      <TextInput
        style={styles.input}
        placeholder="¿Qué está pasando?"
        placeholderTextColor={colors.textFaint}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Descripción (opcional)</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Agregá más detalles..."
        placeholderTextColor={colors.textFaint}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      {isAnimal && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del animal</Text>

          <Text style={styles.label}>Especie</Text>
          <View style={styles.chips}>
            {ANIMAL_SPECIES_LIST.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSpecies(s)}
                style={[styles.chip, species === s && styles.chipActive]}
              >
                <Text style={[styles.chipText, species === s && styles.chipTextActive]}>
                  {ANIMAL_SPECIES_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Nombre (opcional)</Text>
          <TextInput style={styles.input} placeholderTextColor={colors.textFaint} value={petName} onChangeText={setPetName} />

          <Text style={styles.label}>Color (opcional)</Text>
          <TextInput style={styles.input} placeholderTextColor={colors.textFaint} value={color} onChangeText={setColor} />

          <Text style={styles.label}>Características (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Tamaño, collar, manchas..."
            placeholderTextColor={colors.textFaint}
            value={characteristics}
            onChangeText={setCharacteristics}
            multiline
          />

          <Text style={styles.label}>Sexo (opcional)</Text>
          <View style={styles.chips}>
            {ANIMAL_SEX_LIST.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSex(sex === s ? undefined : s)}
                style={[styles.chip, sex === s && styles.chipActive]}
              >
                <Text style={[styles.chipText, sex === s && styles.chipTextActive]}>
                  {ANIMAL_SEX_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Edad aproximada en años (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textFaint}
            value={approxAgeYears}
            onChangeText={setApproxAgeYears}
            keyboardType="decimal-pad"
          />

          {category === 'ADOPCION' && (
            <>
              <Text style={styles.label}>Condiciones de adopción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Ej: casa con patio, esterilizar, visitar antes..."
                placeholderTextColor={colors.textFaint}
                value={adoptionConditions}
                onChangeText={setAdoptionConditions}
                multiline
              />
            </>
          )}

          <Text style={styles.label}>Teléfono de contacto (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textFaint}
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
          />
        </View>
      )}

      {isEvent && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del evento</Text>

          <Text style={styles.label}>Fecha (AAAA-MM-DD)</Text>
          <TextInput style={styles.input} placeholderTextColor={colors.textFaint} value={eventDate} onChangeText={setEventDate} />

          <Text style={styles.label}>Hora (HH:MM)</Text>
          <TextInput
            style={styles.input}
            placeholder="19:00"
            placeholderTextColor={colors.textFaint}
            value={eventTime}
            onChangeText={setEventTime}
          />

          <Text style={styles.label}>Organizador (opcional)</Text>
          <TextInput style={styles.input} placeholderTextColor={colors.textFaint} value={organizerName} onChangeText={setOrganizerName} />
        </View>
      )}

      {isSale && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos de la venta</Text>

          <Text style={styles.label}>Precio (S/)</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textFaint}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Condición (opcional)</Text>
          <View style={styles.chips}>
            {SALE_CONDITION_LIST.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCondition(condition === c ? undefined : c)}
                style={[styles.chip, condition === c && styles.chipActive]}
              >
                <Text style={[styles.chipText, condition === c && styles.chipTextActive]}>
                  {SALE_CONDITION_LABELS[c]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.hint}>
        Se publica con tu ubicación actual{coords ? '' : ' (buscando...)'}.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>Publicar</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 48, backgroundColor: colors.bg, flexGrow: 1 },
  stepTitle: { ...typography.h1, marginTop: spacing.md },
  stepSubtitle: { ...typography.bodyMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  gridCell: {
    width: '31%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  gridIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  gridLabel: { ...typography.caption, color: colors.text, textAlign: 'center', fontWeight: '600' },
  selectedCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  selectedIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLabel: { ...typography.h3, flex: 1 },
  changeLabel: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  label: { ...typography.h3, fontSize: 13, marginTop: spacing.lg, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, fontWeight: '600' },
  chipTextActive: { color: colors.onPrimary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 14,
  },
  textarea: { height: 90, textAlignVertical: 'top' },
  hint: { ...typography.caption, marginTop: spacing.md },
  section: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: { ...typography.h3 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 15,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
});
