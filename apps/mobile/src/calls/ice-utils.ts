import Constants from 'expo-constants';

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/** Match web buildIceServers — STUN from env extra, default Google STUN. No secrets logged. */
export function buildIceServers(): IceServerConfig[] {
  const extra = Constants.expoConfig?.extra ?? {};

  const stunUrl =
    (extra.stunUrl as string | undefined) ||
    (extra.webrtcStunUrl as string | undefined) ||
    'stun:stun.l.google.com:19302';

  const servers: IceServerConfig[] = [{ urls: stunUrl }];

  const turnUrl = (extra.turnUrl as string | undefined)?.trim();
  if (turnUrl) {
    const turn: IceServerConfig = { urls: turnUrl };
    const username = (extra.turnUsername as string | undefined)?.trim();
    const credential = (extra.turnCredential as string | undefined)?.trim();
    if (username) turn.username = username;
    if (credential) turn.credential = credential;
    servers.push(turn);
  }

  return servers;
}
