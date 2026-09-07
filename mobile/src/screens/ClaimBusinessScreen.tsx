import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { createBusinessClaim } from '../api/businessClaims';

export default function ClaimBusinessScreen({ route, navigation }: any) {
  const { businessId, businessName } = route.params as {
    businessId: string;
    businessName: string;
  };
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await createBusinessClaim({ businessId, message: message.trim() || undefined });
      Alert.alert(
        'Solicitud enviada',
        'Un moderador va a revisar tu solicitud para ser el dueño verificado.',
      );
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        'No se pudo enviar',
        err?.response?.data?.message ?? 'Intentá de nuevo en un momento.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reclamar "{businessName}"</Text>
      <Text style={styles.description}>
        Contanos por qué sos el dueño o encargado de este negocio. Un
        moderador revisa la solicitud antes de aprobarla.
      </Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Ej: Soy el dueño, mi teléfono ya está listado en la ficha"
        value={message}
        onChangeText={setMessage}
        multiline
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Enviar solicitud</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  description: { color: '#6b7280', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  textarea: { height: 100, textAlignVertical: 'top' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
