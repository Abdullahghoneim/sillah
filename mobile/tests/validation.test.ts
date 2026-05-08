import {
  friendlyAuthError,
  validateEmail,
  validateName,
  validateOtp,
  validatePhone,
} from '@/lib/validation';

describe('validateEmail', () => {
  test('rejects empty', () => {
    expect(validateEmail('')).toBe('Enter your email');
    expect(validateEmail('   ')).toBe('Enter your email');
  });

  test('rejects malformed', () => {
    expect(validateEmail('not-an-email')).toMatch(/valid email/);
    expect(validateEmail('a@b')).toMatch(/valid email/);
    expect(validateEmail('a @b.com')).toMatch(/valid email/);
  });

  test('accepts valid', () => {
    expect(validateEmail('a@b.co')).toBeNull();
    expect(validateEmail('  Ehsan@Example.COM  ')).toBeNull();
  });
});

describe('validateName', () => {
  test('rejects empty', () => {
    expect(validateName('')).toBe('Enter your full name');
    expect(validateName('  ')).toBe('Enter your full name');
  });

  test('rejects too short / too long', () => {
    expect(validateName('A')).toMatch(/at least 2/);
    expect(validateName('x'.repeat(121))).toMatch(/too long/);
  });

  test('accepts normal name', () => {
    expect(validateName('Ehsan Mohamed')).toBeNull();
  });
});

describe('validatePhone', () => {
  test('rejects empty', () => {
    expect(validatePhone('')).toBe('Enter your phone number');
  });

  test('rejects too short', () => {
    expect(validatePhone('+1')).toMatch(/too short/);
  });

  test('rejects bad characters', () => {
    expect(validatePhone('phone-here!')).toMatch(/valid phone/);
  });

  test('rejects when digit count below 7', () => {
    expect(validatePhone('+1-2-3-4')).toMatch(/at least 7 digits/);
  });

  test('accepts well-formed numbers', () => {
    expect(validatePhone('+20 100 123 4567')).toBeNull();
    expect(validatePhone('01062067188')).toBeNull();
    expect(validatePhone('1-202-555-0136')).toBeNull();
  });
});

describe('validateOtp', () => {
  test('rejects empty', () => {
    expect(validateOtp('')).toMatch(/6-digit/);
  });

  test('rejects partial', () => {
    expect(validateOtp('123')).toMatch(/all 6 digits/);
  });

  test('rejects non-digits', () => {
    expect(validateOtp('12a456')).toMatch(/digits only/);
  });

  test('accepts complete code', () => {
    expect(validateOtp('123456')).toBeNull();
  });
});

describe('friendlyAuthError', () => {
  test('translates already-registered', () => {
    expect(
      friendlyAuthError(new Error('Email already registered'), 'fb'),
    ).toMatch(/already registered/i);
  });

  test('translates invalid otp', () => {
    expect(friendlyAuthError(new Error('Invalid OTP'), 'fb')).toMatch(
      /incorrect/i,
    );
  });

  test('translates expired', () => {
    expect(friendlyAuthError(new Error('OTP expired'), 'fb')).toMatch(
      /expired/i,
    );
  });

  test('translates network failures', () => {
    expect(
      friendlyAuthError(new Error('network request failed'), 'fb'),
    ).toMatch(/can.t reach/i);
  });

  test('falls back to provided text on empty', () => {
    expect(friendlyAuthError(undefined, 'fallback msg')).toBe('fallback msg');
  });

  test('passes through unknown messages', () => {
    expect(friendlyAuthError(new Error('Some weird thing'), 'fb')).toBe(
      'Some weird thing',
    );
  });
});
