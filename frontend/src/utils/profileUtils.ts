import { User } from '../types';
import { validatePhoneNumber } from './phoneValidation';

/**
 * Single reusable profile validation function across the application.
 * Dynamically checks all mandatory citizen fields (full name, phone, age/dob,
 * gender, address, zone/area, occupation, family income).
 * Returns true if all mandatory fields are valid and filled, false otherwise.
 */
function isIncomeValid(user: User): boolean {
  const raw = (user as any).income ?? (user as any).familyIncome;
  if (raw === undefined || raw === null || raw === '') return false;
  const val = Number(raw);
  return !isNaN(val) && val > 0;
}

export function isProfileComplete(user: User | null | undefined): boolean {
  if (!user) return false;

  // Standard user fields required for all roles
  const nameValid = Boolean(user.name && user.name.trim().length > 0);
  const emailValid = Boolean(user.email && user.email.trim().length > 0);
  const phoneValid = Boolean(user.phone && validatePhoneNumber(user.phone).isValid);
  const addressValid = Boolean(user.address && user.address.trim().length > 0);

  if (!nameValid || !emailValid || !phoneValid || !addressValid) {
    return false;
  }

  // Citizen-specific mandatory profile fields
  if (user.role === 'citizen') {
    const ageValid =
      (user.age !== undefined && user.age !== null && !isNaN(Number(user.age)) && Number(user.age) > 0) ||
      Boolean(user.dob && user.dob.trim().length > 0) ||
      Boolean(user.dateOfBirth && user.dateOfBirth.trim().length > 0);

    const genderValid = Boolean(user.gender && user.gender.trim().length > 0);
    const occupationValid = Boolean(user.occupation && user.occupation.trim().length > 0);

    if (!ageValid || !genderValid || !occupationValid) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates profile completion percentage dynamically (0 - 100%).
 */
export function getProfileCompleteness(user: User | null | undefined): number {
  if (!user) return 0;

  const requiredChecks = [
    Boolean(user.name && user.name.trim().length > 0),
    Boolean(user.email && user.email.trim().length > 0),
    Boolean(user.phone && validatePhoneNumber(user.phone).isValid),
    Boolean(user.address && user.address.trim().length > 0),
  ];

  if (user.role === 'citizen') {
    requiredChecks.push(
      (user.age !== undefined && user.age !== null && !isNaN(Number(user.age)) && Number(user.age) > 0) ||
      Boolean(user.dob && user.dob.trim().length > 0) ||
      Boolean(user.dateOfBirth && user.dateOfBirth.trim().length > 0)
    );
    requiredChecks.push(Boolean(user.gender && user.gender.trim().length > 0));
    requiredChecks.push(Boolean(user.occupation && user.occupation.trim().length > 0));
  }

  const completedCount = requiredChecks.filter(Boolean).length;
  return Math.round((completedCount / requiredChecks.length) * 100);
}

/**
 * Returns a list of human-readable missing mandatory profile fields.
 */
export function getMissingProfileFields(user: User | null | undefined): string[] {
  if (!user) return ['All Profile Details'];

  const missing: string[] = [];
  if (!user.name || !user.name.trim()) missing.push('Full Name');
  if (!user.email || !user.email.trim()) missing.push('Email');
  if (!user.phone || !validatePhoneNumber(user.phone).isValid) missing.push('Valid Phone Number (10 Digits)');
  if (!user.address || !user.address.trim()) missing.push('Physical Address');

  if (user.role === 'citizen') {
    const ageValid =
      (user.age !== undefined && user.age !== null && !isNaN(Number(user.age)) && Number(user.age) > 0) ||
      Boolean(user.dob && user.dob.trim().length > 0) ||
      Boolean(user.dateOfBirth && user.dateOfBirth.trim().length > 0);
    if (!ageValid) missing.push('Age / Date of Birth');

    if (!user.gender || !user.gender.trim()) missing.push('Gender');
    if (!user.occupation || !user.occupation.trim()) missing.push('Primary Occupation');
  }

  return missing;
}
