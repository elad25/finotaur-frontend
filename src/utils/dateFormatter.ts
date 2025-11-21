/**
 * Format trade date with timezone support
 */
export const formatTradeDate = (date: string | Date, timezone?: string): string => {
  const d = new Date(date);
  
  if (!timezone || timezone === 'system') {
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return d.toLocaleString('en-US', { 
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format time only
 */
export const formatTradeTime = (date: string | Date, timezone?: string): string => {
  const d = new Date(date);
  
  if (!timezone || timezone === 'system') {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return d.toLocaleTimeString('en-US', { 
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format short date (e.g., "Jan 5")
 */
export const formatTradeDateShort = (date: string | Date, timezone?: string): string => {
  const d = new Date(date);
  
  if (!timezone || timezone === 'system') {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  return d.toLocaleDateString('en-US', { 
    timeZone: timezone,
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format full date (e.g., "Jan 5, 2025")
 */
export const formatTradeDateFull = (date: string | Date, timezone?: string): string => {
  const d = new Date(date);
  
  if (!timezone || timezone === 'system') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return d.toLocaleDateString('en-US', { 
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format for datetime-local input
 */
export const formatForInput = (date: Date, timezone?: string): string => {
  let d = date;
  
  if (timezone && timezone !== 'system') {
    const str = date.toLocaleString('en-US', { timeZone: timezone });
    d = new Date(str);
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};