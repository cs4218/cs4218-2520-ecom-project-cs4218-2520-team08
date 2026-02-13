import userModel from "./userModel.js";

describe("userModel", () => {
  it("should require name field", () => {
    const user = new userModel({
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
  });

  it("should trim the name field", () => {
    const user = new userModel({
      name: "  Test User  ",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();

    const schema = userModel.schema;
    const namePath = schema.path("name");
    expect(namePath.options.trim).toBe(true);
  });

  it("should have name field of type String", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();

    const schema = userModel.schema;
    const namePath = schema.path("name");
    expect(namePath.instance).toBe("String");
  });

  it("should require email field", () => {
    const user = new userModel({
      name: "Test User",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.email).toBeDefined();
  });

  it("should have unique email constraint", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();

    const schema = userModel.schema;
    const emailPath = schema.path("email");
    expect(emailPath.options.unique).toBe(true);
  });

  it("should have email field of type String", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();

    const schema = userModel.schema;
    const emailPath = schema.path("email");
    expect(emailPath.instance).toBe("String");
  });

  it("should require password field", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.password).toBeDefined();
  });

  it("should have password field of type String", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();

    const schema = userModel.schema;
    const passwordPath = schema.path("password");
    expect(passwordPath.instance).toBe("String");
  });

  it("should require phone field", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.phone).toBeDefined();
  });

  it("should have phone field of type String", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();

    const schema = userModel.schema;
    const phonePath = schema.path("phone");
    expect(phonePath.instance).toBe("String");
  });

  it("should require address field", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.address).toBeDefined();
  });

  it("should have address field of type Object", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();

    const schema = userModel.schema;
    const addressPath = schema.path("address");
    expect(addressPath.instance).toBe("Mixed");
  });

  it("should require DOB field", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      answer: "Football",
    });

    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.DOB).toBeDefined();
  });

  it("should have DOB field of type String", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();

    const schema = userModel.schema;
    const dobPath = schema.path("DOB");
    expect(dobPath.instance).toBe("String");
  });

  it("should require answer field", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
    });

    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.answer).toBeDefined();
  });

  it("should have answer field of type String", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();

    const schema = userModel.schema;
    const answerPath = schema.path("answer");
    expect(answerPath.instance).toBe("String");
  });

  it("should set default role to 0", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    expect(user.role).toBe(0);
  });

  it("should have role field of type Number", () => {
    const user = new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    });

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();

    const schema = userModel.schema;
    const rolePath = schema.path("role");
    expect(rolePath.instance).toBe("Number");
  });

  it("should create valid user with all required fields", () => {
    const userData = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
      answer: "Football",
    };

    const user = new userModel(userData);
    const validationError = user.validateSync();

    expect(validationError).toBeUndefined();
    expect(user.name).toBe("Test User");
    expect(user.email).toBe("test@example.com");
    expect(user.password).toBe("password123");
    expect(user.phone).toBe("1234567890");
    expect(user.address).toBe("123 Street");
    expect(user.DOB).toBe("1990-01-01");
    expect(user.answer).toBe("Football");
    expect(user.role).toBe(0);
  });
});
