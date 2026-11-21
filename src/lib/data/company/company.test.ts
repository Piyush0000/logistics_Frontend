import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockOnboardingService } from '../onboarding/mock';
import { gatewayCompanyService } from './gateway';
import { companyService } from './index';
import { createMockCompanyService, mockCompanyService } from './mock';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));
afterEach(() => vi.unstubAllGlobals());

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
    country: 'IN',
    pincode: '411001',
  },
  bank: { holder: 'Asha Traders Private Limited', account: '123456789012', ifsc: 'HDFC0001234' },
};
const docs = (['gst', 'pan', 'cheque'] as const).map((kind) => ({
  kind,
  name: `${kind}.pdf`,
  type: 'application/pdf',
  size: 2000,
}));

describe('mock company service', () => {
  it('starts with no details and KYC not started, as sample data', async () => {
    const result = await createMockCompanyService().getCompany();
    expect(result).toEqual({
      ok: true,
      source: 'mock',
      data: { details: null, kycStatus: 'not_started', documents: [] },
    });
  });

  it('submits for review and keeps document names', async () => {
    const service = createMockCompanyService();
    expect(await service.saveCompany(details, docs)).toEqual({
      ok: true,
      source: 'mock',
      data: { kycStatus: 'submitted' },
    });
    const result = await service.getCompany();
    if (!result.ok) throw new Error('expected data');
    expect(result.data.kycStatus).toBe('submitted');
    expect(result.data.documents).toEqual([
      { kind: 'gst', name: 'gst.pdf' },
      { kind: 'pan', name: 'pan.pdf' },
      { kind: 'cheque', name: 'cheque.pdf' },
    ]);
  });

  it('masks the saved account number', async () => {
    const service = createMockCompanyService();
    await service.saveCompany(details, docs);
    const result = await service.getCompany();
    if (!result.ok || !result.data.details) throw new Error('expected details');
    expect(result.data.details.bank.account).toBe('********9012');
    expect(JSON.stringify(result)).not.toContain('123456789012');
  });

  it('refuses bad details and missing documents without changing anything', async () => {
    const service = createMockCompanyService();
    expect(await service.saveCompany({ ...details, gstin: 'bad' }, docs)).toMatchObject({
      ok: false,
      error: { kind: 'validation' },
    });
    expect(await service.saveCompany(details, docs.slice(0, 2))).toMatchObject({
      ok: false,
      error: { kind: 'validation', message: 'Add the Cancelled cheque.' },
    });
    const result = await service.getCompany();
    if (!result.ok) throw new Error('expected data');
    expect(result.data.kycStatus).toBe('not_started');
  });

  it('lets a later save keep documents already on file', async () => {
    const service = createMockCompanyService();
    await service.saveCompany(details, docs);
    const again = await service.saveCompany(details, [{ kind: 'gst' as const, name: 'new-gst.pdf', type: 'application/pdf', size: 2000 }]);
    expect(again.ok).toBe(true);
    const result = await service.getCompany();
    if (!result.ok) throw new Error('expected data');
    expect(result.data.documents).toHaveLength(3);
    expect(result.data.documents[0]).toEqual({ kind: 'gst', name: 'new-gst.pdf' });
  });

  it('marks the Home KYC step done after submitting', async () => {
    const kyc = async () => {
      const result = await mockOnboardingService.getChecklist();
      if (!result.ok) throw new Error('expected data');
      return result.data.find((item) => item.id === 'kyc')?.done;
    };
    expect(await kyc()).toBe(false);
    await mockCompanyService.saveCompany(details, docs);
    expect(await kyc()).toBe(true);
  });
});

describe('gateway company service', () => {
  it('reads the company with a masked account, saves it, and uploads documents', async () => {
    const stub = (body: unknown, status = 200) => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
      status === 204 ? new Response(null, { status }) : Response.json(body, { status }),
    );
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };
    let fetchMock = stub({
      details: {
        legal_name: details.legalName,
        brand_name: details.brandName,
        gstin: details.gstin,
        pan: details.pan,
        address: details.address,
        bank: { ...details.bank, account: '123456789012' },
      },
      kyc_status: 'PENDING',
      kyc_note: null,
      documents: [{ kind: 'gst', name: 'gst.pdf', size: 10, uploaded_at: '2026-11-22T00:00:00.000Z' }],
    });
    expect(await gatewayCompanyService.getCompany()).toMatchObject({
      ok: true,
      data: {
        kycStatus: 'submitted',
        details: { bank: { account: '********9012' } },
        documents: [{ kind: 'gst', name: 'gst.pdf' }],
      },
    });
    fetchMock = stub({ kyc_status: 'PENDING' });
    expect(await gatewayCompanyService.saveCompany(details, docs)).toMatchObject({
      ok: true,
      data: { kycStatus: 'submitted' },
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toMatchObject({
      legal_name: details.legalName,
      gstin: details.gstin,
    });
    fetchMock = stub({ kind: 'pan', name: 'pan.pdf', size: 4, uploaded_at: 'x' });
    await gatewayCompanyService.uploadDocument('pan', {
      name: 'pan.pdf',
      type: 'application/pdf',
      bytes: new TextEncoder().encode('%PDF'),
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(new URL(String(url)).pathname).toBe('/api/v1/account/documents/pan');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual({
      file_name: 'pan.pdf',
      content_type: 'application/pdf',
      data_base64: Buffer.from('%PDF').toString('base64'),
    });
  });

  it('is picked by DATA_SOURCE_COMPANY', () => {
    expect(companyService()).toBe(mockCompanyService);
    process.env.DATA_SOURCE_COMPANY = 'gateway';
    try {
      expect(companyService()).toBe(gatewayCompanyService);
    } finally {
      delete process.env.DATA_SOURCE_COMPANY;
    }
  });
});
