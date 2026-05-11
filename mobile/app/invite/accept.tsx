import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { authClient } from '@/lib/auth-client';
import { acceptInviteToken } from '@/lib/students-api';
import { friendlyAuthError } from '@/lib/validation';

export const PENDING_INVITE_KEY = 'sillah_pending_invite_token';

const COLORS = {
  pageBg: '#F7FFFF',
  cardBg: '#FFFFFF',
  textMain: '#091E42',
  textSub: '#5D6B82',
  teal: '#2CA1AB',
  red: '#D7583A',
};

type State =
  | { kind: 'loading' }
  | { kind: 'success'; name?: string }
  | { kind: 'no-session' }
  | { kind: 'wrong-role' }
  | { kind: 'error'; message: string };

export default function AcceptInvite() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token =
    typeof params.token === 'string'
      ? params.token
      : Array.isArray(params.token)
        ? params.token[0]
        : '';

  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const handledRef = useRef(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (handledRef.current) return;

    if (!token) {
      setState({
        kind: 'error',
        message: 'This invitation link is missing a token.',
      });
      return;
    }

    handledRef.current = true;

    if (!session) {
      SecureStore.setItemAsync(PENDING_INVITE_KEY, token).catch(() => {});
      setState({ kind: 'no-session' });
      return;
    }

    const role = (session.user as { role?: string }).role;
    if (role && role !== 'STUDENT') {
      setState({ kind: 'wrong-role' });
      return;
    }

    acceptInviteToken(token)
      .then((res) => {
        if (res.student) {
          SecureStore.deleteItemAsync(PENDING_INVITE_KEY).catch(() => {});
          setState({ kind: 'success', name: res.student.name });
          setTimeout(() => {
            router.replace('/(tabs)/student-home' as never);
          }, 900);
        } else {
          setState({
            kind: 'error',
            message: 'That invitation could not be accepted.',
          });
        }
      })
      .catch((err) => {
        const rawMessage =
          err instanceof Error ? err.message : String(err ?? '');
        if (rawMessage === 'EXPIRED_TOKEN') {
          setState({
            kind: 'error',
            message:
              'This invitation has expired. Ask your teacher for a new one.',
          });
        } else if (rawMessage === 'INVALID_TOKEN') {
          setState({
            kind: 'error',
            message: 'This invitation link is no longer valid.',
          });
        } else {
          setState({
            kind: 'error',
            message: friendlyAuthError(err, 'Could not accept the invite.'),
          });
        }
      });
  }, [session, sessionLoading, token]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <View style={styles.card}>
          {state.kind === 'loading' ? (
            <>
              <ActivityIndicator color={COLORS.teal} size="large" />
              <Text style={styles.title}>Accepting invitation…</Text>
              <Text style={styles.body}>Hold tight while we set things up.</Text>
            </>
          ) : state.kind === 'success' ? (
            <>
              <View style={[styles.iconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark" size={32} color="#15803D" />
              </View>
              <Text style={styles.title}>
                Welcome{state.name ? `, ${state.name}` : ''}!
              </Text>
              <Text style={styles.body}>
                You're now connected to your teacher. Opening your home…
              </Text>
            </>
          ) : state.kind === 'no-session' ? (
            <>
              <View style={[styles.iconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="mail-outline" size={28} color={COLORS.teal} />
              </View>
              <Text style={styles.title}>You've been invited!</Text>
              <Text style={styles.body}>
                Create your Sillah account to accept the invitation. Use the
                email address your teacher used to invite you.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.cta,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => router.replace('/register')}
              >
                <Text style={styles.ctaText}>Create Account</Text>
              </Pressable>
              <Pressable
                onPress={() => router.replace('/login')}
                style={({ pressed }) => [
                  styles.secondary,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.secondaryText}>
                  I already have an account
                </Text>
              </Pressable>
            </>
          ) : state.kind === 'wrong-role' ? (
            <>
              <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons
                  name="alert-circle-outline"
                  size={28}
                  color={COLORS.red}
                />
              </View>
              <Text style={styles.title}>This invite is for a student</Text>
              <Text style={styles.body}>
                You're currently signed in to a teacher account. Sign out and
                sign in as a student to accept this invitation.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.cta,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={async () => {
                  try {
                    await authClient.signOut();
                  } finally {
                    router.replace('/login');
                  }
                }}
              >
                <Text style={styles.ctaText}>Sign out</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons
                  name="alert-circle-outline"
                  size={28}
                  color={COLORS.red}
                />
              </View>
              <Text style={styles.title}>Couldn't accept invitation</Text>
              <Text style={styles.body}>{state.message}</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.cta,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.ctaText}>Back to sign in</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.pageBg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 20,
    color: COLORS.textMain,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSub,
    textAlign: 'center',
  },
  cta: {
    width: '100%',
    backgroundColor: COLORS.teal,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  secondary: {
    paddingVertical: 8,
  },
  secondaryText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: COLORS.teal,
  },
});
