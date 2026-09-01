export type VerificationStepId =
  | 'discord_identity'
  | 'server_membership'
  | 'account_check'
  | 'anti_bot'
  | 'verification'
  | 'role_assignment';

export type StepStatus = 'waiting' | 'checking' | 'success' | 'failed';

export interface VerificationStepConfig {
  id: VerificationStepId;
  title: string;
  checkingText: string;
  successText: string;
  failedText: string;
}

export interface VerificationUser {
  id?: string;
  discord_id?: string;
  username?: string;
  avatar?: string | null;
}

export interface VerificationSessionData {
  guildName?: string;
  guildId?: string;
  user?: VerificationUser;
  username?: string;
  verifiedRoleName?: string;
  errorReason?: string;
  failedStepId?: VerificationStepId;
  roleFailed?: boolean;
}
