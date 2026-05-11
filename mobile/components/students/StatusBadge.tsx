import { StyleSheet, Text, View } from 'react-native';
import type { StudentStatusValue } from '@/lib/students-api';
import { STUDENT_COLORS, STUDENT_RADII } from './tokens';

type Props = {
  status: StudentStatusValue;
};

export function StatusBadge({ status }: Props) {
  const isActive = status === 'ACTIVE';
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isActive
            ? STUDENT_COLORS.activeBg
            : STUDENT_COLORS.inactiveBg,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: isActive
              ? STUDENT_COLORS.activeText
              : STUDENT_COLORS.inactiveText,
          },
        ]}
      >
        {isActive ? 'Active' : 'Inactive'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: STUDENT_RADII.badge,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
});
