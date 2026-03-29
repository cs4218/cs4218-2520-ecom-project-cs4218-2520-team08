require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';

mongoose.connect(MONGO_URL).then(async () => {
  // Delete all loadtest users
  const result = await mongoose.connection.db
    .collection('users')
    .deleteMany({ email: { $regex: '@loadtest\\.com$' } });
  console.log(`Cleaned up ${result.deletedCount} loadtest user(s) from DB`);

  // Reset cs4218@test.com password back to original in case it was changed by a previous test run
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
}).catch(err => {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
});
