import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authClient } from '@/lib/auth-client';
import { Avatar } from './Avatar';
import { STUDENT_COLORS, STUDENT_RADII } from './tokens';

export function Topbar() {
  const { data: session } = authClient.useSession();
  const name = session?.user?.name ?? 'My Profile';
  const firstName = name.split(' ')[0];
  const image = (session?.user as { image?: string | null } | undefined)?.image;

  return (
    <View style={styles.topbar}>
      <View style={styles.searchBox}>
        <Ionicons
          name="search-outline"
          size={18}
          color={STUDENT_COLORS.textMuted}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search . ."
          placeholderTextColor={STUDENT_COLORS.textMuted}
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          hitSlop={6}
          style={({ pressed }) => [styles.flag, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.flagText}>🇬🇧</Text>
        </Pressable>

        <Pressable
          hitSlop={6}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons
            name="notifications-outline"
            size={22}
            color={STUDENT_COLORS.textMain}
          />
        </Pressable>

        <Pressable
          hitSlop={4}
          onPress={() => router.push('/(tabs)/profile' as never)}
          style={({ pressed }) => [styles.profile, pressed && { opacity: 0.85 }]}
        >
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.profileAvatar}
              contentFit="cover"
            />
          ) : (
            <Avatar name={name} size={36} />
          )}
          <Text style={styles.profileLabel} numberOfLines={1}>
            {firstName || 'My Profile'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={STUDENT_COLORS.textSub}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    height: 72,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    shadowColor: '#AFB6C9',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 10,
  },
  searchBox: {
    flex: 1,
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: STUDENT_COLORS.textMain,
  },
  actions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  flag: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  flagText: {
    fontSize: 18,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: STUDENT_RADII.avatar,
  },
  profileLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: STUDENT_COLORS.textMain,
    maxWidth: 120,
  },
});
