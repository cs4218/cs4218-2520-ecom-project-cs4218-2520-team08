import mongoose from "mongoose";
import Order from "./orderModel.js";

describe("orderModel", () => {
  afterAll(async () => {
    // Ensure no open handles from mongoose default connection.
    await mongoose.disconnect();
  });

  it("defines products as an array of ObjectId refs to Products", () => {
    // Arrange
    const productsPath = Order.schema.path("products");

    // Act
    const caster = productsPath.caster;

    // Assert
    expect(productsPath.instance).toBe("Array");
    expect(caster.instance).toBe("ObjectId");
    expect(caster.options.ref).toBe("Products");
  });

  it("defines buyer as an ObjectId ref to users", () => {
    // Arrange
    const buyerPath = Order.schema.path("buyer");

    // Act
    const { instance, options } = buyerPath;

    // Assert
    expect(instance).toBe("ObjectId");
    expect(options.ref).toBe("users");
  });

  it('defaults status to "Not Process" when not provided', () => {
    // Arrange
    const doc = new Order({});

    // Act
    const status = doc.status;

    // Assert
    expect(status).toBe("Not Process");
  });

  it("accepts a valid status from the enum", () => {
    // Arrange
    const doc = new Order({ status: "Shipped" });

    // Act
    const err = doc.validateSync();

    // Assert
    expect(err).toBeUndefined();
    expect(doc.status).toBe("Shipped");
  });

  it("rejects a status that is not in the enum", () => {
    // Arrange
    const doc = new Order({ status: "INVALID_STATUS" });

    // Act
    const err = doc.validateSync();

    // Assert
    expect(err).toBeDefined();
    expect(err.errors.status).toBeDefined();
    expect(err.errors.status.name).toBe("ValidatorError");
  });

  it("enables timestamps (createdAt and updatedAt)", () => {
    // Arrange
    const schemaOptions = Order.schema.options;

    // Act
    const timestamps = schemaOptions.timestamps;

    // Assert
    expect(timestamps).toBe(true);
    expect(Order.schema.path("createdAt")).toBeDefined();
    expect(Order.schema.path("updatedAt")).toBeDefined();
  });
});

