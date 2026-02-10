module.exports = {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // transform ESM to CJS so jest.mock() works
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },

  // which test to run
  testMatch: [
    "<rootDir>/controllers/*.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "controllers/**",
  ],
};
