import JWT from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import { requireSignIn, isAdmin } from './authMiddleware.js';

jest.mock('jsonwebtoken');
jest.mock('../models/userModel.js');

describe('authMiddleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.JWT_SECRET = 'test-secret';

    mockReq = {
      headers: {},
      user: null
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    mockNext = jest.fn();
  });

  describe('requireSignIn', () => {
    it('requireSignIn attaches decoded user to request', async () => {
      const mockDecoded = { _id: '123', email: 'test@example.com' };
      mockReq.headers.authorization = 'Bearer validToken';
      JWT.verify.mockReturnValueOnce(mockDecoded);

      await requireSignIn(mockReq, mockRes, mockNext);

      expect(JWT.verify).toHaveBeenCalledWith('Bearer validToken', 'test-secret');
      expect(mockReq.user).toEqual(mockDecoded);
      expect(mockNext).toHaveBeenCalled();
    });

    it('requireSignIn handles invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalidToken';
      const mockError = new Error('Invalid token');
      JWT.verify.mockImplementationOnce(() => {
        throw mockError;
      });

      await requireSignIn(mockReq, mockRes, mockNext);

      expect(JWT.verify).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockReq.user).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('isAdmin calls next for admin user', async () => {
      mockReq.user = { _id: '123' };
      const mockUser = { _id: '123', role: 1 };
      userModel.findById.mockResolvedValueOnce(mockUser);

      await isAdmin(mockReq, mockRes, mockNext);

      expect(userModel.findById).toHaveBeenCalledWith('123');
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('isAdmin returns 401 for non-admin user', async () => {
      mockReq.user = { _id: '123' };
      const mockUser = { _id: '123', role: 0 };
      userModel.findById.mockResolvedValueOnce(mockUser);

      await isAdmin(mockReq, mockRes, mockNext);

      expect(userModel.findById).toHaveBeenCalledWith('123');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: 'UnAuthorized Access'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('isAdmin handles errors (500)', async () => {
      mockReq.user = { _id: '123' };
      const mockError = new Error('Database error');
      userModel.findById.mockRejectedValueOnce(mockError);

      await isAdmin(mockReq, mockRes, mockNext);

      expect(userModel.findById).toHaveBeenCalledWith('123');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        error: mockError,
        message: 'Error in admin middleware'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
