import { jest } from "@jest/globals";

// ---- Mocks must be defined before importing the controller module ----
const mockUserModel = jest.fn(function User(doc) {
  Object.assign(this, doc);
  this.save = jest.fn().mockResolvedValue(this);
});
mockUserModel.findOne = jest.fn();
mockUserModel.findById = jest.fn();
mockUserModel.findByIdAndUpdate = jest.fn();

const mockOrderModel = {
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const mockHashPassword = jest.fn();
const mockComparePassword = jest.fn();
const mockJWTSign = jest.fn();

jest.mock("../models/userModel.js", () => ({
  __esModule: true,
  default: mockUserModel,
}));

jest.mock("../models/orderModel.js", () => ({
  __esModule: true,
  default: mockOrderModel,
}));

jest.mock("./../helpers/authHelper.js", () => ({
  __esModule: true,
  comparePassword: mockComparePassword,
  hashPassword: mockHashPassword,
}));

jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  default: {
    sign: mockJWTSign,
  },
}));

let controllers;
beforeAll(async () => {
  controllers = await import("./authController.js");
});

function createRes() {
  return {
    status: jest.fn(function status() {
      return this;
    }),
    send: jest.fn(),
    json: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = "test-secret";
});

describe("authController", () => {

  describe("updateProfileController", () => {
    it("returns early with res.json error when password is shorter than 6 characters", async () => {
      // Arrange
      mockUserModel.findById.mockResolvedValueOnce({
        name: "Existing",
        password: "existingPw",
        phone: "111",
        address: "Addr",
      });
      const req = {
        body: { password: "123" },
        user: { _id: "u1" },
      };
      const res = createRes();

      // Act
      await controllers.updateProfileController(req, res);

      // Assert
      expect(mockUserModel.findById).toHaveBeenCalledWith("u1");
      expect(res.json).toHaveBeenCalledWith({
        error: "Passsword is required and 6 character long",
      });
      expect(mockHashPassword).not.toHaveBeenCalled();
      expect(mockUserModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("updates profile using existing values when optional fields are missing and password is not provided", async () => {
      // Arrange
      const existingUser = {
        name: "Existing",
        password: "existingPw",
        phone: "111",
        address: "Addr",
      };
      const updatedUser = { ...existingUser, _id: "u1" };
      mockUserModel.findById.mockResolvedValueOnce(existingUser);
      mockUserModel.findByIdAndUpdate.mockResolvedValueOnce(updatedUser);
      const req = {
        body: {},
        user: { _id: "u1" },
      };
      const res = createRes();

      // Act
      await controllers.updateProfileController(req, res);

      // Assert
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "u1",
        {
          name: "Existing",
          password: "existingPw",
          phone: "111",
          address: "Addr",
        },
        { new: true }
      );
      expect(mockHashPassword).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile Updated SUccessfully",
        updatedUser,
      });
    });

    it("hashes password and updates provided fields when valid password is supplied", async () => {
      // Arrange
      mockUserModel.findById.mockResolvedValueOnce({
        name: "Existing",
        password: "existingPw",
        phone: "111",
        address: "Addr",
      });
      mockHashPassword.mockResolvedValueOnce("hashedPw");
      const updatedUser = {
        _id: "u1",
        name: "New Name",
        password: "hashedPw",
        phone: "999",
        address: "New Address",
      };
      mockUserModel.findByIdAndUpdate.mockResolvedValueOnce(updatedUser);
      const req = {
        body: {
          name: "New Name",
          email: "ignored@example.com",
          password: "123456",
          phone: "999",
          address: "New Address",
        },
        user: { _id: "u1" },
      };
      const res = createRes();

      // Act
      await controllers.updateProfileController(req, res);

      // Assert
      expect(mockHashPassword).toHaveBeenCalledWith("123456");
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "u1",
        {
          name: "New Name",
          password: "hashedPw",
          phone: "999",
          address: "New Address",
        },
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile Updated SUccessfully",
        updatedUser,
      });
    });

    it("returns 400 when an error is thrown while updating profile", async () => {
      // Arrange
      const err = new Error("db down");
      mockUserModel.findById.mockRejectedValueOnce(err);
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const req = {
        body: { name: "N" },
        user: { _id: "u1" },
      };
      const res = createRes();

      // Act
      await controllers.updateProfileController(req, res);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(err);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error WHile Update profile",
        error: err,
      });
      logSpy.mockRestore();
    });
  });

  describe("getOrdersController", () => {
    it("returns orders for the authenticated buyer and calls populate twice", async () => {
      // Arrange
      const orders = [{ _id: "o1" }, { _id: "o2" }];
      const query = { populate: jest.fn() };
      mockOrderModel.find.mockReturnValueOnce(query);
      query.populate
        .mockImplementationOnce(() => query) // populate products
        .mockImplementationOnce(() => Promise.resolve(orders)); // populate buyer + resolve query

      const req = { user: { _id: "u1" } };
      const res = createRes();

      // Act
      await controllers.getOrdersController(req, res);

      // Assert
      expect(mockOrderModel.find).toHaveBeenCalledWith({ buyer: "u1" });
      expect(query.populate).toHaveBeenNthCalledWith(1, "products", "-photo");
      expect(query.populate).toHaveBeenNthCalledWith(2, "buyer", "name");
      expect(res.json).toHaveBeenCalledWith(orders);
    });

    it("returns 500 when an error occurs while fetching orders", async () => {
      // Arrange
      const err = new Error("query failed");
      mockOrderModel.find.mockImplementationOnce(() => {
        throw err;
      });
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const req = { user: { _id: "u1" } };
      const res = createRes();

      // Act
      await controllers.getOrdersController(req, res);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(err);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error WHile Geting Orders",
        error: err,
      });
      logSpy.mockRestore();
    });
  });

  describe("getAllOrdersController", () => {
    it("returns all orders and sorts by createdAt descending", async () => {
      // Arrange
      const orders = [{ _id: "o1" }];
      const query = { populate: jest.fn(), sort: jest.fn() };
      mockOrderModel.find.mockReturnValueOnce(query);
      query.populate.mockImplementationOnce(() => query).mockImplementationOnce(() => query);
      query.sort.mockResolvedValueOnce(orders);
      const req = {};
      const res = createRes();

      // Act
      await controllers.getAllOrdersController(req, res);

      // Assert
      expect(mockOrderModel.find).toHaveBeenCalledWith({});
      expect(query.populate).toHaveBeenNthCalledWith(1, "products", "-photo");
      expect(query.populate).toHaveBeenNthCalledWith(2, "buyer", "name");
      expect(query.sort).toHaveBeenCalledWith({ createdAt: "-1" });
      expect(res.json).toHaveBeenCalledWith(orders);
    });

    it("returns 500 when an error occurs while fetching all orders", async () => {
      // Arrange
      const err = new Error("sort failed");
      const query = { populate: jest.fn(), sort: jest.fn() };
      mockOrderModel.find.mockReturnValueOnce(query);
      query.populate.mockImplementationOnce(() => query).mockImplementationOnce(() => query);
      query.sort.mockRejectedValueOnce(err);
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const req = {};
      const res = createRes();

      // Act
      await controllers.getAllOrdersController(req, res);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(err);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error WHile Geting Orders",
        error: err,
      });
      logSpy.mockRestore();
    });
  });

  describe("orderStatusController", () => {
    it("updates order status by orderId and returns updated order", async () => {
      // Arrange
      const updatedOrder = { _id: "o1", status: "Shipped" };
      mockOrderModel.findByIdAndUpdate.mockResolvedValueOnce(updatedOrder);
      const req = { params: { orderId: "o1" }, body: { status: "Shipped" } };
      const res = createRes();

      // Act
      await controllers.orderStatusController(req, res);

      // Assert
      expect(mockOrderModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "o1",
        { status: "Shipped" },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedOrder);
    });

    it("returns 500 when an error occurs while updating order status", async () => {
      // Arrange
      const err = new Error("update failed");
      mockOrderModel.findByIdAndUpdate.mockRejectedValueOnce(err);
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const req = { params: { orderId: "o1" }, body: { status: "cancel" } };
      const res = createRes();

      // Act
      await controllers.orderStatusController(req, res);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(err);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error While Updateing Order",
        error: err,
      });
      logSpy.mockRestore();
    });
  });
});

