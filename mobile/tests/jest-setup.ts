// Silence noisy logs from libraries during tests
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// expo-router — minimal mock surface used by the auth screens
jest.mock('expo-router', () => {
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  };
  return {
    router,
    useRouter: () => router,
    useLocalSearchParams: jest.fn(() => ({})),
    Redirect: () => null,
    Link: ({ children }: { children: any }) => children ?? null,
    Stack: Object.assign(({ children }: { children: any }) => children ?? null, {
      Screen: () => null,
    }),
  };
});

// expo-image
jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: any) => React.createElement(View, props),
  };
});

// expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: any) => React.createElement(View, props),
  };
});

// @expo/vector-icons — render the icon name as text so tests can assert
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name }: { name: string }) =>
    React.createElement(Text, null, `icon:${name}`);
  return { Ionicons: Icon };
});

// react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: any) =>
      React.createElement(View, rest, children),
    SafeAreaProvider: ({ children }: any) => children ?? null,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

// expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// auth-client — mocked per-test; baseline so imports don't blow up
jest.mock('@/lib/auth-client', () => {
  return {
    API_BASE_URL: 'http://localhost:3000',
    authClient: {
      emailOtp: {
        sendVerificationOtp: jest.fn().mockResolvedValue({ error: null }),
      },
      signIn: {
        emailOtp: jest.fn().mockResolvedValue({ error: null }),
      },
      signOut: jest.fn().mockResolvedValue(undefined),
      useSession: jest.fn(() => ({ data: null, isPending: false })),
      getCookie: jest.fn(() => 'sillah_session=test'),
    },
    registerUser: jest.fn().mockResolvedValue({
      user: { id: 'u1', email: 'test@example.com' },
      otpRequired: true,
    }),
  };
});

// global fetch shim used by select-role for PATCH /api/users/me
(global as any).fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
  }),
);
