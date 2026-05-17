import { useState, useEffect } from 'react';
import { getCurrentTimePeriod, getTimePeriodGreeting } from '../data/timePeriods';
import type { TimePeriod } from '../types';

export function useTimePeriod() {
  const [currentPeriod, setCurrentPeriod] = useState<TimePeriod>(getCurrentTimePeriod());

  useEffect(() => {
    const update = () => {
      setCurrentPeriod(getCurrentTimePeriod());
    };

    // Update every minute
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const getGreeting = (characterId: string): string => {
    return getTimePeriodGreeting(currentPeriod, characterId);
  };

  return {
    currentPeriod,
    getGreeting,
    refresh: () => setCurrentPeriod(getCurrentTimePeriod()),
  };
}
