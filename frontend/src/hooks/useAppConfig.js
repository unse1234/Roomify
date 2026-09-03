import { useQuery } from '@tanstack/react-query';
import { getAppConfig } from '../services/config.service.js';

// Server-owned domain constants (service fee, limits, enums). Fetched once
// and cached for the session so the client never hardcodes a value that can
// drift from the backend.
const FALLBACK = { serviceFeePercent: 0.05 };

export const useAppConfig = () => {
  const query = useQuery({
    queryKey: ['app-config'],
    queryFn: getAppConfig,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return { ...FALLBACK, ...(query.data?.data ?? {}) };
};
