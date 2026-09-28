/**
 * Date and Year Validation Utilities
 * Ensures date inputs and year fields accept and process strictly 4-digit years (e.g., 1900 - 2099 / 9999).
 */

/**
 * Sanitizes any date string (YYYY-MM-DD) so that the year component is strictly capped at 4 digits.
 * Prevents 5+ digit years like 222222.
 */
export function sanitizeDateYear(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  const parts = trimmed.split('-');
  
  if (parts.length > 0 && parts[0]) {
    // If year part has more than 4 digits, truncate to 4 digits
    if (parts[0].length > 4) {
      parts[0] = parts[0].slice(0, 4);
      return parts.join('-');
    }
  }
  return trimmed;
}

/**
 * Validates that a date value has a valid 4-digit year (between minYear and maxYear).
 * Returns null if valid, or an error string if invalid.
 */
export function validate4DigitYear(
  dateValue: string,
  minYear = 1900,
  maxYear = 2099,
  fieldName = 'Date'
): string | null {
  if (!dateValue) return null;
  const parts = dateValue.split('-');
  if (parts.length < 1 || !parts[0]) {
    return `Please enter a valid ${fieldName}.`;
  }

  const yearStr = parts[0];
  if (yearStr.length !== 4 || !/^\d{4}$/.test(yearStr)) {
    return `${fieldName} year must be strictly 4 digits (e.g., 2026).`;
  }

  const yearNum = parseInt(yearStr, 10);
  if (isNaN(yearNum) || yearNum < minYear || yearNum > maxYear) {
    return `${fieldName} year must be between ${minYear} and ${maxYear}.`;
  }

  return null;
}
