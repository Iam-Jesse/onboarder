const mongoose = require('mongoose')

const entitySchema = new mongoose.Schema({
  entity_name: String,
  type: String,
  suffix: String,
  registered_office_block_number: String,
  registered_office_street: String,
  registered_office_building: String,
  registered_office_level: String,
  registered_office_unit: String,
  registered_office_postal_code: String,
  activity: String,
  associated_user: String,
  activity_number: String,
  entity_registration_number: String,
  entity_incorporation_date: Number
})

const Entity = mongoose.model('Entity', entitySchema)

module.exports = Entity
