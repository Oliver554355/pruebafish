import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchBusiness, updateBusiness, verifyBusiness } from '../api/businesses';
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
} from '../api/products';
import { deletePhoto, uploadPhoto } from '../api/photos';
import { pickImage } from '../pickImage';
import { BusinessDetail, Product } from '../types';
import { colors, radius, spacing, typography } from '../theme';

export default function BusinessPanelScreen({ route }: any) {
  const { businessId } = route.params as { businessId: string };

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [uploadingBusinessPhoto, setUploadingBusinessPhoto] = useState(false);

  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [uploadingProductPhotoId, setUploadingProductPhotoId] = useState<
    string | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [businessData, productsData] = await Promise.all([
        fetchBusiness(businessId),
        fetchProducts(businessId),
      ]);
      setBusiness(businessData);
      setProducts(productsData);
      setName(businessData.name);
      setDescription(businessData.description ?? '');
      setAddress(businessData.address ?? '');
      setPhone(businessData.phone ?? '');
      setHours(businessData.hours ?? '');
    } catch (err) {
      Alert.alert('Error', 'No se pudo cargar el panel del point.');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveInfo() {
    if (name.trim().length < 3) {
      Alert.alert('Nombre muy corto', 'Escribí al menos 3 caracteres.');
      return;
    }
    setSavingInfo(true);
    try {
      const updated = await updateBusiness(businessId, {
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        hours: hours.trim() || undefined,
      });
      setBusiness((prev) => (prev ? { ...prev, ...updated } : prev));
      Alert.alert('Listo', 'Se guardaron los cambios.');
    } catch (err: any) {
      Alert.alert(
        'No se pudo guardar',
        err?.response?.data?.message ?? 'Intentá de nuevo en un momento.',
      );
    } finally {
      setSavingInfo(false);
    }
  }

  function handleVerify() {
    Alert.alert(
      'Verificar negocio',
      'Confirmá que sos el dueño o encargado de este point. Los points verificados aparecen primero en las búsquedas y el mapa.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Verificar',
          onPress: async () => {
            setVerifying(true);
            try {
              const updated = await verifyBusiness(businessId);
              setBusiness((prev) => (prev ? { ...prev, ...updated } : prev));
            } catch (err: any) {
              Alert.alert(
                'No se pudo verificar',
                err?.response?.data?.message ?? 'Intentá de nuevo en un momento.',
              );
            } finally {
              setVerifying(false);
            }
          },
        },
      ],
    );
  }

  async function handleAddBusinessPhoto() {
    const uri = await pickImage();
    if (!uri) return;
    setUploadingBusinessPhoto(true);
    try {
      const photo = await uploadPhoto(uri, { businessId });
      setBusiness((prev) =>
        prev ? { ...prev, photos: [...prev.photos, photo] } : prev,
      );
    } catch (err) {
      Alert.alert('Error', 'No se pudo subir la foto.');
    } finally {
      setUploadingBusinessPhoto(false);
    }
  }

  function handleDeleteBusinessPhoto(photoId: string) {
    Alert.alert('Borrar foto', '¿Seguro que querés borrarla?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePhoto(photoId);
            setBusiness((prev) =>
              prev
                ? { ...prev, photos: prev.photos.filter((p) => p.id !== photoId) }
                : prev,
            );
          } catch (err) {
            Alert.alert('Error', 'No se pudo borrar la foto.');
          }
        },
      },
    ]);
  }

  async function handleAddProduct() {
    if (newProductName.trim().length < 2) {
      Alert.alert('Nombre muy corto', 'Escribí al menos 2 caracteres.');
      return;
    }
    setAddingProduct(true);
    try {
      const price = newProductPrice.trim()
        ? Number(newProductPrice.replace(',', '.'))
        : undefined;
      const product = await createProduct({
        businessId,
        name: newProductName.trim(),
        price,
      });
      setProducts((prev) => [...prev, product]);
      setNewProductName('');
      setNewProductPrice('');
    } catch (err: any) {
      Alert.alert(
        'No se pudo agregar',
        err?.response?.data?.message ?? 'Intentá de nuevo en un momento.',
      );
    } finally {
      setAddingProduct(false);
    }
  }

  function startEditingProduct(product: Product) {
    setEditingProductId(product.id);
    setEditName(product.name);
    setEditPrice(product.price ?? '');
  }

  async function handleSaveProduct(id: string) {
    if (editName.trim().length < 2) {
      Alert.alert('Nombre muy corto', 'Escribí al menos 2 caracteres.');
      return;
    }
    try {
      const price = editPrice.trim()
        ? Number(editPrice.replace(',', '.'))
        : undefined;
      const updated = await updateProduct(id, {
        name: editName.trim(),
        price,
      });
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      setEditingProductId(null);
    } catch (err: any) {
      Alert.alert(
        'No se pudo guardar',
        err?.response?.data?.message ?? 'Intentá de nuevo en un momento.',
      );
    }
  }

  function handleDeleteProduct(id: string) {
    Alert.alert('Borrar producto', '¿Seguro que querés borrarlo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct(id);
            setProducts((prev) => prev.filter((p) => p.id !== id));
          } catch (err) {
            Alert.alert('Error', 'No se pudo borrar el producto.');
          }
        },
      },
    ]);
  }

  async function handleAddProductPhoto(productId: string) {
    const uri = await pickImage();
    if (!uri) return;
    setUploadingProductPhotoId(productId);
    try {
      const photo = await uploadPhoto(uri, { productId });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, photos: [...p.photos, photo] } : p,
        ),
      );
    } catch (err) {
      Alert.alert('Error', 'No se pudo subir la foto.');
    } finally {
      setUploadingProductPhotoId(null);
    }
  }

  function handleDeleteProductPhoto(productId: string, photoId: string) {
    Alert.alert('Borrar foto', '¿Seguro que querés borrarla?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePhoto(photoId);
            setProducts((prev) =>
              prev.map((p) =>
                p.id === productId
                  ? { ...p, photos: p.photos.filter((ph) => ph.id !== photoId) }
                  : p,
              ),
            );
          } catch (err) {
            Alert.alert('Error', 'No se pudo borrar la foto.');
          }
        },
      },
    ]);
  }

  if (loading || !business) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Panel de {business.name}</Text>

      {business.verified ? (
        <View style={styles.verifiedRow}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.verifiedText}>Negocio verificado</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.verifyButton}
          onPress={handleVerify}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={15} color={colors.onPrimary} />
              <Text style={styles.verifyButtonText}>Verificar negocio</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Información</Text>
      <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor={colors.textFaint} value={name} onChangeText={setName} />
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Descripción"
        placeholderTextColor={colors.textFaint}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Dirección"
        placeholderTextColor={colors.textFaint}
        value={address}
        onChangeText={setAddress}
      />
      <TextInput
        style={styles.input}
        placeholder="Teléfono"
        placeholderTextColor={colors.textFaint}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput style={styles.input} placeholder="Horario" placeholderTextColor={colors.textFaint} value={hours} onChangeText={setHours} />
      <TouchableOpacity style={styles.button} onPress={handleSaveInfo} disabled={savingInfo}>
        {savingInfo ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>Guardar cambios</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Fotos del point</Text>
      <ScrollView horizontal style={styles.photoRow}>
        {business.photos.map((photo) => (
          <TouchableOpacity
            key={photo.id}
            onLongPress={() => handleDeleteBusinessPhoto(photo.id)}
          >
            <Image source={{ uri: photo.url }} style={styles.photo} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.addPhoto}
          onPress={handleAddBusinessPhoto}
          disabled={uploadingBusinessPhoto}
        >
          {uploadingBusinessPhoto ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
              <Text style={styles.addPhotoText}>Foto</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
      <Text style={styles.hint}>Mantené presionada una foto para borrarla.</Text>

      <Text style={styles.sectionTitle}>Menú / Productos</Text>
      {products.map((product) => (
        <View key={product.id} style={styles.productCard}>
          {editingProductId === product.id ? (
            <View>
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                placeholderTextColor={colors.textFaint}
                value={editName}
                onChangeText={setEditName}
              />
              <TextInput
                style={styles.input}
                placeholder="Precio (opcional)"
                placeholderTextColor={colors.textFaint}
                value={editPrice}
                onChangeText={setEditPrice}
                keyboardType="decimal-pad"
              />
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.smallButton, styles.cancelButton]}
                  onPress={() => setEditingProductId(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => handleSaveProduct(product.id)}
                >
                  <Text style={styles.buttonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.productHeader}>
                <Text style={styles.productName}>{product.name}</Text>
                {product.price != null && (
                  <Text style={styles.productPrice}>S/ {product.price}</Text>
                )}
              </View>
              <ScrollView horizontal style={styles.photoRow}>
                {product.photos.map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    onLongPress={() => handleDeleteProductPhoto(product.id, photo.id)}
                  >
                    <Image source={{ uri: photo.url }} style={styles.photoSmall} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.addPhotoSmall}
                  onPress={() => handleAddProductPhoto(product.id)}
                  disabled={uploadingProductPhotoId === product.id}
                >
                  {uploadingProductPhotoId === product.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="camera-outline" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </ScrollView>
              <View style={styles.row}>
                <TouchableOpacity onPress={() => startEditingProduct(product)}>
                  <Text style={styles.link}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteProduct(product.id)}>
                  <Text style={styles.deleteLink}>Borrar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      ))}

      <View style={styles.addProductBox}>
        <TextInput
          style={styles.input}
          placeholder="Nombre del producto"
          placeholderTextColor={colors.textFaint}
          value={newProductName}
          onChangeText={setNewProductName}
        />
        <TextInput
          style={styles.input}
          placeholder="Precio (opcional)"
          placeholderTextColor={colors.textFaint}
          value={newProductPrice}
          onChangeText={setNewProductPrice}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity style={styles.button} onPress={handleAddProduct} disabled={addingProduct}>
          {addingProduct ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Agregar producto</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: 48, backgroundColor: colors.bg },
  title: { ...typography.h1, fontSize: 20, marginBottom: spacing.sm },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  verifiedText: { color: colors.success, fontWeight: '600' },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  verifyButtonText: { color: colors.onPrimary, fontWeight: '700' },
  sectionTitle: { ...typography.h3, fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  textarea: { height: 70, textAlignVertical: 'top' },
  hint: { ...typography.caption, marginTop: spacing.xs },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: colors.onPrimary, fontWeight: '700' },
  photoRow: { flexDirection: 'row' },
  photo: { width: 100, height: 100, borderRadius: radius.md, marginRight: spacing.sm },
  photoSmall: { width: 72, height: 72, borderRadius: radius.sm, marginRight: spacing.sm },
  addPhoto: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoSmall: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  productCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  productName: { ...typography.h3, fontSize: 15 },
  productPrice: { color: colors.success, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  smallButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  cancelButton: { backgroundColor: colors.surfaceAlt },
  cancelButtonText: { color: colors.text, fontWeight: '600' },
  link: { color: colors.primary, fontWeight: '600' },
  deleteLink: { color: colors.danger, fontWeight: '600' },
  addProductBox: { marginTop: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
