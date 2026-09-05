import { WorkLog } from './api.models';
/** Test fixture; never used as production data. */
export function workLogFixture(id: string, overrides: Partial<WorkLog> = {}): WorkLog {
  return {
    id,
    update: 'Work ' + id,
    date: '2026-09-05',
    category: 'Office Work',
    type: 'Review',
    workMode: 'WFO',
    createdTime: 'private-created',
    lastEditedTime: 'private-edited',
    comment: '',
    wentWrong: '',
    appraisal: false,
    projectIds: [],
    jiraIds: [],
    companyIds: [],
    teamIds: [],
    jiraStatuses: [],
    sprintIds: [],
    spilloverCount: 0,
    ...overrides,
  };
}
