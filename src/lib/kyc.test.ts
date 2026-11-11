import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_PATTERN,
  checkDocuments,
  GSTIN_PATTERN,
  IFSC_PATTERN,
  maskAccount,
  MAX_DOCUMENT_BYTES,
  PAN_PATTERN,
  parseCompanyInput,
} from './kyc';

const details = {
  legalName: 'Asha Traders Private Limited',
  brandName: 'Asha Mart',
  gstin: '27AAPFU0939F1ZV',
  pan: 'AAPFU0939F',
  address: {
    name: 'Asha Rao',
    phone: '+919811111111',
    line1: '12 MG Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
  },
  bank: { holder: 'Asha Traders Private Limited', account: '123456789012', ifsc: 'HDFC0001234' },
};

const pdf = (kind: 'gst' | 'pan' | 'cheque') => ({ kind, name: `${kind}.pdf`, type: 'application/pdf', size: 1000 });
const all = [pdf('gst'), pdf('pan'), pdf('cheque')];

describe('patterns', () => {
  it('accepts a valid GSTIN and rejects one with a bad checksum position', () => {
    expect(GSTIN_PATTERN.test('27AAPFU0939F1ZV')).toBe(true);
    expect(GSTIN_PATTERN.test('27AAPFU0939F1AV')).toBe(false);
  });

  it('checks PAN and account number shapes', () => {
    expect(PAN_PATTERN.test('AAPFU0939F')).toBe(true);
    expect(PAN_PATTERN.test('AAPFU09390')).toBe(false);
    expect(ACCOUNT_PATTERN.test('12345678')).toBe(false);
    expect(ACCOUNT_PATTERN.test('123456789')).toBe(true);
    expect(ACCOUNT_PATTERN.test('1'.repeat(18))).toBe(true);
    expect(ACCOUNT_PATTERN.test('1'.repeat(19))).toBe(false);
  });

  it('rejects IFSC without a 0 in the fifth place', () => {
    expect(IFSC_PATTERN.test('HDFC0001234')).toBe(true);
    expect(IFSC_PATTERN.test('HDFC1001234')).toBe(false);
    expect(IFSC_PATTERN.test('HDF00001234')).toBe(false);
  });
});

describe('parseCompanyInput', () => {
  it('uppercases GSTIN, PAN and IFSC and trims text', () => {
    const result = parseCompanyInput({
      ...details,
      legalName: '  Asha Traders  ',
      gstin: ' 27aapfu0939f1zv ',
      pan: 'aapfu0939f',
      bank: { ...details.bank, ifsc: 'hdfc0001234' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.legalName).toBe('Asha Traders');
    expect(result.value.gstin).toBe('27AAPFU0939F1ZV');
    expect(result.value.pan).toBe('AAPFU0939F');
    expect(result.value.bank.ifsc).toBe('HDFC0001234');
    expect(result.value.address.country).toBe('IN');
  });

  it('reports each bad field under its own key', () => {
    const result = parseCompanyInput({
      ...details,
      gstin: '27AAPFU0939F1AV',
      pan: 'X',
      address: { ...details.address, pincode: '011001', line1: '' },
      bank: { holder: '', account: '123', ifsc: 'HDFC1001234' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(
      ['address.line1', 'address.pincode', 'bank.account', 'bank.holder', 'bank.ifsc', 'gstin', 'pan'].sort(),
    );
  });

  it('treats an empty second address line as missing', () => {
    const result = parseCompanyInput({ ...details, address: { ...details.address, line2: '  ' } });
    expect(result.ok).toBe(true);
  });

  it('refuses input that is not an object', () => {
    expect(parseCompanyInput(null).ok).toBe(false);
  });
});

describe('checkDocuments', () => {
  it('requires all three documents', () => {
    expect(checkDocuments(all)).toBeNull();
    expect(checkDocuments([pdf('gst'), pdf('pan')])).toBe('Add the Cancelled cheque.');
    expect(checkDocuments([])).toBe('Add the GST certificate.');
  });

  it('counts documents already on file', () => {
    expect(checkDocuments([pdf('pan')], ['gst', 'cheque'])).toBeNull();
  });

  it('allows PDF, JPG and PNG up to 5 MB only', () => {
    const big = { ...pdf('gst'), size: MAX_DOCUMENT_BYTES + 1 };
    expect(checkDocuments([big, pdf('pan'), pdf('cheque')])).toBe('gst.pdf is larger than 5 MB.');
    expect(checkDocuments([{ ...pdf('gst'), size: MAX_DOCUMENT_BYTES }, pdf('pan'), pdf('cheque')])).toBeNull();
    expect(checkDocuments([{ ...pdf('gst'), type: 'image/gif' }, pdf('pan'), pdf('cheque')])).toBe(
      'gst.pdf is not a PDF, JPG or PNG file.',
    );
    expect(checkDocuments([{ ...pdf('gst'), size: 0 }, pdf('pan'), pdf('cheque')])).toBe('gst.pdf is empty.');
  });

  it('refuses two files for one kind', () => {
    expect(checkDocuments([...all, pdf('gst')])).toBe('Add only one file for the GST certificate.');
  });
});

describe('maskAccount', () => {
  it('keeps only the last 4 digits', () => {
    expect(maskAccount('123456789012')).toBe('********9012');
    expect(maskAccount('123')).toBe('***');
  });
});
