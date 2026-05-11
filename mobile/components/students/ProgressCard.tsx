import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STUDENT_COLORS, STUDENT_RADII, STUDENT_SHADOW } from './tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  label: string;
  value: string;
  delta?: string;
  icon: IconName;
  iconColor: string;
  iconBg: string;
};

export function ProgressCard({
  label,
  value,
  delta,
  icon,
  iconColor,
  iconBg,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      </View>
      <Text style={styles.value}>{value}</Text>
      {delta ? <Text style={styles.delta}>{delta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 200,
    backgroundColor: STUDENT_COLORS.cardBg,
    borderRadius: STUDENT_RADII.card,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: STUDENT_COLORS.border,
    ...STUDENT_SHADOW,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: STUDENT_COLORS.textSub,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 22,
    color: STUDENT_COLORS.textMain,
  },
  delta: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: STUDENT_COLORS.activeText,
  },
});
