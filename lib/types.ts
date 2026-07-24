export type PlatformRole = "SUPER_ADMIN" | "USER";
export type MembershipRole = "MANAGER" | "VALIDATOR" | "MEMBER";
export type AppRole = "SUPER_ADMIN" | MembershipRole;
export type EntityStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type CampaignStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
export type ActivityStatus = "ACTIVE" | "INACTIVE";
export type ScoringType =
  | "FIXED"
  | "PER_ITEM"
  | "PER_KG"
  | "PER_MEMBER"
  | "PER_COMPLETE_KIT"
  | "TIERED"
  | "MANUAL";
export type SubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "NEEDS_CHANGES"
  | "APPROVED"
  | "PARTIALLY_APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface Principal {
  userId: string;
  email: string;
  platformRole: PlatformRole;
  organizationId: string | null;
  membershipId: string | null;
  membershipRole: MembershipRole | null;
}

export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Organization extends BaseEntity {
  name?: string;
  slug?: string;
  status?: EntityStatus;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export interface Membership extends BaseEntity {
  name?: string;
  email?: string;
  role?: MembershipRole;
  status?: EntityStatus;
  user?: { id?: string; name?: string; email?: string; status?: EntityStatus };
}

export interface Campaign extends BaseEntity {
  name?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  status?: CampaignStatus;
  minimumActionsPerMonth?: number;
}

export interface ActivityItemType {
  id?: string;
  name?: string;
  points?: number;
  unit?: string;
}

export interface Activity extends BaseEntity {
  campaignId?: string;
  name?: string;
  description?: string;
  scoringType?: ScoringType;
  points?: number;
  unit?: string;
  minimumQuantity?: number;
  maxOccurrences?: number;
  minimumParticipationPercent?: number;
  repeatable?: boolean;
  evidenceRequired?: boolean;
  rulesJson?: Record<string, unknown>;
  status?: ActivityStatus;
  itemTypes?: ActivityItemType[];
  approvedOccurrences?: number;
}

export interface Evidence extends BaseEntity {
  originalName?: string;
  mimeType?: string;
  size?: number;
  url?: string;
}

export interface Submission extends BaseEntity {
  campaignId?: string;
  activityId?: string;
  actionDate?: string;
  institutionName?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  status?: SubmissionStatus;
  calculatedPoints?: number;
  approvedPoints?: number;
  validationReason?: string;
  activity?: Activity;
  evidences?: Evidence[];
  submittedAt?: string;
  reviewedAt?: string;
}

export interface Goal extends BaseEntity {
  campaignId?: string;
  type?: "WEEKLY" | "MONTHLY";
  startsAt?: string;
  endsAt?: string;
  targetPoints?: number;
  targetActions?: number;
}

export interface DashboardSummary {
  approvedPoints: number;
  pendingPoints: number;
  approvedActions: number;
  pendingActions: number;
  activeParticipants: number;
  regularity: Array<{ month: string; approvedActions: number; regular: boolean }>;
  goals: Goal[];
}

export interface ActivitySummary {
  activityId: string;
  activityName: string;
  approvedPoints: number;
  approvedActions: number;
}

export function appRole(principal: Principal | null): AppRole | null {
  if (!principal) return null;
  return principal.platformRole === "SUPER_ADMIN"
    ? "SUPER_ADMIN"
    : principal.membershipRole;
}
