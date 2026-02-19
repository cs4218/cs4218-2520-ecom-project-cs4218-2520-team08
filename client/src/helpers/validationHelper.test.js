import {
  containsXSS,
  containsSQLInjection,
  isValidPhone,
  isValidLength,
  isNotWhitespaceOnly,
} from "./validationHelper";

describe("validationHelper", () => {
  describe("containsXSS", () => {
    it("returns false for safe strings", () => {
      expect(containsXSS("hello world")).toBe(false);
      expect(containsXSS("normal text 123")).toBe(false);
      expect(containsXSS("")).toBe(false);
    });

    it("returns true for script tags", () => {
      expect(containsXSS("<script>alert(1)</script>")).toBe(true);
      expect(containsXSS("<SCRIPT>evil()</SCRIPT>")).toBe(true);
      expect(containsXSS("foo <script src=x>")).toBe(true);
    });

    it("returns true for event handler patterns", () => {
      expect(containsXSS("<div onclick=alert(1)>")).toBe(true);
      expect(containsXSS("<img onerror=alert(1)>")).toBe(true);
      expect(containsXSS("<body onload=evil()>")).toBe(true);
    });

    it("returns true for javascript: URLs", () => {
      expect(containsXSS("javascript:alert(1)")).toBe(true);
      expect(containsXSS("<a href=\"javascript:void(0)\">")).toBe(true);
    });
  });

  describe("containsSQLInjection", () => {
    it("returns false for safe strings", () => {
      expect(containsSQLInjection("hello")).toBe(false);
      expect(containsSQLInjection("user@email.com")).toBe(false);
      expect(containsSQLInjection("")).toBe(false);
    });

    it("returns true for DROP TABLE pattern", () => {
      expect(containsSQLInjection("'; DROP TABLE users--")).toBe(true);
    });

    it("returns true for DELETE FROM pattern", () => {
      expect(containsSQLInjection("'; DELETE FROM users")).toBe(true);
    });

    it("returns true for INSERT/UPDATE patterns", () => {
      expect(containsSQLInjection("'; INSERT INTO users")).toBe(true);
      expect(containsSQLInjection("'; UPDATE users SET")).toBe(true);
    });

    it("returns true for OR 1=1 style patterns", () => {
      expect(containsSQLInjection("' OR '1'='1")).toBe(true);
      expect(containsSQLInjection("OR 1=1")).toBe(true);
    });

    it("returns true for SQL comment pattern", () => {
      expect(containsSQLInjection("admin'--")).toBe(true);
    });
  });

  describe("isValidPhone", () => {
    it("returns valid for 7-15 digits", () => {
      expect(isValidPhone("1234567")).toEqual({ valid: true });
      expect(isValidPhone("123456789012345")).toEqual({ valid: true });
      expect(isValidPhone("81234567")).toEqual({ valid: true });
    });

    it("returns invalid when not digits only", () => {
      expect(isValidPhone("123-456-7890")).toEqual({
        valid: false,
        error: "Phone number must contain only digits",
      });
      expect(isValidPhone("1234567a")).toEqual({
        valid: false,
        error: "Phone number must contain only digits",
      });
      expect(isValidPhone("+6512345678")).toEqual({
        valid: false,
        error: "Phone number must contain only digits",
      });
    });

    it("returns invalid when too short", () => {
      expect(isValidPhone("123456")).toEqual({
        valid: false,
        error: "Phone number must be 7-15 digits",
      });
    });

    it("returns invalid when too long", () => {
      expect(isValidPhone("1234567890123456")).toEqual({
        valid: false,
        error: "Phone number must be 7-15 digits",
      });
    });
  });

  describe("isValidLength", () => {
    it("returns true when value length is within maxLength", () => {
      expect(isValidLength("hi", 10)).toBe(true);
      expect(isValidLength("hello", 5)).toBe(true);
      expect(isValidLength("", 5)).toBe(true);
    });

    it("returns false when value length exceeds maxLength", () => {
      expect(isValidLength("hello world", 5)).toBe(false);
      expect(isValidLength("ab", 1)).toBe(false);
    });
  });

  describe("isNotWhitespaceOnly", () => {
    it("returns true when value has non-whitespace content", () => {
      expect(isNotWhitespaceOnly("hello")).toBe(true);
      expect(isNotWhitespaceOnly("  hello  ")).toBe(true);
      expect(isNotWhitespaceOnly("a")).toBe(true);
    });

    it("returns false for empty or whitespace-only strings", () => {
      expect(isNotWhitespaceOnly("")).toBe(false);
      expect(isNotWhitespaceOnly("   ")).toBe(false);
      expect(isNotWhitespaceOnly("\t\n")).toBe(false);
    });
  });
});
