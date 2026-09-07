import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useNavigation } from '@react-navigation/native';
import { registerPushToken } from './api/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Se activa una vez que hay sesion (enabled = !!user, ver RootNavigator).
// Pide permiso, obtiene el token de push del dispositivo (FCM en
// Android/iOS via Google) y lo registra en el backend; y escucha cuando
// el usuario toca una notificacion para llevarlo a la pantalla que
// corresponda segun el "data" que mando NotificationsService.
export function usePushNotifications(enabled: boolean) {
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      // Emuladores sin Google Play Services no tienen token real -- no
      // tiene sentido pedir permiso ahi.
      if (!Device.isDevice) return;

      const { status: existing } = await Notifications.getPermissionsAsync();
      const finalStatus =
        existing === 'granted'
          ? existing
          : (await Notifications.requestPermissionsAsync()).status;
      if (finalStatus !== 'granted') return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Comunidad Chosica',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      try {
        const { data: token } = await Notifications.getDevicePushTokenAsync();
        if (!cancelled) registerPushToken(token).catch(() => {});
      } catch {
        // Sin Google Play Services (emulador sin Play Store, etc.) esto
        // puede fallar -- no es critico para el resto de la app.
      }
    })();

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | Record<string, string>
          | undefined;
        if (!data?.type) return;

        if (data.type === 'follow' && data.userId) {
          navigation.navigate('UserProfile', { userId: data.userId });
        } else if (data.postId) {
          navigation.navigate('PostDetail', { postId: data.postId });
        } else if (data.businessId) {
          navigation.navigate('BusinessDetail', { businessId: data.businessId });
        }
      },
    );

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [enabled, navigation]);
}
