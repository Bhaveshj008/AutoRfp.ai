/**
 * Safe property access that returns a default value instead of throwing
 */
export const safeGet = <T extends object, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue?: T[K]
): T[K] | undefined => {
  try {
    if (!obj || typeof obj !== 'object') return defaultValue;
    return obj[key] ?? defaultValue;
  } catch (error) {
    console.warn(`Error accessing property ${String(key)}:`, error);
    return defaultValue;
  }
};

/**
 * Safe array access that returns empty array if invalid
 */
export const safeArray = <T>(arr: T[] | null | undefined, defaultValue: T[] = []): T[] => {
  try {
    if (!Array.isArray(arr)) return defaultValue;
    return arr;
  } catch (error) {
    console.warn('Error accessing array:', error);
    return defaultValue;
  }
};

/**
 * Safe function call that catches errors
 */
export const safeCall = <T extends any[], R>(
  fn: (...args: T) => R,
  args: T,
  defaultValue?: R
): R | undefined => {
  try {
    if (typeof fn !== 'function') {
      console.warn('safeCall: provided argument is not a function');
      return defaultValue;
    }
    return fn(...args);
  } catch (error) {
    console.error('Error calling function:', error);
    return defaultValue;
  }
};

/**
 * Safe JSON parse
 */
export const safeJsonParse = <T>(json: string, defaultValue?: T): T | undefined => {
  try {
    if (typeof json !== 'string') return defaultValue;
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn('Error parsing JSON:', error);
    return defaultValue;
  }
};

/**
 * Safe JSON stringify
 */
export const safeJsonStringify = (obj: any, defaultValue: string = ''): string => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('Error stringifying JSON:', error);
    return defaultValue;
  }
};

/**
 * Validate required fields in an object
 */
export const validateRequired = (
  obj: any,
  requiredFields: string[]
): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  requiredFields.forEach((field) => {
    const value = safeGet(obj, field);
    if (value === null || value === undefined || value === '') {
      errors[field] = `${field} is required`;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Format error message for display
 */
export const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as any).message);
  }
  return 'An unexpected error occurred';
};

/**
 * Safe number conversion
 */
export const safeNumber = (value: any, defaultValue: number = 0): number => {
  try {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  } catch (error) {
    console.warn('Error converting to number:', error);
    return defaultValue;
  }
};

/**
 * Safe string conversion
 */
export const safeString = (value: any, defaultValue: string = ''): string => {
  try {
    if (value === null || value === undefined) return defaultValue;
    return String(value);
  } catch (error) {
    console.warn('Error converting to string:', error);
    return defaultValue;
  }
};

/**
 * Safe boolean conversion
 */
export const safeBoolean = (value: any, defaultValue: boolean = false): boolean => {
  try {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value) || defaultValue;
  } catch (error) {
    console.warn('Error converting to boolean:', error);
    return defaultValue;
  }
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(safeString(email));
  } catch (error) {
    console.warn('Error validating email:', error);
    return false;
  }
};

/**
 * Retry async function with exponential backoff
 */
export const retryAsync = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
};
