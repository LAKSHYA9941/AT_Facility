export enum Role {
  CUSTOMER = "CUSTOMER",
  DRIVER = "DRIVER",
  ADMIN = "ADMIN",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  BANNED = "BANNED",
  PENDING = "PENDING",
}

export enum KYCStatus {
  UNSUBMITTED = "UNSUBMITTED",
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

export enum TripType {
  ONE_WAY = "ONE_WAY",
  ROUND_TRIP = "ROUND_TRIP",
}

export enum TripStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  CONFIRMED = "CONFIRMED",
  DRIVER_ASSIGNED = "DRIVER_ASSIGNED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum VehicleSegment {
  HATCHBACK = "HATCHBACK",
  SEDAN = "SEDAN",
  MINI_SUV = "MINI_SUV",
  SUV = "SUV",
  TEMPO = "TEMPO",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  PARTIAL_REFUND = "PARTIAL_REFUND",
}

export enum PaymentMethod {
  UPI = "UPI",
  CARD = "CARD",
  WALLET = "WALLET",
  CASH = "CASH",
}

export enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
}

export enum DocumentType {
  AADHAAR = "AADHAAR",
  DRIVING_LICENSE = "DRIVING_LICENSE",
  VEHICLE_RC = "VEHICLE_RC",
  PAN = "PAN",
  BANK_DETAILS = "BANK_DETAILS",
  SELFIE = "SELFIE",
}

export enum DocumentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum PackageCategory {
  BEACH = "BEACH",
  HILLS = "HILLS",
  CITYBREAK = "CITYBREAK",
  WILD = "WILD",
}

export enum ExtraChargeType {
  EXTRA_KM = "EXTRA_KM",
  EXTRA_HOURS = "EXTRA_HOURS",
  FUEL = "FUEL",
  DAMAGE = "DAMAGE",
  DRIVER_ADDON = "DRIVER_ADDON",
  OTHER = "OTHER",
}
