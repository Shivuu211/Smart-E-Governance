/**
 * Standardized Indian Phone Number Validation & Formatting Utilities
 * Standard: 10-digit mobile number starting with 6, 7, 8, or 9.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  cleaned: string;
}

/**
 * Strips non-digit characters and removes leading '+91' or '0' if present
 */
export function normalizePhoneNumber(input: string): string {
  if (!input) return '';
  let digits = input.replace(/\D/g, '');
  
  // If user entered +91 or 91 with 12 digits, strip country code
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  // If user entered with leading 0 (11 digits)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  
  return digits;
}

/**
 * Validates whether the given phone number is a valid 10-digit Indian mobile number.
 */
export function validatePhoneNumber(phone: string, isRequired: boolean = true): PhoneValidationResult {
  const cleaned = normalizePhoneNumber(phone);

  if (!cleaned) {
    if (isRequired) {
      return {
        isValid: false,
        error: 'Phone number is required.',
        cleaned: '',
      };
    }
    return { isValid: true, cleaned: '' };
  }

  if (cleaned.length < 10) {
    return {
      isValid: false,
      error: `Phone number is incomplete (${cleaned.length}/10 digits).`,
      cleaned,
    };
  }

  if (cleaned.length > 10) {
    return {
      isValid: false,
      error: 'Phone number cannot exceed 10 digits.',
      cleaned,
    };
  }

  // Indian mobile numbers start with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid mobile number. Must start with 6, 7, 8, or 9.',
      cleaned,
    };
  }

  return {
    isValid: true,
    cleaned,
  };
}

/**
 * Realtime input sanitizer for phone input fields (enforces numeric only & max 10 digits)
 */
export function sanitizePhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length > 10) {
    // If starts with 91 and length is 12
    if (digits.startsWith('91') && digits.length === 12) {
      return digits.slice(2, 12);
    }
    return digits.slice(0, 10);
  }
  return digits;
}
