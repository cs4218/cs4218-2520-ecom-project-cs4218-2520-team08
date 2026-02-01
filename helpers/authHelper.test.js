import bcrypt from 'bcrypt';
import { hashPassword, comparePassword } from './authHelper.js';

jest.mock('bcrypt');

describe('authHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('hashPassword returns hashed password', async () => {
      const mockHashedPassword = '$2b$10$hashedpasswordstring';
      bcrypt.hash.mockResolvedValueOnce(mockHashedPassword);

      const result = await hashPassword('testPassword123');

      expect(bcrypt.hash).toHaveBeenCalledWith('testPassword123', 10);
      expect(result).toBe(mockHashedPassword);
    });

    it('hashPassword returns undefined on error', async () => {
      const mockError = new Error('Hashing failed');
      bcrypt.hash.mockRejectedValueOnce(mockError);

      const result = await hashPassword('testPassword123');

      expect(result).toBeUndefined();
    });
  });

  describe('comparePassword', () => {
    it('comparePassword returns true for valid password', async () => {
      bcrypt.compare.mockResolvedValueOnce(true);

      const result = await comparePassword('testPassword123', '$2b$10$hashedpasswordstring');

      expect(bcrypt.compare).toHaveBeenCalledWith('testPassword123', '$2b$10$hashedpasswordstring');
      expect(result).toBe(true);
    });

    it('comparePassword returns false for invalid password', async () => {
      bcrypt.compare.mockResolvedValueOnce(false);

      const result = await comparePassword('wrongPassword', '$2b$10$hashedpasswordstring');

      expect(bcrypt.compare).toHaveBeenCalledWith('wrongPassword', '$2b$10$hashedpasswordstring');
      expect(result).toBe(false);
    });
  });
});
