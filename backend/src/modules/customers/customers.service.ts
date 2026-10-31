import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  CreateCustomerDto,
  UpdateCustomerProfileDto,
  CustomerQueryFilters,
} from './customers.types';
import { AuthUser } from '../../types';
import { hashPassword } from '../../utils/password';
import { generateSecureRandomToken } from '../../utils/token';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/AppError';
import { buildPagination, formatPaginatedResponse } from '../../utils/pagination';
import { logger } from '../../utils/logger';

export class CustomerService {
  /**
   * Provision a customer directly by Staff / Admin
   */
  async createCustomer(dto: CreateCustomerDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const rawPassword = dto.password || `Brightloop!${generateSecureRandomToken().substring(0, 8)}`;
    const passwordHash = await hashPassword(rawPassword);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: UserRole.CUSTOMER,
        isActive: true,
        customerProfile: {
          create: {
            contactName: dto.contactName.trim(),
            companyName: dto.companyName?.trim() || null,
            phone: dto.phone?.trim() || null,
            billingAddress: dto.billingAddress?.trim() || null,
            city: dto.city?.trim() || null,
            country: dto.country?.trim() || null,
            taxNumber: dto.taxNumber?.trim() || null,
          },
        },
      },
      include: {
        customerProfile: true,
      },
    });

    logger.info(`[Customers] Provisioned customer: ${user.email} (Profile ID: ${user.customerProfile?.id})`);
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      customerProfile: user.customerProfile,
    };
  }

  /**
   * List customers (Admin and Staff only)
   */
  async listCustomers(filters: CustomerQueryFilters) {
    const { page, limit, skip, take } = buildPagination(filters);

    const where: Prisma.CustomerProfileWhereInput = {};

    if (filters.search) {
      where.OR = [
        { companyName: { contains: filters.search, mode: 'insensitive' } },
        { contactName: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.customerProfile.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, isActive: true, createdAt: true } },
          _count: {
            select: { subscriptions: true, invoices: true, quotations: true, payments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.customerProfile.count({ where }),
    ]);

    return formatPaginatedResponse(items, total, page, limit);
  }

  /**
   * Get single customer profile by ID
   */
  async getCustomerById(user: AuthUser, id: string) {
    if (user.role === 'CUSTOMER' && user.customerProfileId !== id) {
      throw new ForbiddenError('Access forbidden: You cannot view another customer profile');
    }

    const customer = await prisma.customerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, isActive: true, createdAt: true } },
        _count: {
          select: { subscriptions: true, invoices: true, quotations: true, payments: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError('Customer profile not found');
    }

    return customer;
  }

  /**
   * Update customer profile details
   */
  async updateCustomerProfile(user: AuthUser, id: string, dto: UpdateCustomerProfileDto) {
    if (user.role === 'CUSTOMER' && user.customerProfileId !== id) {
      throw new ForbiddenError('Access forbidden: You cannot modify another customer profile');
    }

    const customer = await prisma.customerProfile.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundError('Customer profile not found');
    }

    const data: Prisma.CustomerProfileUpdateInput = {};
    if (dto.companyName !== undefined) data.companyName = dto.companyName.trim() || null;
    if (dto.contactName !== undefined) data.contactName = dto.contactName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.billingAddress !== undefined) data.billingAddress = dto.billingAddress.trim() || null;
    if (dto.city !== undefined) data.city = dto.city.trim() || null;
    if (dto.country !== undefined) data.country = dto.country.trim() || null;
    if (dto.taxNumber !== undefined) data.taxNumber = dto.taxNumber.trim() || null;

    const updated = await prisma.customerProfile.update({
      where: { id },
      data,
    });

    logger.info(`[Customers] Updated customer profile ${id}`);
    return updated;
  }

  /**
   * Customer Child Views
   */
  async getCustomerSubscriptions(user: AuthUser, customerId: string) {
    await this.getCustomerById(user, customerId);
    return prisma.subscription.findMany({
      where: { customerId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCustomerQuotations(user: AuthUser, customerId: string) {
    await this.getCustomerById(user, customerId);
    return prisma.quotation.findMany({
      where: { customerId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCustomerInvoices(user: AuthUser, customerId: string) {
    await this.getCustomerById(user, customerId);
    return prisma.invoice.findMany({
      where: { customerId },
      orderBy: { issueDate: 'desc' },
    });
  }

  async getCustomerPayments(user: AuthUser, customerId: string) {
    await this.getCustomerById(user, customerId);
    return prisma.payment.findMany({
      where: { customerId },
      include: { allocations: { include: { invoice: true } } },
      orderBy: { paymentDate: 'desc' },
    });
  }
}

export const customerService = new CustomerService();
