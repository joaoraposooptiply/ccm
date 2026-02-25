export type PendingAction =
  | { type: 'launch'; profileId: string; cwd?: string }
  | { type: 'login'; profileId: string }
  | { type: 'activate'; profileId: string; profileName: string };

// Shared mutable ref — set by TUI before exiting, read by cli.tsx after exit
export const pendingAction: { value: PendingAction | null } = { value: null };
