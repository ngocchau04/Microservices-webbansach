const mongoose = require("mongoose");

const connectDatabase = async ({ mongoUri, dbName }) => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(mongoUri, {
    dbName,
    autoIndex: true,
  });

  console.log(`[checkout-service] connected MongoDB db=${dbName}`);
  return mongoose.connection;
};

module.exports = {
  connectDatabase,
};

