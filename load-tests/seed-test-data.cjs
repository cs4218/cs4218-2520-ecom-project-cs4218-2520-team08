require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';

mongoose.connect(MONGO_URL).then(async () => {
  const db = mongoose.connection.db;

  // Seed a test category
  const existingCategory = await db.collection('categories').findOne({ slug: 'load-test-category' });
  let categoryId;
  if (existingCategory) {
    categoryId = existingCategory._id;
    console.log('Category already exists, skipping');
  } else {
    const cat = await db.collection('categories').insertOne({
      name: 'Load Test Category',
      slug: 'load-test-category',
    });
    categoryId = cat.insertedId;
    console.log('Seeded category:', categoryId);
  }

  // Seed test products
  const existingProduct = await db.collection('products').findOne({ slug: 'load-test-product-1' });
  if (existingProduct) {
    console.log('Products already exist, skipping');
  } else {
    await db.collection('products').insertMany([
      {
        name: 'Load Test Product 1',
        slug: 'load-test-product-1',
        description: 'A product for load testing',
        price: 9.99,
        category: categoryId,
        quantity: 100,
        shipping: true,
      },
      {
        name: 'Load Test Product 2',
        slug: 'load-test-product-2',
        description: 'Another product for load testing',
        price: 19.99,
        category: categoryId,
        quantity: 50,
        shipping: false,
      },
      {
        name: 'Load Test Product 3',
        slug: 'load-test-product-3',
        description: 'Third product for load testing',
        price: 29.99,
        category: categoryId,
        quantity: 75,
        shipping: true,
      },
    ]);
    console.log('Seeded 3 test products');
  }

  await mongoose.disconnect();
}).catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
