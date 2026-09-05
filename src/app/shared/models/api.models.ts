export interface ListResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  nextCursor: string | null;
}
export interface ResourceView {
  label: string;
  path: string;
  relations?: boolean;
}

export interface NamedRef {
  id: string;
  name: string;
}

export interface JiraRef {
  id: string;
  key: string;
  summary: string;
}

export interface Jira {
  id: string;
  createdTime: string;
  lastEditedTime: string;
  jiraKey: string;
  summary: string;
  status: string | null;
  tags: string[];
  appraisal: boolean;
  spillover: boolean;
  spilloverCount: number;
  spilloverReason: string;
  inActiveSprint: boolean;
  demoRequired: boolean;
  demoedDate: string | null;
  demoNotes: string;
  sprintIds: string[];
  projectIds: string[];
  blockedByIds: string[];
  releaseItemIds: string[];
  projects?: NamedRef[];
  sprints?: NamedRef[];
  blockedBy?: JiraRef[];
}

export interface WorkLog {
  id: string;
  createdTime: string;
  lastEditedTime: string;
  update: string;
  date: string | null;
  category: string | null;
  type: string | null;
  workMode: string | null;
  comment: string;
  wentWrong: string;
  appraisal: boolean;
  projectIds: string[];
  jiraIds: string[];
  companyIds: string[];
  teamIds: string[];
  jiraStatuses: string[];
  sprintIds: string[];
  spilloverCount: number;
  companies?: NamedRef[];
  teams?: NamedRef[];
  projects?: NamedRef[];
  jiras?: JiraRef[];
  sprints?: NamedRef[];
}

export interface Sprint {
  id: string;
  sprint: string;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
  weekOff1: string | null;
  weekOff2: string | null;
  plannedLeaveDays: number;
  holidayDays: number;
  capacityDays: number;
  availableDays: number;
  allocatedDays: number;
  remainingDays: number;
  projectIds: string[];
  allocationIds: string[];
  projects?: NamedRef[];
}

export interface SprintAllocation {
  id: string;
  allocation: string;
  plannedDays: number;
  notes: string;
  sprintIds: string[];
  jiraIds: string[];
  sprintActive: boolean;
}

export interface ReleaseItem {
  id: string;
  createdTime: string;
  lastEditedTime: string;
  releaseItem: string;
  componentName: string;
  deploymentType: string | null;
  versionNumber: string;
  branch: string;
  formalAnnouncedDate: string | null;
  confirmedReleaseDate: string | null;
  notes: string;
  jiraIds: string[];
  jiraStatuses: string[];
  sprintIds: string[];
  spilloverCount: number;
  jiras?: JiraRef[];
  sprints?: NamedRef[];
}

export interface Feedback {
  id: string;
  createdTime: string;
  lastEditedTime: string;
  feedback: string;
  date: string | null;
  feedbackFrom: string;
  personType: string | null;
  context: string | null;
  feedbackType: string | null;
  details: string;
  actionFollowUp: string;
  companyIds: string[];
  projectIds: string[];
  teamIds: string[];
  companies?: NamedRef[];
  projects?: NamedRef[];
  teams?: NamedRef[];
}

export interface WorkLink {
  id: string;
  createdTime: string;
  lastEditedTime: string;
  link: string;
  type: string | null;
  url: string | null;
  notes: string;
  active: boolean;
  companyIds: string[];
  projectIds: string[];
  companies?: NamedRef[];
  projects?: NamedRef[];
}

export type DomainItem = Jira | WorkLog | Sprint | SprintAllocation | ReleaseItem | Feedback | WorkLink;

export interface DashboardResponse {
  generatedAt: string;
  company: NamedRef | null;
  project: NamedRef | null;
  currentSprint: Sprint | null;
  jiraSummary: { active: number; blocked: number; spillovers: number; demoPending: number };
  activeJiras: Jira[];
  blockedJiras: Jira[];
  spilloverJiras: Jira[];
  demoPendingJiras: Jira[];
  recentWorkLogs: WorkLog[];
  releaseSummary: { pending: number; confirmed: number; notAnnounced: number };
  pendingReleases: ReleaseItem[];
  feedbackSummary: { appraisal: number; improvementFollowUp: number; negative: number };
  activeWorkLinks: WorkLink[];
}
