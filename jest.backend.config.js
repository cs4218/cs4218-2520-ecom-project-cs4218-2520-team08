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
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "controllers/authController.js",
    "helpers/authHelper.js",
    "middlewares/authMiddleware.js",
    "models/userModel.js",
  ],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },
};
