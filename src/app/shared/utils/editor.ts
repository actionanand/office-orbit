import { MetadataSelectOption, NamedRef, RelationOption, ResourceMetadataResponse } from '../models/api.models';

export function metadataOptions(metadata: ResourceMetadataResponse | null, key: string): MetadataSelectOption[] {
  return metadata?.fields.find(field => field.key === key && field.writable)?.options ?? [];
}

export function optionId(metadata: ResourceMetadataResponse | null, key: string, name: string | null): string {
  if (!name) return '';
  return metadataOptions(metadata, key).find(option => option.name.toLowerCase() === name.toLowerCase())?.id ?? '';
}

export function relationOptions(ids: string[], refs: NamedRef[] | undefined): RelationOption[] {
  return ids.map(id => ({ id, label: refs?.find(ref => ref.id === id)?.name ?? 'Selected item' }));
}

export function todayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
