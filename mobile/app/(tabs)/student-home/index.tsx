import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { authClient } from '@/lib/auth-client';
import {
  type StudentWithTeacher,
  acceptInviteToken,
  getMyStudentProfile,
} from '@/lib/students-api';
import { Avatar } from '@/components/students/Avatar';
import { ProgressCard } from '@/components/students/ProgressCard';
import {
  STUDENT_COLORS,
  STUDENT_RADII,
  STUDENT_SHADOW,
} from '@/components/students/tokens';
import { friendlyAuthError } from '@/lib/validation';

export default function StudentHomeScreen() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [profile, setProfile] = useState<StudentWithTeacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyStudentProfile();
      setProfile(res.student);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionLoading || !session) return;
    fetchProfile();
  }, [session, sessionLoading, fetchProfile]);

  if (sessionLoading) return <View style={styles.fullPage} />;
  if (!session) return <Redirect href="/login" />;

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
      >
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={STUDENT_COLORS.primaryTeal} />
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color={STUDENT_COLORS.brandRed}
              />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                onPress={fetchProfile}
                style={({ pressed }) => [
                  styles.cta,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.ctaText}>Try again</Text>
              </Pressable>
            </View>
          ) : profile ? (
            <>
              <WelcomeCard
                profile={profile}
                onOpenInvite={() => setInviteModalOpen(true)}
              />

              {profile.teacher ? (
                <View style={styles.statsGrid}>
                  <ProgressCard
                    label="Overall Progress"
                    value={`${Math.round(profile.progress?.overallProgress ?? 0)}%`}
                    icon="star"
                    iconColor={STUDENT_COLORS.starYellow}
                    iconBg="#FEF3C7"
                  />
                  <ProgressCard
                    label="Attendance Rate"
                    value={`${Math.round(profile.progress?.attendanceRate ?? 0)}%`}
                    icon="calendar"
                    iconColor={STUDENT_COLORS.primaryTeal}
                    iconBg="#CCFBF1"
                  />
                  <ProgressCard
                    label="Lessons Completed"
                    value={`${profile.progress?.lessonsCompleted ?? 0}`}
                    icon="bulb"
                    iconColor={STUDENT_COLORS.targetOrange}
                    iconBg="#FFEDD5"
                  />
                  <ProgressCard
                    label="Practice Completed"
                    value={`${Math.round(profile.progress?.practiceCompleted ?? 0)}%`}
                    icon="clipboard"
                    iconColor={STUDENT_COLORS.clipboardYellow}
                    iconBg="#FEF9C3"
                  />
                </View>
              ) : null}
            </>
          ) : null}
      </ScrollView>

      <InviteCodeModal
        visible={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={() => {
          setInviteModalOpen(false);
          fetchProfile();
        }}
      />
    </View>
  );
}

function WelcomeCard({
  profile,
  onOpenInvite,
}: {
  profile: StudentWithTeacher;
  onOpenInvite: () => void;
}) {
  const attached = !!profile.teacher;
  return (
    <View style={styles.welcomeCard}>
      <View style={styles.welcomeRow}>
        <Avatar name={profile.name} avatarUrl={profile.avatarUrl} size={64} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.welcomeTitle}>Welcome, {profile.name}!</Text>
          {attached ? (
            <Text style={styles.welcomeBody}>
              You’re learning with{' '}
              <Text style={styles.welcomeStrong}>{profile.teacher!.name}</Text>.
            </Text>
          ) : (
            <Text style={styles.welcomeBody}>
              You’re not connected to a teacher yet. Enter your invite code to
              get started.
            </Text>
          )}
        </View>
      </View>

      {!attached ? (
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
          onPress={onOpenInvite}
        >
          <Ionicons name="key-outline" size={16} color="#FFFFFF" />
          <Text style={styles.ctaText}>Enter Invite Code</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function InviteCodeModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setToken('');
    setErr(null);
    setSubmitting(false);
  }

  async function onSubmit() {
    if (!token.trim()) {
      setErr('Paste your invite code');
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      const res = await acceptInviteToken(token.trim());
      if (!res.student) {
        setErr('That code didn’t link your account — try again.');
        return;
      }
      reset();
      onSuccess();
    } catch (e) {
      setErr(friendlyAuthError(e, 'Could not accept the invite. Try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!submitting) {
          reset();
          onClose();
        }
      }}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={() => {
          if (submitting) return;
          reset();
          onClose();
        }}
      >
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enter Invite Code</Text>
            <Pressable
              onPress={() => {
                if (submitting) return;
                reset();
                onClose();
              }}
              hitSlop={8}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="close" size={22} color={STUDENT_COLORS.textSub} />
            </Pressable>
          </View>

          <Text style={styles.modalBody}>
            Paste the invite code from the email your teacher sent.
          </Text>

          <TextInput
            value={token}
            onChangeText={setToken}
            placeholder="paste-token-here"
            placeholderTextColor={STUDENT_COLORS.textMuted}
            style={[styles.input, err && styles.inputError]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {err ? <Text style={styles.fieldError}>{err}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.cta,
              (pressed || submitting) && { opacity: 0.85 },
            ]}
            onPress={onSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.ctaText}>Accept Invite</Text>
              </>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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
  center: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeCard: {
    backgroundColor: STUDENT_COLORS.cardBg,
    borderRadius: STUDENT_RADII.card,
    borderWidth: 1,
    borderColor: STUDENT_COLORS.border,
    padding: 24,
    gap: 18,
    ...STUDENT_SHADOW,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  welcomeTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 22,
    color: STUDENT_COLORS.textMain,
  },
  welcomeBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: STUDENT_COLORS.textSub,
    lineHeight: 20,
  },
  welcomeStrong: {
    fontFamily: 'Manrope_600SemiBold',
    color: STUDENT_COLORS.textMain,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: STUDENT_COLORS.primaryTeal,
    borderRadius: STUDENT_RADII.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: STUDENT_COLORS.cardBg,
    borderRadius: 16,
    padding: 24,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 18,
    color: STUDENT_COLORS.textMain,
  },
  modalBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: STUDENT_COLORS.textSub,
  },
  input: {
    borderWidth: 1,
    borderColor: STUDENT_COLORS.border,
    borderRadius: STUDENT_RADII.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: STUDENT_COLORS.textMain,
    backgroundColor: STUDENT_COLORS.inputBg,
  },
  inputError: { borderColor: STUDENT_COLORS.brandRed },
  fieldError: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: STUDENT_COLORS.brandRed,
  },
});
