export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidIndianPhone10(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  // Must be exactly 10 digits starting with 6-9
  return /^[6-9]\d{9}$/.test(cleaned);
}

export function formatPhone10(phone: string): string {
  return phone.replace(/\D/g, '').slice(0, 10);
}

export function isNonEmpty(s: string): boolean {
  return s.trim().length > 0;
}
