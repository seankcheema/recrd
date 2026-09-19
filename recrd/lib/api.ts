import Constants from 'expo-constants';
import { Platform } from 'react-native';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function getExpoDevHostname(): string | null {
  const constants = Constants as unknown as {
    expoGoConfig?: { debuggerHost?: string };
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
    manifest?: { debuggerHost?: string };
  };

  const hostUri =
    constants.expoGoConfig?.debuggerHost ??
    constants.manifest2?.extra?.expoClient?.hostUri ??
    constants.manifest?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  return hostUri.split(':')[0] || null;
}

function resolveApiUrl(): string {
  const rawApiUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
  if (!rawApiUrl) {
    return '';
  }

  const normalizedApiUrl = rawApiUrl.replace(/\/$/, '');

  if (Platform.OS === 'web') {
    return normalizedApiUrl;
  }

  try {
    const apiUrl = new URL(normalizedApiUrl);
    if (!LOCAL_HOSTS.has(apiUrl.hostname)) {
      return normalizedApiUrl;
    }

    const expoHostname = getExpoDevHostname();
    if (!expoHostname) {
      return normalizedApiUrl;
    }

    apiUrl.hostname = expoHostname;
    return apiUrl.toString().replace(/\/$/, '');
  } catch {
    return normalizedApiUrl;
  }
}

export const API_URL = resolveApiUrl();
