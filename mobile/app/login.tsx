import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { AuthLayout } from '@/components/auth-layout';
import { authClient } from '@/lib/auth-client';
import { friendlyAuthError, validateEmail } from '@/lib/validation';

const COLORS = {
  white: '#FFFFFF',
  textMain: '#091E42',
  textSub: '#5D6B82',
  border: '#D2DBE2',
  teal: '#2CA1AB',
  brandRed: '#D7583A',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function onContinue() {
    const trimmed = email.trim().toLowerCase();
    const emailMsg = validateEmail(trimmed);
    if (emailMsg) {
      setEmailError(emailMsg);
      return;
    }
    setEmailError(null);
    setFormError(null);
    setSubmitting(true);
    try {
      const { error: otpError } = await authClient.emailOtp.sendVerificationOtp({
        email: trimmed,
        type: 'sign-in',
      });
      if (otpError) {
        throw new Error(otpError.message ?? 'Could not send code');
      }
      router.push({
        pathname: '/verify',
        params: { email: trimmed, mode: 'signin' },
      });
    } catch (err) {
      setFormError(friendlyAuthError(err, 'Could not send the code. Try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  const emailInvalid = !!emailError;

  return (
    <AuthLayout titleLines={['Welcome, let’s keep', 'Arabic learning']}>
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, emailInvalid && styles.inputInvalid]}
          placeholder="Ehsanmohamed@example.com"
          placeholderTextColor={COLORS.textSub}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (emailError) setEmailError(null);
            if (formError) setFormError(null);
          }}
          editable={!submitting}
        />
        {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
      </View>

      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.cta,
          (pressed || submitting) && styles.ctaPressed,
        ]}
        onPress={onContinue}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.ctaText}>Continue</Text>
        )}
      </Pressable>

      <View style={styles.signupRow}>
        <Text style={styles.signupMuted}>New to Silah?</Text>
        <Pressable hitSlop={8} onPress={() => router.push('/register')}>
          <Text style={styles.signupLink}>Create an account</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  field: { width: '100%', gap: 6 },
  label: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMain,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMain,
  },
  inputInvalid: {
    borderColor: COLORS.brandRed,
  },

  fieldError: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.brandRed,
    marginTop: 2,
  },
  formError: {
    width: '100%',
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.brandRed,
    textAlign: 'center',
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

  signupRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signupMuted: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textSub,
  },
  signupLink: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.teal,
  },
});
