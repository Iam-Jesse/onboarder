const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const { readCSVFile } = require('../helpers')

router.post(
  '/check_business_name',
  body('entity_name').trim().not().isEmpty(),
  (req, res) => {
    console.log('reached')
    const { errors } = validationResult(req)
    if (errors.length > 0) {
      return res.status(400).send({ error: 'Enter valid entity name!' })
    }

    readCSVFile(req.body.entity_name, (available) => {
      res.json({available})
    })
  }
)

module.exports = router
