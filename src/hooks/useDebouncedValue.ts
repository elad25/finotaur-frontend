import { useEffect, useState } from 'react';

/**
 * 🚀 DEBOUNCE: חוכה X מילישניות לפני עדכון הערך
 * מונע ביצועים כבדים בכל הקשה
 * 
 * דוגמה:
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebouncedValue(search, 300);
 * 
 * עכשיו debouncedSearch ישתנה רק אחרי 300ms מההקשה האחרונה!
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // קובע טיימר - אחרי delay מילישניות, עדכן את הערך
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // אם value השתנה לפני שה-delay עבר - בטל את הטיימר הקודם!
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}