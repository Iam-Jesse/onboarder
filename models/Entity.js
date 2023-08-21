const mongoose = require('mongoose')

const entitySchema = new mongoose.Schema({
  name: String,
  type: String,
  suffix: String,
  registered_office_block_number: String,
  registered_office_street: String,
  registered_office_building: String,
  registered_office_level: String,
  registered_office_unit: String,
  registered_office_postal_code: String,
  other_address_1: String,
  other_address_2: String,
  activity: String,
  associated_user: String,
  activity_number: Number,
  entity_css_client: {
    type: Boolean,
    default: false
  },
  entity_auditor: {
    type: Boolean,
    default: false
  },
  entity_taxation_client: {
    type: Boolean,
    default: false
  },
  entity_corporate_shareholder: {
    type: Boolean,
    default: false
  },
  entity_fund_management: {
    type: Boolean,
    default: false
  },
  entity_accounting_client: {
    type: Boolean,
    default: false
  },
  entity_corporate_director: {
    type: Boolean,
    default: false
  },
  entity_corporate_owner: {
    type: Boolean,
    default: false
  },
  entity_external_corporate_secretary: {
    type: Boolean,
    default: false
  },
  entity_audit_client: {
    type: Boolean,
    default: false
  },
  entity_prospect: {
    type: Boolean,
    default: false
  },
  entity_client: {
    type: Boolean,
    default: false
  },
  entity_non_client: {
    type: Boolean,
    default: false
  },
  entity_country: {
    type: String,
    default: 'SINGAPORE'
  },
  entity_address_country: {
    type: String,
    default: 'SINGAPORE'
  },
  entity_registration_number: String,
  entity_status: {
    type: Boolean,
    default: false
  },
  entity_country: {
    type: String,
    default: 'Active'
  },
  entity_incorporation_date: String,
  entity_corporate_controller: String
})

const Entity = mongoose.model('Entity', entitySchema)

module.exports = Entity
