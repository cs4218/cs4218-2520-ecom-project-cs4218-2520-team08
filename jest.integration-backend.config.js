module.exports = {
  displayName: "integration-backend",
  testEnvironment: "node",
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },
  testMatch: [
    "<rootDir>/integration-tests/backend/**/*.test.js",
  ],
  testTimeout: 30000,
};
