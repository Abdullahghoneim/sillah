module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/tests/jest-setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm/)?((jest-)?react-native|@react-native|@react-native-community|expo|expo-.*|@expo|@expo-google-fonts|react-navigation|@react-navigation|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|@better-auth|better-auth)/?)',
    'node_modules/.pnpm/(?!((jest-)?react-native|@react-native|@react-native-community|expo|expo-.*|@expo|@expo-google-fonts|react-navigation|@react-navigation|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|@better-auth|better-auth)[+@])',
  ],
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/tests/mocks/svg-mock.tsx',
    '^@/(.*)$': '<rootDir>/$1',
  },
};
