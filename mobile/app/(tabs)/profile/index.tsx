import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect } from 'expo-router';
import { authClient } from '@/lib/auth-client';
import {
  type ProfileUser,
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
} from '@/lib/profile-api';
import { Avatar } from '@/components/students/Avatar';
import {
  STUDENT_COLORS,
  STUDENT_RADII,
  STUDENT_SHADOW,
} from '@/components/students/tokens';
import {
  friendlyAuthError,
  validateName,
  validatePhone,
} from '@/lib/validation';

const CAMERA_BLUE = '#1E88E5';

export default function ProfileScreen() {
  const {
    data: session,
    isPending: sessionLoading,
    refetch: refetchSession,
  } = authClient.useSession();
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    bio?: string;
    form?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await getMyProfile();
      setProfile(me);
      setName(me.name ?? '');
      setPhone(me.phone ?? '');
      setBio(me.bio ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionLoading || !session) return;
    load();
  }, [load, session, sessionLoading]);

  const dirty =
    !!profile &&
    (name.trim() !== (profile.name ?? '') ||
      phone.trim() !== (profile.phone ?? '') ||
      bio.trim() !== (profile.bio ?? ''));

  async function onSave() {
    if (!profile) return;
    const nameErr = validateName(name);
    const phoneErr = phone.trim() ? validatePhone(phone) : null;
    const bioErr =
      bio.length > 500 ? 'Bio must be 500 characters or fewer' : null;
    if (nameErr || phoneErr || bioErr) {
      setErrors({
        name: nameErr ?? undefined,
        phone: phoneErr ?? undefined,
        bio: bioErr ?? undefined,
      });
      return;
    }
    setErrors({});
    setSaving(true);
    setSuccess(null);
    try {
      const next = await updateMyProfile({
        name: name.trim(),
        phone: phone.trim() ? phone.trim() : null,
        bio: bio.trim() ? bio.trim() : null,
      });
      setProfile(next);
      setName(next.name ?? '');
      setPhone(next.phone ?? '');
      setBio(next.bio ?? '');
      // Re-read the Better Auth session so the Topbar / other consumers
      // re-render with the new name / image.
      try {
        await refetchSession?.();
      } catch {
        /* non-fatal */
      }
      setSuccess('Profile saved');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setErrors({
        form: friendlyAuthError(err, 'Could not save your changes.'),
      });
    } finally {
      setSaving(false);
    }
  }

  async function onPickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission required',
        'Allow photo library access in Settings to update your photo.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      exif: false,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;

    setUploadingAvatar(true);
    setErrors({});
    try {
      const { image } = await uploadAvatar({
        uri: asset.uri,
        mimeType: asset.mimeType ?? null,
        fileName: asset.fileName ?? null,
      });
      setProfile((p) => (p ? { ...p, image } : p));
      try {
        await refetchSession?.();
      } catch {
        /* non-fatal */
      }
      setSuccess('Photo updated');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setErrors({
        form: friendlyAuthError(err, 'Could not update your photo.'),
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (sessionLoading) return <View style={styles.page} />;
  if (!session) return <Redirect href="/login" />;

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Profile Setting</Text>

        {loading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator color={STUDENT_COLORS.primaryTeal} />
          </View>
        ) : error ? (
          <View style={[styles.card, styles.centerBlock]}>
            <Ionicons
              name="alert-circle-outline"
              size={28}
              color={STUDENT_COLORS.brandRed}
            />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={load}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : profile ? (
          <>
            <View style={styles.headerCard}>
              <View style={styles.avatarWrap}>
                {profile.image ? (
                  <Image
                    source={{ uri: profile.image }}
                    style={styles.avatarImg}
                    contentFit="cover"
                  />
                ) : (
                  <Avatar name={profile.name} size={88} />
                )}
                <Pressable
                  onPress={onPickAvatar}
                  disabled={uploadingAvatar}
                  style={({ pressed }) => [
                    styles.avatarEdit,
                    (pressed || uploadingAvatar) && { opacity: 0.85 },
                  ]}
                  hitSlop={6}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  )}
                </Pressable>
              </View>

              <View style={styles.identity}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={styles.profileEmail}>{profile.email}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <Text style={styles.sectionSubtitle}>
                Update your personal details and profile information
              </Text>

              <View style={[styles.row, isWide ? styles.rowWide : null]}>
                <View style={styles.col}>
                  <Field
                    label="Full Name"
                    placeholder="Enter your name"
                    value={name}
                    onChangeText={(v) => {
                      setName(v);
                      if (errors.name)
                        setErrors((e) => ({ ...e, name: undefined }));
                    }}
                    error={errors.name}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.col}>
                  <Field
                    label="Phone"
                    placeholder="Enter your Phone"
                    value={phone}
                    onChangeText={(v) => {
                      setPhone(v);
                      if (errors.phone)
                        setErrors((e) => ({ ...e, phone: undefined }));
                    }}
                    error={errors.phone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <Field
                label="Email"
                placeholder="Enter your email"
                value={profile.email}
                editable={false}
              />

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Bio</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textarea,
                    errors.bio && styles.inputError,
                  ]}
                  placeholder="Enter your bio"
                  placeholderTextColor={STUDENT_COLORS.textMuted}
                  value={bio}
                  onChangeText={(v) => {
                    setBio(v);
                    if (errors.bio)
                      setErrors((e) => ({ ...e, bio: undefined }));
                  }}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  maxLength={500}
                />
                {errors.bio ? (
                  <Text style={styles.fieldError}>{errors.bio}</Text>
                ) : (
                  <Text style={styles.fieldHint}>{bio.length} / 500</Text>
                )}
              </View>

              {errors.form ? (
                <Text style={styles.formError}>{errors.form}</Text>
              ) : null}
              {success ? (
                <Text style={styles.successText}>{success}</Text>
              ) : null}

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={onSave}
                  disabled={!dirty || saving}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (!dirty || pressed || saving) && { opacity: 0.85 },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Save Changes</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
};

function Field({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType,
  autoCapitalize,
  editable = true,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          !editable && styles.inputLocked,
          error && styles.inputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={STUDENT_COLORS.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F7FFFF' },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 18,
  },
  pageTitle: {
    fontFamily: 'Marhey_700Bold',
    fontSize: 26,
    color: STUDENT_COLORS.textMain,
    lineHeight: 40,
    paddingVertical: 2,
  },
  centerBlock: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: STUDENT_COLORS.textSub,
    textAlign: 'center',
  },

  headerCard: {
    backgroundColor: STUDENT_COLORS.cardBg,
    borderRadius: STUDENT_RADII.card,
    paddingHorizontal: 28,
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    ...STUDENT_SHADOW,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    position: 'relative',
  },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarEdit: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: CAMERA_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  profileName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 20,
    color: STUDENT_COLORS.textMain,
  },
  profileEmail: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: STUDENT_COLORS.textSub,
  },

  card: {
    backgroundColor: STUDENT_COLORS.cardBg,
    borderRadius: STUDENT_RADII.card,
    padding: 28,
    gap: 16,
    ...STUDENT_SHADOW,
  },
  sectionTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    color: STUDENT_COLORS.textMain,
  },
  sectionSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: STUDENT_COLORS.textSub,
    marginTop: -10,
  },

  row: { flexDirection: 'column', gap: 16 },
  rowWide: { flexDirection: 'row', gap: 18 },
  col: { flex: 1, minWidth: 0 },

  field: { gap: 6 },
  fieldLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: STUDENT_COLORS.textMain,
  },
  input: {
    borderWidth: 1,
    borderColor: STUDENT_COLORS.border,
    borderRadius: STUDENT_RADII.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: STUDENT_COLORS.textMain,
    backgroundColor: '#FFFFFF',
  },
  inputLocked: {
    backgroundColor: STUDENT_COLORS.inputBg,
    color: STUDENT_COLORS.textSub,
  },
  inputError: { borderColor: STUDENT_COLORS.brandRed },
  textarea: {
    minHeight: 120,
    paddingTop: 12,
  },
  fieldError: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: STUDENT_COLORS.brandRed,
  },
  fieldHint: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: STUDENT_COLORS.textMuted,
    alignSelf: 'flex-end',
  },

  formError: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: STUDENT_COLORS.brandRed,
    textAlign: 'center',
  },
  successText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: STUDENT_COLORS.activeText,
    textAlign: 'center',
  },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  primaryBtn: {
    backgroundColor: STUDENT_COLORS.primaryTeal,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: STUDENT_RADII.button,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
