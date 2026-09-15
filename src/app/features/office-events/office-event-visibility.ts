import { environment } from '../../../environments/environment';
import { OfficeEventType } from './office-event';

export function enabledOfficeEventTypes(): OfficeEventType[] {
  const types: OfficeEventType[] = [];
  if (environment.showHoliday) types.push('holiday');
  if (environment.showImportantDay) types.push('important-day');
  if (environment.showRota) types.push('rota');
  return types;
}
