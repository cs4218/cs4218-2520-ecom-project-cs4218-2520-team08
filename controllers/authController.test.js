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
    jest.spyOn(console, "log").mockImplementation(() => {});
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
    it("returns 404 for missing name", async () => {
      mockReq.body = {
        email: "test@example.com",
        password: "pass",
        phone: "123",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Name is Required" });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for missing email", async () => {
      mockReq.body = {
        name: "Test",
        password: "pass",
        phone: "123",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Email is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for missing password", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        phone: "123",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Password is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for missing phone", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Phone no is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for missing address", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "123",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Address is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for missing DOB", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "DOB is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for missing answer", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "123",
        address: "addr",
        DOB: "2000-01-01",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
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
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
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
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
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
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
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

    it("returns 404 for empty string name", async () => {
      mockReq.body = {
        name: "",
        email: "test@example.com",
        password: "pass",
        phone: "123",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Name is Required" });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for empty string email", async () => {
      mockReq.body = {
        name: "Test",
        email: "",
        password: "pass",
        phone: "123",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Email is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for empty string password", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "",
        phone: "123",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Password is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for empty string phone", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Phone no is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for empty string address", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Address is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for empty string DOB", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "DOB is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for empty string answer", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Answer is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for whitespace-only name", async () => {
      mockReq.body = {
        name: "   ",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Name cannot be whitespace only",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for whitespace-only email", async () => {
      mockReq.body = {
        name: "Test",
        email: "   ",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Email cannot be whitespace only",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for whitespace-only password", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "   ",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Password cannot be whitespace only",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for whitespace-only phone", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "   ",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Phone no cannot be whitespace only",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for whitespace-only address", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "   ",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Address cannot be whitespace only",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for whitespace-only DOB", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "   ",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "DOB cannot be whitespace only",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for whitespace-only answer", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "   ",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Answer cannot be whitespace only",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for null name", async () => {
      mockReq.body = {
        name: null,
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Name is Required" });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for null email", async () => {
      mockReq.body = {
        name: "Test",
        email: null,
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Email is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for null password", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: null,
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Password is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for null phone", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: null,
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Phone no is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for null address", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: null,
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Address is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for null DOB", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: null,
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "DOB is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for null answer", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: null,
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Answer is Required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid email format", async () => {
      mockReq.body = {
        name: "Test",
        email: "not-an-email",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Please enter a valid email address",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for email too long", async () => {
      const longEmail = "a".repeat(255) + "@example.com";
      mockReq.body = {
        name: "Test",
        email: longEmail,
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Email is too long",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks invalid phone number - non-numeric", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "abc-def-ghij",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Phone number must contain only digits",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks invalid phone number - too short", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "123",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Phone number must be 7-15 digits",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks invalid phone number - too long", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "12345678901234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Phone number must be 7-15 digits",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid DOB format", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "01-01-2000",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Please enter a valid date of birth (YYYY-MM-DD)",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid DOB date", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2024-02-31",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Please enter a valid date of birth",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 when DOB string parses to invalid date", async () => {
      const OriginalDate = global.Date;
      global.Date = class extends OriginalDate {
        constructor(...args) {
          super(...args);
          if (args[0] === "2024-02-30") {
            this.getTime = () => NaN;
          }
        }
      };
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2024-02-30",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Please enter a valid date of birth",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
      global.Date = OriginalDate;
    });

    it("returns 400 for DOB in the future", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const futureDOB = tomorrow.toISOString().split("T")[0];

      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: futureDOB,
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Date of birth cannot be in the future",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks very long name string", async () => {
      const longName = "a".repeat(10000);
      mockReq.body = {
        name: longName,
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Name is too long (max 100 characters)",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks very long address string", async () => {
      const longAddress = "a".repeat(10000);
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: longAddress,
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Address is too long (max 500 characters)",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("handles unicode characters in name", async () => {
      mockReq.body = {
        name: "José García",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedPassword");
      const savedUser = {
        _id: "123",
        name: "José García",
        email: "test@example.com",
      };
      const mockUser = {
        save: jest.fn().mockResolvedValue(savedUser),
      };
      userModel.mockImplementation(() => mockUser);

      await registerController(mockReq, mockRes);

      expect(mockUser.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it("blocks XSS payload in name field", async () => {
      const xssPayload = '<script>alert("xss")</script>';
      mockReq.body = {
        name: xssPayload,
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      // Server-side validation should block XSS
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks SQL injection pattern in name field", async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      mockReq.body = {
        name: sqlInjection,
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      // Server-side validation should block SQL injection
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("handles case-different email for duplicate registration", async () => {
      mockReq.body = {
        name: "Test",
        email: "Test@Example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };
      userModel.findOne.mockResolvedValue({
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

    it("blocks XSS payload in email field", async () => {
      mockReq.body = {
        name: "Test",
        email: "user<script>@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks SQL injection pattern in email field", async () => {
      mockReq.body = {
        name: "Test",
        email: "a'OR'1'='1@x.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks XSS payload in password field", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: '<script>alert("xss")</script>',
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks SQL injection pattern in password field", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "'; DROP TABLE users; --",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks XSS payload in address field", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "<img src=x onerror=alert(1)>",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks SQL injection pattern in address field", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "'; DROP TABLE users; --",
        DOB: "2000-01-01",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks XSS payload in DOB field", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: '<script>alert("xss")</script>',
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks SQL injection pattern in DOB field", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "'; DROP TABLE users; --",
        answer: "ans",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks XSS payload in answer field", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: '<script>alert("xss")</script>',
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("blocks SQL injection pattern in answer field", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "'; DROP TABLE users; --",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("handles hashPassword throwing (500)", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };
      userModel.findOne.mockResolvedValue(null);
      const hashError = new Error("Hash failed");
      hashPassword.mockRejectedValue(hashError);

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Errro in Registeration",
        error: hashError,
      });
    });

    it("handles user save throwing (500)", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedPassword");
      const saveError = new Error("Save failed");
      const mockUser = {
        save: jest.fn().mockRejectedValue(saveError),
      };
      userModel.mockImplementation(() => mockUser);

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Errro in Registeration",
        error: saveError,
      });
    });

    it("success response includes user with expected fields", async () => {
      mockReq.body = {
        name: "Test",
        email: "test@example.com",
        password: "pass",
        phone: "1234567890",
        address: "addr",
        DOB: "2000-01-01",
        answer: "ans",
      };
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedPassword");
      const savedUser = {
        _id: "123",
        name: "Test",
        email: "test@example.com",
      };
      const mockUser = {
        save: jest.fn().mockResolvedValue(savedUser),
      };
      userModel.mockImplementation(() => mockUser);

      await registerController(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User Register Successfully",
          user: expect.objectContaining({
            _id: "123",
            name: "Test",
            email: "test@example.com",
          }),
        }),
      );
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
      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(false);

      await loginController(mockReq, mockRes);

      expect(comparePassword).toHaveBeenCalledWith(
        "wrongpass",
        "hashedPassword",
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
      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockResolvedValue("mockToken123");

      await loginController(mockReq, mockRes);

      expect(comparePassword).toHaveBeenCalledWith(
        "correctpass",
        "hashedPassword",
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
      userModel.findOne.mockRejectedValue(dbError);

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error in login",
        error: dbError,
      });
    });

    it("returns 404 for empty string email", async () => {
      mockReq.body = { email: "", password: "pass" };

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for empty string password", async () => {
      mockReq.body = { email: "test@example.com", password: "" };

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for whitespace-only email", async () => {
      mockReq.body = { email: "   ", password: "pass" };

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email and password cannot be whitespace only",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for whitespace-only password", async () => {
      mockReq.body = { email: "test@example.com", password: "   " };

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email and password cannot be whitespace only",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for null email", async () => {
      mockReq.body = { email: null, password: "pass" };

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("returns 404 for null password", async () => {
      mockReq.body = { email: "test@example.com", password: null };

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("returns 400 for invalid email format", async () => {
      mockReq.body = { email: "not-an-email", password: "pass" };

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Please enter a valid email address",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for email too long", async () => {
      const longEmail = "a".repeat(255) + "@example.com";
      mockReq.body = { email: longEmail, password: "pass" };

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is too long",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("handles case sensitivity for email lookup", async () => {
      mockReq.body = { email: "Test@Example.com", password: "pass" };
      userModel.findOne.mockResolvedValue(null);

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

    it("handles comparePassword throwing (500)", async () => {
      mockReq.body = { email: "test@example.com", password: "pass" };
      const mockUser = {
        _id: "123",
        email: "test@example.com",
        password: "hashedPassword",
      };
      userModel.findOne.mockResolvedValue(mockUser);
      const compareError = new Error("Compare failed");
      comparePassword.mockRejectedValue(compareError);

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error in login",
        error: compareError,
      });
    });

    it("handles JWT.sign throwing (500)", async () => {
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
      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      const jwtError = new Error("JWT sign failed");
      JWT.sign.mockRejectedValue(jwtError);

      await loginController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error in login",
        error: jwtError,
      });
    });

    it("success response user object does not include password", async () => {
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
      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockResolvedValue("mockToken123");

      await loginController(mockReq, mockRes);

      const sentPayload = mockRes.send.mock.calls[0][0];
      expect(sentPayload.user).toEqual({
        _id: "123",
        name: "Test User",
        email: "test@example.com",
        phone: "123",
        address: "addr",
        role: 0,
      });
      expect(sentPayload.user).not.toHaveProperty("password");
      expect(sentPayload.token).toBe("mockToken123");
    });
  });

  describe("forgotPasswordController", () => {
    it("returns 404 for missing email", async () => {
      mockReq.body = { answer: "ans", newPassword: "newpass" };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Email is required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for missing answer", async () => {
      mockReq.body = { email: "test@example.com", newPassword: "newpass" };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Answer is required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for missing newPassword", async () => {
      mockReq.body = { email: "test@example.com", answer: "ans" };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "New Password is required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 when email is not found", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "ans",
        newPassword: "newpass",
      };
      userModel.findOne.mockResolvedValue(null);

      await forgotPasswordController(mockReq, mockRes);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong Email Or Answer",
      });
    });

    it("returns 404 when answer does not match", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "wrongans",
        newPassword: "newpass",
      };
      const mockUser = {
        _id: "123",
        email: "test@example.com",
        answer: "correctans",
      };
      userModel.findOne.mockResolvedValue(mockUser);

      await forgotPasswordController(mockReq, mockRes);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
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
      const mockUser = {
        _id: "123",
        email: "test@example.com",
        answer: "correctans",
      };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("newHashedPassword");
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);

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
      userModel.findOne.mockRejectedValue(dbError);

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Something went wrong",
        error: dbError,
      });
    });

    it("returns 404 for empty string email", async () => {
      mockReq.body = { email: "", answer: "ans", newPassword: "newpass" };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Email is required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for empty string answer", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "",
        newPassword: "newpass",
      };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Answer is required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for empty string newPassword", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "ans",
        newPassword: "",
      };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "New Password is required",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for whitespace-only email", async () => {
      mockReq.body = { email: "   ", answer: "ans", newPassword: "newpass" };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Email cannot be whitespace only",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for whitespace-only answer", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "   ",
        newPassword: "newpass",
      };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Answer cannot be whitespace only",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for whitespace-only newPassword", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "ans",
        newPassword: "   ",
      };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "New Password cannot be whitespace only",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 404 for null email", async () => {
      mockReq.body = { email: null, answer: "ans", newPassword: "newpass" };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Email is required",
      });
    });

    it("returns 404 for null answer", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: null,
        newPassword: "newpass",
      };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Answer is required",
      });
    });

    it("returns 400 for invalid email format", async () => {
      mockReq.body = {
        email: "not-an-email",
        answer: "ans",
        newPassword: "newpass",
      };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Please enter a valid email address",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for XSS payload in email", async () => {
      mockReq.body = {
        email: "user<script>@example.com",
        answer: "ans",
        newPassword: "newpass",
      };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for XSS payload in answer", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: '<script>alert("xss")</script>',
        newPassword: "newpass",
      };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for XSS payload in newPassword", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "ans",
        newPassword: '<script>alert("xss")</script>',
      };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for SQL injection pattern in email", async () => {
      mockReq.body = {
        email: "'; DROP TABLE users; --@example.com",
        answer: "ans",
        newPassword: "newpass",
      };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for SQL injection pattern in answer", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "'; DROP TABLE users; --",
        newPassword: "newpass",
      };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 for SQL injection pattern in newPassword", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "ans",
        newPassword: "'; DROP TABLE users; --",
      };

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Invalid characters detected",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it("succeeds when email is different case (case-insensitive)", async () => {
      mockReq.body = {
        email: "Test@Example.com",
        answer: "ans",
        newPassword: "newpass",
      };
      const mockUser = { _id: "123", email: "test@example.com", answer: "ans" };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("newHashedPassword");
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await forgotPasswordController(mockReq, mockRes);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Password Reset Successfully",
      });
    });

    it("succeeds when answer is different case (case-insensitive)", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "Football",
        newPassword: "newpass",
      };
      const mockUser = {
        _id: "123",
        email: "test@example.com",
        answer: "football",
      };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("newHashedPassword");
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await forgotPasswordController(mockReq, mockRes);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(hashPassword).toHaveBeenCalledWith("newpass");
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Password Reset Successfully",
      });
    });

    it("handles hashPassword throwing (500)", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "ans",
        newPassword: "newpass",
      };
      const mockUser = { _id: "123", email: "test@example.com", answer: "ans" };
      userModel.findOne.mockResolvedValue(mockUser);
      const hashError = new Error("Hash failed");
      hashPassword.mockRejectedValue(hashError);

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Something went wrong",
        error: hashError,
      });
    });

    it("handles findByIdAndUpdate throwing (500)", async () => {
      mockReq.body = {
        email: "test@example.com",
        answer: "ans",
        newPassword: "newpass",
      };
      const mockUser = { _id: "123", email: "test@example.com", answer: "ans" };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("newHashedPassword");
      const updateError = new Error("Update failed");
      userModel.findByIdAndUpdate.mockRejectedValue(updateError);

      await forgotPasswordController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Something went wrong",
        error: updateError,
      });
    });
  });

  describe("testController", () => {
    it('returns "Protected Routes" string', () => {
      mockRes.send = jest.fn();

      testController(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith("Protected Routes");
      expect(mockRes.send).toHaveBeenCalledTimes(1);
    });

    it("does not call res.status on success", () => {
      mockRes.send = jest.fn();

      testController(mockReq, mockRes);

      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("when res.send throws, catch sends { error }", () => {
      mockRes.send = jest.fn();
      const mockError = new Error("Test error");

      mockRes.send
        .mockImplementationOnce(() => {
          throw mockError;
        })
        .mockImplementationOnce(() => {});

      testController(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledTimes(2);
      expect(mockRes.send).toHaveBeenNthCalledWith(1, "Protected Routes");
      expect(mockRes.send).toHaveBeenNthCalledWith(2, { error: mockError });
    });

    it("handles errors", () => {
      mockRes.send = jest.fn();
      const mockError = new Error("Test error");

      mockRes.send.mockImplementationOnce(() => {
        throw mockError;
      });

      expect(() => testController(mockReq, mockRes)).not.toThrow();
      expect(mockRes.send).toHaveBeenCalled();
    });
  });
});
