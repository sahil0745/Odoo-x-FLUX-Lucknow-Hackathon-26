export interface CreateStaffDto {
  email: string;
  password: string;
  department?: string;
  title?: string;
}

export interface UpdateStaffDto {
  department?: string;
  title?: string;
}

export interface UpdateStaffStatusDto {
  isActive: boolean;
}
