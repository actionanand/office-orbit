import { TestBed } from '@angular/core/testing';
import { SnackbarService } from './snackbar.service';

describe('SnackbarService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('shows and automatically dismisses a success message', () => {
    const snackbar = TestBed.inject(SnackbarService);

    snackbar.success('Work link added.');

    expect(snackbar.current()).toMatchObject({ text: 'Work link added.', tone: 'success' });
    vi.advanceTimersByTime(3499);
    expect(snackbar.current()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(snackbar.current()).toBeNull();
  });

  it('does not let an older timer dismiss a newer message', () => {
    const snackbar = TestBed.inject(SnackbarService);

    snackbar.success('First message');
    vi.advanceTimersByTime(1000);
    snackbar.success('Second message');
    vi.advanceTimersByTime(2500);

    expect(snackbar.current()?.text).toBe('Second message');
    vi.advanceTimersByTime(1000);
    expect(snackbar.current()).toBeNull();
  });

  it('supports immediate dismissal', () => {
    const snackbar = TestBed.inject(SnackbarService);

    snackbar.error('Unable to copy the link.');
    snackbar.dismiss();

    expect(snackbar.current()).toBeNull();
  });
});
