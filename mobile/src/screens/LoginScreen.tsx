import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PixelIconV2 } from '../PixelIconV2';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, radius, spacing, typography } from '../theme';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? 'No se pudo iniciar sesión',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoBadge}>
        <PixelIconV2 name="navegacion/ubicacion" size={68} />
      </View>
      <Text style={styles.title}>Comunidad Chosica</Text>
      <Text style={styles.subtitle}>Tu comunidad, en un solo lugar</Text>

      <View style={styles.inputRow}>
        <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>
      <View style={styles.inputRow}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>Iniciar sesión</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>¿No tenés cuenta? Registrate</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.bg },
  logoBadge: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.h1, fontFamily: fonts.pixel, fontWeight: 'normal', fontSize: 15, lineHeight: 24, textAlign: 'center' },
  subtitle: { ...typography.bodyMuted, textAlign: 'center', marginBottom: spacing.xxl, marginTop: spacing.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: 14, color: colors.text, fontSize: 15 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 15,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
  link: { marginTop: spacing.lg, textAlign: 'center', color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.md },
});
