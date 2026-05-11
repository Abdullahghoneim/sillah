import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { AuthLayout } from '@/components/auth-layout';
import { API_BASE_URL, authClient } from '@/lib/auth-client';
import { acceptInviteToken } from '@/lib/students-api';
import { friendlyAuthError } from '@/lib/validation';

export const PENDING_INVITE_KEY = 'sillah_pending_invite_token';

const COLORS = {
  white: '#FFFFFF',
  textMain: '#091E42',
  textSub: '#5D6B82',
  border: '#D2DBE2',
  teal: '#2CA1AB',
  brandRed: '#D7583A',
};

type RoleOption = {
  value: 'TEACHER' | 'STUDENT';
  label: string;
};

const OPTIONS: RoleOption[] = [
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'STUDENT', label: 'Parent/Student' },
];

export default function SelectRole() {
  const [selected, setSelected] = useState<RoleOption['value'] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onNext() {
    if (!selected) {
      setFormError('Pick a role to continue');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const cookie = authClient.getCookie();
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify({ role: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? `Update failed (${res.status})`);
      }
      if (selected === 'TEACHER') {
        router.replace('/(tabs)/students' as never);
      } else {
        let pendingToken: string | null = null;
        try {
          pendingToken = await SecureStore.getItemAsync(PENDING_INVITE_KEY);
        } catch {
          pendingToken = null;
        }
        if (pendingToken) {
          try {
            await acceptInviteToken(pendingToken);
          } catch {
            // ignore — either token expired / already linked by email auto-match
          }
          try {
            await SecureStore.deleteItemAsync(PENDING_INVITE_KEY);
          } catch {
            // best-effort cleanup
          }
        }
        router.replace('/(tabs)/student-home' as never);
      }
    } catch (err) {
      setFormError(friendlyAuthError(err, 'Could not save your role. Try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout titleLines={['Select Your Role']} showBack>
      <View style={styles.options}>
        {OPTIONS.map((opt) => {
          const isActive = selected === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                setSelected(opt.value);
                if (formError) setFormError(null);
              }}
              style={({ pressed }) => [
                styles.option,
                isActive && styles.optionActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View
                style={[styles.radioOuter, isActive && styles.radioOuterActive]}
              >
                {isActive ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.optionLabel}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.cta,
          (pressed || submitting) && styles.ctaPressed,
        ]}
        onPress={onNext}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.ctaText}>Next</Text>
        )}
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  options: {
    width: '100%',
    gap: 12,
  },
  option: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
  },
  optionActive: {
    borderColor: COLORS.teal,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: COLORS.teal,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.teal,
  },
  optionLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMain,
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
});
