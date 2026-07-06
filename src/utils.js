// Small shared helpers.

export function initials(email = '') {
  const name = String(email).split('@')[0] || '';
  return name.slice(0, 2).toUpperCase() || 'U';
}
