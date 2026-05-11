import { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import { authClient } from '@/lib/auth-client';
import { STUDENT_COLORS } from './tokens';
import {
  CalendarIcon,
  DashboardIcon,
  LessonsIcon,
  LogoutIcon,
  PracticeIcon,
  StudentsIcon,
  TemplatesIcon,
} from './SidebarIcons';

type IconProps = { color?: string; size?: number };

type NavItem = {
  label: string;
  Icon: ComponentType<IconProps>;
  href: string;
  match: string[];
};

const TEACHER_NAV: NavItem[] = [
  { label: 'Dashboard', Icon: DashboardIcon, href: '/(tabs)', match: ['/'] },
  { label: 'Templates', Icon: TemplatesIcon, href: '/(tabs)/students', match: ['/templates'] },
  { label: 'Lessons', Icon: LessonsIcon, href: '/(tabs)/students', match: ['/lessons'] },
  { label: 'Practice', Icon: PracticeIcon, href: '/(tabs)/students', match: ['/practice'] },
  { label: 'Students', Icon: StudentsIcon, href: '/(tabs)/students', match: ['/students'] },
  { label: 'Calendar', Icon: CalendarIcon, href: '/(tabs)/students', match: ['/calendar'] },
];

const STUDENT_NAV: NavItem[] = [
  { label: 'Home', Icon: DashboardIcon, href: '/(tabs)/student-home', match: ['/student-home'] },
  { label: 'Lessons', Icon: LessonsIcon, href: '/(tabs)/student-home', match: ['/lessons'] },
  { label: 'Practice', Icon: PracticeIcon, href: '/(tabs)/student-home', match: ['/practice'] },
  { label: 'Calendar', Icon: CalendarIcon, href: '/(tabs)/student-home', match: ['/calendar'] },
];

type Props = {
  variant?: 'teacher' | 'student';
};

const ICON_INACTIVE = '#5D6B82';
const ACTIVE_TINT = '#2CA1AB';
const ACTIVE_BG = '#D8F0F080';

export function Sidebar({ variant = 'teacher' }: Props) {
  const pathname = usePathname();
  const items = variant === 'teacher' ? TEACHER_NAV : STUDENT_NAV;

  async function onLogout() {
    try {
      await authClient.signOut();
    } finally {
      router.replace('/login');
    }
  }

  return (
    <View style={styles.sidebar}>
      <View style={styles.logoBlock}>
        <Image
          source={require('@/assets/images/silah-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </View>

      <View style={styles.nav}>
        {items.map((item, idx) => {
          const active = item.match.some((m) =>
            m === '/' ? pathname === '/' : pathname.startsWith(m),
          );
          const IconCmp = item.Icon;
          return (
            <Pressable
              key={`${item.label}-${idx}`}
              onPress={() => router.push(item.href as never)}
              style={({ pressed }) => [
                styles.navItem,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
                <IconCmp
                  size={24}
                  color={active ? ACTIVE_TINT : ICON_INACTIVE}
                />
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.iconCircle}>
            <LogoutIcon size={24} color={ICON_INACTIVE} />
          </View>
          <Text style={styles.navLabel}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.mascotWrap}>
        <View style={styles.mascotCircle}>
          <Image
            source={require('@/assets/images/login-mascot.png')}
            style={styles.mascot}
            contentFit="cover"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 80,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
    shadowColor: '#AFB6C9',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 2, height: 2 },
    elevation: 4,
  },
  logoBlock: {
    paddingBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 56,
    height: 44,
  },
  nav: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    gap: 14,
    paddingTop: 6,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
    width: '100%',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconCircleActive: {
    backgroundColor: ACTIVE_BG,
  },
  navLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: ICON_INACTIVE,
    textAlign: 'center',
  },
  navLabelActive: {
    color: ACTIVE_TINT,
    fontFamily: 'Manrope_600SemiBold',
  },
  mascotWrap: {
    paddingTop: 12,
    alignItems: 'center',
  },
  mascotCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: STUDENT_COLORS.primaryTeal,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascot: {
    width: 44,
    height: 44,
  },
});
