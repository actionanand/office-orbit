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

export interface MetadataSelectOption {
  id: string;
  name: string;
  color: string;
}

export type ResourceFieldType =
  | 'title'
  | 'rich_text'
  | 'date'
  | 'select'
  | 'multi_select'
  | 'relation'
  | 'checkbox'
  | 'url'
  | 'status'
  | 'rollup'
  | 'formula'
  | 'unknown';

export interface ResourceFieldMetadata {
  key: string;
  label: string;
  type: ResourceFieldType | string;
  writable: boolean;
  options?: MetadataSelectOption[];
  optionsEndpoint?: string;
}

export interface ResourceMetadataResponse {
  resource: string;
  fields: ResourceFieldMetadata[];
}

export interface MutationResponse<T> {
  data: T;
}

export interface RelationOption {
  id: string;
  label: string;
  description?: string;
}

export interface QueryRequest<TFilters> {
  filters: TFilters;
  pageSize: number;
  cursor: string | null;
  includeRelations: boolean;
}

export interface BulkDeleteResponse {
  requested: number;
  deleted: number;
  failed: Array<{ id: string; deleted: false; error?: string }>;
  allSucceeded: boolean;
}

export interface TodoQueryFilters {
  statuses?: string[];
  dueFrom?: string;
  dueTo?: string;
  dueBefore?: string;
  dueOnOrBefore?: string;
  q?: string;
}

export interface TaskQueryFilters {
  statuses?: string[];
  priorities?: string[];
  responsibilities?: string[];
  requestedByTypes?: string[];
  assignedToTypes?: string[];
  companyIds?: string[];
  jiraIds?: string[];
  dueFrom?: string;
  dueTo?: string;
  dueBefore?: string;
  dueOnOrBefore?: string;
  followUpFrom?: string;
  followUpTo?: string;
  followUpBefore?: string;
  followUpOnOrBefore?: string;
  completedFrom?: string;
  completedTo?: string;
  q?: string;
}

export interface MemoQueryFilters {
  categories?: string[];
  tags?: string[];
  pinned?: boolean;
  q?: string;
}

export interface WorkLogQueryFilters {
  from?: string;
  to?: string;
  projectIds?: string[];
  jiraIds?: string[];
  categories?: string[];
  types?: string[];
  workModes?: string[];
  appraisal?: boolean;
}

export interface FeedbackQueryFilters {
  from?: string;
  to?: string;
  companyIds?: string[];
  teamIds?: string[];
  personTypes?: string[];
  contexts?: string[];
  feedbackTypes?: string[];
}

export interface WorkLinkQueryFilters {
  companyIds?: string[];
  projectIds?: string[];
  types?: string[];
  active?: boolean;
  q?: string;
}

export interface JiraQueryFilters {
  statuses?: string[];
  tags?: string[];
  sprintIds?: string[];
  projectIds?: string[];
  inActiveSprint?: boolean;
  spillover?: boolean;
  appraisal?: boolean;
  demoRequired?: boolean;
  q?: string;
}

export interface WorkLogCreateRequest {
  update: string;
  date: string | null;
  categoryOptionId: string | null;
  typeOptionId: string | null;
  workModeOptionId: string | null;
  projectId: string | null;
  jiraIds: string[];
  comment: string;
  wentWrong: string;
  appraisal: boolean;
}
export type WorkLogPatchRequest = Partial<WorkLogCreateRequest>;

export interface FeedbackCreateRequest {
  feedback: string;
  date: string | null;
  feedbackFrom: string;
  personTypeOptionId: string | null;
  contextOptionId: string | null;
  feedbackTypeOptionId: string | null;
  companyId: string | null;
  teamId: string | null;
  details: string;
  actionFollowUp: string;
}
export type FeedbackPatchRequest = Partial<FeedbackCreateRequest>;

export interface WorkLinkCreateRequest {
  link: string;
  typeOptionId: string | null;
  url: string | null;
  companyId: string | null;
  projectId: string | null;
  notes: string;
  active: boolean;
}
export type WorkLinkPatchRequest = Partial<WorkLinkCreateRequest>;

export interface TodoCreateRequest {
  toDo: string;
  statusOptionId: string | null;
  dueDate: string | null;
  notes: string;
}
export type TodoPatchRequest = Partial<TodoCreateRequest>;

export interface TaskCreateRequest {
  task: string;
  statusOptionId: string | null;
  priorityOptionId: string | null;
  responsibilityOptionId: string | null;
  requestedBy: string;
  requestedByTypeOptionId: string | null;
  assignedTo: string;
  assignedToTypeOptionId: string | null;
  dueDate: string | null;
  followUpDate: string | null;
  completedDate: string | null;
  companyId: string | null;
  jiraIds: string[];
  notes: string;
  outcomeUpdate: string;
}
export type TaskPatchRequest = Partial<TaskCreateRequest>;

export interface MemoCreateRequest {
  memo: string;
  categoryOptionId: string | null;
  tagOptionIds: string[];
  pinned: boolean;
  markdown: string;
}
export type MemoPatchRequest = Partial<MemoCreateRequest>;

export interface JiraRef {
  id: string;
  key: string;
  summary: string;
}

export interface JiraOption {
  id: string;
  jiraKey: string;
  summary: string;
  status: string | null;
  inActiveSprint: boolean;
}

export interface JiraOptionQueryFilters {
  q?: string;
}

export interface SprintRef extends NamedRef {
  active: boolean;
  startDate: string | null;
  endDate: string | null;
}

export interface SprintHistoryItem {
  sprint: SprintRef;
  allocationId: string | null;
  plannedDays: number | null;
  allocationNotes: string;
  allocationConflict: boolean;
  allocationCount: number;
}

export interface SpillEvent {
  number: number;
  fromSprint: SprintRef;
  toSprint: SprintRef;
  reason: string | null;
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
  sprints?: SprintRef[];
  blockedBy?: JiraRef[];
}

export interface JiraDetail extends Jira {
  sprintHistory: SprintHistoryItem[];
  spillEvents: SpillEvent[];
  latestSpill: SpillEvent | null;
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

export interface SprintDetailJira {
  id: string;
  jiraKey: string;
  summary: string;
  status: string | null;
  tags: string[];
  spillover: boolean;
  spilloverCount: number;
  plannedDays: number | null;
  allocationId: string | null;
  allocationNotes: string;
  allocationConflict: boolean;
  allocationCount: number;
}

export interface SprintDetailResponse {
  sprint: Sprint;
  jiras: SprintDetailJira[];
  count: number;
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
  workType: string | null;
  details: string;
  actionFollowUp: string;
  companyIds: string[];
  teamIds: string[];
  companies?: NamedRef[];
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

export interface Todo {
  id: string;
  createdTime: string;
  lastEditedTime: string;
  toDo: string;
  status: string | null;
  dueDate: string | null;
  notes: string;
}

export interface Task {
  id: string;
  createdTime: string;
  lastEditedTime: string;
  task: string;
  status: string | null;
  priority: string | null;
  responsibility: string | null;
  requestedBy: string;
  requestedByType: string | null;
  assignedTo: string;
  assignedToType: string | null;
  dueDate: string | null;
  followUpDate: string | null;
  completedDate: string | null;
  companyIds: string[];
  jiraIds: string[];
  notes: string;
  outcomeUpdate: string;
  companies?: NamedRef[];
  jiras?: JiraRef[];
}

export interface Memo {
  id: string;
  createdTime: string;
  lastEditedTime: string;
  memo: string;
  category: string | null;
  tags: string[];
  pinned: boolean;
}

export interface MemoDetail extends Memo {
  markdown: string;
  truncated: boolean;
  unknownBlockIds: string[];
  textFallback: string;
}

export interface ReferenceLibraryItem {
  id: string;
  title: string;
  createdTime: string | null;
  lastEditedTime: string | null;
}

export interface ReferenceLibraryDetail extends ReferenceLibraryItem {
  markdown: string;
  truncated: boolean;
  unknownBlockIds: string[];
  textFallback: string;
}

export interface ReferenceImportAccepted {
  status: string;
  taskId: string;
  pollAfterSeconds: number;
}

export interface ReferenceImportStatus {
  status: 'queued' | 'running' | 'retrying' | 'succeeded' | 'failed';
  taskId: string;
  pollAfterSeconds: number | null;
  pageId: string | null;
  failed: boolean;
}

export type DomainItem =
  | Jira
  | WorkLog
  | Sprint
  | SprintAllocation
  | ReleaseItem
  | Feedback
  | WorkLink
  | Todo
  | Task
  | Memo
  | ReferenceLibraryItem;

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
