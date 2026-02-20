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

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "client/src/pages/Auth/**",
    "client/src/hooks/useCategory.js",
    "client/src/pages/Categories.js",
    "client/src/pages/admin/CreateCategory.js",
    "client/src/components/Form/CategoryForm.js",
    "client/src/context/auth.js",
    "client/src/components/Routes/Private.js",
    "client/src/components/UserMenu.js",
    "client/src/pages/user/Dashboard.js",
    "client/src/helpers/validationHelper.js",
    "client/src/pages/ProductDetails.js",
    "client/src/pages/CategoryProduct.js",
    "client/src/components/Footer.js",
    "client/src/components/Header.js",
    "client/src/components/Layout.js",
    "client/src/components/Spinner.js",
    "client/src/pages/Pagenotfound.js",
    "client/src/pages/HomePage.js",
    "client/src/components/Prices.js",
    "client/src/pages/CartPage.js",
    "client/src/context/cart.js",
    "client/src/pages/user/Orders.js",
    "client/src/pages/user/Profile.js",
    "client/src/pages/admin/Users.js",
    "client/src/pages/Search.js",
    "client/src/components/Form/SearchInput.js",
    "client/src/context/search.js",
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
