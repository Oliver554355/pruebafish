import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import TabNavigator from './TabNavigator';
import PostDetailScreen from '../screens/PostDetailScreen';
import BusinessDetailScreen from '../screens/BusinessDetailScreen';
import CreateBusinessScreen from '../screens/CreateBusinessScreen';
import BusinessPanelScreen from '../screens/BusinessPanelScreen';
import ClaimBusinessScreen from '../screens/ClaimBusinessScreen';
import ModerationScreen from '../screens/ModerationScreen';
import SavedScreen from '../screens/SavedScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import FollowListScreen from '../screens/FollowListScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ headerShown: true, title: 'Publicación' }}
      />
      <Stack.Screen
        name="BusinessDetail"
        component={BusinessDetailScreen}
        options={{ headerShown: true, title: 'Negocio' }}
      />
      <Stack.Screen
        name="CreateBusiness"
        component={CreateBusinessScreen}
        options={{ headerShown: true, title: 'Agregar negocio' }}
      />
      <Stack.Screen
        name="BusinessPanel"
        component={BusinessPanelScreen}
        options={{ headerShown: true, title: 'Panel del negocio' }}
      />
      <Stack.Screen
        name="ClaimBusiness"
        component={ClaimBusinessScreen}
        options={{ headerShown: true, title: 'Reclamar negocio' }}
      />
      <Stack.Screen
        name="Moderation"
        component={ModerationScreen}
        options={{ headerShown: true, title: 'Moderación' }}
      />
      <Stack.Screen
        name="Saved"
        component={SavedScreen}
        options={{ headerShown: true, title: 'Guardados' }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ headerShown: true, title: 'Perfil' }}
      />
      <Stack.Screen
        name="FollowList"
        component={FollowListScreen}
        options={({ route }: any) => ({
          headerShown: true,
          title: route.params?.mode === 'followers' ? 'Seguidores' : 'Siguiendo',
        })}
      />
    </Stack.Navigator>
  );
}
