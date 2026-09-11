import { activeSprint, jiraExternalUrl, spilloverLabel } from './jira';

describe('JIRA presentation', () => {
  it('uses human spillover labels', () => {
    expect(spilloverLabel(0)).toBe('');
    expect(spilloverLabel(1)).toBe('Spilled once');
    expect(spilloverLabel(2)).toBe('Spilled 2 times');
  });

  it('constructs external links with or without a trailing slash', () => {
    expect(jiraExternalUrl('https://example.atlassian.net', 'CRI-1234')).toBe(
      'https://example.atlassian.net/browse/CRI-1234',
    );
    expect(jiraExternalUrl('https://example.atlassian.net/', 'CRI-1234')).toBe(
      'https://example.atlassian.net/browse/CRI-1234',
    );
    expect(jiraExternalUrl(null, 'CRI-1234')).toBeNull();
  });

  it('uses only the active flag for the current Sprint regardless of relation order', () => {
    const history = { id: 'history', name: 'History', active: false, startDate: null, endDate: null };
    const current = { id: 'current', name: 'Current', active: true, startDate: null, endDate: null };
    expect(activeSprint([current, history])).toBe(current);
    expect(activeSprint([history])).toBeNull();
    expect(activeSprint([])).toBeNull();
  });
});
