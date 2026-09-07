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
  CATEGORY_LABELS,
  SALE_CONDITION_LABELS,
} from '../categoryStyle';
import { useCurrentLocation } from '../useCurrentLocation';

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
  const [category, setCategory] = useState<PostCategory>('ACCIDENTE');
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

  const isAnimal = ANIMAL_CATEGORIES.includes(category);
  const isEvent = category === 'EVENTO';
  const isSale = category === 'VENTA';

  async function handleSubmit() {
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
        {ALL_CATEGORIES.map((cat) => (
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

      {isAnimal && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del animal</Text>

          <Text style={styles.label}>Especie</Text>
          <View style={styles.chips}>
            {ANIMAL_SPECIES_LIST.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSpecies(s)}
                style={[
                  styles.chip,
                  { backgroundColor: species === s ? '#7c3aed' : '#f3f4f6' },
                ]}
              >
                <Text style={{ color: species === s ? '#fff' : '#374151', fontWeight: '600' }}>
                  {ANIMAL_SPECIES_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Nombre (opcional)</Text>
          <TextInput style={styles.input} value={petName} onChangeText={setPetName} />

          <Text style={styles.label}>Color (opcional)</Text>
          <TextInput style={styles.input} value={color} onChangeText={setColor} />

          <Text style={styles.label}>Características (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Tamaño, collar, manchas..."
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
                style={[
                  styles.chip,
                  { backgroundColor: sex === s ? '#7c3aed' : '#f3f4f6' },
                ]}
              >
                <Text style={{ color: sex === s ? '#fff' : '#374151', fontWeight: '600' }}>
                  {ANIMAL_SEX_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Edad aproximada en años (opcional)</Text>
          <TextInput
            style={styles.input}
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
                value={adoptionConditions}
                onChangeText={setAdoptionConditions}
                multiline
              />
            </>
          )}

          <Text style={styles.label}>Teléfono de contacto (opcional)</Text>
          <TextInput
            style={styles.input}
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
          <TextInput style={styles.input} value={eventDate} onChangeText={setEventDate} />

          <Text style={styles.label}>Hora (HH:MM)</Text>
          <TextInput
            style={styles.input}
            placeholder="19:00"
            value={eventTime}
            onChangeText={setEventTime}
          />

          <Text style={styles.label}>Organizador (opcional)</Text>
          <TextInput style={styles.input} value={organizerName} onChangeText={setOrganizerName} />
        </View>
      )}

      {isSale && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos de la venta</Text>

          <Text style={styles.label}>Precio (S/)</Text>
          <TextInput
            style={styles.input}
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
                style={[
                  styles.chip,
                  { backgroundColor: condition === c ? '#0891b2' : '#f3f4f6' },
                ]}
              >
                <Text style={{ color: condition === c ? '#fff' : '#374151', fontWeight: '600' }}>
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
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Publicar</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  label: { fontWeight: '600', marginTop: 16, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  textarea: { height: 90, textAlignVertical: 'top' },
  hint: { color: '#6b7280', fontSize: 12, marginTop: 12 },
  section: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionTitle: { fontWeight: '700', fontSize: 15, marginBottom: 4 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
