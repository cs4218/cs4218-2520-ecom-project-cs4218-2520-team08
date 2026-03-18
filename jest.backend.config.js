module.exports = {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // transform ESM to CJS so jest.mock() works
  transform: {
    "^.+\.jsx?$": "babel-jest",
  },

  // which test to run
  testMatch: [
    "<rootDir>/controllers/**/*.test.js",
    "<rootDir>/models/**/*.test.js",
    "<rootDir>/helpers/**/*.test.js",
    "<rootDir>/middlewares/**/*.test.js",
    "<rootDir>/config/**/*.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  coverageDirectory: "<rootDir>/coverage/backend",
  coverageReporters: ["json", "lcov", "text-summary"],
  collectCoverageFrom: [
    "helpers/authHelper.js",
    "middlewares/authMiddleware.js",
    "controllers/authController.js",
    "controllers/categoryController.js",
    "controllers/productController.js",
    "models/userModel.js",
    "models/orderModel.js",
    "models/productModel.js",
    "models/categoryModel.js",
    "config/db.js",
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
    },
  },
};
