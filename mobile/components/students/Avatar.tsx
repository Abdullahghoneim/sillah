import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { STUDENT_COLORS, STUDENT_RADII } from './tokens';

type Props = {
  name: string;
  avatarUrl?: string | null;
  size?: number;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, avatarUrl, size = 40 }: Props) {
  const initials = getInitials(name || '?');
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: STUDENT_RADII.avatar,
        }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: STUDENT_RADII.avatar,
        },
      ]}
    >
      <Text
        style={[styles.text, { fontSize: Math.max(12, Math.round(size * 0.4)) }]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: STUDENT_COLORS.primaryTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_600SemiBold',
  },
});
