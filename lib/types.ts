export type PlatformRole = "ADMIN" | "USER";
export type MembershipRole = "MANAGER" | "MEMBER";
export type AppRole = "SUPER_ADMIN" | "LEADER_SETUP" | MembershipRole;
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
  name?: string;
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
  userId?: string;
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

export interface AdminTeamReference {
  id: string;
  name: string;
  slug: string;
}

export interface AdminTeamSummary {
  team: AdminTeamReference;
  approvedPoints: number;
  pendingPoints: number;
  totalPoints: number;
  approvedActions: number;
  pendingActions: number;
  totalActions: number;
  activeParticipants: number;
  disqualified: boolean;
  regularity: DashboardSummary["regularity"];
  goals: Array<Goal & { progress?: GoalProgress }>;
}

export interface RankingEntry {
  position: number;
  organizationId: string;
  name: string;
  slug: string;
  photoUrl: string | null;
  points: number;
  lastUpdatedAt: string | null;
}

export interface MemberRankingEntry {
  position: number;
  membershipId: string;
  userId: string;
  name: string;
  points: number;
  approvedActions: number;
  lastUpdatedAt: string | null;
}

export interface TeamMemberRanking {
  team: AdminTeamReference;
  ranking: MemberRankingEntry[];
}

export interface ActivityItemType {
  id?: string;
  name?: string;
  points?: number;
  pointsPerUnit?: number;
  unit?: string;
  minimumQuantity?: number;
}

export interface ActivityAvailability {
  available: boolean;
  reason: string | null;
  blockScope?: "CAMPAIGN" | "MONTH" | "DATE" | null;
  blockedUntil?: string | null;
  approvedOccurrences: number;
  approvedOccurrencesThisMonth: number;
  remainingOccurrences?: number | null;
  remainingOccurrencesThisMonth?: number | null;
}

export interface Activity extends BaseEntity {
  campaignId?: string;
  name?: string;
  description?: string;
  scoringType?: ScoringType;
  points?: number;
  unit?: string;
  minimumQuantity?: number | null;
  minimumParticipants?: number | null;
  maxOccurrences?: number | null;
  maxOccurrencesPerMonth?: number | null;
  maxOccurrencesPerParticipant?: number | null;
  maxOccurrencesPerParticipantPerMonth?: number | null;
  minimumParticipationPercent?: number | null;
  repeatable?: boolean;
  evidenceRequired?: boolean;
  rulesJson?: Record<string, unknown>;
  status?: ActivityStatus;
  itemTypes?: ActivityItemType[];
  approvedOccurrences?: number;
  availability?: ActivityAvailability;
}

export interface Evidence extends BaseEntity {
  originalName?: string;
  mimeType?: string;
  size?: number;
  url?: string;
}

export interface Submission extends BaseEntity {
  createdBy?: string;
  campaignId?: string;
  activityId?: string;
  actionDate?: string;
  institutionName?: string;
  quantity?: number;
  unit?: string;
  details?: { durationMinutes?: number };
  notes?: string;
  status?: SubmissionStatus;
  calculatedPoints?: number;
  approvedPoints?: number;
  validationReason?: string;
  activity?: Activity;
  campaign?: Campaign;
  organization?: Organization;
  evidences?: Evidence[];
  submittedAt?: string;
  reviewedAt?: string;
}

export interface Goal extends BaseEntity {
  campaignId?: string;
  activityId?: string | null;
  title?: string;
  description?: string | null;
  type?: "WEEKLY" | "MONTHLY" | "CAMPAIGN" | "CUSTOM";
  startsAt?: string;
  endsAt?: string;
  targetPoints?: number;
  targetActions?: number;
  targetParticipants?: number;
  targetQuantity?: number;
  unit?: string | null;
}

export interface GoalMetric {
  points: number;
  actions: number;
  participants: number;
  quantity: number;
}

export interface GoalProgress {
  achieved: GoalMetric;
  targets: GoalMetric;
  remaining: GoalMetric;
  percentages: GoalMetric;
  overallPercentage: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "ACHIEVED" | "EXPIRED";
}

export interface MonthlyPlanInput {
  campaignId: string;
  activityId?: string;
  titlePrefix: string;
  targetPoints?: number;
  targetActions?: number;
  targetParticipants?: number;
  targetQuantity?: number;
  unit?: string;
}

export interface TeamProfile {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  hasLogo: boolean;
  logoUrl?: string | null;
}

export interface DashboardSummary {
  approvedPoints: number;
  pendingPoints: number;
  totalPoints: number;
  approvedActions: number;
  pendingActions: number;
  totalActions: number;
  myApprovedPoints: number;
  myPendingPoints: number;
  myTotalPoints: number;
  myApprovedActions: number;
  myPendingActions: number;
  myTotalActions: number;
  activeParticipants: number;
  disqualified: boolean;
  regularity: Array<{
    month: string;
    approvedActions: number;
    pendingActions: number;
    totalActions: number;
    minimumActions?: number;
    closed?: boolean;
    regular: boolean;
  }>;
  goals: Goal[];
}

export interface ActivitySummary {
  activityId: string;
  activityName: string;
  approvedPoints: number;
  pendingPoints: number;
  totalPoints: number;
  approvedActions: number;
  pendingActions: number;
  totalActions: number;
}

export function appRole(principal: Principal | null): AppRole | null {
  if (!principal) return null;
  if (principal.platformRole === "ADMIN") return "SUPER_ADMIN";
  if (!principal.membershipRole) return "LEADER_SETUP";
  return principal.membershipRole;
}
