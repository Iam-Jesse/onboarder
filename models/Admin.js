const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  email: String,
  password: String,
  full_name: String,
  job_title: String,
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
