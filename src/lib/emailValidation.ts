// קובץ זה יבדוק שהאימייל תקין לפני ששולחים אותו ל-Supabase

export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  // בדיקה שהאימייל לא ריק
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Please enter an email address' };
  }

  // בדיקה שהאימייל בפורמט נכון
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // רשימת אתרי אימייל מזויפים/זמניים שאנחנו לא רוצים
  const blockedDomains = [
    'tempmail.com',
    'guerrillamail.com', 
    'mailinator.com',
    'test.com',
    'example.com',
    'fake.com',
    'dummy.com',
    'temp.com',
    '10minutemail.com',
    'throwaway.email',
    'trashmail.com'
  ];

  // מוציאים את החלק אחרי ה-@ (הדומיין)
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (blockedDomains.includes(domain)) {
    return { isValid: false, error: 'Please use a valid email address' };
  }

  // בדיקות נוספות
  if (email.includes('..') || email.startsWith('.')) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // אם הכל תקין
  return { isValid: true };
};