import { FormControl, FormGroup } from '@angular/forms';
import { ResourceMetadataResponse, Todo, TodoCreateRequest } from '../../shared/models/api.models';
import { metadataOptions, optionId } from '../../shared/utils/editor';
import { parseDate } from '../office-events/gviz';
import { MONTHS, MONTH_DAYS, WEEKDAYS } from './todo-recurrence';

export function createRecurrenceForm() {
  return new FormGroup({
    scheduleOptionId: new FormControl('', { nonNullable: true }),
    repeatOnOptionIds: new FormControl<string[]>([], { nonNullable: true }),
    interval: new FormControl<number | null>(null),
    repeatDay: new FormControl<number | null>(null),
    repeatMonthOptionId: new FormControl('', { nonNullable: true }),
    monthEndOptionId: new FormControl('', { nonNullable: true }),
    repeatStart: new FormControl('', { nonNullable: true }),
    workdayAdjust: new FormControl(false, { nonNullable: true }),
    monthlyTiming: new FormControl('specific', { nonNullable: true }),
  });
}
export type RecurrenceForm = ReturnType<typeof createRecurrenceForm>;
type Value = ReturnType<RecurrenceForm['getRawValue']>;
export function optionName(meta: ResourceMetadataResponse | null, key: string, id: string): string {
  return metadataOptions(meta, key).find(option => option.id === id)?.name ?? '';
}
export function normalizeRecurrence(form: RecurrenceForm, meta: ResourceMetadataResponse | null): void {
  const value = form.getRawValue(),
    schedule = optionName(meta, 'scheduleOptionId', value.scheduleOptionId);
  const dailyWeekly = schedule === 'Daily' || schedule === 'Weekly';
  form.patchValue(
    {
      repeatOnOptionIds: schedule === 'Weekly' ? value.repeatOnOptionIds : [],
      interval: dailyWeekly ? value.interval : null,
      repeatStart: dailyWeekly && Number(value.interval) > 1 ? value.repeatStart : '',
      repeatDay:
        schedule === 'Yearly' || (schedule === 'Monthly' && value.monthlyTiming === 'specific')
          ? value.repeatDay
          : null,
      repeatMonthOptionId: schedule === 'Yearly' ? value.repeatMonthOptionId : '',
      monthEndOptionId: schedule === 'Monthly' && value.monthlyTiming === 'end' ? value.monthEndOptionId : '',
      workdayAdjust: Boolean(schedule) && value.workdayAdjust,
    },
    { emitEvent: false },
  );
}
export function recurrenceValidation(value: Value, meta: ResourceMetadataResponse | null): string {
  if (!value.scheduleOptionId) return '';
  const schedule = optionName(meta, 'scheduleOptionId', value.scheduleOptionId);
  if (!['Daily', 'Weekly', 'Monthly', 'Yearly'].includes(schedule)) return 'Choose a supported schedule.';
  if (
    schedule === 'Weekly' &&
    (!value.repeatOnOptionIds.length ||
      value.repeatOnOptionIds.some(
        id => !(WEEKDAYS as readonly string[]).includes(optionName(meta, 'repeatOnOptionIds', id)),
      ))
  )
    return 'Choose at least one Repeat On weekday.';
  if (schedule === 'Daily' || schedule === 'Weekly') {
    if (value.interval != null && (!Number.isInteger(value.interval) || value.interval < 1))
      return 'Interval must be a whole number of at least 1.';
    if ((value.interval ?? 1) > 1 && (!/^\d{4}-\d{2}-\d{2}$/.test(value.repeatStart) || !parseDate(value.repeatStart)))
      return 'Choose a Repeat Start date for this interval.';
  }
  if (schedule === 'Monthly' && value.monthlyTiming === 'end') {
    if (!['Last day', 'Day before last day'].includes(optionName(meta, 'monthEndOptionId', value.monthEndOptionId)))
      return 'Choose a Month End option.';
  } else if (schedule === 'Monthly' || schedule === 'Yearly') {
    const month = MONTHS.indexOf(optionName(meta, 'repeatMonthOptionId', value.repeatMonthOptionId));
    if (schedule === 'Yearly' && month < 0) return 'Choose a Repeat Month.';
    const max = schedule === 'Yearly' ? MONTH_DAYS[month] : 31;
    if (!Number.isInteger(value.repeatDay) || !value.repeatDay || value.repeatDay < 1 || value.repeatDay > max)
      return `Repeat Day must be a whole number from 1 to ${max}.`;
  }
  return '';
}
export function recurrenceWrite(
  value: Value,
): Pick<
  TodoCreateRequest,
  | 'scheduleOptionId'
  | 'repeatOnOptionIds'
  | 'interval'
  | 'repeatDay'
  | 'repeatMonthOptionId'
  | 'monthEndOptionId'
  | 'repeatStart'
  | 'workdayAdjust'
> {
  return {
    scheduleOptionId: value.scheduleOptionId || null,
    repeatOnOptionIds: value.repeatOnOptionIds,
    interval: value.interval,
    repeatDay: value.repeatDay,
    repeatMonthOptionId: value.repeatMonthOptionId || null,
    monthEndOptionId: value.monthEndOptionId || null,
    repeatStart: value.repeatStart || null,
    workdayAdjust: value.workdayAdjust,
  };
}
export function recurrenceDraft(todo: Todo | null, meta: ResourceMetadataResponse): Value {
  return {
    scheduleOptionId: optionId(meta, 'scheduleOptionId', todo?.schedule ?? null),
    repeatOnOptionIds: (todo?.repeatOn ?? []).map(name => optionId(meta, 'repeatOnOptionIds', name)).filter(Boolean),
    interval: todo?.interval ?? null,
    repeatDay: todo?.repeatDay ?? null,
    repeatMonthOptionId: optionId(meta, 'repeatMonthOptionId', todo?.repeatMonth ?? null),
    monthEndOptionId: optionId(meta, 'monthEndOptionId', todo?.monthEnd ?? null),
    repeatStart: todo?.repeatStart ?? '',
    workdayAdjust: todo?.workdayAdjust ?? false,
    monthlyTiming: todo?.monthEnd ? 'end' : 'specific',
  };
}
