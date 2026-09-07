import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { updateMyLocation } from './api/users';

interface LocationState {
  coords: { lat: number; lng: number } | null;
  loading: boolean;
  error: string | null;
}

// Chosica, como fallback si el usuario niega el permiso de ubicacion —
// asi la app sigue siendo utilizable (aunque no centrada en el usuario)
// en vez de romperse.
const CHOSICA_FALLBACK = { lat: -11.9311, lng: -76.6961 };

export function useCurrentLocation() {
  const [state, setState] = useState<LocationState>({
    coords: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) {
          setState({
            coords: CHOSICA_FALLBACK,
            loading: false,
            error: 'Permiso de ubicación denegado, mostrando Chosica',
          });
        }
        return;
      }
      try {
        const position = await Location.getCurrentPositionAsync({});
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        if (!cancelled) {
          setState({ coords, loading: false, error: null });
        }
        // Fire-and-forget: mantiene lastLat/lastLng al dia para las
        // notificaciones push de "algo paso cerca tuyo". Si falla (sin
        // sesion, sin red) no debe romper la pantalla que pidio la
        // ubicacion.
        updateMyLocation(coords.lat, coords.lng).catch(() => {});
      } catch {
        if (!cancelled) {
          setState({
            coords: CHOSICA_FALLBACK,
            loading: false,
            error: 'No se pudo obtener la ubicación, mostrando Chosica',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
