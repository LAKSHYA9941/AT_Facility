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

export enum RideStatus {
  SEARCHING = "SEARCHING",
  CONFIRMED = "CONFIRMED",
  ARRIVING = "ARRIVING",
  IN_RIDE = "IN_RIDE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum VehicleSegment {
  SWIFT = "SWIFT",
  COMFORT = "COMFORT",
  PRESTIGE = "PRESTIGE",
  VOYAGER = "VOYAGER",
  ECORIDE = "ECORIDE",
  FLEXDRIVE = "FLEXDRIVE",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
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
