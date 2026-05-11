import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type StudentLevel, inviteStudent } from '@/lib/students-api';
import {
  friendlyAuthError,
  validateEmail,
  validateName,
} from '@/lib/validation';
import { STUDENT_COLORS, STUDENT_RADII } from './tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const LEVELS: { value: StudentLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

export function InviteStudentModal({ visible, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [level, setLevel] = useState<StudentLevel>('BEGINNER');

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    age?: string;
    parentEmail?: string;
    form?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName('');
    setEmail('');
    setAge('');
    setParentEmail('');
    setLevel('BEGINNER');
    setErrors({});
    setSubmitting(false);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  function validateAge(raw: string): string | null {
    if (!raw.trim()) return null;
    const n = Number(raw);
    if (!Number.isInteger(n)) return 'Age must be a whole number';
    if (n < 4 || n > 18) return 'Age must be between 4 and 18';
    return null;
  }

  function validateParentEmail(raw: string): string | null {
    if (!raw.trim()) return null;
    return validateEmail(raw);
  }

  async function onSubmit() {
    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const ageErr = validateAge(age);
    const parentErr = validateParentEmail(parentEmail);

    if (nameErr || emailErr || ageErr || parentErr) {
      setErrors({
        name: nameErr ?? undefined,
        email: emailErr ?? undefined,
        age: ageErr ?? undefined,
        parentEmail: parentErr ?? undefined,
      });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await inviteStudent({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        ...(age.trim() ? { age: Number(age) } : {}),
        level,
        ...(parentEmail.trim()
          ? { parentEmail: parentEmail.trim().toLowerCase() }
          : {}),
      });
      reset();
      onSuccess();
    } catch (err) {
      setErrors({
        form: friendlyAuthError(err, 'Could not send the invitation. Try again.'),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <View style={styles.header}>
            <Text style={styles.title}>Invite New Student</Text>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="close" size={22} color={STUDENT_COLORS.textSub} />
            </Pressable>
          </View>

          <Field
            label="Student Name"
            required
            placeholder="e.g. Sarah Ahmed"
            value={name}
            onChangeText={setName}
            error={errors.name}
          />

          <Field
            label="Email"
            required
            placeholder="student@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field
                label="Age"
                placeholder="e.g. 10"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                error={errors.age}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Level</Text>
              <View style={styles.segment}>
                {LEVELS.map((opt) => {
                  const active = level === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setLevel(opt.value)}
                      style={[
                        styles.segmentItem,
                        active && styles.segmentItemActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentLabel,
                          active && styles.segmentLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <Field
            label="Parent Email"
            placeholder="parent@example.com (optional)"
            value={parentEmail}
            onChangeText={setParentEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.parentEmail}
          />

          {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

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
              <Text style={styles.ctaText}>Send Invitation</Text>
            )}
          </Pressable>

          <Pressable onPress={handleClose} hitSlop={6}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type FieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

function Field({
  label,
  required,
  error,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? (
          <Text style={{ color: STUDENT_COLORS.brandRed }}> *</Text>
        ) : null}
      </Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={STUDENT_COLORS.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: STUDENT_COLORS.cardBg,
    borderRadius: 16,
    padding: 24,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 18,
    color: STUDENT_COLORS.textMain,
  },
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: STUDENT_COLORS.textMain,
    backgroundColor: STUDENT_COLORS.inputBg,
  },
  inputError: {
    borderColor: STUDENT_COLORS.brandRed,
  },
  fieldError: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: STUDENT_COLORS.brandRed,
  },
  row: { flexDirection: 'row', gap: 12 },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: STUDENT_COLORS.border,
    borderRadius: STUDENT_RADII.input,
    overflow: 'hidden',
    backgroundColor: STUDENT_COLORS.inputBg,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: STUDENT_COLORS.primaryTeal,
  },
  segmentLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: STUDENT_COLORS.textSub,
  },
  segmentLabelActive: {
    color: '#FFFFFF',
  },
  formError: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: STUDENT_COLORS.brandRed,
    textAlign: 'center',
  },
  cta: {
    backgroundColor: STUDENT_COLORS.primaryTeal,
    borderRadius: STUDENT_RADII.button,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  cancel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: STUDENT_COLORS.textSub,
    textAlign: 'center',
  },
});
