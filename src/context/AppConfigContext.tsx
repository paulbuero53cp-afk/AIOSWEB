// ─────────────────────────────────────────────────────────────
//  AIOS — App-Konfiguration Context
//  Lädt COMPANY-Objekt von /api/config und stellt es app-weit bereit.
//  Kein STOCKMEIER oder sonstiger Mandantenname ist hardcodiert.
// ─────────────────────────────────────────────────────────────

import { createContext, useContext } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import type { AppConfig } from '@/types';

const DEFAULT_CONFIG: AppConfig = {
  name:    'AIOS',
  short:   'AIOS',
  tag:     'AI Management System',
  iso:     'ISO 42001 aligned',
  chatbot: { enabled: false, label: '', url: '', hint: '' },
};

const AppConfigContext = createContext<AppConfig>(DEFAULT_CONFIG);

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const { data } = useSWR<AppConfig>('/api/config', swrFetcher);
  return (
    <AppConfigContext.Provider value={data ?? DEFAULT_CONFIG}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig(): AppConfig {
  return useContext(AppConfigContext);
}
