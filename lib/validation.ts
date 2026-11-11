export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
};

export function getPasswordStrength(pw: string): PasswordStrength {
  if (pw.length < 6) return { score: 0, label: 'Too short' };
  let score = 1;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'] as const;
  const s = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  return { score: s, label: labels[s] };
}