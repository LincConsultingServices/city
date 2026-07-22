// TanStack Query hooks — the read surface UI uses (never fetch directly, PRD
// §12.2). Registry is cached aggressively; wallet/progress get invalidated by
// the fresh balances submit/purchase responses carry (F1+). Frozen in F0.

import { useQuery } from '@tanstack/react-query';
import { api } from './client';

const MINUTE = 60_000;

export function useModules() {
  return useQuery({ queryKey: ['modules'], queryFn: api.getModules, staleTime: 5 * MINUTE });
}

export function useBadges() {
  return useQuery({ queryKey: ['badges'], queryFn: api.getBadges, staleTime: MINUTE });
}

export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: api.getProfile, staleTime: MINUTE });
}

export function useProgress() {
  return useQuery({ queryKey: ['progress'], queryFn: api.getProgress, staleTime: 30_000 });
}
