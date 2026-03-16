module.exports = {
  displayName: "integration-frontend",
  testEnvironment: "jest-environment-jsdom",
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
    "^react$": "<rootDir>/client/node_modules/react",
    "^react/(.*)$": "<rootDir>/client/node_modules/react/$1",
    "^react-dom$": "<rootDir>/client/node_modules/react-dom",
    "^react-dom/(.*)$": "<rootDir>/client/node_modules/react-dom/$1",
    "^@testing-library/react$": "<rootDir>/client/node_modules/@testing-library/react",
    "^@testing-library/jest-dom(.*)$": "<rootDir>/client/node_modules/@testing-library/jest-dom$1",
  },
  moduleDirectories: ["node_modules", "client/node_modules"],
  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],
  testMatch: [
    "<rootDir>/integration-tests/frontend/**/*.test.js",
  ],
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
  testTimeout: 15000,
};
