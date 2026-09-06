import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import MapScreen from '../screens/MapScreen';
import CommunityScreen from '../screens/CommunityScreen';
import PublishScreen from '../screens/PublishScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ProfileScreen from '../screens/ProfileScreen';

// 5 secciones principales, seccion 23 del brief: Mapa, Comunidad, Publicar,
// Explorar, Perfil. Iconos con emoji por ahora — sin libreria de iconos
// hasta que haya una decision de diseño real.
const Tab = createBottomTabNavigator();

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Tab.Screen
        name="Mapa"
        component={MapScreen}
        options={{ tabBarIcon: () => <TabIcon emoji="🗺️" /> }}
      />
      <Tab.Screen
        name="Comunidad"
        component={CommunityScreen}
        options={{ tabBarIcon: () => <TabIcon emoji="📰" /> }}
      />
      <Tab.Screen
        name="Publicar"
        component={PublishScreen}
        options={{ tabBarIcon: () => <TabIcon emoji="➕" /> }}
      />
      <Tab.Screen
        name="Explorar"
        component={ExploreScreen}
        options={{ tabBarIcon: () => <TabIcon emoji="🔎" /> }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{ tabBarIcon: () => <TabIcon emoji="👤" /> }}
      />
    </Tab.Navigator>
  );
}
