/**
 * Name Validation and Sanitization Utility
 * 
 * Rules:
 * - Accepts only letters (A-Z, a-z) and spaces.
 * - Rejects any numbers, digits, or special characters.
 */

export const MAX_NAME_LENGTH = 50;

/**
 * Real-time input sanitizer that restricts user typing to letters and spaces only,
 * removing all numbers, digits, symbols, and special characters.
 */
export function sanitizeNameInput(value: string, maxLength = MAX_NAME_LENGTH): string {
  if (!value) return '';
  // Strip out any characters that are not letters or spaces
  return value.replace(/[^A-Za-z\s]/g, '').slice(0, maxLength);
}

/**
 * Checks if a string contains numbers or special characters.
 */
export function containsInvalidNameCharacters(value: string): boolean {
  if (!value) return false;
  return /[^A-Za-z\s]/.test(value);
}

/**
 * Validates a name according to strict rules:
 * - Must not contain numbers or digits
 * - Must not contain special characters or symbols
 * - Must contain only alphabetic letters and spaces
 */
export function validateName(
  name: string,
  isRequired = true,
  maxLength = MAX_NAME_LENGTH,
  fieldName = 'Full Name'
): { isValid: boolean; error?: string } {
  if (!name || !name.trim()) {
    if (isRequired) {
      return { isValid: false, error: `${fieldName} is required.` };
    }
    return { isValid: true };
  }

  const trimmed = name.trim();

  if (/\d/.test(trimmed)) {
    return {
      isValid: false,
      error: `${fieldName} must contain only letters and cannot contain numbers.`,
    };
  }

  if (/[^A-Za-z\s]/.test(trimmed)) {
    return {
      isValid: false,
      error: `${fieldName} must not contain special characters or symbols. Only letters and spaces are allowed.`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ${maxLength} characters (currently ${trimmed.length} characters).`,
    };
  }

  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: `${fieldName} must be at least 2 characters long.`,
    };
  }

  return { isValid: true };
}

