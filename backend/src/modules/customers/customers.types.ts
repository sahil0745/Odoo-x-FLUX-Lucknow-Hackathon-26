export interface CreateCustomerDto {
  email: string;
  password?: string;
  contactName: string;
  companyName?: string;
  phone?: string;
  billingAddress?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
}

export interface UpdateCustomerProfileDto {
  companyName?: string;
  contactName?: string;
  phone?: string;
  billingAddress?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
}

export interface CustomerQueryFilters {
  search?: string;
  page?: number;
  limit?: number;
}
