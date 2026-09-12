import { ResourceMetadataResponse } from '../models/api.models';
import { metadataOptions, optionId, relationOptions, todayIso } from './editor';

const metadata: ResourceMetadataResponse = {
  resource: 'work-logs',
  fields: [
    {
      key: 'typeOptionId',
      label: 'Type',
      type: 'select',
      writable: true,
      options: [{ id: 'option-id', name: 'Work', color: 'green' }],
    },
    {
      key: 'workType',
      label: 'Work Type',
      type: 'rollup',
      writable: false,
      options: [{ id: 'wrong', name: 'Office Work', color: 'blue' }],
    },
  ],
};

describe('editor metadata helpers', () => {
  it('uses option IDs and never exposes read-only fields as editable options', () => {
    expect(optionId(metadata, 'typeOptionId', 'work')).toBe('option-id');
    expect(optionId(metadata, 'typeOptionId', 'option-id')).toBe('');
    expect(metadataOptions(metadata, 'workType')).toEqual([]);
  });

  it('preserves selected relation ids when only relation names are available', () => {
    expect(relationOptions(['page-id'], [{ id: 'page-id', name: 'Project' }])).toEqual([
      { id: 'page-id', label: 'Project' },
    ]);
  });

  it('formats local dates without UTC rollover', () => {
    expect(todayIso(new Date(2026, 8, 12))).toBe('2026-09-12');
  });
});
