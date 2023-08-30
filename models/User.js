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
    ref: 'Entity',
  },
  board_members: [
    {
      full_name: String,
      id_type: String,
      id_number: String,
      is_director: {
        type: Boolean,
        default: false,
      },
      is_shareholder: {
        type: Boolean,
        default: false,
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
    },
  ],
  status: {
    form_submitted: {
      type: String,
      default: 'incomplete',
    },
    approved: {
      type: String,
      default: 'incomplete',
    },
    screening_complete: {
      type: String,
      default: 'incomplete',
    },
    signatures_complete: {
      type: String,
      default: 'incomplete',
    },
    acra: {
      type: String,
      default: 'incomplete',
    }
  },
  timestamps: true
})

const User = mongoose.model('User', userSchema)

module.exports = User
