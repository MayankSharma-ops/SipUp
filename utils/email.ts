export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function maskEmail(value: string) {
  const email = normalizeEmail(value);
  const [localPart = '', domain = ''] = email.split('@');

  if (!localPart || !domain) {
    return email;
  }

  const visiblePrefix = localPart.slice(0, Math.min(2, localPart.length));
  const hiddenLength = Math.max(localPart.length - visiblePrefix.length, 1);

  return `${visiblePrefix}${'*'.repeat(hiddenLength)}@${domain}`;
}
