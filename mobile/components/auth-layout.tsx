import { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import LeafTopLeft from '@/assets/images/login-leaf-top-left.svg';
import LeafTopRight from '@/assets/images/login-leaf-top-right.svg';

const COLORS = {
  white: '#FFFFFF',
  textMain: '#091E42',
  orange: '#FD871C',
  border: '#D2DBE2',
};

type AuthLayoutProps = {
  titleLines: string[];
  children: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
};

export function AuthLayout({
  titleLines,
  children,
  showBack,
  onBack,
}: AuthLayoutProps) {
  const { width } = useWindowDimensions();
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
              {titleLines.map((line, i) => {
                const isLast = i === titleLines.length - 1;
                return (
                  <Text key={i} style={styles.title}>
                    {line}
                    {isLast ? (
                      <Text style={styles.titleAccent}> ツ</Text>
                    ) : null}
                  </Text>
                );
              })}
            </View>

            {children}
          </View>
        </View>

        <View style={styles.heroPanel}>
          <LinearGradient
            colors={['rgba(155, 210, 215, 0.25)', 'rgba(255, 255, 255, 0.4)']}
            locations={[0, 0.5205]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <Image
            source={require('@/assets/images/login-mascot.png')}
            style={styles.mascot}
            contentFit="contain"
          />
        </View>
      </View>

      <View style={styles.leafTopLeft} pointerEvents="none">
        <LeafTopLeft width="100%" height="100%" />
      </View>
      <View style={styles.leafTopRight} pointerEvents="none">
        <LeafTopRight width="100%" height="100%" />
      </View>

      {showBack ? (
        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => {
            if (onBack) onBack();
            else if (router.canGoBack()) router.back();
          }}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.textMain} />
        </Pressable>
      ) : null}
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
    maxWidth: 480,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 32,
    gap: 24,
    alignItems: 'center',
  },
  logoRow: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 110, height: 76 },

  titleBlock: { width: '100%', alignItems: 'center', gap: 6 },
  title: {
    fontFamily: 'Marhey_600SemiBold',
    fontSize: 26,
    lineHeight: 44,
    color: COLORS.textMain,
    textAlign: 'center',
    includeFontPadding: false,
    paddingVertical: 2,
  },
  titleAccent: { color: COLORS.orange },

  heroPanel: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  mascot: {
    width: '100%',
    height: '78%',
    alignSelf: 'center',
  },

  leafTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 200,
    height: 150,
    zIndex: 10,
  },
  leafTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 200,
    height: 150,
    zIndex: 10,
  },

  backBtn: {
    position: 'absolute',
    top: 24,
    left: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 20,
  },
});
