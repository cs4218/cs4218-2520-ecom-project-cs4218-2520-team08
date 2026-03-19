import { connect, closeDatabase, clearDatabase } from "./helpers/testDb.js";
import userModel from "../../models/userModel.js";
import {
  registerController,
  loginController,
  forgotPasswordController,
} from "../../controllers/authController.js";
import { requireSignIn, isAdmin } from "../../middlewares/authMiddleware.js";
import { hashPassword } from "../../helpers/authHelper.js";
import JWT from "jsonwebtoken";

const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  headers: {},
  user: null,
  ...overrides,
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const validUser = {
  name: "Test User",
  email: "test@example.com",
  password: "securepassword123",
  phone: "12345678",
  address: "123 Test Street",
  DOB: "1990-01-01",
  answer: "mypet",
};

beforeAll(async () => {
  await connect();
  process.env.JWT_SECRET = "test-integration-secret";
});

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(async () => {
  await clearDatabase();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await closeDatabase();
});

// Tsui Yi Wern, A0266070J
describe("Backend Integration: Auth Controller", () => {
  describe("User registration with real DB", () => {
    it("creates a user document in MongoDB with a bcrypt-hashed password", async () => {
      const req = makeReq({ body: validUser });
      const res = makeRes();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const body = res.send.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.user.name).toBe(validUser.name);
      expect(body.user.email).toBe(validUser.email.toLowerCase());

      expect(body.user.password).not.toBe(validUser.password);
      expect(body.user.password).toMatch(/^\$2b\$/);

      const dbUser = await userModel.findOne({ email: validUser.email.toLowerCase() });
      expect(dbUser).not.toBeNull();
      expect(dbUser.name).toBe(validUser.name);
      expect(dbUser.password).not.toBe(validUser.password);
      expect(dbUser.password).toMatch(/^\$2b\$/);
    });

    it("stores email in lowercase regardless of input casing", async () => {
      const req = makeReq({ body: { ...validUser, email: "TEST@EXAMPLE.COM" } });
      const res = makeRes();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const dbUser = await userModel.findOne({ email: "test@example.com" });
      expect(dbUser).not.toBeNull();
      expect(dbUser.email).toBe("test@example.com");
    });
  });


  describe("Registration input validation", () => {
    it("rejects registration with invalid email format and does not write to DB", async () => {
      const req = makeReq({ body: { ...validUser, email: "not-an-email" } });
      const res = makeRes();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = res.send.mock.calls[0][0];
      expect(body.message).toBe("Please enter a valid email address");
      expect(await userModel.countDocuments({})).toBe(0);
    });

    it("rejects registration with non-digit phone number and does not write to DB", async () => {
      const req = makeReq({ body: { ...validUser, phone: "abc-defg" } });
      const res = makeRes();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = res.send.mock.calls[0][0];
      expect(body.message).toBe("Phone number must contain only digits");
      expect(await userModel.countDocuments({})).toBe(0);
    });

    it("rejects registration with XSS payload in name and does not write to DB", async () => {
      const req = makeReq({ body: { ...validUser, name: '<script>alert("xss")</script>' } });
      const res = makeRes();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = res.send.mock.calls[0][0];
      expect(body.message).toBe("Invalid characters detected");
      expect(await userModel.countDocuments({})).toBe(0);
    });

    it("rejects registration with a future date of birth and does not write to DB", async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDOB = futureDate.toISOString().split("T")[0];

      const req = makeReq({ body: { ...validUser, DOB: futureDOB } });
      const res = makeRes();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = res.send.mock.calls[0][0];
      expect(body.message).toBe("Date of birth cannot be in the future");
      expect(await userModel.countDocuments({})).toBe(0);
    });
  });

  // Tsui Yi Wern, A0266070J
  describe("User login and JWT validation", () => {
    it("finds the user, verifies password via bcrypt, and returns a valid decodable JWT", async () => {
      await registerController(makeReq({ body: validUser }), makeRes());

      const loginReq = makeReq({ body: { email: validUser.email, password: validUser.password } });
      const loginRes = makeRes();
      await loginController(loginReq, loginRes);

      expect(loginRes.status).toHaveBeenCalledWith(200);
      const body = loginRes.send.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.token).toBeDefined();
      expect(body.user.email).toBe(validUser.email.toLowerCase());

      const decoded = JWT.verify(body.token, process.env.JWT_SECRET);
      expect(decoded._id).toBeDefined();
      const dbUser = await userModel.findOne({ email: validUser.email.toLowerCase() });
      expect(decoded._id.toString()).toBe(dbUser._id.toString());
    });

    it("rejects login with wrong password and returns success: false", async () => {
      await registerController(makeReq({ body: validUser }), makeRes());

      const loginRes = makeRes();
      await loginController(
        makeReq({ body: { email: validUser.email, password: "wrongpassword" } }),
        loginRes
      );

      const body = loginRes.send.mock.calls[0][0];
      expect(body.success).toBe(false);
      expect(body.message).toBe("Invalid Password");
    });

    it("rejects login for an unregistered email", async () => {
      const loginRes = makeRes();
      await loginController(
        makeReq({ body: { email: "unknown@example.com", password: "anypass" } }),
        loginRes
      );

      const body = loginRes.send.mock.calls[0][0];
      expect(body.success).toBe(false);
      expect(body.message).toBe("Email is not registerd");
    });
  });

// Tsui Yi Wern, A0266070J
  describe("Register to login end-to-end flow", () => {
    it("JWT from login contains the same user ID as the registered document", async () => {
      const regRes = makeRes();
      await registerController(makeReq({ body: validUser }), regRes);
      const registeredUser = regRes.send.mock.calls[0][0].user;

      const loginRes = makeRes();
      await loginController(
        makeReq({ body: { email: validUser.email, password: validUser.password } }),
        loginRes
      );

      const { success, user, token } = loginRes.send.mock.calls[0][0];
      expect(success).toBe(true);
      expect(user.name).toBe(validUser.name);
      expect(user.email).toBe(validUser.email.toLowerCase());

      const decoded = JWT.verify(token, process.env.JWT_SECRET);
      expect(decoded._id.toString()).toBe(registeredUser._id.toString());
    });

    it("login with case-variant email succeeds after registering with lowercase email", async () => {
      await registerController(makeReq({ body: validUser }), makeRes());

      const loginRes = makeRes();
      await loginController(
        makeReq({ body: { email: "TEST@EXAMPLE.COM", password: validUser.password } }),
        loginRes
      );

      const body = loginRes.send.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.user.email).toBe("test@example.com");
    });
  });

  // Tsui Yi Wern, A0266070J
  describe("Forgot password and reset flow", () => {
    it("resets password so new password works and old password no longer works", async () => {
      await registerController(makeReq({ body: validUser }), makeRes());

      const forgotRes = makeRes();
      await forgotPasswordController(
        makeReq({ body: { email: validUser.email, answer: validUser.answer, newPassword: "newpassword456" } }),
        forgotRes
      );

      const forgotBody = forgotRes.send.mock.calls[0][0];
      expect(forgotBody.success).toBe(true);
      expect(forgotBody.message).toBe("Password Reset Successfully");

      const newLoginRes = makeRes();
      await loginController(
        makeReq({ body: { email: validUser.email, password: "newpassword456" } }),
        newLoginRes
      );
      expect(newLoginRes.send.mock.calls[0][0].success).toBe(true);

      const oldLoginRes = makeRes();
      await loginController(
        makeReq({ body: { email: validUser.email, password: validUser.password } }),
        oldLoginRes
      );
      expect(oldLoginRes.send.mock.calls[0][0].success).toBe(false);
    });

    it("rejects forgot password with wrong security answer", async () => {
      await registerController(makeReq({ body: validUser }), makeRes());

      const forgotRes = makeRes();
      await forgotPasswordController(
        makeReq({ body: { email: validUser.email, answer: "wronganswer", newPassword: "newpassword456" } }),
        forgotRes
      );

      expect(forgotRes.status).toHaveBeenCalledWith(400);
      const body = forgotRes.send.mock.calls[0][0];
      expect(body.success).toBe(false);
      expect(body.message).toBe("Wrong Email Or Answer");
    });

    it("rejects forgot password for a non-existent email", async () => {
      const forgotRes = makeRes();
      await forgotPasswordController(
        makeReq({ body: { email: "nobody@example.com", answer: "anything", newPassword: "newpass123" } }),
        forgotRes
      );

      expect(forgotRes.status).toHaveBeenCalledWith(400);
      const body = forgotRes.send.mock.calls[0][0];
      expect(body.success).toBe(false);
      expect(body.message).toBe("Wrong Email Or Answer");
    });

    it("resets password and stores new bcrypt hash in DB", async () => {
      await registerController(makeReq({ body: validUser }), makeRes());
      const before = await userModel.findOne({ email: validUser.email.toLowerCase() });
      const oldHash = before.password;

      await forgotPasswordController(
        makeReq({ body: { email: validUser.email, answer: validUser.answer, newPassword: "brandnewpass" } }),
        makeRes()
      );

      const after = await userModel.findOne({ email: validUser.email.toLowerCase() });
      expect(after.password).not.toBe(oldHash);
      expect(after.password).toMatch(/^\$2b\$/);
      expect(after.password).not.toBe("brandnewpass");
    });
  });

  // Tsui Yi Wern, A0266070J
  describe("Auth middleware access control", () => {
    it("grants access to admin user — req.user is set and isAdmin calls next", async () => {
      const hashedPw = await hashPassword("adminpass");
      const adminUser = await userModel.create({
        ...validUser,
        email: "admin@example.com",
        password: hashedPw,
        role: 1,
      });

      const token = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

      const req = makeReq({ headers: { authorization: token } });
      const res = makeRes();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(adminUser._id.toString());
      expect(next).toHaveBeenCalledTimes(1);

      const adminNext = jest.fn();
      await isAdmin(req, res, adminNext);

      expect(adminNext).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("rejects isAdmin for a non-admin user (role 0) with 401", async () => {
      const hashedPw = await hashPassword("userpass");
      const normalUser = await userModel.create({
        ...validUser,
        email: "user@example.com",
        password: hashedPw,
        role: 0,
      });

      const req = makeReq({ user: { _id: normalUser._id } });
      const res = makeRes();
      const next = jest.fn();

      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
      const body = res.send.mock.calls[0][0];
      expect(body.success).toBe(false);
      expect(body.message).toBe("UnAuthorized Access");
    });

    it("requireSignIn does not call next for an invalid/expired token", async () => {
      const req = makeReq({ headers: { authorization: "invalid.token.string" } });
      const res = makeRes();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(req.user).toBeNull();
    });

    it("requireSignIn does not call next when authorization header is missing", async () => {
      const req = makeReq({ headers: {} });
      const res = makeRes();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(req.user).toBeNull();
    });
  });

  // Tsui Yi Wern, A0266070J
  describe("Duplicate email registration prevention", () => {
    it("rejects second registration with same email and no duplicate document in DB", async () => {
      await registerController(makeReq({ body: validUser }), makeRes());

      const dupRes = makeRes();
      await registerController(
        makeReq({ body: { ...validUser, name: "Another User" } }),
        dupRes
      );

      const body = dupRes.send.mock.calls[0][0];
      expect(body.success).toBe(false);
      expect(body.message).toBe("Already Register please login");

      const count = await userModel.countDocuments({ email: validUser.email.toLowerCase() });
      expect(count).toBe(1);
    });

    it("treats duplicate email check as case-insensitive", async () => {
      await registerController(makeReq({ body: validUser }), makeRes());

      const dupRes = makeRes();
      await registerController(
        makeReq({ body: { ...validUser, email: "TEST@EXAMPLE.COM", name: "Another" } }),
        dupRes
      );

      const body = dupRes.send.mock.calls[0][0];
      expect(body.success).toBe(false);
      const count = await userModel.countDocuments({});
      expect(count).toBe(1);
    });
  });
});