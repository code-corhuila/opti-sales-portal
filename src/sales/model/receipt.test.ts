import { describe, expect, it } from 'vitest';
import { validateReceipt, MAX_RECEIPT_BYTES } from './receipt';
describe('private payment evidence', () => {
  it('requires a supported, nonempty attachment no larger than 2 MiB', () => {
    expect(validateReceipt(null)).toBeDefined();
    for (const file of [{ size: 0, type: 'application/pdf' }, { size: 1, type: 'text/html' }, { size: MAX_RECEIPT_BYTES + 1, type: 'image/png' }]) expect(validateReceipt(file)).toBeDefined();
    for (const type of ['application/pdf', 'image/png', 'image/jpeg']) expect(validateReceipt({ size: MAX_RECEIPT_BYTES, type })).toBeUndefined();
  });
});
