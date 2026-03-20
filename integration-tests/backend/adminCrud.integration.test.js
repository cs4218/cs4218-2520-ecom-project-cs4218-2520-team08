import { connect, closeDatabase, clearDatabase } from "./helpers/testDb.js";
import mongoose from "mongoose";
import categoryModel from "../../models/categoryModel.js";
import productModel from "../../models/productModel.js";
import {
  createCategoryController,
  categoryControlller,
  updateCategoryController,
  deleteCategoryCOntroller,
} from "../../controllers/categoryController.js";
import {
  createProductController,
  getProductController,
  updateProductController,
  deleteProductController,
  productPhotoController
} from "../../controllers/productController.js";
import fs from "fs";
import path from "path";
import os from "os";

jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({})),
  Environment: { Sandbox: "sandbox" },
}));

const makeReq = (overrides = {}) => ({
  params: {},
  body: {},
  fields: {},
  files: {},
  ...overrides,
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

// Kamat Shivangi Prashant, A0319665R
describe("Backend Integration: Admin CRUD Operations", () => {
  
  describe("Category CRUD", () => {
    // 1. Category full CRUD lifecycle
    it("Admin Category CRUD Lifecycle", async () => {
      // Kamat Shivangi Prashant, A0319665R
      
      // Create
      const reqCreate = makeReq({ body: { name: "Electronics" } });
      const resCreate = makeRes();
      await createCategoryController(reqCreate, resCreate);
      
      expect(resCreate.status).toHaveBeenCalledWith(201);
      const createdCategory = resCreate.send.mock.calls[0][0].category;
      expect(createdCategory.name).toBe("Electronics");
      expect(createdCategory.slug).toBe("electronics"); 
      
      // Get All - verify it exists
      const reqGetAll = makeReq();
      const resGetAll = makeRes();
      await categoryControlller(reqGetAll, resGetAll);
      
      expect(resGetAll.status).toHaveBeenCalledWith(200);
      let categories = resGetAll.send.mock.calls[0][0].category;
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe("Electronics");
      
      const catId = categories[0]._id.toString();

      // Update
      const reqUpdate = makeReq({
        params: { id: catId },
        body: { name: "Home Appliances" },
      });
      const resUpdate = makeRes();
      await updateCategoryController(reqUpdate, resUpdate);
      
      expect(resUpdate.status).toHaveBeenCalledWith(200);
      const updatedCategory = resUpdate.send.mock.calls[0][0].category;
      expect(updatedCategory.name).toBe("Home Appliances");
      expect(updatedCategory.slug).toBe("home-appliances");

      // Delete
      const reqDelete = makeReq({ params: { id: catId } });
      const resDelete = makeRes();
      await deleteCategoryCOntroller(reqDelete, resDelete);
      
      expect(resDelete.status).toHaveBeenCalledWith(200);

      // Get All - verify it's removed
      const reqGetAllAfter = makeReq();
      const resGetAllAfter = makeRes();
      await categoryControlller(reqGetAllAfter, resGetAllAfter);
      
      expect(resGetAllAfter.status).toHaveBeenCalledWith(200);
      categories = resGetAllAfter.send.mock.calls[0][0].category;
      expect(categories).toHaveLength(0);
    });

    // 2. Duplicate category rejection
    it("Duplicate category rejection", async () => {
      // Kamat Shivangi Prashant, A0319665R
      const reqCreate1 = makeReq({ body: { name: "Books" } });
      const resCreate1 = makeRes();
      await createCategoryController(reqCreate1, resCreate1);
      expect(resCreate1.status).toHaveBeenCalledWith(201);

      const reqCreate2 = makeReq({ body: { name: "Books" } });
      const resCreate2 = makeRes();
      await createCategoryController(reqCreate2, resCreate2);
      
      expect(resCreate2.status).toHaveBeenCalledWith(409);
      expect(resCreate2.send.mock.calls[0][0].success).toBe(false);
      expect(resCreate2.send.mock.calls[0][0].message).toBe("Category Already Exists");
      
      const count = await categoryModel.countDocuments({ name: "Books" });
      expect(count).toBe(1);
    });
  });

  describe("Product CRUD", () => {
    // 3. Product full CRUD lifecycle
    it("Admin Product full CRUD lifecycle", async () => {
      // Kamat Shivangi Prashant, A0319665R
      const cat = await categoryModel.create({ name: "Toys", slug: "toys" });

      // Create
      const reqCreate = makeReq({
        fields: {
          name: "Action Figure",
          description: "Cool toy",
          price: 25,
          category: cat._id.toString(),
          quantity: 100,
        },
        files: {},
      });
      const resCreate = makeRes();
      await createProductController(reqCreate, resCreate);
      
      expect(resCreate.status).toHaveBeenCalledWith(201);
      const createdProduct = resCreate.send.mock.calls[0][0].products;
      const pid = createdProduct._id.toString();
      
      // Get
      const reqGet = makeReq();
      const resGet = makeRes();
      await getProductController(reqGet, resGet);
      
      expect(resGet.status).toHaveBeenCalledWith(200);
      let products = resGet.send.mock.calls[0][0].products;
      expect(products).toHaveLength(1);
      expect(products[0].name).toBe("Action Figure");

      // Update
      const reqUpdate = makeReq({
        params: { pid },
        fields: {
          name: "Super Action Figure",
          description: "Cool toy",
          price: 35,
          category: cat._id.toString(),
          quantity: 50,
        },
        files: {},
      });
      const resUpdate = makeRes();
      await updateProductController(reqUpdate, resUpdate);
      
      expect(resUpdate.status).toHaveBeenCalledWith(201);
      const updatedProduct = resUpdate.send.mock.calls[0][0].products;
      expect(updatedProduct.name).toBe("Super Action Figure");
      expect(updatedProduct.price).toBe(35);

      // Delete
      const reqDelete = makeReq({ params: { pid } });
      const resDelete = makeRes();
      await deleteProductController(reqDelete, resDelete);
      
      expect(resDelete.status).toHaveBeenCalledWith(200);

      // Get after delete
      const reqGetAfter = makeReq();
      const resGetAfter = makeRes();
      await getProductController(reqGetAfter, resGetAfter);
      
      expect(resGetAfter.status).toHaveBeenCalledWith(200);
      products = resGetAfter.send.mock.calls[0][0].products;
      expect(products).toHaveLength(0);
    });

    // 4. Create product with photo persists correctly
    it("Create product with photo persists correctly", async () => {
      // Kamat Shivangi Prashant, A0319665R
      const cat = await categoryModel.create({ name: "Art", slug: "art" });
      
      const tempPhotoPath = path.join(os.tmpdir(), "test-photo.png");
      fs.writeFileSync(tempPhotoPath, "fake-photo-binary-data");

      const reqCreate = makeReq({
        fields: {
          name: "Painting",
          description: "Nice painting",
          price: 150,
          category: cat._id.toString(),
          quantity: 2,
        },
        files: {
          photo: {
            size: 500,
            path: tempPhotoPath,
            type: "image/png"
          }
        },
      });
      const resCreate = makeRes();
      await createProductController(reqCreate, resCreate);
      
      expect(resCreate.status).toHaveBeenCalledWith(201);
      const createdPid = resCreate.send.mock.calls[0][0].products._id.toString();

      // Get Photo
      const reqPhoto = makeReq({ params: { pid: createdPid } });
      const resPhoto = makeRes();
      await productPhotoController(reqPhoto, resPhoto);

      expect(resPhoto.set).toHaveBeenCalledWith("Content-type", "image/png");
      expect(resPhoto.status).toHaveBeenCalledWith(200);
      const photoBuffer = resPhoto.send.mock.calls[0][0];
      expect(photoBuffer.toString()).toBe("fake-photo-binary-data");
      
      if (fs.existsSync(tempPhotoPath)) {
        fs.unlinkSync(tempPhotoPath);
      }
    });
  });

  describe("Category and Product Relationship", () => {
    // 5. Delete category does not orphan products
    it("Delete category does not orphan products", async () => {
      // Kamat Shivangi Prashant, A0319665R
      
      // Create Category
      const reqCat = makeReq({ body: { name: "Music" } });
      const resCat = makeRes();
      await createCategoryController(reqCat, resCat);
      const catId = resCat.send.mock.calls[0][0].category._id.toString();

      // Create Product
      const reqProd = makeReq({
        fields: {
          name: "Guitar",
          description: "Acoustic",
          price: 200,
          category: catId,
          quantity: 5,
        },
        files: {},
      });
      const resProd = makeRes();
      await createProductController(reqProd, resProd);
      const pid = resProd.send.mock.calls[0][0].products._id.toString();

      // Delete Category
      const reqDelCat = makeReq({ params: { id: catId } });
      const resDelCat = makeRes();
      await deleteCategoryCOntroller(reqDelCat, resDelCat);
      expect(resDelCat.status).toHaveBeenCalledWith(200);

      // Verify Product still exists in DB
      const productInDb = await productModel.findById(pid);
      expect(productInDb).toBeTruthy();
      expect(productInDb.name).toBe("Guitar");
      expect(productInDb.category.toString()).toBe(catId);
    });
  });
});
