import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  white: '#FFFFFF',
  textMain: '#091E42',
  textSub: '#5D6B82',
  border: '#D2DBE2',
  teal: '#2CA1AB',
  tealSoft: 'rgba(44, 161, 171, 0.08)',
  orange: '#FD871C',
  brandRed: '#D7583A',
};

export default function Login() {
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const isWide = width >= 700;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={[styles.root, isWide ? styles.rootRow : styles.rootCol]}>
        <View style={styles.formPanel}>
          <View style={styles.formCard}>
            <View style={styles.logoRow}>
              <Image
                source={require('@/assets/images/silah-logo.png')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>

            <View style={styles.titleBlock}>
              <Text style={styles.title}>Welcome, let’s keep</Text>
              <Text style={styles.title}>
                Arabic learning <Text style={styles.titleAccent}>ツ</Text>
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Ehsanmohamed@example.com"
                placeholderTextColor={COLORS.textMain}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
              onPress={() => {}}
            >
              <Text style={styles.ctaText}>Continue</Text>
            </Pressable>

            <View style={styles.signupRow}>
              <Text style={styles.signupMuted}>New to Silah?</Text>
              <Pressable hitSlop={8} onPress={() => {}}>
                <Text style={styles.signupLink}>Create an account</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.heroPanel}>
          <LinearGradient
            colors={[COLORS.tealSoft, 'rgba(255,255,255,0.4)']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.heroTitleBlock} pointerEvents="none">
            <Text style={styles.heroTitle}>Arabic Learning</Text>
            <Text style={styles.heroTitle}>Begins with</Text>
            <Text style={styles.heroJoy}>
              JOY <Text style={{ color: COLORS.orange }}>ツ</Text>
            </Text>
          </View>

          <Image
            source={require('@/assets/images/login-mascot.png')}
            style={styles.mascot}
            contentFit="contain"
          />
        </View>
      </View>

      <Image
        source={require('@/assets/images/login-leaves.png')}
        style={styles.leafTopLeft}
        contentFit="cover"
        pointerEvents="none"
      />
      <Image
        source={require('@/assets/images/login-leaves.png')}
        style={styles.leafTopRight}
        contentFit="cover"
        pointerEvents="none"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  root: { flex: 1, backgroundColor: COLORS.white },
  rootRow: { flexDirection: 'row' },
  rootCol: { flexDirection: 'column' },

  formPanel: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 32,
    gap: 24,
    alignItems: 'center',
  },
  logoRow: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 110, height: 76 },

  titleBlock: { width: '100%', alignItems: 'center', gap: 4 },
  title: {
    fontFamily: 'Marhey_600SemiBold',
    fontSize: 22,
    lineHeight: 26,
    color: COLORS.textMain,
    textAlign: 'center',
  },
  titleAccent: { color: COLORS.orange },

  field: { width: '100%', gap: 8 },
  label: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMain,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMain,
  },

  cta: {
    width: '100%',
    backgroundColor: COLORS.teal,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 24,
    color: COLORS.white,
  },

  signupRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signupMuted: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textSub,
  },
  signupLink: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.teal,
  },

  heroPanel: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  heroTitleBlock: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
  },
  heroTitle: {
    fontFamily: 'Marhey_600SemiBold',
    fontSize: 26,
    lineHeight: 34,
    color: COLORS.textMain,
    textAlign: 'center',
  },
  heroJoy: {
    fontFamily: 'Marhey_700Bold',
    fontSize: 38,
    lineHeight: 46,
    color: COLORS.orange,
    textAlign: 'center',
    marginTop: 4,
  },
  mascot: {
    width: '100%',
    height: '78%',
    alignSelf: 'center',
  },

  leafTopLeft: {
    position: 'absolute',
    top: -70,
    left: -90,
    width: 290,
    height: 150,
    transform: [{ rotate: '-22deg' }],
    zIndex: 10,
  },
  leafTopRight: {
    position: 'absolute',
    top: -70,
    right: -90,
    width: 290,
    height: 150,
    transform: [{ scaleX: -1 }, { rotate: '-22deg' }],
    zIndex: 10,
  },
});
