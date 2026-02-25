import { hasBackedUpCredential } from './keychain.js';

export type AuthStatus = 'authenticated' | 'no-credential' | 'unknown';

export async function checkAuthStatus(profileId: string): Promise<AuthStatus> {
  const hasCred = await hasBackedUpCredential(profileId);
  if (hasCred) return 'authenticated';
  return 'no-credential';
}
