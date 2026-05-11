import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Student } from '@/lib/students-api';
import { Avatar } from './Avatar';
import { StatusBadge } from './StatusBadge';
import { STUDENT_COLORS } from './tokens';

const LEVEL_LABEL: Record<Student['level'], string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

type Props = {
  student: Student;
  onView: () => void;
  onToggleStatus: () => void;
  onRemove: () => void;
};

export function StudentRow({
  student,
  onView,
  onToggleStatus,
  onRemove,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={styles.row}>
      <Pressable style={styles.cellStudent} onPress={onView} hitSlop={4}>
        <Avatar name={student.name} avatarUrl={student.avatarUrl} size={36} />
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {student.name}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {student.parentEmail || student.email || ''}
          </Text>
        </View>
      </Pressable>

      <Text style={styles.cellAge}>{student.age != null ? `${student.age}` : '—'}</Text>
      <Text style={styles.cellLevel}>{LEVEL_LABEL[student.level]}</Text>

      <View style={styles.cellStatus}>
        <StatusBadge status={student.status} />
      </View>

      <View style={styles.cellAction}>
        <Pressable
          onPress={() => setMenuOpen((v) => !v)}
          hitSlop={6}
          style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={STUDENT_COLORS.textSub} />
        </Pressable>

        {menuOpen ? (
          <View style={styles.menu}>
            <MenuItem
              label="View Profile"
              icon="person-outline"
              onPress={() => {
                setMenuOpen(false);
                onView();
              }}
            />
            <MenuItem
              label={student.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              icon={student.status === 'ACTIVE' ? 'pause-outline' : 'play-outline'}
              onPress={() => {
                setMenuOpen(false);
                onToggleStatus();
              }}
            />
            <MenuItem
              label="Remove"
              icon="trash-outline"
              danger
              onPress={() => {
                setMenuOpen(false);
                onRemove();
              }}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function MenuItem({
  label,
  icon,
  onPress,
  danger,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        pressed && { backgroundColor: STUDENT_COLORS.rowHoverBg },
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={danger ? STUDENT_COLORS.inactiveText : STUDENT_COLORS.textSub}
      />
      <Text
        style={[
          styles.menuItemText,
          danger && { color: STUDENT_COLORS.inactiveText },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 0.8,
    borderBottomColor: '#D2DBE2',
    gap: 12,
  },
  cellStudent: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  identity: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: STUDENT_COLORS.textMain,
  },
  email: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: STUDENT_COLORS.textSub,
  },
  cellAge: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: STUDENT_COLORS.textMain,
  },
  cellLevel: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: STUDENT_COLORS.textMain,
  },
  cellStatus: { flex: 1 },
  cellAction: {
    width: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'relative',
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    position: 'absolute',
    top: 32,
    right: 0,
    backgroundColor: STUDENT_COLORS.cardBg,
    borderRadius: 8,
    paddingVertical: 6,
    minWidth: 180,
    borderWidth: 1,
    borderColor: STUDENT_COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuItemText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: STUDENT_COLORS.textMain,
  },
});
