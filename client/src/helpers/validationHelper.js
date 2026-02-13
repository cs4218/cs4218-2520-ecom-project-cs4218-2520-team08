export const containsXSS = (value) => {
  const xssPatterns = [
    /<script\b/gi,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<[^>]+on\w+\s*=/gi,
    /<img[^>]+onerror/gi,
    /<[^>]+src\s*=\s*["']?javascript:/gi,
    /javascript:/gi,
  ];
  return xssPatterns.some((pattern) => pattern.test(value));
};

export const containsSQLInjection = (value) => {
  const sqlPatterns = [
    /('\s*;?\s*DROP\s+TABLE)/gi,
    /('\s*;?\s*DELETE\s+FROM)/gi,
    /('\s*;?\s*INSERT\s+INTO)/gi,
    /('\s*;?\s*UPDATE\s+\w+\s+SET)/gi,
    /('\s*OR\s+'?\d+'?\s*=\s*'?\d+'?)/gi,
    /'OR\s*'?\d+'?\s*'?\s*=\s*'?\d+/gi,
    /\bOR\s*\d+\s*=\s*\d+\b/gi,
    /(--\s*$)/gm,
  ];
  return sqlPatterns.some((pattern) => pattern.test(value));
};

export const isValidPhone = (phone) => {
  const digitsOnlyRegex = /^\d+$/;
  if (!digitsOnlyRegex.test(phone)) {
    return { valid: false, error: "Phone number must contain only digits" };
  }
  if (phone.length < 7 || phone.length > 15) {
    return { valid: false, error: "Phone number must be 7-15 digits" };
  }
  return { valid: true };
};

export const isValidLength = (value, maxLength) => {
  return value.length <= maxLength;
};

export const isNotWhitespaceOnly = (value) => {
  return value.trim().length > 0;
};
