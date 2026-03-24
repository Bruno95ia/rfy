'use client';

import { useEffect } from 'react';
import { trackScreen } from '@/lib/analytics/track';

export function ContextPackTracker() {
  useEffect(() => {
    trackScreen('settings_context_pack');
  }, []);
  return null;
}
