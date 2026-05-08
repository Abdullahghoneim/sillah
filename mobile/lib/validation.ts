const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Enter your email';
  if (!EMAIL_RE.test(value)) return 'Enter a valid email like name@example.com';
  return null;
}

export function validateName(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Enter your full name';
  if (value.length < 2) return 'Name must be at least 2 characters';
  if (value.length > 120) return 'Name is too long';
  return null;
}

export function validateOtp(otp: string, length = 6): string | null {
  if (!otp) return `Enter the ${length}-digit code from your email`;
  if (otp.length < length) return `Enter all ${length} digits`;
  if (!/^\d+$/.test(otp)) return 'Code must be digits only';
  return null;
}

const PHONE_RE = /^[+\d][\d\s\-()]*$/;

export function validatePhone(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Enter your phone number';
  if (value.length < 5) return 'Phone number is too short';
  if (value.length > 20) return 'Phone number is too long';
  if (!PHONE_RE.test(value)) {
    return 'Enter a valid phone like +20 100 123 4567';
  }
  const digitCount = value.replace(/\D/g, '').length;
  if (digitCount < 7) return 'Enter at least 7 digits';
  return null;
}

export function friendlyAuthError(err: unknown, fallback: string): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : '';
  const lower = raw.toLowerCase();

  if (!raw) return fallback;
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'This email is already registered — try logging in instead';
  }
  if (lower.includes('invalid otp') || lower.includes('invalid code')) {
    return 'That code is incorrect — double-check and try again';
  }
  if (lower.includes('expired')) {
    return 'That code has expired — tap Resend for a new one';
  }
  if (lower.includes('too many') || lower.includes('rate')) {
    return 'Too many attempts — wait a moment and try again';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Can’t reach the server — check your connection and try again';
  }
  if (lower.includes('user not found') || lower.includes('no user')) {
    return 'We couldn’t find an account with that email';
  }
  return raw;
}
