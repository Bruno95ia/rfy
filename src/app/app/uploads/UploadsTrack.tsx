'use client';

import { useEffect } from 'react';
import { trackScreen } from '@/lib/analytics/track';

export function UploadsTrack() {
  useEffect(() => {
    trackScreen('uploads');
  }, []);
  return null;
}
