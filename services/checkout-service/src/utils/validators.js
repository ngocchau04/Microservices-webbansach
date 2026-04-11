const mongoose = require("mongoose");

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const toPositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

module.exports = {
  isObjectId,
  toPositiveInt,
  isNonEmptyString,
};

