import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapScreen from '../screens/MapScreen';
import CommunityScreen from '../screens/CommunityScreen';
import PublishScreen from '../screens/PublishScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme';

// 5 secciones principales, seccion 23 del brief: Mapa, Comunidad, Publicar,
// Explorar, Perfil. "Publicar" se destaca como boton circular flotante en
// el centro de la barra (igual que el mockup de referencia), el resto son
// tabs normales con icono + label.
const Tab = createBottomTabNavigator();

function PublishTabButton({ onPress }: { onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.fabWrapper} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.fab}>
        <Ionicons name="add" size={30} color={colors.onPrimary} />
      </View>
    </TouchableOpacity>
  );
}

export default function TabNavigator() {
  // En celulares con navegacion por gestos (sin botones fisicos) el SO se
  // queda con una franja de gestos pegada al borde inferior de la pantalla;
  // si la tab bar no suma ese inset, los iconos quedan tapados por esa franja
  // y el toque lo agarra el gesto de "ir a inicio" en vez de la app.
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontWeight: '700' as const },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Search')}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="search" size={22} color={colors.text} />
          </TouchableOpacity>
        ),
        tabBarStyle: [styles.tabBar, { height: 64 + insets.bottom, paddingBottom: 8 + insets.bottom }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      <Tab.Screen
        name="Mapa"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Comunidad"
        component={CommunityScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Publicar"
        component={PublishScreen}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <PublishTabButton onPress={props.onPress as (() => void) | undefined} />
          ),
        }}
      />
      <Tab.Screen
        name="Explorar"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  fabWrapper: {
    top: -18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    borderWidth: 3,
    borderColor: colors.bg,
  },
});
