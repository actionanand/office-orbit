import { JiraDetail } from '../../shared/models/api.models';
import { formatDate, formatDateRange, names } from '../../shared/utils/format';
import { activeSprint } from '../../shared/utils/jira';
import { markdownFieldBlocks } from '../../core/platform/report-markdown';
import { ReportRecord, WorkLogReport } from '../work-logs/work-log-report';

/** Export the loaded detail, including collapsed histories, without internal relation IDs. */
export function jiraReport(jira: JiraDetail): WorkLogReport {
  const records: ReportRecord[] = [];
  const field = (label: string, value: string | null | undefined) => (value ? `${label}: ${value}` : '');
  const add = (section: string, title: string, lines: string[]) =>
    records.push({
      date: section,
      title,
      lines: lines.filter(Boolean),
      blocks: lines.filter(Boolean).flatMap(markdownFieldBlocks),
    });

  add('Overview', jira.summary || jira.jiraKey, [
    field('Status', jira.status),
    field('Project', names(jira.projects)),
    field('Tags', jira.tags.join(', ')),
    field('Current Sprint', activeSprint(jira.sprints)?.name),
    field('First Sprint Start', formatDate(jira.firstSprintStart)),
    `Spillover: ${jira.spilloverCount}`,
    `Appraisal: ${jira.appraisal ? 'Yes' : 'No'}`,
    field('Work started', formatDate(jira.timeline.startedDate)),
    field('Sprint window through', formatDate(jira.timeline.endedDate)),
  ]);
  if (jira.description) add('Description', '', [jira.description]);
  for (const history of jira.sprintHistory) {
    add('Sprint history', history.sprint.name, [
      formatDateRange(history.sprint.startDate, history.sprint.endDate),
      history.sprint.active ? 'Active Sprint' : '',
      history.spilled ? 'Spilled' : '',
      history.plannedDays === null ? 'Planned days not recorded' : `Planned: ${history.plannedDays} days`,
      history.allocationConflict ? `Allocation conflict: ${history.allocationCount} allocations` : '',
      field('Notes', history.allocationNotes),
      field('Spill reason', history.spillReason),
    ]);
  }
  for (const spill of jira.spillEvents) {
    add('Spill history', `Spill #${spill.number}: ${spill.fromSprint.name} -> ${spill.toSprint.name}`, [
      field('Reason', spill.reason),
    ]);
  }
  for (const log of jira.workLogs) {
    add('Work history', log.update, [
      field('Date', formatDate(log.date)),
      [log.type, log.category, log.workMode].filter(Boolean).join(' | '),
      log.appraisal ? 'Appraisal' : '',
      field('Comment', log.comment),
      field('Went wrong', log.wentWrong),
    ]);
  }
  for (const relationship of jira.relationships) {
    add('Relationships', `${relationship.displayType}: ${relationship.otherJira.key}`, [
      relationship.otherJira.summary,
      field('Status', relationship.otherJira.status),
      field('Reason', relationship.reason),
      field('Linked', formatDate(relationship.linkedOn)),
      relationship.resolvedOn ? `Resolved: ${formatDate(relationship.resolvedOn)}` : '',
    ]);
  }
  for (const release of jira.releaseItems) {
    add('Release history', release.componentName || release.releaseItem, [
      field('Deployment', release.deploymentType),
      field('Version', release.versionNumber),
      field('Branch', release.branch),
      field('Formal announced', formatDate(release.formalAnnouncedDate)),
      field('Confirmed release', formatDate(release.confirmedReleaseDate)),
      field('Notes', release.notes),
    ]);
  }
  add('Demo', jira.demoedDate ? 'Demoed' : jira.demoRequired ? 'Required' : 'Not required', [
    field('Demoed date', formatDate(jira.demoedDate)),
    field('Notes', jira.demoNotes),
  ]);
  add('Record information', '', [
    field('Created', formatDate(jira.createdTime)),
    field('Last updated', formatDate(jira.lastEditedTime)),
  ]);
  return {
    layout: 'jira',
    title: 'JIRA Detail',
    summary: [{ label: 'JIRA', value: jira.jiraKey }],
    period: '',
    categories: '',
    generated: new Date().toLocaleDateString(),
    records,
  };
}

export function jiraPdfFilename(key: string): string {
  return `office-orbit-jira-${key.replace(/[^a-zA-Z0-9_-]/g, '-') || 'detail'}.pdf`;
}
