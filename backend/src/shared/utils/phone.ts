import {
  parsePhoneNumber,
  isValidPhoneNumber,
  CountryCode,
} from "libphonenumber-js";

export const formatPhone = (phone: string): string => {
  // if no + prefix, assume India
  if (!phone.startsWith("+")) {
    phone = "+91" + phone.replace(/\D/g, "");
  }
  return phone.trim();
};

export const isValidPhone = (phone: string): boolean => {
  try {
    return isValidPhoneNumber(phone);
  } catch {
    return false;
  }
};

export const isValidIndianPhone = (phone: string): boolean => {
  try {
    const parsed = parsePhoneNumber(phone, "IN" as CountryCode);
    return parsed.isValid() && parsed.country === "IN";
  } catch {
    return false;
  }
};

export const getCountryFromPhone = (phone: string): string | undefined => {
  try {
    const parsed = parsePhoneNumber(phone);
    return parsed.country;
  } catch {
    return undefined;
  }
};
