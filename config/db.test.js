import mongoose from "mongoose";
import connectDB from "./db.js";

// Mock mongoose module
jest.mock("mongoose", () => ({
  connect: jest.fn(),
}));

describe("connectDB", () => {
  let consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on console.log to verify logging behavior
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    // Set MONGO_URL to a test URL
    process.env.MONGO_URL = "mongodb://test-host:27017/mydb";
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  // Success Case Tests
  describe("Successful Connection", () => {
    it("should connect successfully and log connection host", async () => {
      const mockConnection = {
        connection: {
          host: "test-url",
        },
      };

      mongoose.connect.mockResolvedValue(mockConnection);

      await connectDB();

      expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URL);
      expect(mongoose.connect).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      // Verify the log contains the host
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("test-url")
      );
    });

    it("should use MONGO_URL environment variable", async () => {
      const testUrl = "mongodb://test-host:27017/mydb";
      process.env.MONGO_URL = testUrl;

      const mockConnection = {
        connection: {
          host: "test-host",
        },
      };

      mongoose.connect.mockResolvedValue(mockConnection);

      await connectDB();

      expect(mongoose.connect).toHaveBeenCalledWith(testUrl);
    });

    it("should log success message with correct format", async () => {
      const mockConnection = {
        connection: {
          host: "example.com",
        },
      };

      mongoose.connect.mockResolvedValue(mockConnection);

      await connectDB();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Connected To Mongodb Database")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("example.com")
      );
    });
  });

  // Error Case Tests
  describe("Error Handling", () => {
    it("should log error message when connection fails", async () => {
      const error = new Error("Connection failed: ECONNREFUSED");
      mongoose.connect.mockRejectedValue(error);

      await connectDB();

      expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URL);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error in Mongodb")
      );
    });

    it("should log error message with error details", async () => {
      const error = new Error("Authentication failed");
      mongoose.connect.mockRejectedValue(error);

      await connectDB();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error in Mongodb")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Authentication failed")
      );
    });

    it("should handle network timeout errors", async () => {
      const timeoutError = new Error("MongoNetworkTimeoutError: connection timed out");
      mongoose.connect.mockRejectedValue(timeoutError);

      await connectDB();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error in Mongodb")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("connection timed out")
      );
    });

    it("should handle invalid connection string errors", async () => {
      const invalidError = new Error("Invalid connection string");
      mongoose.connect.mockRejectedValue(invalidError);

      await connectDB();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error in Mongodb")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid connection string")
      );
    });
  });

  // Function Behavior Tests
  describe("Function Behavior", () => {
    it("should be an async function", () => {
      expect(connectDB).toBeInstanceOf(Function);
      // Verify it returns a Promise
      mongoose.connect.mockResolvedValue({ connection: { host: "test" } });
      const result = connectDB();
      expect(result).toBeInstanceOf(Promise);
    });

    it("should call mongoose.connect exactly once per invocation", async () => {
      const mockConnection = {
        connection: {
          host: "localhost",
        },
      };

      mongoose.connect.mockResolvedValue(mockConnection);

      await connectDB();

      expect(mongoose.connect).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple sequential calls", async () => {
      const mockConnection = {
        connection: {
          host: "localhost",
        },
      };

      mongoose.connect.mockResolvedValue(mockConnection);

      await connectDB();
      await connectDB();
      await connectDB();

      expect(mongoose.connect).toHaveBeenCalledTimes(3);
    });
  });
});
