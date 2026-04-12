require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';

mongoose.connect(MONGO_URL).then(async () => {
  // Delete any capacity-test users from previous runs
  const result = await mongoose.connection.db
    .collection('users')
    .deleteMany({ email: { $regex: '@capacitytest\\.com$' } });
  console.log(`Cleaned up ${result.deletedCount} capacity-test user(s) from DB`);

  // Delete orders created by capacity tests (buyer email pattern)
  const capacityUsers = await mongoose.connection.db
    .collection('users')
    .find({ email: { $regex: '@capacitytest\\.com$' } })
    .project({ _id: 1 })
    .toArray();
  if (capacityUsers.length > 0) {
    const userIds = capacityUsers.map(u => u._id);
    const orderResult = await mongoose.connection.db
      .collection('orders')
      .deleteMany({ buyer: { $in: userIds } });
    console.log(`Cleaned up ${orderResult.deletedCount} capacity-test order(s) from DB`);
  }

  // Reset cs4218@test.com password back to original in case it was changed
  const hashedPassword = await bcrypt.hash('cs4218@test.com', 10);
  const reset = await mongoose.connection.db
    .collection('users')
    .updateOne(
      { email: 'cs4218@test.com' },
      { $set: { password: hashedPassword } }
    );
  if (reset.matchedCount > 0) {
    console.log('Reset cs4218@test.com password to original');
  }

  await mongoose.disconnect();
  console.log('Capacity test cleanup complete');
}).catch(err => {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
});
