import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from './confirmation.service';

describe('ConfirmationService', () => {
  it('resolves the active confirmation with the selected outcome', async () => {
    TestBed.configureTestingModule({ providers: [ConfirmationService] });
    const service = TestBed.inject(ConfirmationService);
    const result = service.confirm({ title: 'Delete?', message: 'This cannot be undone.', danger: true });

    expect(service.current()).toMatchObject({
      title: 'Delete?',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      danger: true,
    });
    service.settle(true);

    await expect(result).resolves.toBe(true);
    expect(service.current()).toBeNull();
  });

  it('cancels an older request when a new confirmation replaces it', async () => {
    TestBed.configureTestingModule({ providers: [ConfirmationService] });
    const service = TestBed.inject(ConfirmationService);
    const first = service.confirm({ title: 'First', message: 'First request' });
    void service.confirm({ title: 'Second', message: 'Second request' });

    await expect(first).resolves.toBe(false);
    expect(service.current()?.title).toBe('Second');
  });
});
