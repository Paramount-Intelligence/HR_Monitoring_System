import type { ConfigContext, ExpoConfig } from 'expo/config';

const PRODUCTION_API =
  'https://hrmonitoringsystem-production-cb42.up.railway.app/api/v1';
const PRODUCTION_WS =
  'wss://hrmonitoringsystem-production-cb42.up.railway.app/api/v1/ws';
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
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? PRODUCTION_API,
      wsUrl: process.env.EXPO_PUBLIC_WS_URL ?? PRODUCTION_WS,
      environment: appEnvironment,
      buildProfile,
      featureSetVersion: 'mobile-phase-19',
      buildTime: new Date().toISOString(),
      easBuildId: process.env.EAS_BUILD_ID,
    },
  };
};
