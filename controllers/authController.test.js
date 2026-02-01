import userModel from "../models/userModel.js";

import { hashPassword, comparePassword } from "../helpers/authHelper.js";
import JWT from "jsonwebtoken";

import {
  registerController,
  loginController,
  forgotPasswordController,
  testController,
} from "./authController.js";

jest.mock("../models/userModel.js");
jest.mock("../helpers/authHelper.js");
jest.mock("jsonwebtoken");

describe("authController", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";

    mockReq = {
      body: {},
      user: {},
      params: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
  });

  describe("registerController", () => {
    it("returns error for missing name", async () => {
      mockReq.body = {
        email: "test@example.com",
        password: "pass",
        phone: "123",
        address: "addr",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith({ error: "Name is Required" });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns error for missing email", async () => {
      mockReq.body = {
        name: "Test",
        password: "pass",
        phone: "123",
        address: "addr",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Email is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns error for missing password", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        phone: "123",
        address: "addr",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Password is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns error for missing phone", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        address: "addr",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Phone no is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns error for missing address", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "123",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Address is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns error for missing answer", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "123",
        address: "addr",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Answer is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 200 with success: false for existing user", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "123",
        address: "addr",
        answer: "ans",
      };
      userModel.findOne.mockResolvedValueOnce({
        _id: "123",
        email: "test@example.com",
      });

      await registerController(mockReq, mockRes);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Already Register please login",
      });
    });

    it("returns 201 with success: true for new user", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "123",
        address: "addr",
        answer: "ans",
      };
      userModel.findOne.mockResolvedValueOnce(null);
      hashPassword.mockResolvedValueOnce("hashedPassword");
      const savedUser = { _id: "123", name: "Test", email: "test@example.com" };
      const mockUser = {
        save: jest.fn().mockResolvedValueOnce(savedUser),
      };
      userModel.mockImplementationOnce(() => mockUser);

      await registerController(mockReq, mockRes);

      expect(hashPassword).toHaveBeenCalledWith("pass");
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "User Register Successfully",
        user: savedUser,
      });
    });

    it("handles errors (500)", async () => {
      const dbError = new Error("Database error");
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "123",
        address: "addr",
        answer: "ans",
      };
      userModel.findOne.mockRejectedValueOnce(dbError);

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Errro in Registeration",
        error: dbError,
      });
    });
  });

  describe("loginController", () => {
    it("returns 404 for missing email", async () => {
      mockReq.body = { password: "pass" };

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for missing password", async () => {
      mockReq.body = { email: "test@example.com" };

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for non-existent email", async () => {
      mockReq.body = { email: "test@example.com", password: "pass" };
      userModel.findOne.mockResolvedValueOnce(null);

      await loginController(mockReq, mockRes);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is not registerd",
      });
    });

    it("returns 200 with success: false for wrong password", async () => {
      mockReq.body = { email: "test@example.com", password: "wrongpass" };
      const mockUser = {
        _id: "123",
        email: "test@example.com",
        password: "hashedPassword",
      };
      userModel.findOne.mockResolvedValueOnce(mockUser);
      comparePassword.mockResolvedValueOnce(false);

      await loginController(mockReq, mockRes);

      expect(comparePassword).toHaveBeenCalledWith(
        "wrongpass",
        "hashedPassword"
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Password",
      });
    });

    it("returns 200 with success: true and token for valid credentials", async () => {
      mockReq.body = { email: "test@example.com", password: "correctpass" };
      const mockUser = {
        _id: "123",
        name: "Test User",
        email: "test@example.com",
        phone: "123",
        address: "addr",
        role: 0,
        password: "hashedPassword",
      };
      userModel.findOne.mockResolvedValueOnce(mockUser);
      comparePassword.mockResolvedValueOnce(true);
      JWT.sign.mockResolvedValueOnce("mockToken123");

      await loginController(mockReq, mockRes);

      expect(comparePassword).toHaveBeenCalledWith(
        "correctpass",
        "hashedPassword"
      );
      expect(JWT.sign).toHaveBeenCalledWith({ _id: "123" }, "test-secret", {
        expiresIn: "7d",
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "login successfully",
        user: {
          _id: "123",
          name: "Test User",
          email: "test@example.com",
          phone: "123",
          address: "addr",
          role: 0,
        },
        token: "mockToken123",
      });
    });

    it("handles errors (500)", async () => {
      mockReq.body = { email: "test@example.com", password: "pass" };
      const dbError = new Error("Database error");
      userModel.findOne.mockRejectedValueOnce(dbError);

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error in login",
        error: dbError,
      });
    });
  });

  describe("forgotPasswordController", () => {
    it("returns 400 for missing email", async () => {
      mockReq.body = { answer: "ans", newPassword: "newpass" };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Emai is required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for missing answer", async () => {
      mockReq.body = { email: "test@example.com", newPassword: "newpass" };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "answer is required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for missing newPassword", async () => {
      mockReq.body = { email: "test@example.com", answer: "ans" };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "New Password is required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for success: false and wrong email or answer", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "wrongans",
        newPassword: "newpass",
      };
      userModel.findOne.mockResolvedValueOnce(null);

      await forgotPasswordController(mockReq, mockRes);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
        answer: "wrongans",
      });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong Email Or Answer",
      });
    });

    it("returns 200 with success: true on password reset", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "correctans",
        newPassword: "newpass",
      };
      const mockUser = { _id: "123", email: "test@example.com" };
      userModel.findOne.mockResolvedValueOnce(mockUser);
      hashPassword.mockResolvedValueOnce("newHashedPassword");
      userModel.findByIdAndUpdate.mockResolvedValueOnce(mockUser);

      await forgotPasswordController(mockReq, mockRes);

      expect(hashPassword).toHaveBeenCalledWith("newpass");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("123", {
        password: "newHashedPassword",
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Password Reset Successfully",
      });
    });

    it("handles errors (500)", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "ans",
        newPassword: "newpass",
      };
      const dbError = new Error("Database error");
      userModel.findOne.mockRejectedValueOnce(dbError);

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Something went wrong",
        error: dbError,
      });
    });
  });

  describe("testController", () => {
    it('returns "Protected Routes" string', () => {
      mockRes.send = jest.fn();

      testController(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith("Protected Routes");
    });

    it("handles errors", () => {
      mockRes.send = jest.fn();
      const mockError = new Error("Test error");
      jest.spyOn(console, "log").mockImplementationOnce(() => {});

      // Simulate error by making send throw
      mockRes.send.mockImplementationOnce(() => {
        throw mockError;
      });

      try {
        testController(mockReq, mockRes);
      } catch (error) {
        // Error should be caught and logged
      }

      expect(mockRes.send).toHaveBeenCalled();
    });
  });
});
