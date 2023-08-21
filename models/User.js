const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: String,
  uen: String,
  company_name: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  payment_status: String,
  webflow_id: String,
  entity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entity'
  },
  board_members: [{
    full_name: String,
    id_type: String, 
    id_number: String,
    role: String,
    is_shareholder: {
      type: Boolean, 
      default: false
    },
    share_percentage: Number,
    email: String,
    nationality: String,
    country_of_birth: String,
    date_of_birth: String,
    country_code: String,
    phone: String,
    local_house_no: String,
    local_street_name: String,
    local_level: String,
    local_building: String,
    local_unit_no: String,
    local_postal_code: String,
    foreign_address_1: String,
    foreign_address_2: String
  }],
  form_status: {
    type: String,
    default: 'Incomplete'
  }
})

const User = mongoose.model('User', userSchema)

module.exports = User
