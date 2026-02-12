import mongoose from "mongoose";
import Product from "./productModel.js";

describe("Product Model", () => {
  // Schema Definition Tests
  describe("Schema Definition", () => {
    it("should export a Mongoose Schema as a function", () => {
      expect(typeof Product).toBe("function");
    });

    it("should have model name 'Products'", () => {
      const modelName = Product.modelName;
      expect(modelName).toBe("Products");
    });
  });

  // Required Field Validation Tests
  describe("Required Field Validation", () => {
    it("should throw validation error when name is missing", () => {
      const productData = {
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.name.message).toContain("required");
    });

    it("should throw validation error when slug is missing", () => {
      const productData = {
        name: "Test Product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.slug).toBeDefined();
      expect(error.errors.slug.message).toContain("required");
    });

    it("should throw validation error when description is missing", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.description).toBeDefined();
      expect(error.errors.description.message).toContain("required");
    });

    it("should throw validation error when price is missing", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.price).toBeDefined();
      expect(error.errors.price.message).toContain("required");
    });

    it("should throw validation error when category is missing", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.category).toBeDefined();
      expect(error.errors.category.message).toContain("required");
    });

    it("should throw validation error when quantity is missing", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.quantity).toBeDefined();
      expect(error.errors.quantity.message).toContain("required");
    });
  });

  // Valid Product Creation Tests
  describe("Valid Product Creation", () => {
    it("should create a product with all required fields", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.name).toBe("Test Product");
      expect(product.slug).toBe("test-product");
      expect(product.description).toBe("Test description");
      expect(product.price).toBe(100);
      expect(product.category).toEqual(productData.category);
      expect(product.quantity).toBe(10);
    });

    it("should create a product with all fields including optional ones", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
        photo: {
          data: Buffer.from("test-image-data"),
          contentType: "image/png",
        },
        shipping: true,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.name).toBe("Test Product");
      expect(product.slug).toBe("test-product");
      expect(product.description).toBe("Test description");
      expect(product.price).toBe(100);
      expect(product.category).toEqual(productData.category);
      expect(product.quantity).toBe(10);
      expect(product.photo.data).toBeInstanceOf(Buffer);
      expect(product.photo.contentType).toBe("image/png");
      expect(product.shipping).toBe(true);
    });
  });

  // Data Type Validation Tests
  describe("Data Type Validation", () => {
    it("should accept number for name field due to Mongoose type casting", () => {
      const productData = {
        name: 12345,
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.name).toBe("12345"); // Cast to string
    });

    it("should reject non-castable value for name field", () => {
      const productData = {
        name: { invalid: "object" },
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });

    it("should reject non-numeric value for price field", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: "not-a-number",
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.price).toBeDefined();
    });

    it("should reject non-numeric value for quantity field", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: "not-a-number",
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.quantity).toBeDefined();
    });

    it("should accept valid ObjectId for category field", () => {
      const validObjectId = new mongoose.Types.ObjectId();
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: validObjectId,
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.category).toEqual(validObjectId);
    });

    it("should reject invalid ObjectId format for category field", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: "invalid-object-id",
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.category).toBeDefined();
    });

    it("should accept boolean value for shipping field", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
        shipping: true,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.shipping).toBe(true);
    });

    it("should accept false boolean value for shipping field", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
        shipping: false,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.shipping).toBe(false);
    });

    it("should accept zero value for price field", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 0,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.price).toBe(0);
    });

    it("should accept zero value for quantity field", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 0,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.quantity).toBe(0);
    });

    it("should accept negative value for price field", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: -10,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.price).toBe(-10);
    });

    it("should accept negative value for quantity field", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: -5,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.quantity).toBe(-5);
    });

    it("should accept decimal value for price field", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 99.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.price).toBe(99.99);
    });

    it("should accept decimal value for quantity field", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10.5,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.quantity).toBe(10.5);
    });

    it("should reject empty string for name field", () => {
      const productData = {
        name: "",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });

    it("should reject null value for required fields", () => {
      const productData = {
        name: null,
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });
  });

  // Optional Field Tests
  describe("Optional Field Tests", () => {
    it("should validate product without shipping field", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.shipping).toBeUndefined();
    });

    it("should validate product without photo field", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.photo).toEqual({ data: undefined, contentType: undefined });
    });

    it("should accept Buffer data and contentType for photo field", () => {
      const imageBuffer = Buffer.from("fake-image-data");
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
        photo: {
          data: imageBuffer,
          contentType: "image/jpeg",
        },
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.photo.data).toBeInstanceOf(Buffer);
      expect(Buffer.compare(product.photo.data, imageBuffer)).toBe(0);
      expect(product.photo.contentType).toBe("image/jpeg");
    });

    it("should accept photo field with only data property", () => {
      const imageBuffer = Buffer.from("fake-image-data");
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
        photo: {
          data: imageBuffer,
        },
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.photo.data).toBeInstanceOf(Buffer);
    });

    it("should accept photo field with only contentType property", () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        price: 100,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
        photo: {
          contentType: "image/png",
        },
      };

      const product = new Product(productData);
      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.photo.contentType).toBe("image/png");
    });
  });

  // Timestamps Tests
  describe("Timestamps", () => {
    it("should have timestamps option enabled in schema", () => {
      const schema = Product.schema;

      expect(schema.options.timestamps).toBe(true);
    });

    it("should have createdAt field in schema paths", () => {
      const schema = Product.schema;
      const createdAtPath = schema.paths.createdAt;

      expect(createdAtPath).toBeDefined();
      expect(createdAtPath.instance).toBe("Date");
    });

    it("should have updatedAt field in schema paths", () => {
      const schema = Product.schema;
      const updatedAtPath = schema.paths.updatedAt;

      expect(updatedAtPath).toBeDefined();
      expect(updatedAtPath.instance).toBe("Date");
    });
  });
});
