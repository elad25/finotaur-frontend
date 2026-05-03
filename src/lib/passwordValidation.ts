// src/lib/passwordValidation.ts
// Shared password validation logic — single source of truth for Register and ResetPassword

export const validatePassword = (password: string) => {
  return {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?!]/.test(password),
  };
};

export const getPasswordStrength = (password: string) => {
  if (!password) return { label: '', color: '', bgColor: '', progress: 0 };

  const validation = validatePassword(password);
  const score = Object.values(validation).filter(Boolean).length;

  if (score === 4) return { label: 'Strong', color: 'text-green-500', bgColor: 'bg-green-500', progress: 100 };
  if (score === 3) return { label: 'Good', color: 'text-yellow-500', bgColor: 'bg-yellow-500', progress: 75 };
  if (score === 2) return { label: 'Fair', color: 'text-orange-500', bgColor: 'bg-orange-500', progress: 50 };
  return { label: 'Weak', color: 'text-red-500', bgColor: 'bg-red-500', progress: 25 };
};

export const isStrongPassword = (password: string): boolean => {
  const validation = validatePassword(password);
  return Object.values(validation).every(Boolean);
};
