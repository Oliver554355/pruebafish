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
import { colors, radius, spacing, typography } from '../theme';

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
        Contanos por qué sos el dueño o encargado de este point. Un
        moderador revisa la solicitud antes de aprobarla.
      </Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Ej: Soy el dueño, mi teléfono ya está listado en la ficha"
        placeholderTextColor={colors.textFaint}
        value={message}
        onChangeText={setMessage}
        multiline
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>Enviar solicitud</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.bg },
  title: { ...typography.h2, marginBottom: spacing.sm },
  description: { ...typography.bodyMuted, marginBottom: spacing.xl },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 15,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
});
