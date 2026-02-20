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
  collectCoverageFrom: [
    "controllers/authController.js",
    "controllers/productController.js",
    "helpers/authHelper.js",
    "helpers/productHelper.js",
    "middlewares/authMiddleware.js",
    "middlewares/productMiddleware.js",
    "models/orderModel.js",
    "models/userModel.js",
    "models/productModel.js",
    "config/db.js",
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
    },
  },
};
