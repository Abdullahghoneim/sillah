import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthLayout } from '@/components/auth-layout';
import { authClient } from '@/lib/auth-client';
import { friendlyAuthError, validateOtp } from '@/lib/validation';

const COLORS = {
  white: '#FFFFFF',
  textMain: '#091E42',
  textSub: '#5D6B82',
  border: '#D2DBE2',
  teal: '#2CA1AB',
  brandRed: '#D7583A',
};

const OTP_LENGTH = 6;

type Mode = 'signin' | 'signup';

export default function Verify() {
  const params = useLocalSearchParams<{ email?: string; mode?: Mode }>();
  const email = (params.email ?? '').toString();
  const mode: Mode = params.mode === 'signup' ? 'signup' : 'signin';

  const [digits, setDigits] = useState<string[]>(() =>
    Array(OTP_LENGTH).fill(''),
  );
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const inputs = useRef<(TextInput | null)[]>([]);

  const otp = digits.join('');
  const isComplete = otp.length === OTP_LENGTH;

  const isSignup = mode === 'signup';
  const titleLines = isSignup ? ['Verify your email'] : ['Check your email'];
  const ctaLabel = isSignup ? 'Verify' : 'Sign In';

  function setDigitAt(index: number, value: string) {
    const cleaned = value.replace(/\D/g, '');
    setError(null);
    setInfo(null);

    if (cleaned.length > 1) {
      const next = digits.slice();
      for (let i = 0; i < cleaned.length && index + i < OTP_LENGTH; i++) {
        next[index + i] = cleaned[i];
      }
      setDigits(next);
      const lastFilled = Math.min(index + cleaned.length, OTP_LENGTH) - 1;
      const focusIdx = Math.min(lastFilled + 1, OTP_LENGTH - 1);
      inputs.current[focusIdx]?.focus();
      return;
    }

    const next = digits.slice();
    next[index] = cleaned;
    setDigits(next);
    if (cleaned && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function onKeyPress(
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const next = digits.slice();
      next[index - 1] = '';
      setDigits(next);
    }
  }

  async function onSubmit() {
    if (!email) {
      setError('We lost track of your email — go back and enter it again');
      return;
    }
    const otpMsg = validateOtp(otp, OTP_LENGTH);
    if (otpMsg) {
      setError(otpMsg);
      return;
    }
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await authClient.signIn.emailOtp({
        email,
        otp,
      });
      if (signInError) {
        throw new Error(signInError.message ?? 'Invalid or expired code');
      }
      router.replace(isSignup ? '/select-role' : '/(tabs)');
    } catch (err) {
      setError(friendlyAuthError(err, 'That code didn’t work. Try again or resend.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    if (!email) {
      setError('We lost track of your email — go back and enter it again');
      return;
    }
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      const { error: otpError } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'sign-in',
      });
      if (otpError) throw new Error(otpError.message ?? 'Could not resend code');
      setInfo('A fresh code is on its way to your inbox');
    } catch (err) {
      setError(friendlyAuthError(err, 'Couldn’t resend the code. Try again in a moment.'));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout titleLines={titleLines} showBack>
      <View style={styles.field}>
        <Text style={styles.label}>
          {isSignup
            ? 'Enter the verification code from your email'
            : 'Enter the security code from your email'}
        </Text>
        <View style={styles.otpRow}>
          {digits.map((digit, i) => (
            <TextInput
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
              value={digit}
              onChangeText={(v) => setDigitAt(i, v)}
              onKeyPress={(e) => onKeyPress(i, e)}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              textAlign="center"
              editable={!submitting}
              selectTextOnFocus
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
            />
          ))}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.cta,
          (pressed || submitting) && styles.ctaPressed,
        ]}
        onPress={onSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        )}
      </Pressable>

      <View style={styles.resendRow}>
        <Text style={styles.resendMuted}>Didn’t get the code?</Text>
        <Pressable hitSlop={8} onPress={onResend} disabled={resending}>
          <Text style={[styles.resendLink, resending && { opacity: 0.6 }]}>
            {resending ? 'Sending…' : 'Resend'}
          </Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  field: { width: '100%', gap: 12 },
  label: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMain,
  },

  otpRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpInput: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.textMain,
    backgroundColor: COLORS.white,
    paddingVertical: 0,
  },
  otpInputFilled: {
    borderColor: COLORS.teal,
  },

  error: {
    width: '100%',
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.brandRed,
  },
  info: {
    width: '100%',
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.teal,
  },

  cta: {
    width: '100%',
    backgroundColor: COLORS.teal,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 24,
    color: COLORS.white,
  },

  resendRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resendMuted: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textSub,
  },
  resendLink: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.teal,
  },
});
