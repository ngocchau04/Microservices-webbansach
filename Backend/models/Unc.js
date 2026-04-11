const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    email: String,
    name: String,
    password: String,
    sdt: String,
    verifynumber: String
}, {versionKey: false});

const Unc = mongoose.model("unverified_accounts", accountSchema);

module.exports = Unc;