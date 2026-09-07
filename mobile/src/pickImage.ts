import * as ImagePicker from 'expo-image-picker';

// Wrapper unico para pedir permiso y abrir la galeria: se reusa para fotos
// de negocio y fotos de producto, mismo flujo en ambos casos.
export async function pickImage(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
}
