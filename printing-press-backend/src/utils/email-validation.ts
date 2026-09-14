const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isValidEmail = (value: unknown): boolean => typeof value === 'string' && EMAIL_PATTERN.test(value.trim());
export const requireValidEmail = (value: unknown, optional = false): void => {
  if (optional && (value == null || String(value).trim() === '')) return;
  if (!isValidEmail(value)) throw new Error('INVALID_EMAIL');
};
