/**
 * Standardized Password Validation Utility
 * Requires:
 * - At least one numeric digit (0-9)
 * - At least one special character (e.g. !@#$%^&*...)
 * - Minimum length (default 6 characters)
 */

export interface PasswordRequirements {
  hasMinLength: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

export interface PasswordValidationResult extends PasswordRequirements {
  error?: string;
}

export const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;
export const NUMERICAL_REGEX = /\d/;

export function getPasswordRequirements(password: string, minLength: number = 6): PasswordRequirements {
  const pwd = password || '';
  const hasMinLength = pwd.length >= minLength;
  const hasNumber = NUMERICAL_REGEX.test(pwd);
  const hasSpecialChar = SPECIAL_CHAR_REGEX.test(pwd);
  const isValid = hasMinLength && hasNumber && hasSpecialChar;

  return {
    hasMinLength,
    hasNumber,
    hasSpecialChar,
    isValid,
  };
}

export function validatePassword(
  password: string,
  minLength: number = 6,
  requireSpecialChar: boolean = true
): PasswordValidationResult {
  if (!password) {
    return {
      hasMinLength: false,
      hasNumber: false,
      hasSpecialChar: false,
      isValid: false,
      error: 'Password is required.',
    };
  }

  const reqs = getPasswordRequirements(password, minLength);

  if (!reqs.hasMinLength) {
    return {
      ...reqs,
      isValid: false,
      error: `Password must be at least ${minLength} characters long.`,
    };
  }

  if (requireSpecialChar) {
    if (!reqs.hasNumber && !reqs.hasSpecialChar) {
      return {
        ...reqs,
        isValid: false,
        error: 'Password must contain at least one numerical digit and one special character.',
      };
    }

    if (!reqs.hasNumber) {
      return {
        ...reqs,
        isValid: false,
        error: 'Password must include at least one numerical digit (0-9).',
      };
    }

    if (!reqs.hasSpecialChar) {
      return {
        ...reqs,
        isValid: false,
        error: 'Password must include at least one special character (e.g., !@#$%^&*).',
      };
    }
  }

  return {
    ...reqs,
    isValid: true,
    error: undefined,
  };
}
