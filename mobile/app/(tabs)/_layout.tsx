import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authClient } from '@/lib/auth-client';
import { Sidebar } from '@/components/students/Sidebar';
import { Topbar } from '@/components/students/Topbar';

const PAGE_BG = '#F7FFFF';

export default function TabLayout() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const variant = role === 'STUDENT' ? 'student' : 'teacher';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.shell}>
        <Sidebar variant={variant} />
        <View style={styles.main}>
          <Topbar />
          <View style={styles.content}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: PAGE_BG },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="explore" />
              <Stack.Screen name="students/index" />
              <Stack.Screen name="students/[studentId]" />
              <Stack.Screen name="student-home/index" />
              <Stack.Screen name="profile/index" />
            </Stack>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  shell: { flex: 1, flexDirection: 'row' },
  main: { flex: 1, backgroundColor: PAGE_BG },
  content: { flex: 1, backgroundColor: PAGE_BG },
});
