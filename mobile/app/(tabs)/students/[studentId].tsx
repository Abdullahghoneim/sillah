import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { authClient } from '@/lib/auth-client';
import { type StudentWithProgress, getStudent } from '@/lib/students-api';
import { Avatar } from '@/components/students/Avatar';
import { ProgressCard } from '@/components/students/ProgressCard';
import {
  STUDENT_COLORS,
  STUDENT_RADII,
  STUDENT_SHADOW,
} from '@/components/students/tokens';

const LEVEL_LABEL: Record<StudentWithProgress['level'], string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

type Tab = 'overview' | 'lessons' | 'practices';

export default function StudentProfileScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const [student, setStudent] = useState<StudentWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  const fetchStudent = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getStudent(studentId);
      setStudent(res.student);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (sessionLoading || !session) return;
    fetchStudent();
  }, [fetchStudent, session, sessionLoading]);

  if (sessionLoading) return <View style={styles.fullPage} />;
  if (!session) return <Redirect href="/login" />;

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
      >
          <Pressable
            onPress={() => router.replace('/(tabs)/students' as never)}
            style={({ pressed }) => [
              styles.backLink,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
          >
            <Ionicons
              name="chevron-back"
              size={16}
              color={STUDENT_COLORS.textSub}
            />
            <Text style={styles.backLinkText}>Back to students</Text>
          </Pressable>

          {loading ? (
            <SkeletonProfile />
          ) : error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color={STUDENT_COLORS.brandRed}
              />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                onPress={fetchStudent}
                style={({ pressed }) => [
                  styles.retry,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : student ? (
            <>
              <ProfileHeader student={student} />

              <View style={styles.tabBar}>
                <TabItem
                  label="Overview"
                  active={tab === 'overview'}
                  onPress={() => setTab('overview')}
                />
                <TabItem
                  label="Inclass Lessons"
                  active={tab === 'lessons'}
                  onPress={() => setTab('lessons')}
                />
                <TabItem
                  label="Practices"
                  active={tab === 'practices'}
                  onPress={() => setTab('practices')}
                />
              </View>

              {tab === 'overview' ? (
                <OverviewTab student={student} />
              ) : tab === 'lessons' ? (
                <EmptyAssignTab label="lessons" />
              ) : (
                <EmptyAssignTab label="practices" />
              )}
            </>
          ) : null}
      </ScrollView>
    </View>
  );
}

function ProfileHeader({ student }: { student: StudentWithProgress }) {
  return (
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <Avatar name={student.name} avatarUrl={student.avatarUrl} size={72} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{student.name}</Text>
            {student.status === 'ACTIVE' ? (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>Active Now</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons
                name="star-outline"
                size={14}
                color={STUDENT_COLORS.textSub}
              />
              <Text style={styles.metaText}>
                Age: {student.age != null ? student.age : '—'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons
                name="trending-up-outline"
                size={14}
                color={STUDENT_COLORS.textSub}
              />
              <Text style={styles.metaText}>
                Level: {LEVEL_LABEL[student.level]}
              </Text>
            </View>
            {student.parentEmail ? (
              <View style={styles.metaItem}>
                <Ionicons
                  name="mail-outline"
                  size={14}
                  color={STUDENT_COLORS.textSub}
                />
                <Text style={styles.metaText}>{student.parentEmail}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={({ pressed }) => [
            styles.actionFilled,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="book-outline" size={16} color="#FFFFFF" />
          <Text style={styles.actionFilledText}>Assign a Lesson</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionOutlined,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons
            name="clipboard-outline"
            size={16}
            color={STUDENT_COLORS.primaryTeal}
          />
          <Text style={styles.actionOutlinedText}>Assign a Practice</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TabItem({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tabItem, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
      <View
        style={[
          styles.tabUnderline,
          active && { backgroundColor: STUDENT_COLORS.primaryTeal },
        ]}
      />
    </Pressable>
  );
}

function OverviewTab({ student }: { student: StudentWithProgress }) {
  const overall = student.progress?.overallProgress ?? 0;
  const attendance = student.progress?.attendanceRate ?? 0;
  const lessons = student.progress?.lessonsCompleted ?? 0;
  const practice = student.progress?.practiceCompleted ?? 0;

  return (
    <View style={styles.statsGrid}>
      <ProgressCard
        label="Overall Progress"
        value={`${Math.round(overall)}%`}
        delta="+5% this month"
        icon="star"
        iconColor={STUDENT_COLORS.starYellow}
        iconBg="#FEF3C7"
      />
      <ProgressCard
        label="Attendance Rate"
        value={`${Math.round(attendance)}%`}
        delta="+3% this week"
        icon="calendar"
        iconColor={STUDENT_COLORS.primaryTeal}
        iconBg="#CCFBF1"
      />
      <ProgressCard
        label="Lessons Completed"
        value={`${lessons}`}
        delta="+6% this month"
        icon="bulb"
        iconColor={STUDENT_COLORS.targetOrange}
        iconBg="#FFEDD5"
      />
      <ProgressCard
        label="Practice Completed"
        value={`${Math.round(practice)}%`}
        delta="+2% this month"
        icon="clipboard"
        iconColor={STUDENT_COLORS.clipboardYellow}
        iconBg="#FEF9C3"
      />
    </View>
  );
}

function EmptyAssignTab({ label }: { label: 'lessons' | 'practices' }) {
  return (
    <View style={styles.emptyTab}>
      <Ionicons
        name={label === 'lessons' ? 'book-outline' : 'clipboard-outline'}
        size={36}
        color={STUDENT_COLORS.primaryTeal}
      />
      <Text style={styles.emptyTitle}>No {label} assigned yet</Text>
      <Text style={styles.emptyBody}>
        Assign a {label === 'lessons' ? 'lesson' : 'practice'} to start tracking
        progress.
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.actionFilled,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Ionicons name="add" size={16} color="#FFFFFF" />
        <Text style={styles.actionFilledText}>
          Assign a {label === 'lessons' ? 'Lesson' : 'Practice'}
        </Text>
      </Pressable>
    </View>
  );
}

function SkeletonProfile() {
  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.profileCard, { paddingVertical: 32 }]}>
        <ActivityIndicator color={STUDENT_COLORS.primaryTeal} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F7FFFF' },
  main: { flex: 1 },
  mainContent: {
    padding: 28,
    gap: 18,
  },
  fullPage: { flex: 1, backgroundColor: '#F7FFFF' },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  backLinkText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: STUDENT_COLORS.textSub,
  },
  profileCard: {
    backgroundColor: STUDENT_COLORS.cardBg,
    borderRadius: STUDENT_RADII.card,
    borderWidth: 1,
    borderColor: STUDENT_COLORS.border,
    padding: 24,
    gap: 18,
    ...STUDENT_SHADOW,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  profileName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 22,
    color: STUDENT_COLORS.textMain,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: STUDENT_RADII.badge,
    backgroundColor: STUDENT_COLORS.activeBg,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STUDENT_COLORS.activeText,
  },
  activeText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: STUDENT_COLORS.activeText,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: STUDENT_COLORS.textSub,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: STUDENT_COLORS.primaryTeal,
    borderRadius: STUDENT_RADII.button,
  },
  actionFilledText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  actionOutlined: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: STUDENT_COLORS.primaryTeal,
    borderRadius: STUDENT_RADII.button,
    backgroundColor: STUDENT_COLORS.cardBg,
  },
  actionOutlinedText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: STUDENT_COLORS.primaryTeal,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: STUDENT_COLORS.border,
  },
  tabItem: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  tabLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: STUDENT_COLORS.textSub,
  },
  tabLabelActive: {
    color: STUDENT_COLORS.primaryTeal,
    fontFamily: 'Manrope_600SemiBold',
  },
  tabUnderline: {
    height: 2,
    backgroundColor: 'transparent',
    borderRadius: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  emptyTab: {
    backgroundColor: STUDENT_COLORS.cardBg,
    borderRadius: STUDENT_RADII.card,
    borderWidth: 1,
    borderColor: STUDENT_COLORS.border,
    padding: 40,
    alignItems: 'center',
    gap: 10,
    ...STUDENT_SHADOW,
  },
  emptyTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    color: STUDENT_COLORS.textMain,
  },
  emptyBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: STUDENT_COLORS.textSub,
    textAlign: 'center',
    maxWidth: 320,
  },
  errorBox: {
    backgroundColor: STUDENT_COLORS.cardBg,
    borderRadius: STUDENT_RADII.card,
    borderWidth: 1,
    borderColor: STUDENT_COLORS.border,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: STUDENT_COLORS.textSub,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: STUDENT_COLORS.primaryTeal,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: STUDENT_RADII.button,
  },
  retryText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
});
