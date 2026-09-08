import React, { createContext, useContext } from 'react';
import { useCurrentLocation } from '../useCurrentLocation';

// Antes cada pantalla (Mapa, Comunidad, Explorar, Publicar, CreateBusiness)
// llamaba useCurrentLocation() por su cuenta, repitiendo el pedido de
// permiso + fix de GPS cada vez que esa pantalla se montaba -- eso era
// la demora percibida en Explorar/Comunidad, no el backend (que responde
// en <30ms). Con este Provider el fix de ubicacion se pide una sola vez
// por sesion y todas las pantallas comparten el mismo resultado.
type LocationContextValue = ReturnType<typeof useCurrentLocation>;

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const value = useCurrentLocation();
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation debe usarse dentro de <LocationProvider>');
  return ctx;
}
