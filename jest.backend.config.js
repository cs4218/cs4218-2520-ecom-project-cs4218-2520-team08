module.exports = {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: [
    "<rootDir>/controllers/*.test.js",
    "<rootDir>/helpers/*.test.js",
    "<rootDir>/middlewares/*.test.js",
    "<rootDir>/models/*.test.js",
    "<rootDir>/config/*.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "controllers/authController.js",
    "helpers/authHelper.js",
    "middlewares/authMiddleware.js",
    "models/userModel.js",
    "controllers/productController.js",
    "helpers/productHelper.js",
    "middlewares/productMiddleware.js",
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
