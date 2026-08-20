import { describe, expect, it } from 'vitest';
import { DocumentQuotaError, validateDocumentContent } from '../../api/document-intel/storage';

describe('document content limits', () => {
  it('accepts small text and rejects content over 128 KiB', () => {
    expect(validateDocumentContent('notes')).toBe('notes');
    expect(() => validateDocumentContent('x'.repeat(128 * 1024 + 1))).toThrow(DocumentQuotaError);
  });

  it('rejects missing and non-text document content', () => {
    expect(() => validateDocumentContent('')).toThrow(DocumentQuotaError);
    expect(() => validateDocumentContent({ content: 'notes' })).toThrow(DocumentQuotaError);
  });
});
