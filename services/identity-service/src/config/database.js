const mongoose = require("mongoose");

const connectDatabase = async ({ mongoUri, dbName }) => {
  await mongoose.connect(mongoUri, {
    dbName,
  });
  console.log(`[identity-service] MongoDB connected (${dbName})`);
};

module.exports = {
  connectDatabase,
};
