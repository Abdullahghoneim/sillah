import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { authClient } from '@/lib/auth-client';
import {
  type AgeFilter,
  type Student,
  type StudentLevel,
  listStudents,
  removeStudent,
  updateStudent,
} from '@/lib/students-api';
import { StudentRow } from '@/components/students/StudentRow';
import { InviteStudentModal } from '@/components/students/InviteStudentModal';
import {
  STUDENT_COLORS,
  STUDENT_RADII,
  STUDENT_SHADOW,
} from '@/components/students/tokens';

const PAGE_SIZE = 7;

const AGE_OPTIONS: { value: AgeFilter | ''; label: string }[] = [
  { value: '', label: 'All ages' },
  { value: 'under8', label: 'Under 8' },
  { value: '8-12', label: '8 – 12' },
  { value: 'over12', label: 'Over 12' },
];

const LEVEL_OPTIONS: { value: StudentLevel | ''; label: string }[] = [
  { value: '', label: 'All levels' },
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

export default function StudentsListScreen() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState<AgeFilter | ''>('');
  const [levelFilter, setLevelFilter] = useState<StudentLevel | ''>('');

  const [inviteOpen, setInviteOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSearchRef = useRef(search);

  const fetchPage = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listStudents({
          page: nextPage,
          limit: PAGE_SIZE,
          search: debouncedSearchRef.current || undefined,
          age: ageFilter || undefined,
          level: levelFilter || undefined,
        });
        setStudents(res.students);
        setTotal(res.total);
        setPage(res.page);
        setTotalPages(res.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load students');
      } finally {
        setLoading(false);
      }
    },
    [ageFilter, levelFilter],
  );

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) return;
    fetchPage(1);
  }, [sessionLoading, session, ageFilter, levelFilter, fetchPage]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debouncedSearchRef.current = search.trim();
      fetchPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchPage]);

  const onToggleStatus = useCallback(async (student: Student) => {
    const nextStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStudents((prev) =>
      prev.map((s) =>
        s.id === student.id ? { ...s, status: nextStatus } : s,
      ),
    );
    try {
      await updateStudent(student.id, { status: nextStatus });
    } catch {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id ? { ...s, status: student.status } : s,
        ),
      );
      Alert.alert('Could not update student', 'Please try again.');
    }
  }, []);

  const onRemove = useCallback(
    (student: Student) => {
      Alert.alert(
        'Remove student',
        `Remove ${student.name} from your students?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeStudent(student.id);
                fetchPage(page);
              } catch {
                Alert.alert('Failed to remove', 'Please try again.');
              }
            },
          },
        ],
      );
    },
    [page, fetchPage],
  );

  const headerCount = useMemo(() => total, [total]);

  if (sessionLoading) {
    return <View style={styles.fullPage} />;
  }
  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.page}>
      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.title}>
            My Students{' '}
            <Text style={styles.titleCount}>({headerCount})</Text>
          </Text>

          <View style={styles.toolbar}>
            <View style={styles.searchWrap}>
              <Ionicons
                name="search-outline"
                size={16}
                color={STUDENT_COLORS.textSub}
              />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search Student"
                placeholderTextColor={STUDENT_COLORS.textMuted}
                autoCapitalize="none"
              />
            </View>

            <Dropdown
              label={`Age: ${AGE_OPTIONS.find((o) => o.value === ageFilter)?.label ?? 'All'}`}
              options={AGE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              onChange={(v) => setAgeFilter(v as AgeFilter | '')}
            />

            <Dropdown
              label={`Level: ${LEVEL_OPTIONS.find((o) => o.value === levelFilter)?.label ?? 'All'}`}
              options={LEVEL_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              onChange={(v) => setLevelFilter(v as StudentLevel | '')}
            />

            <Pressable
              style={({ pressed }) => [
                styles.cta,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => setInviteOpen(true)}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.ctaText}>Invite Student</Text>
            </Pressable>
          </View>
        </View>

          <View style={styles.tableCard}>
            <TableHeader />

            <View style={styles.tableBody}>
              {loading ? (
                <SkeletonRows count={PAGE_SIZE} />
              ) : error ? (
                <View style={styles.empty}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={36}
                    color={STUDENT_COLORS.brandRed}
                  />
                  <Text style={styles.emptyTitle}>Couldn’t load students</Text>
                  <Text style={styles.emptyBody}>{error}</Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.retry,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => fetchPage(page)}
                  >
                    <Text style={styles.retryText}>Try again</Text>
                  </Pressable>
                </View>
              ) : students.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons
                    name="people-outline"
                    size={36}
                    color={STUDENT_COLORS.primaryTeal}
                  />
                  <Text style={styles.emptyTitle}>No students yet</Text>
                  <Text style={styles.emptyBody}>
                    Invite your first student to start tracking their lessons
                    and practice.
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cta,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => setInviteOpen(true)}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.ctaText}>Invite Student</Text>
                  </Pressable>
                </View>
              ) : (
                <FlatList
                  data={students}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <StudentRow
                      student={item}
                      onView={() =>
                        router.push(`/(tabs)/students/${item.id}` as never)
                      }
                      onToggleStatus={() => onToggleStatus(item)}
                      onRemove={() => onRemove(item)}
                    />
                  )}
                  scrollEnabled={false}
                />
              )}
            </View>
          </View>

          {!loading && !error && students.length > 0 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={(p) => fetchPage(p)}
            />
          ) : null}
        </View>
      <InviteStudentModal
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => {
          setInviteOpen(false);
          fetchPage(1);
        }}
      />
    </View>
  );
}

function TableHeader() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.th, { flex: 3 }]}>Student</Text>
      <Text style={[styles.th, { flex: 1 }]}>Age</Text>
      <Text style={[styles.th, { flex: 1 }]}>Level</Text>
      <Text style={[styles.th, { flex: 1 }]}>Status</Text>
      <View style={{ width: 48 }} />
    </View>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skeletonAvatar} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={[styles.skeletonBar, { width: '40%' }]} />
            <View style={[styles.skeletonBar, { width: '60%', height: 10 }]} />
          </View>
          <View style={[styles.skeletonBar, { width: 30 }]} />
          <View style={[styles.skeletonBar, { width: 80 }]} />
          <View style={[styles.skeletonBar, { width: 60 }]} />
        </View>
      ))}
    </View>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const pages = useMemo(() => buildPageList(page, totalPages), [page, totalPages]);
  return (
    <View style={styles.pagination}>
      <PageBtn
        disabled={page <= 1}
        onPress={() => onChange(page - 1)}
        icon="chevron-back"
      />
      {pages.map((p, i) =>
        p === '…' ? (
          <Text key={`gap-${i}`} style={styles.pageGap}>
            …
          </Text>
        ) : (
          <Pressable
            key={p}
            onPress={() => onChange(p)}
            style={({ pressed }) => [
              styles.pageBtn,
              p === page && styles.pageBtnActive,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[
                styles.pageBtnText,
                p === page && styles.pageBtnTextActive,
              ]}
            >
              {p}
            </Text>
          </Pressable>
        ),
      )}
      <PageBtn
        disabled={page >= totalPages}
        onPress={() => onChange(page + 1)}
        icon="chevron-forward"
      />
    </View>
  );
}

function PageBtn({
  disabled,
  onPress,
  icon,
}: {
  disabled: boolean;
  onPress: () => void;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pageBtn,
        disabled && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      <Ionicons name={icon} size={16} color={STUDENT_COLORS.textSub} />
    </Pressable>
  );
}

function buildPageList(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | '…')[] = [1];
  if (page > 3) items.push('…');
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  for (let i = start; i <= end; i++) items.push(i);
  if (page < total - 2) items.push('…');
  items.push(total);
  return items;
}

function Dropdown({
  label,
  options,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ position: 'relative' }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [
          styles.dropdownTrigger,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.dropdownLabel}>{label}</Text>
        <Ionicons name="chevron-down" size={14} color={STUDENT_COLORS.textSub} />
      </Pressable>
      {open ? (
        <View style={styles.dropdownMenu}>
          {options.map((opt) => (
            <Pressable
              key={opt.value || 'all'}
              onPress={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.dropdownItem,
                pressed && { backgroundColor: STUDENT_COLORS.rowHoverBg },
              ]}
            >
              <Text style={styles.dropdownItemText}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F7FFFF' },
  main: {
    flex: 1,
    padding: 28,
    gap: 18,
  },
  fullPage: {
    flex: 1,
    backgroundColor: '#F7FFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 22,
    color: STUDENT_COLORS.textMain,
  },
  titleCount: {
    color: STUDENT_COLORS.textSub,
    fontFamily: 'Manrope_500Medium',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: STUDENT_COLORS.primaryTeal,
    borderRadius: STUDENT_RADII.button,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  ctaText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchWrap: {
    width: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: STUDENT_COLORS.cardBg,
    borderWidth: 1,
    borderColor: STUDENT_COLORS.border,
    borderRadius: STUDENT_RADII.input,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: STUDENT_COLORS.textMain,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: STUDENT_COLORS.cardBg,
    borderRadius: STUDENT_RADII.input,
    borderWidth: 1,
    borderColor: STUDENT_COLORS.border,
    minWidth: 130,
  },
  dropdownLabel: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: STUDENT_COLORS.textMain,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 42,
    right: 0,
    backgroundColor: STUDENT_COLORS.cardBg,
    borderWidth: 1,
    borderColor: STUDENT_COLORS.border,
    borderRadius: 8,
    minWidth: 170,
    zIndex: 50,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: STUDENT_COLORS.textMain,
  },
  tableCard: {
    flex: 1,
    backgroundColor: STUDENT_COLORS.cardBg,
    borderRadius: STUDENT_RADII.card,
    overflow: 'hidden',
    ...STUDENT_SHADOW,
  },
  tableBody: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.8,
    borderBottomColor: '#D2DBE2',
    gap: 12,
  },
  th: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    color: '#091E42',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: STUDENT_COLORS.tableBorder,
  },
  skeletonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: STUDENT_COLORS.tableBorder,
  },
  skeletonBar: {
    height: 12,
    backgroundColor: STUDENT_COLORS.tableBorder,
    borderRadius: 6,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    color: STUDENT_COLORS.textMain,
    marginTop: 4,
  },
  emptyBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: STUDENT_COLORS.textSub,
    textAlign: 'center',
    maxWidth: 320,
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
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  pageBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: STUDENT_COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  pageBtnActive: {
    backgroundColor: STUDENT_COLORS.primaryTeal,
    borderColor: STUDENT_COLORS.primaryTeal,
  },
  pageBtnText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: STUDENT_COLORS.textMain,
  },
  pageBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_600SemiBold',
  },
  pageGap: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: STUDENT_COLORS.textMain,
    paddingHorizontal: 4,
  },
});
