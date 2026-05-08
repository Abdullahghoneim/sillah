import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AuthLayout } from '@/components/auth-layout';
import { authClient, registerUser } from '@/lib/auth-client';
import {
  friendlyAuthError,
  validateEmail,
  validateName,
  validatePhone,
} from '@/lib/validation';

const COLORS = {
  white: '#FFFFFF',
  textMain: '#091E42',
  textSub: '#5D6B82',
  border: '#D2DBE2',
  teal: '#2CA1AB',
  brandRed: '#D7583A',
};

export default function Register() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function onContinue() {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const nameMsg = validateName(trimmedName);
    const phoneMsg = validatePhone(trimmedPhone);
    const emailMsg = validateEmail(trimmedEmail);
    const termsMsg = acceptTerms
      ? null
      : 'You must accept the Terms and Privacy Policy to continue';

    setNameError(nameMsg);
    setPhoneError(phoneMsg);
    setEmailError(emailMsg);
    setTermsError(termsMsg);
    if (nameMsg || phoneMsg || emailMsg || termsMsg) return;

    setFormError(null);
    setSubmitting(true);
    try {
      await registerUser({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        acceptTerms: true,
      });
      const { error: otpError } = await authClient.emailOtp.sendVerificationOtp({
        email: trimmedEmail,
        type: 'sign-in',
      });
      if (otpError) {
        throw new Error(otpError.message ?? 'Could not send code');
      }
      router.push({
        pathname: '/verify',
        params: { email: trimmedEmail, mode: 'signup' },
      });
    } catch (err) {
      const friendly = friendlyAuthError(err, 'Could not create your account. Try again.');
      if (friendly.toLowerCase().includes('already registered')) {
        setEmailError(friendly);
      } else {
        setFormError(friendly);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout titleLines={['Welcome, let’s Start', 'Arabic learning']}>
      <View style={styles.fieldGroup}>
        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, nameError && styles.inputInvalid]}
            placeholder="Ehsan Mohamed"
            placeholderTextColor={COLORS.textSub}
            autoCapitalize="words"
            autoCorrect={false}
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (nameError) setNameError(null);
              if (formError) setFormError(null);
            }}
            editable={!submitting}
          />
          {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, emailError && styles.inputInvalid]}
            placeholder="Ehsan@example.com"
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

        <View style={styles.field}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={[styles.input, phoneError && styles.inputInvalid]}
            placeholder="+20 100 123 4567"
            placeholderTextColor={COLORS.textSub}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              if (phoneError) setPhoneError(null);
              if (formError) setFormError(null);
            }}
            editable={!submitting}
          />
          {phoneError ? <Text style={styles.fieldError}>{phoneError}</Text> : null}
        </View>

        <View style={{ width: '100%', gap: 6 }}>
          <Pressable
            style={styles.termsRow}
            onPress={() => {
              setAcceptTerms((v) => !v);
              if (termsError) setTermsError(null);
            }}
            hitSlop={8}
          >
            <View
              style={[
                styles.checkbox,
                acceptTerms && styles.checkboxChecked,
                termsError && styles.checkboxInvalid,
              ]}
            >
              {acceptTerms ? (
                <Ionicons name="checkmark" size={14} color={COLORS.white} />
              ) : null}
            </View>
            <Text style={styles.termsText}>
              By creating an account, you agree to{' '}
              <Text style={styles.termsAccent}>Terms and Privacy Policy</Text>
            </Text>
          </Pressable>
          {termsError ? <Text style={styles.fieldError}>{termsError}</Text> : null}
        </View>
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

      <View style={styles.signinRow}>
        <Text style={styles.signinMuted}>Already have an account?</Text>
        <Pressable hitSlop={8} onPress={() => router.replace('/login')}>
          <Text style={styles.signinLink}>Login</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { width: '100%', gap: 12 },
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

  termsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  checkboxInvalid: {
    borderColor: COLORS.brandRed,
  },
  termsText: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSub,
  },
  termsAccent: { color: COLORS.textMain },

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

  signinRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signinMuted: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textSub,
  },
  signinLink: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.teal,
  },
});
