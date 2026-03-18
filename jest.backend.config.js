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
    "controllers/**/*.js",
    "models/**/*.js",
    "routes/**/*.js",
    "helpers/**/*.js",
    "middlewares/**/*.js",
    "config/**/*.js",
    "server.js",
    "!**/*.test.js",
    "!**/*.spec.js",
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
    },
  },
};
