import { describe, it, expect, vi, beforeEach } from 'vitest';
import { planService } from './planService';
import { apiClient } from './api';
import { SubscriptionPlan, CreatePlanPayload } from '../types';

describe('Frontend Plan Service & Client Billing Logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockPlan: SubscriptionPlan = {
    id: 'plan-1',
    name: 'Standard Cloud SaaS',
    description: 'Monthly cloud plan',
    price: '199.99',
    billingFrequency: 'MONTHLY',
    intervalCount: 1,
    minimumQuantity: 5,
    availableFrom: '2026-01-01T00:00:00.000Z',
    availableUntil: '2026-12-31T23:59:59.000Z',
    allowAutoClose: false,
    allowEarlyClose: true,
    allowPause: true,
    allowRenewal: true,
    isActive: true,
    currency: 'USD',
    cadenceFormatted: 'USD 199.99 / Monthly',
    availabilityStatus: 'ACTIVE',
    isAvailable: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('fetches plan listing with filters and pagination parameters', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          plans: [mockPlan],
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        },
      },
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockResponse as any);

    const result = await planService.getPlans({
      page: 1,
      limit: 10,
      search: 'Cloud',
      billingFrequency: 'MONTHLY',
      isActive: true,
    });

    expect(getSpy).toHaveBeenCalledWith('/plans', {
      params: {
        page: 1,
        limit: 10,
        search: 'Cloud',
        billingFrequency: 'MONTHLY',
        isActive: true,
      },
    });

    expect(result.plans).toHaveLength(1);
    expect(result.plans[0].name).toBe('Standard Cloud SaaS');
    expect(result.plans[0].price).toBe('199.99');
    expect(result.plans[0].minimumQuantity).toBe(5);
  });

  it('fetches single plan by ID', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: { plan: mockPlan },
      },
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockResponse as any);

    const result = await planService.getPlanById('plan-1');

    expect(getSpy).toHaveBeenCalledWith('/plans/plan-1');
    expect(result.id).toBe('plan-1');
    expect(result.name).toBe('Standard Cloud SaaS');
  });

  it('creates plan with full payload including closing, pause and renewal options', async () => {
    const payload: CreatePlanPayload = {
      name: 'Enterprise Annual Pack',
      price: '1999.00',
      billingFrequency: 'YEARLY',
      intervalCount: 1,
      minimumQuantity: 10,
      availableFrom: '2026-01-01T00:00:00.000Z',
      availableUntil: null,
      allowAutoClose: true,
      allowEarlyClose: false,
      allowPause: true,
      allowRenewal: true,
      isActive: true,
    };

    const mockResponse = {
      data: {
        success: true,
        data: { plan: { id: 'new-plan-id', ...payload } },
      },
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockResponse as any);

    const created = await planService.createPlan(payload);

    expect(postSpy).toHaveBeenCalledWith('/plans', payload);
    expect(created.name).toBe('Enterprise Annual Pack');
  });

  it('calls updatePlanStatus to activate or deactivate plan', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: { plan: { ...mockPlan, isActive: false } },
      },
    };

    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue(mockResponse as any);

    const updated = await planService.updatePlanStatus('plan-1', false);

    expect(patchSpy).toHaveBeenCalledWith('/plans/plan-1/status', { isActive: false });
    expect(updated.isActive).toBe(false);
  });

  it('calls validateQuantity endpoint with requested quantity', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          validation: {
            isValid: true,
            requestedQuantity: 10,
            minimumQuantity: 5,
          },
        },
      },
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockResponse as any);

    const result = await planService.validateQuantity('plan-1', 10);

    expect(postSpy).toHaveBeenCalledWith('/plans/plan-1/validate-quantity', { quantity: 10 });
    expect(result.isValid).toBe(true);
    expect(result.requestedQuantity).toBe(10);
    expect(result.minimumQuantity).toBe(5);
  });

  it('calls calculateNextBillingDate utility endpoint', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          periodStart: '2026-01-31T00:00:00.000Z',
          periodEnd: '2026-02-28T00:00:00.000Z',
          nextBillingDate: '2026-02-28T00:00:00.000Z',
        },
      },
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockResponse as any);

    const cycle = await planService.calculateNextBillingDate(
      '2026-01-31T00:00:00.000Z',
      'MONTHLY',
      1
    );

    expect(postSpy).toHaveBeenCalledWith('/plans/next-billing-date', {
      startDate: '2026-01-31T00:00:00.000Z',
      billingFrequency: 'MONTHLY',
      intervalCount: 1,
      anchorDay: undefined,
    });

    expect(cycle.nextBillingDate).toBe('2026-02-28T00:00:00.000Z');
  });
});
