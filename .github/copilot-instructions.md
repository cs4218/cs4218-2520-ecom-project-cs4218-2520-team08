# Copilot Instructions - Virtual Vault E-commerce

## Architecture Overview

This is a **MERN stack e-commerce application** with clear separation between frontend (React) and backend (Express/MongoDB):

- **Backend**: Express REST API (root level) with controllers, models, routes, and middleware
- **Frontend**: React SPA in `client/` with context-based state management
- **Database**: MongoDB (Atlas) with models in `models/` (user, product, category, order)
- **Authentication**: JWT tokens stored in localStorage, sent via `Authorization` header

Key architectural pattern: Backend provides RESTful APIs at `/api/v1/*`, frontend proxies to `http://localhost:6060` (see `client/package.json`).

## Critical Workflows

### Running the Application
```bash
npm run dev          # Starts both backend (port 6060) & frontend (port 3000) concurrently
npm run server       # Backend only (nodemon for hot-reload)
npm run client       # Frontend only (from root, not inside client/)
npm start            # Production backend only
```

### Testing Commands (Must use these exact commands)
```bash
npm run test:backend   # Jest tests for controllers/*.test.js (100% coverage required)
npm run test:frontend  # Jest tests for client/src/**/*.test.js (80% coverage required)
npm test               # Runs both backend and frontend tests sequentially
```

**Critical**: Tests use `node --experimental-vm-modules` for ES module support. All test files use ES6 `import`, not `require`.

### Code Analysis
```bash
npm run sonarqube    # Runs SonarQube analysis (must have local SonarQube running on port 9000)
```

## Testing Conventions

### Backend Tests (`controllers/*.test.js`)
- **Mock pattern**: Mock `categoryModel`, `slugify`, and other dependencies at module level
- **Response mocking**: Use helper function `mockRes()` that returns chainable `res.status().send()`
- **Coverage target**: 100% lines and functions (enforced in `jest.backend.config.js`)
- **Environment**: Node.js (`testEnvironment: "node"`)

Example from `categoryController.test.js`:
```javascript
jest.mock("../models/categoryModel.js", () => {
  const ModelCtor = jest.fn(function (doc) {
    return { ...doc, save: jest.fn() };
  });
  ModelCtor.findOne = jest.fn();
  // ... other methods
  return { __esModule: true, default: ModelCtor };
});
```

### Frontend Tests (`client/src/**/*.test.js`)
- **Mock pattern**: Mock `axios`, `react-hot-toast`, `Layout`, `AdminMenu`, and form components
- **Routing**: Wrap components in `<MemoryRouter>` with `<Routes>` for routing tests
- **Modal testing**: Mock `antd` Modal with `visible` prop to control rendering
- **Coverage target**: 80% lines and functions (enforced in `jest.frontend.config.js`)
- **Environment**: jsdom (`testEnvironment: "jest-environment-jsdom"`)
- **Transform**: Babel transforms JSX via `babel-jest` and `babel.config.cjs`
- **CSS handling**: CSS imports mapped to `identity-obj-proxy` in `moduleNameMapper`

Example from `CreateCategory.test.js`:
```javascript
jest.mock("../../components/Form/CategoryForm", () => {
  return function CategoryFormMock({ value, setValue, handleSubmit }) {
    return (
      <form onSubmit={handleSubmit}>
        <input aria-label="category-input" value={value} onChange={(e) => setValue(e.target.value)} />
        <button type="submit">SUBMIT</button>
      </form>
    );
  };
});
```

### Test Coverage Requirements
- **Backend**: `collectCoverageFrom: ["controllers/**"]` with 100% threshold
- **Frontend**: Specific files listed in `collectCoverageFrom` (AdminDashboard, CreateProduct, CreateCategory, etc.) with 80% threshold
- Coverage reports generated in `coverage/` directory

## API Patterns

### Route Structure
Routes follow pattern: `/api/v1/{resource}/{action}`
- **Auth**: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/user-auth`, `/api/v1/auth/admin-auth`
- **Category**: `/api/v1/category/create-category`, `/api/v1/category/get-category`, `/api/v1/category/update-category/:id`, `/api/v1/category/delete-category/:id`
- **Product**: `/api/v1/product/*` (similar pattern)

### Middleware Chain
Protected routes use: `requireSignIn` (JWT verification) → `isAdmin` (role check, role === 1)

Example from `authRoute.js`:
```javascript
router.get("/admin-auth", requireSignIn, isAdmin, (req, res) => {
  res.status(200).send({ ok: true });
});
```

### Controller Response Pattern
Controllers return: `{ success: boolean, message?: string, data?: any }`

Typical pattern:
```javascript
if (data?.success) {
  toast.success("Operation succeeded");
  // refresh data
} else {
  toast.error(data.message);
}
```

**Common typos preserved in error messages** (do not "fix" these):
- `"Something wwent wrong in getting catgeory"` (double 'w', typo in 'category')
- `"somthing went wrong in input form"` (missing 'e' in 'something')
- `"Somtihing went wrong"` (typo in 'Something')

## State Management

### Context Pattern
Frontend uses React Context API (not Redux). Three contexts in `client/src/context/`:
- **auth.js**: `[auth, setAuth]` hook with `{ user, token }`, synced with localStorage
- **cart.js**: Shopping cart state
- **search.js**: Search functionality state

Auth token automatically added to all axios requests:
```javascript
axios.defaults.headers.common["Authorization"] = auth?.token;
```

### Authentication Flow
1. Login → JWT token stored in localStorage (key: "auth")
2. Token loaded on app mount via `useEffect` in `AuthProvider`
3. Protected routes check `auth?.token` existence
4. Backend verifies JWT via `requireSignIn` middleware

## Environment Setup

### Required .env Variables
Create `.env` in root:
```
MONGO_URL=mongodb+srv://...  # MongoDB Atlas connection string
PORT=6060                     # Backend port
DEV_MODE=development
JWT_SECRET=your_secret        # For JWT signing
```

### Database Schema
Collections in `test` database:
- `users`: Authentication, profile (role: 0=user, 1=admin)
- `products`: E-commerce products with category references
- `categories`: Product categories (name, slug)
- `orders`: User orders with status tracking

## Project-Specific Quirks

1. **ES Modules everywhere**: All `.js` files use `import/export`, not CommonJS
2. **Dual package.json**: Root has backend deps + test configs, `client/` has frontend deps
3. **Proxy setup**: Frontend proxies API calls via `"proxy": "http://localhost:6060"` in `client/package.json`
4. **Color console**: Backend uses `colors` npm package (e.g., `.bgCyan.white`)
5. **Formidable**: Product images handled via `express-formidable` middleware
6. **Slugify**: Category names auto-slugified for URLs
7. **Test file naming**: Tests use `*.test.js` suffix, must be co-located with source (controllers/ or client/src/)

## Common Development Tasks

### Adding a New Frontend Component Test
1. Create `ComponentName.test.js` adjacent to component
2. Mock `Layout`, `AdminMenu`, axios, and react-hot-toast
3. Wrap in `<MemoryRouter>` if component uses routing
4. Add component path to `collectCoverageFrom` in `jest.frontend.config.js` if coverage required

### Adding a New Backend API Endpoint
1. Add controller function in `controllers/`
2. Create route in `routes/` and import controller
3. Register route in `server.js` with `app.use("/api/v1/resource", routes)`
4. Add corresponding test in `controllers/*.test.js` with mocked models

### Debugging Test Failures
- Check console for "Each child in a list should have a unique 'key' prop" warnings (suppressed in tests via `beforeAll`)
- Verify axios mocks return `{ data: { success: boolean, ... } }` structure
- Frontend: Check if `waitFor` is used for async operations
- Backend: Verify model mocks implement all methods called in controller

---

**Last Updated**: February 2026  
**Testing Framework**: Jest 29 with jsdom and Babel transforms  
**Code Quality**: SonarQube static analysis + 80-100% coverage requirements
