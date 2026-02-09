module.exports = {
  // name displayed during tests
  displayName: "frontend",

  // simulates browser environment in jest
  // e.g., using document.querySelector in your tests
  testEnvironment: "jest-environment-jsdom",

  // jest does not recognise jsx files by default, so we use babel to transform any jsx files
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },

  // tells jest how to handle css/scss imports in your tests
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },

  // ignore all node_modules except styleMock (needed for css imports)
  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  // only run these tests
  testMatch: ["<rootDir>/client/src/**/*.test.js"],

  testPathIgnorePatterns: [
  "<rootDir>/client/src/pages/Auth/",  
  "<rootDir>/client/src/_site/pages/Auth/",
],


  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "client/src/pages/admin/AdminDashboard.js",
    "client/src/pages/admin/CreateProduct.js",
    "client/src/components/AdminMenu.js",
    "client/src/pages/admin/AdminOrders.js",
    "client/src/pages/admin/UpdateProduct.js",
    "client/src/pages/admin/Products.js",
    "client/src/pages/admin/CreateCategory.js",
    "client/src/components/Form/CategoryForm.js"
  ],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
