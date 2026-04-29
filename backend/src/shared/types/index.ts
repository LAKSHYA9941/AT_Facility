import { Role } from "./enums";

export type JWTPayload = {
  userId: string;
  role: Role;
  phone: string;
};

export type APIResponse<T = null> = {
  success: boolean;
  message: string;
  data: T;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export type RequestUser = {
  userId: string;
  role: Role;
  phone: string;
};
