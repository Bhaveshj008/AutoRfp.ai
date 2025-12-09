import { safeNumber, safeString } from './errorUtils';

/**
 * Safe currency formatting that handles null/undefined values
 */
export const formatCurrencySafe = (
  amount: number | null | undefined,
  currencyCode: string | null | undefined,
  defaultValue: string = 'N/A'
): string => {
  try {
    const safeAmount = safeNumber(amount);
    const safeCurrency = safeString(currencyCode, 'USD');

    if (safeAmount === 0 && amount === null) return defaultValue;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0,
    }).format(safeAmount);
  } catch (error) {
    console.warn('Error formatting currency:', error);
    return defaultValue;
  }
};

/**
 * Safe date formatting
 */
export const formatDateSafe = (
  date: string | Date | null | undefined,
  defaultValue: string = 'N/A'
): string => {
  try {
    if (!date) return defaultValue;

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return defaultValue;
    }

    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return defaultValue;
  }
};

/**
 * Safe percentage formatting
 */
export const formatPercentageSafe = (
  value: number | null | undefined,
  decimals: number = 0,
  defaultValue: string = 'N/A'
): string => {
  try {
    const safeValue = safeNumber(value);
    return `${safeValue.toFixed(decimals)}%`;
  } catch (error) {
    console.warn('Error formatting percentage:', error);
    return defaultValue;
  }
};

/**
 * Safe display of large numbers with abbreviation (1M, 1K, etc)
 */
export const formatNumberCompact = (
  num: number | null | undefined,
  defaultValue: string = '0'
): string => {
  try {
    const safeNum = safeNumber(num);

    if (safeNum >= 1000000) {
      return `${(safeNum / 1000000).toFixed(1)}M`;
    }
    if (safeNum >= 1000) {
      return `${(safeNum / 1000).toFixed(1)}K`;
    }
    return safeNum.toFixed(0);
  } catch (error) {
    console.warn('Error formatting number:', error);
    return defaultValue;
  }
};

/**
 * Safe string truncation
 */
export const truncateSafe = (
  text: string | null | undefined,
  maxLength: number = 100,
  suffix: string = '...'
): string => {
  try {
    const safeText = safeString(text);
    if (safeText.length <= maxLength) return safeText;
    return safeText.substring(0, maxLength - suffix.length) + suffix;
  } catch (error) {
    console.warn('Error truncating text:', error);
    return '';
  }
};

/**
 * Safe display of object/array length
 */
export const getSafeLengthSafe = (
  obj: any[] | any | null | undefined,
  defaultValue: number = 0
): number => {
  try {
    if (Array.isArray(obj)) return obj.length;
    if (typeof obj === 'object' && obj !== null && 'length' in obj) {
      return safeNumber(obj.length, defaultValue);
    }
    return defaultValue;
  } catch (error) {
    console.warn('Error getting safe length:', error);
    return defaultValue;
  }
};
