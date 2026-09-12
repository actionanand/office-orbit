import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SnackbarService } from './snackbar.service';

describe('SnackbarService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('shows and automatically dismisses a success message', fakeAsync(() => {
    const snackbar = TestBed.inject(SnackbarService);

    snackbar.success('Work link added.');

    expect(snackbar.current()).toMatchObject({ text: 'Work link added.', tone: 'success' });
    tick(3499);
    expect(snackbar.current()).not.toBeNull();
    tick(1);
    expect(snackbar.current()).toBeNull();
  }));

  it('does not let an older timer dismiss a newer message', fakeAsync(() => {
    const snackbar = TestBed.inject(SnackbarService);

    snackbar.success('First message');
    tick(1000);
    snackbar.success('Second message');
    tick(2500);

    expect(snackbar.current()?.text).toBe('Second message');
    tick(1000);
    expect(snackbar.current()).toBeNull();
  }));

  it('supports immediate dismissal', () => {
    const snackbar = TestBed.inject(SnackbarService);

    snackbar.error('Unable to copy the link.');
    snackbar.dismiss();

    expect(snackbar.current()).toBeNull();
  });
});
