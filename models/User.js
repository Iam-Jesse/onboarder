const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: String,
  full_name: String,
  job_title: String,
  phone: String,
  uen: String,
  company_name: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const User = mongoose.model('User', userSchema)

module.exports = User
