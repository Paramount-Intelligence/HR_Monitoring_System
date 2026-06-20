import type { ConfigContext, ExpoConfig } from 'expo/config';

// Expo config is evaluated by Node without TS path resolution for sibling modules.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  PRODUCTION_API_BASE_URL,
  PRODUCTION_WS_BASE_URL,
} = require('./config/production-urls.js') as {
  PRODUCTION_API_BASE_URL: string;
  PRODUCTION_WS_BASE_URL: string;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const buildProfile = process.env.EAS_BUILD_PROFILE ?? 'development';
  const isProduction = buildProfile === 'production';
  const isPreview = buildProfile === 'preview';
  const includeDevClient =
    buildProfile === 'development' || buildProfile === 'ios-simulator';

  const basePlugins = (config.plugins ?? []) as NonNullable<ExpoConfig['plugins']>;
  const pluginsWithoutDevClient = basePlugins.filter((plugin) => {
    if (typeof plugin === 'string') return plugin !== 'expo-dev-client';
    if (Array.isArray(plugin)) return plugin[0] !== 'expo-dev-client';
    return true;
  });

  const plugins = [
    ...pluginsWithoutDevClient,
    ...(includeDevClient ? ['expo-dev-client'] : []),
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 24,
          newArchEnabled: false,
        },
        ios: {
          newArchEnabled: false,
        },
      },
    ],
  ] as NonNullable<ExpoConfig['plugins']>;

  const appEnvironment = isProduction
    ? 'production'
    : isPreview
      ? 'preview'
      : 'development';

  return {
    ...config,
    name: config.name ?? 'PIMS',
    slug: config.slug ?? 'pims-mobile',
    plugins,
    android: {
      ...config.android,
      package: config.android?.package ?? 'com.paramount.pims',
      versionCode: config.android?.versionCode ?? 1,
    },
    ios: {
      ...config.ios,
      bundleIdentifier:
        config.ios?.bundleIdentifier ?? 'com.paramountintelligence.pims',
      buildNumber: config.ios?.buildNumber ?? '1',
    },
    extra: {
      ...config.extra,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? PRODUCTION_API_BASE_URL,
      wsUrl: process.env.EXPO_PUBLIC_WS_URL ?? PRODUCTION_WS_BASE_URL,
      environment: appEnvironment,
      buildProfile,
      featureSetVersion: 'mobile-stitch-v2',
      buildTime: new Date().toISOString(),
      easBuildId: process.env.EAS_BUILD_ID,
    },
  };
};
