import { Prisma, QuotationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  CreateQuotationTemplateDto,
  QuotationQueryFilters,
} from './quotations.types';
import { AuthUser } from '../../types';
import { subscriptionService } from '../subscriptions/subscriptions.service';
import { buildPagination, formatPaginatedResponse } from '../../utils/pagination';
import { FinancialCalculator } from '../../utils/calculation';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class QuotationService {
  /**
   * Generate sequential quotation number: QT-YYYY-XXXXX
   */
  private async generateQuotationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QT-${year}-`;

    const latest = await prisma.quotation.findFirst({
      where: { quotationNumber: { startsWith: prefix } },
      orderBy: { quotationNumber: 'desc' },
      select: { quotationNumber: true },
    });

    let seq = 1;
    if (latest) {
      const parts = latest.quotationNumber.split('-');
      if (parts.length === 3) {
        seq = parseInt(parts[2], 10) + 1;
      }
    }

    return `${prefix}${seq.toString().padStart(5, '0')}`;
  }

  /**
   * Create a new quotation
   */
  async createQuotation(salesRepUser: AuthUser, dto: CreateQuotationDto) {
    const customer = await prisma.customerProfile.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundError('Customer profile not found');
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) {
      throw new NotFoundError('Subscription plan not found');
    }

    // Process line items and calculate financial snapshots
    let subtotalAcc = 0;
    let taxAcc = 0;
    let discountAcc = 0;

    const lineCalculations = [];

    for (const line of dto.lines) {
      const product = await prisma.product.findUnique({
        where: { id: line.productId },
        include: {
          taxRules: {
            include: { taxRule: true },
          },
        },
      });

      if (!product) {
        throw new NotFoundError(`Product ${line.productId} not found`);
      }

      let variantSurcharge = 0;
      if (line.variantId) {
        const variant = await prisma.productVariant.findFirst({
          where: { id: line.variantId, productId: line.productId },
        });
        if (!variant) {
          throw new NotFoundError(`Variant ${line.variantId} not found for product`);
        }
        variantSurcharge = Number(variant.additionalPrice);
      }

      const unitPrice =
        line.unitPrice !== undefined
          ? Number(line.unitPrice)
          : Number(product.salesPrice) + variantSurcharge;

      const discountAmount = Number(line.discountAmount || 0);

      // Determine tax rate
      let taxRate = 0;
      let taxRuleId = line.taxRuleId || null;

      if (taxRuleId) {
        const taxRule = await prisma.taxRule.findUnique({ where: { id: taxRuleId } });
        if (taxRule) taxRate = Number(taxRule.rate);
      } else if (product.taxRules.length > 0) {
        const defaultTax = product.taxRules.find((tr) => tr.taxRule.isDefault) || product.taxRules[0];
        taxRate = Number(defaultTax.taxRule.rate);
        taxRuleId = defaultTax.taxRuleId;
      }

      const calc = FinancialCalculator.calculateLine({
        unitPrice,
        quantity: line.quantity,
        discountAmount,
        taxRatePercent: taxRate,
      });

      subtotalAcc += unitPrice * line.quantity;
      discountAcc += discountAmount;
      taxAcc += Number(calc.taxAmount);

      lineCalculations.push({
        productId: line.productId,
        variantId: line.variantId || null,
        taxRuleId,
        quantity: line.quantity,
        unitPrice: calc.unitPrice,
        discountAmount: calc.discountAmount,
        taxRate: calc.taxRate,
        taxAmount: calc.taxAmount,
        lineTotal: calc.lineTotal,
      });
    }

    const totalAmount = subtotalAcc - discountAcc + taxAcc;
    const quotationNumber = await this.generateQuotationNumber();

    const validityDays = dto.validityDays || 30;
    const issueDate = new Date();
    const expiryDate = new Date(issueDate.getTime() + validityDays * 24 * 60 * 60 * 1000);

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerId: dto.customerId,
        planId: dto.planId,
        templateId: dto.templateId || null,
        salesRepId: salesRepUser.id,
        status: QuotationStatus.DRAFT,
        validityDays,
        issueDate,
        expiryDate,
        currency: dto.currency || 'USD',
        subtotal: FinancialCalculator.toDecimal(subtotalAcc),
        discountAmount: FinancialCalculator.toDecimal(discountAcc),
        taxAmount: FinancialCalculator.toDecimal(taxAcc),
        totalAmount: FinancialCalculator.toDecimal(totalAmount),
        notes: dto.notes?.trim() || null,
        lines: {
          create: lineCalculations,
        },
      },
      include: {
        lines: {
          include: {
            product: true,
            variant: true,
            taxRule: true,
          },
        },
        customer: true,
        plan: true,
        salesRep: {
          select: { id: true, email: true },
        },
      },
    });

    logger.info(`[Quotations] Created quotation ${quotation.quotationNumber} for customer ${dto.customerId}`);
    return quotation;
  }

  /**
   * List quotations with role-based scoping and filtering
   */
  async listQuotations(user: AuthUser, filters: QuotationQueryFilters) {
    const { page, limit, skip, take } = buildPagination(filters);

    const where: Prisma.QuotationWhereInput = {};

    // Customer data isolation enforcement
    if (user.role === 'CUSTOMER') {
      if (!user.customerProfileId) {
        throw new ForbiddenError('Customer profile not associated with this account');
      }
      where.customerId = user.customerProfileId;
    } else if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { quotationNumber: { contains: filters.search, mode: 'insensitive' } },
        { customer: { companyName: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { contactName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        include: {
          customer: {
            select: { id: true, companyName: true, contactName: true, user: { select: { email: true } } },
          },
          plan: {
            select: { id: true, name: true, billingFrequency: true },
          },
          salesRep: {
            select: { id: true, email: true },
          },
          lines: {
            include: {
              product: true,
              variant: true,
            },
          },
          _count: {
            select: { lines: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.quotation.count({ where }),
    ]);

    return formatPaginatedResponse(items, total, page, limit);
  }

  /**
   * Get single quotation by ID
   */
  async getQuotationById(user: AuthUser, id: string) {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: true,
        salesRep: { select: { id: true, email: true } },
        lines: {
          include: {
            product: true,
            variant: true,
            taxRule: true,
          },
        },
        subscription: {
          select: { id: true, subscriptionNumber: true, status: true },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundError('Quotation not found');
    }

    // Customer ownership verification
    if (user.role === 'CUSTOMER' && quotation.customerId !== user.customerProfileId) {
      throw new ForbiddenError('Access forbidden: You cannot view quotations of another customer');
    }

    return quotation;
  }

  /**
   * Update quotation status
   */
  async updateQuotationStatus(user: AuthUser, id: string, newStatus: QuotationStatus) {
    const quotation = await this.getQuotationById(user, id);

    // Customer can only ACCEPT their own quotation
    if (user.role === 'CUSTOMER') {
      if (newStatus !== QuotationStatus.ACCEPTED) {
        throw new ForbiddenError('Customers can only accept quotations');
      }
      if (quotation.status !== QuotationStatus.SENT) {
        throw new ValidationError('Only quotations in SENT status can be accepted');
      }
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: newStatus },
      include: {
        customer: true,
        lines: true,
      },
    });

    logger.info(`[Quotations] Quotation ${quotation.quotationNumber} transitioned to ${newStatus}`);
    return updated;
  }

  /**
   * Dedicated Accept Endpoint
   */
  async acceptQuotation(user: AuthUser, id: string) {
    return this.updateQuotationStatus(user, id, QuotationStatus.ACCEPTED);
  }

  /**
   * Dedicated Reject Endpoint
   */
  async rejectQuotation(user: AuthUser, id: string, reason?: string) {
    const quotation = await this.getQuotationById(user, id);
    if (quotation.status === QuotationStatus.CONVERTED) {
      throw new ValidationError('Converted quotations cannot be rejected');
    }
    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.CANCELLED,
        notes: reason ? `${quotation.notes || ''} [Rejected: ${reason}]`.trim() : quotation.notes,
      },
    });
    return updated;
  }

  /**
   * Dedicated Convert Endpoint
   */
  async convertQuotation(user: AuthUser, id: string, paymentTerms?: string) {
    return subscriptionService.convertQuotationToSubscription(user, {
      quotationId: id,
      paymentTerms,
    });
  }

  /**
   * Quotation Templates
   */
  async createTemplate(dto: CreateQuotationTemplateDto) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) {
      throw new NotFoundError('Subscription plan not found');
    }

    const template = await prisma.quotationTemplate.create({
      data: {
        name: dto.name.trim(),
        planId: dto.planId,
        validityDays: dto.validityDays || 30,
        description: dto.description?.trim() || null,
        isActive: dto.isActive ?? true,
        lines: {
          create: dto.lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId || null,
            quantity: l.quantity || 1,
            unitPrice: FinancialCalculator.toDecimal(l.unitPrice),
          })),
        },
      },
      include: {
        plan: true,
        lines: {
          include: { product: true, variant: true },
        },
      },
    });

    return template;
  }

  async listTemplates() {
    return prisma.quotationTemplate.findMany({
      where: { isActive: true },
      include: {
        plan: true,
        lines: {
          include: { product: true, variant: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const quotationService = new QuotationService();
