import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { authClient } from '@/lib/auth-client';

export default function HomeIndex() {
  const { data: session, isPending } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);

  async function onLogout() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      router.replace('/login');
    } finally {
      setSigningOut(false);
    }
  }

  if (isPending) {
    return (
      <View style={styles.center} />
    );
  }
  if (!session) {
    return <Redirect href="/login" />;
  }
  return (
    <View style={styles.center}>
      <View style={styles.row}>
        <Text style={styles.welcome}>
          Welcome, {session.user.name ?? session.user.email}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.logout,
            (pressed || signingOut) && styles.logoutPressed,
          ]}
          onPress={onLogout}
          disabled={signingOut}
          hitSlop={8}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color="#D7583A" />
          ) : (
            <Text style={styles.logoutText}>Logout</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  welcome: {
    fontSize: 18,
    color: '#091E42',
  },
  logout: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D7583A',
  },
  logoutPressed: {
    opacity: 0.7,
  },
  logoutText: {
    fontSize: 13,
    color: '#D7583A',
    fontWeight: '600',
  },
});
