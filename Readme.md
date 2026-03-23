# CS4218 Project - Virtual Vault

[![Unit Tests (Jest)](https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team08/actions/workflows/unit-tests.yaml/badge.svg)](https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team08/actions/workflows/unit-tests.yaml)

[![Integration Tests (Jest)](https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team08/actions/workflows/integration-tests.yaml/badge.svg)](https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team08/actions/workflows/integration-tests.yaml)

## Milestone 1 CI Run

[Milestone 1 CI Run](https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team08/actions/runs/22277019646)

## Workload Distribution

### Milestone 2 Integration & UI Tests

#### Tsui Yi Wern (A0266070J)

**Integration Tests**

- `integration-tests/backend/authController.integration.test.js`
- `integration-tests/frontend/auth.integration.test.js`

| # | Test | Modules Integrated | Description |
|---|------|--------------------|-------------|
| 1 | User registration with real DB | `registerController`, `userModel`, `hashPassword` | Call `registerController` with a real DB connection. Verify the user document is actually created in MongoDB with a bcrypt-hashed password (not plaintext). Also verifies email is stored lowercase. |
| 2 | User login and JWT validation | `loginController`, `userModel`, `comparePassword`, `JWT.sign` | Register a user in the DB, then call `loginController`. Verify it finds the user, correctly compares the password via bcrypt, and returns a valid JWT that can be decoded. Also verifies wrong-password and unregistered-email rejection. |
| 3 | Register to login end-to-end flow | `registerController`, `loginController`, `userModel`, `authHelper` | Call register, then call login with the same credentials. Verify the returned user data matches what was registered and the JWT contains the correct user ID. Also verifies case-insensitive email login. |
| 4 | Forgot password and reset flow | `forgotPasswordController`, `userModel`, `hashPassword` | Register a user, call `forgotPasswordController` with correct email and answer, then call `loginController` with the new password. Verify the new password works and the old one does not. Also verifies wrong-answer rejection and that new bcrypt hash is stored. |
| 5 | Auth middleware access control | `requireSignIn`, `isAdmin`, `userModel`, `JWT` | Create an admin user in the DB, generate a real JWT for them, pass it through `requireSignIn` then `isAdmin`. Verify `req.user` is set and admin access is granted. Repeat with a non-admin user and verify 401 rejection. Also verifies invalid token does not call next. |
| 6 | Duplicate email registration prevention | `registerController`, `userModel` | Register a user, then attempt to register again with the same email. Verify the second call returns a failure response and no duplicate document exists in the DB. Also verifies case-insensitive duplicate detection. |
| 7 | Login page within full Layout | `Login`, `Layout`, `Header`, `Footer`, `AuthProvider` | Render the Login page inside real Layout with real AuthProvider. Verify Header, Footer, and Login form all render together. Also verifies Register/Login nav links show when unauthenticated. |
| 8 | Login success and auth context update | `Login`, `AuthProvider`, `Header`, `useAuth` | Mock axios to return a successful login response. Fill in the login form and submit. Verify the auth context updates, the Header reflects the logged-in user (shows username, hides Login link), and localStorage is updated. Also verifies error toast on failed login. |
| 9 | Login form validation | `Login`, `validationHelper` | Submit the login form with a whitespace-only password and verify the error toast fires without calling the API. Also verifies XSS in password is rejected, and the Forgot Password button navigates to the forgot-password page. |
| 10 | ForgotPassword page | `ForgotPassword`, `Layout`, `Header`, `Footer`, `validationHelper` | Render the ForgotPassword page inside Layout. Verify the form renders with all fields. Submit with valid data and verify the success toast fires and the user is navigated to the login page. Also verifies failed reset shows error toast, XSS in answer is rejected, and whitespace-only answer is rejected. |
| 11 | Private route access control | `Private`, `Spinner`, `AuthProvider` | Render a Private route-wrapped component with no auth token in context. Verify the Spinner countdown appears and no auth API is called. Also verifies protected content renders when auth API returns ok: true. |
| 12 | Register form validation | `Register`, `Layout`, `validationHelper` | Render Register within Layout. Enter invalid data (XSS strings, invalid phone). Verify validation toast messages appear without making an API call. Also verifies valid submission calls axios.post, successful registration shows success toast and navigates to login, and failed registration shows the API error message. |
| 13 | Dashboard and user menu rendering | `Dashboard`, `Layout`, `AuthProvider`, `useAuth` | Render Dashboard with a pre-authenticated user from localStorage. Verify all user fields (name, email, address, phone, DOB) appear in the card, and UserMenu shows Profile and Orders nav links. |
| 14 | Logout flow | `Header`, `AuthProvider`, `useAuth` | Pre-authenticate a user and render the app. Click the Logout button. Verify the username disappears, the Login nav link reappears, and localStorage.removeItem is called with "auth". |
| 15 | Auth session persistence from localStorage | `AuthProvider`, `useAuth`, `Header` | Pre-populate localStorage with auth data and render the app. Verify the AuthProvider restores user and token from storage on initial load, and the Header shows the persisted user's name. |

**UI Tests**

- `ui_tests/auth.spec.js`

| #   | Test | Pages / Components Traversed | Description |
| --- | ---- | ---------------------------- | ----------- |
| 1   | Register page renders correct structure | `/register` | Navigate to the Register page. Verify the header ("Virtual Vault"), the "REGISTER FORM" heading, all input fields (Name, Email, Password, Phone, Address, DOB, Favourite sports), the REGISTER button, and the footer ("All Rights Reserved") are all visible. |
| 2   | Successful registration redirects to login | `/register` → `/login` | Fill in the Register form with valid unique credentials and submit. Verify a success toast ("Register Successfully, please login") appears and the browser navigates to the `/login` page. |
| 3   | Register form rejects invalid phone number | `/register` | Fill in the Register form with a non-numeric phone field and submit. Verify an error toast ("Phone number must contain only digits") appears and the user remains on the Register page. |
| 4   | Register with already-registered email shows API error toast | `/register` | Submit the Register form using an email that already exists in the DB. Verify the API error toast ("Already Register please login") appears and the user stays on the Register page. |
| 5   | Register form rejects XSS input | `/register` | Fill in the Register form with a script tag in the Name field and submit. Verify an error toast ("Invalid characters detected") appears and no navigation occurs. |
| 6   | Login page renders correct structure | `/login` | Navigate to the Login page. Verify the header ("Virtual Vault"), email and password inputs, the LOGIN button, the Forgot Password button, and the footer are all visible. Register and Login nav links appear in the header. |
| 7   | Successful login updates header and persists session | `/login` → `/` | Fill in valid credentials on the Login page and submit. Verify the header switches from showing "Login" to showing the user's name. Reload the page and verify the user is still logged in (name still visible, no Login link). |
| 8   | Login failure shows error toast | `/login` | Submit the Login form with correct email but wrong password. Verify an error toast appears and the user stays on the Login page. |
| 9   | Login form rejects whitespace-only password | `/login` | Enter a valid email and a whitespace-only string as the password. Click LOGIN. Verify the toast ("Password cannot be whitespace only") appears without making a network request to the login API. |
| 10  | Login form rejects XSS in password | `/login` | Enter a script tag as the password. Click LOGIN. Verify the toast ("Invalid characters detected") appears and no navigation occurs. |
| 11  | Forgot Password button navigates to forgot-password page | `/login` → `/forgot-password` | On the Login page, click the "Forgot Password" button. Verify the browser navigates to `/forgot-password` and the "FORGOT PASSWORD FORM" heading is visible. |
| 12  | Forgot Password page renders correct structure | `/forgot-password` | Navigate to the Forgot Password page. Verify the header ("Virtual Vault"), the "FORGOT PASSWORD FORM" heading, all three input fields (Email, Answer, New Password), and the footer are all visible. |
| 13  | Successful password reset redirects to login | `/forgot-password` → `/login` | Fill in the Forgot Password form with the registered email, security-question answer, and a new password, then submit. Verify a success toast ("Password Reset Successfully") appears and the page navigates to `/login`. |
| 14  | Forgot Password failure shows error toast | `/forgot-password` | Submit the Forgot Password form with a wrong security-question answer. Verify an error toast ("Wrong Email Or Answer") appears and the user remains on the page. |
| 15  | Forgot Password rejects XSS in answer | `/forgot-password` | Enter a script tag as the security-question answer. Click FORGOT PASSWORD. Verify the toast ("Invalid characters detected") appears and no API request is made. |
| 16  | Forgot Password rejects whitespace-only answer | `/forgot-password` | Enter whitespace as the security-question answer. Click FORGOT PASSWORD. Verify the toast ("Answer cannot be whitespace only") appears and no API request is made. |
| 17  | Unauthenticated access to private route shows spinner | `/dashboard/user` | Without logging in, navigate directly to `/dashboard/user`. Verify the Spinner countdown ("redirecting to you in") is visible and the protected dashboard content is not rendered. |
| 18  | Authenticated user can access private dashboard | `/login` → `/dashboard/user` | Log in with valid credentials then navigate to `/dashboard/user`. Verify the dashboard content (user name, email) is visible and the spinner is not shown. |
| 19  | Dashboard shows UserMenu with Profile and Orders links | `/login` → `/dashboard/user` | Log in and navigate to `/dashboard/user`. Verify the UserMenu sidebar contains both a "Profile" link and an "Orders" link. |
| 20  | Logout clears session and restores nav links | `/login` → logout | Log in, verify the username appears in the header. Click the Logout button. Verify the username disappears, the Login nav link reappears, and navigating back to `/dashboard/user` shows the spinner instead of dashboard content. |

---

#### Yeo Zi Yi (A0266292X)

**Integration Tests**

- `integration-tests/backend/ordersProfile.integration.test.js`
- `integration-tests/frontend/search_profile_orders.integration.test.js`

**Backend (`ordersProfile.integration.test.js`)** — real MongoDB via `integration-tests/backend/helpers/testDb.js`; exercises `orderModel`, `userModel`, `productModel`, `categoryModel`, `hashPassword`, and `comparePassword` together with the listed controllers.

| # | Test | Modules integrated | Description |
|---|------|--------------------|-------------|
| 1 | Profile update persists | `updateProfileController`, `userModel`, `hashPassword`, `comparePassword` | Create a user, call `updateProfileController` with new name, phone, and password. Assert HTTP 200 payload, MongoDB fields updated, password stored as bcrypt, and `comparePassword` succeeds for the new password and fails for the old one. |
| 2 | Get orders with populated data | `getOrdersController`, `orderModel`, `userModel`, `productModel` | Create an order with two products (including photo buffers). Call `getOrdersController` as the buyer. Assert JSON array length, populated `buyer.name`, product names, and that serialized products omit `photo`. |
| 3 | Get all orders (admin) sorted | `getAllOrdersController`, `orderModel`, `userModel`, `productModel` | Create three orders with staggered timestamps. Call `getAllOrdersController`. Assert newest-first order of IDs, populated buyer names and product names, and no `photo` on products in the response. |
| 4 | Order status update persists | `orderStatusController`, `orderModel` | Create an order with status `Not Process`. Call `orderStatusController` with `Shipped`. Assert response JSON and MongoDB document both show `Shipped`. |
| 5 | Buyer order isolation | `getOrdersController`, `orderModel`, `userModel`, `productModel` | Create two users and three orders (two for user A, one for user B). Call `getOrdersController` as user A. Assert only A’s order IDs appear in the response. |

**Frontend (`search_profile_orders.integration.test.js`)** — React Testing Library with `MemoryRouter`, `AuthProvider`, `CartProvider`, `SearchProvider`; axios mocked for API boundaries.

| # | Test | Modules integrated | Description |
|---|------|--------------------|-------------|
| 1 | Search submits and shows results | `SearchInput`, `SearchProvider`, `Search`, `Layout`, axios | Render `Layout` with `SearchInput`, type a keyword, submit. Assert `GET /api/v1/product/search/:keyword` and that result product names appear (shared context drives `Search` route). |
| 2 | Profile update and persistence | `Profile`, `AuthProvider`, axios, `react-hot-toast` | Pre-seed `localStorage` auth, render `Profile`, change name/phone/address, submit. Assert `PUT /api/v1/auth/profile` payload, success toast, and updated user in `localStorage`. |
| 3 | Orders list UI | `Orders`, `AuthProvider`, axios | Mock `GET /api/v1/auth/orders` with a populated order. Assert table fields (status, buyer, payment, product row, image `src`, price text, relative date). |
| 4 | Search result cards | `SearchInput`, `Search`, `SearchProvider`, `AuthProvider`, `CartProvider`, axios | Submit search from `/`, assert card shows name, truncated description, price, and **More Details** / **ADD TO CART** buttons. |
| 5 | Layout wraps content | `Layout`, `Header`, `Footer`, providers | Render `Layout` with child text; assert **Virtual Vault**, child content, and **All Rights Reserved** footer. |

**UI Tests**

- `ui_tests/searchAndOrders.spec.js`

Run UI tests (Playwright): `npm run test:ui`  
Requires app reachable at the Playwright `baseURL` (default `http://localhost:3000`), API proxied to the backend, and `MONGO_URL` in `.env` for seeding test users, admin role, and a sample order.

| # | Test | Pages / components traversed | Description |
|---|------|-------------------------------|-------------|
| 1 | Profile structure and field update | `/login` → `/dashboard/user/profile` | Log in as seeded buyer. Assert document title **Your Profile**, form fields including disabled email, footer; update name/phone/address; assert success toast and navbar name. |
| 2 | Dashboard UserMenu | `/dashboard/user` | Assert **Profile** and **Orders** links in the user sidebar. |
| 3 | Orders via UserMenu + `getOrders` | `/dashboard/user` → `/dashboard/user/orders` | Wait for `GET /api/v1/auth/orders`. Assert **Your Orders** title, table headers, status **Not Process**, payment **Success**, quantity **1**, and seeded product name in the line items. |
| 4 | Profile password rotation | `/dashboard/user/profile`, `/login` | `PUT /api/v1/auth/profile` with new password; logout; log in again with the new password (covers `updateProfile` password hashing end-to-end). |
| 5 | Header search → results | `/` → `/search` | Assert `form[role="search"]`, `GET /api/v1/product/search/...`, document title **Search results**, heading and **Found N**, product cards. |
| 6 | Search empty API result | `/` → `/search` | Search with a nonsense keyword; assert **No Products Found**. |
| 7 | Cold `/search` route | `/search` | With default empty search context, assert **Search Resuts** heading and **No Products Found**. |
| 8 | Admin Users page | `/login` → `/dashboard/admin/users` | Wait for `admin-auth`; assert **All Users**, page title, and **AdminMenu** links (Create Category, Products, Orders). |
| 9 | Non-admin blocked from admin URL | `/dashboard/admin/users` → `/login` | Logged-in buyer opens admin users URL; assert spinner copy and redirect to login. |

---

#### Keagan Pang Zhong Hon (A0258729L)

**Integration Tests** 

- `integration-tests/frontend/productDisplay.integration.test.js`
- `integration-tests/backend/productController.integration.test.js`

| #   | Test                                                 | Modules Integrated                                                             | Description                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Product search with real DB                          | `searchProductController`, `productModel`                                      | Insert several products with varied names and descriptions into MongoDB. Call `searchProductController` with a keyword. Verify only matching products are returned (regex match on name or description).                                     |
| 2   | Product filters by category + price                  | `productFiltersController`, `productModel`, `categoryModel`                    | Create categories and products at different price points in the DB. Call `productFiltersController` with a category filter and price range. Verify only products matching both criteria are returned.                                        |
| 3   | Pagination consistency with count                    | `productListController`, `productCountController`, `productModel`              | Insert 15 products. Call `productCountController` to get total (should be 15). Call `productListController` for page 1 (should return 6), page 2 (6), page 3 (3). Verify no overlap between pages and all products are covered.              |
| 4   | Related products by category                         | `realtedProductController`, `productModel`, `categoryModel`                    | Create a category with 5 products. Call `realtedProductController` with one product's ID and category ID. Verify it returns up to 3 other products from the same category, excluding the source product.                                     |
| 5   | Products by category slug                            | `productCategoryController`, `productModel`, `categoryModel`                   | Create a category, create products under it. Call `productCategoryController` with the category slug. Verify the correct category and its products are returned.                                                                             |
| 6   | Get single product + photo endpoint                  | `getSingleProductController`, `productPhotoController`, `productModel`         | Create a product with photo data in the DB. Call `getSingleProductController` by slug (verify photo is excluded from response). Then call `productPhotoController` by ID (verify photo data and content-type are returned).                  |
| 7   | ProductDetails page + related products               | `ProductDetails`, `Layout`, `Header`, `Footer`, `useCart`, `CartProvider`      | Render ProductDetails at a product slug route. Mock axios to return product data and related products. Verify the main product details (name, description, price, category) and related product cards all render together within the Layout. |
| 8   | CategoryProduct page + pagination                    | `CategoryProduct`, `Layout`, `CartProvider`, `useCart`                         | Render CategoryProduct at a category slug. Mock axios to return category info and 8 products. Verify category name, product cards, and "Load More" button render. Click "Load More" and verify additional products appear.                   |
| 9   | Add to cart from ProductDetails updates Header badge | `ProductDetails`, `Header`, `CartProvider`, `useCart`, `Layout`                | Render ProductDetails within Layout (which includes Header). Click "Add to Cart". Verify the cart context updates and the Header's cart badge count increments.                                                                              |
| 10  | Layout composes Header + content + Footer            | `Layout`, `Header`, `Footer`, `AuthProvider`, `CartProvider`, `SearchProvider` | Render Layout with all three context providers. Verify Helmet meta tags, Header with nav links, main content slot, and Footer with links all render in the correct structure.                                                                |


**UI Tests**

- `ui_tests/productDiscovery.spec.js`

| #   | Test                                                          | Pages / Components Traversed                              | Description                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Homepage -> Product Details -> Similar Products -> Navigate   | HomePage, ProductDetails, ProductDetails (second product) | From the homepage, click "More Details" on a product. Verify the product details page loads with name, description, price (in USD format), and category. Verify the "Similar Products" section is visible. If similar products exist, click "More Details" on one of them. Verify a new product details page loads with a different product's information.                                                               |
| 2   | Category Dropdown -> Category Page -> Product Details -> Cart | Header, CategoryProduct, ProductDetails, CartPage         | Open the "Categories" dropdown in the header. Click on a category (e.g., "Electronics"). Verify the category product page loads with the heading "Category - [name]" and a result count. Click "More Details" on a product. Verify the product details page. Click "ADD TO CART". Verify the cart badge increments. Navigate to the cart page. Verify the product is listed in the cart with the correct name and price. |
| 3   | Homepage Category Filter -> Product Details                   | HomePage, ProductDetails                                  | On the homepage, check a category checkbox (e.g., "Electronics"). Verify the displayed products update to show only products from that category. Click "More Details" on one of the filtered products. Verify the product details page shows the matching category name in the "Category" field.                                                                                                                         |
| 4   | Homepage Price Filter -> Verify Filtered Products             | HomePage                                                  | On the homepage, select a price range radio button (e.g., "$0 to 19"). Verify all displayed products have prices within the selected range. Select a different price range (e.g., "$80 to 99"). Verify the products update to show only products in the new range.                                                                                                                                                       |
| 5   | Homepage Load More -> Browse New Products                     | HomePage, ProductDetails                                  | Visit the homepage. Count the initial number of product cards displayed (should be up to 6). If the "Loadmore" button is visible, click it. Verify additional product cards appear (total count increases). Click "More Details" on one of the newly loaded products. Verify the product details page loads correctly with all product information.                                                                      |
| 6   | All Categories Page -> Category -> Product Details            | Categories, CategoryProduct, ProductDetails               | Navigate to `/categories`. Verify all categories are listed as buttons/links (Electronics, Book, Clothing). Click on a category. Verify the category product page loads with the correct heading and products. Click "More Details" on a product. Verify the product details page loads with complete product information.                                                                                               |
| 7   | Product Details Add to Cart -> Cart Verification              | HomePage, ProductDetails, CartPage                        | From the homepage, click "More Details" on a specific product. Note the product's name and price on the details page. Click "ADD TO CART". Verify the toast message "Item Added to cart" appears. Verify the cart badge in the header increments. Navigate to the cart page. Verify that exact product appears in the cart with the correct name and price.                                                              |
| 8   | Category Product Pagination                                   | Header, CategoryProduct                                   | Open the Categories dropdown and navigate to a category page. Verify the initial set of products is displayed (up to 6). If a "Load more" button is visible, click it. Verify additional products are revealed. Verify all displayed products have the correct format: name, price in USD, truncated description, "More Details" and "ADD TO CART" buttons.                                                              |
| 9   | Cross-Category Navigation                                     | Header, CategoryProduct, CategoryProduct                  | Open the Categories dropdown in the header and click "Electronics". Verify the heading shows "Category - Electronics" and products are displayed. Open the Categories dropdown again (without going to the homepage) and click "Book". Verify the heading changes to "Category - Book" and a different set of products is displayed.                                                                                     |
| 10  | Homepage Reset Filters                                        | HomePage                                                  | On the homepage, check a category checkbox to filter products. Verify the product list updates to show filtered results. Click the "RESET FILTERS" button. Verify the page reloads and all products are shown again with no filters active (all category checkboxes unchecked, no price range selected).                                                                                                                 |


---

#### Lee Seng Kitt

---

#### Kamat Shivangi Prashant (A0319665R)

---

### Milestone 1 Unit Tests

#### Tsui Yi Wern (A0266070J)

- `context/auth.test.js`
- `helpers/authHelper.test.js`
- `middlewares/authMiddleware.test.js`
- `pages/Auth/Register.test.js`
- `pages/Auth/Login.test.js`
- `controllers/authController.test.js`
  - `registerController`
  - `loginController`
  - `forgotPasswordController`
  - `testController`
- `components/Routes/Private.test.js`
- `components/UserMenu.test.js`
- `pages/user/Dashboard.test.js`
- `models/userModel.test.js`

#### Yeo Zi Yi (A0266292X)

- `pages/user/Orders.js`
- `controllers/authController.js`
  - `updateProfileController`
  - `getOrdersController`
  - `getAllOrdersController`
  - `orderStatusController`
- `models/orderModel.js`
- `pages/user/Profile.js`
- `pages/admin/Users.js`
- `components/Form/SearchInput.js`
- `context/search.js`
- `pages/Search.js`

#### Keagan Pang Zhong Hon (A0258729L)

- `controllers/productController.js`
  - `getProductController`
  - `getSingleProductController`
  - `productPhotoController`
  - `productFiltersController`
  - `productCountController`
  - `productListController`
  - `searchProductController`
  - `relatedProductController`
  - `productCategoryController`
- `models/productModel.js`
- `config/db.ts`
- `pages/ProductDetails.js`
- `pages/CategoryProduct.js`
- `components/Footer.js`
- `components/Header.js`
- `components/Layout.js`
- `components/Spinner.js`

#### Lee Seng Kitt

- `controllers/categoryController.js`
  - `categoryController`
  - `singleCategoryController`
- `controllers/productController.js`
  - `braintreeTokenController`
  - `brainTreePaymentController`
- `models/categoryModel.js`
- `pages/Categories.js`
- `pages/HomePage.js`
- `pages/CartPage.js`

#### Kamat Shivangi Prashant (A0319665R)

- `components/AdminMenu.js`
- `pages/admin/AdminDashboard.js`
- `components/Form/CategoryForm.js`
- `pages/admin/CreateCategory.js`
- `pages/admin/CreateProduct.js`
- `pages/admin/UpdateProduct.js`
- `controllers/categoryController.js`
  - `createCategoryController`
  - `updateCategoryController`
  - `deleteCategoryController`
- `pages/admin/AdminOrders.js`
- `pages/admin/Products.js`
- `controllers/productController.js`
  - `createProductController`
  - `deleteProductController`
  - `updateProductController`

## 1. Project Introduction

Virtual Vault is a full-stack MERN (MongoDB, Express.js, React.js, Node.js) e-commerce website, offering seamless connectivity and user-friendly features. The platform provides a robust framework for online shopping. The website is designed to adapt to evolving business needs and can be efficiently extended.

## 2. Website Features

- **User Authentication**: Secure user authentication system implemented to manage user accounts and sessions.
- **Payment Gateway Integration**: Seamless integration with popular payment gateways for secure and reliable online transactions.
- **Search and Filters**: Advanced search functionality and filters to help users easily find products based on their preferences.
- **Product Set**: Organized product sets for efficient navigation and browsing through various categories and collections.

## 3. Your Task

- **Unit and Integration Testing**: Utilize Jest for writing and running tests to ensure individual components and functions work as expected, finding and fixing bugs in the process.
- **UI Testing**: Utilize Playwright for UI testing to validate the behavior and appearance of the website's user interface.
- **Code Analysis and Coverage**: Utilize SonarQube for static code analysis and coverage reports to maintain code quality and identify potential issues.
- **Load Testing**: Leverage JMeter for load testing to assess the performance and scalability of the ecommerce platform under various traffic conditions.

## 4. Setting Up The Project

### 1. Installing Node.js

1. **Download and Install Node.js**:
  - Visit [nodejs.org](https://nodejs.org) to download and install Node.js.
2. **Verify Installation**:
  - Open your terminal and check the installed versions of Node.js and npm:

### 2. MongoDB Setup

1. **Download and Install MongoDB Compass**:
  - Visit [MongoDB Compass](https://www.mongodb.com/products/tools/compass) and download and install MongoDB Compass for your operating system.
2. **Create a New Cluster**:
  - Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
  - After logging in, create a project and within that project deploy a free cluster.
3. **Configure Database Access**:
  - Create a new user for your database (if not alredy done so) in MongoDB Atlas.
  - Navigate to "Database Access" under "Security" and create a new user with the appropriate permissions.
4. **Whitelist IP Address**:
  - Go to "Network Access" under "Security" and whitelist your IP address to allow access from your machine.
  - For example, you could whitelist 0.0.0.0 to allow access from anywhere for ease of use.
5. **Connect to the Database**:
  - In your cluster's page on MongoDB Atlas, click on "Connect" and choose "Compass".
  - Copy the connection string.
6. **Establish Connection with MongoDB Compass**:
  - Open MongoDB Compass on your local machine, paste the connection string (replace the necessary placeholders), and establish a connection to your cluster.

### 3. Application Setup

To download and use the MERN (MongoDB, Express.js, React.js, Node.js) app from GitHub, follow these general steps:

1. **Clone the Repository**
  - Go to the GitHub repository of the MERN app.
  - Click on the "Code" button and copy the URL of the repository.
  - Open your terminal or command prompt.
  - Use the `git clone` command followed by the repository URL to clone the repository to your local machine:
    ```bash
    git clone <repository_url>
    ```
  - Navigate into the cloned directory.
2. **Install Frontend and Backend Dependencies**
  - Run the following command in your project's root directory:
3. **Add database connection string to `.env`**
  - Add the connection string copied from MongoDB Atlas to the `.env` file inside the project directory (replace the necessary placeholders):
4. **Adding sample data to database**
  - Download “Sample DB Schema” from Canvas and extract it.
  - In MongoDB Compass, create a database named `test` under your cluster.
  - Add four collections to this database: `categories`, `orders`, `products`, and `users`.
  - Under each collection, click "ADD DATA" and import the respective JSON from the extracted "Sample DB Schema".
5. **Running the Application**
  - Open your web browser.
  - Use `npm run dev` to run the app from root directory, which starts the development server.
  - Navigate to `http://localhost:3000` to access the application.

## 5. Unit Testing with Jest

Unit testing is a crucial aspect of software development aimed at verifying the functionality of individual units or components of a software application. It involves isolating these units and subjecting them to various test scenarios to ensure their correctness.
Jest is a popular JavaScript testing framework widely used for unit testing. It offers a simple and efficient way to write and execute tests in JavaScript projects.

### Getting Started with Jest

To begin unit testing with Jest in your project, follow these steps:

1. **Install Jest**:Use your preferred package manager to install Jest. For instance, with npm:
  ```bash
   npm install --save-dev jest

  ```
2. **Write Tests**Create test files for your components or units where you define test cases to evaluate their behaviour.
3. **Run Tests**Execute your tests using Jest to ensure that your components meet the expected behaviour.You can run the tests by using the following command in the root of the directory:
  - **Frontend tests**
  - **Backend tests**
    ```bash
    npm run test:backend
    ```
  - **All the tests**
    ```bash
    npm run test
    ```

