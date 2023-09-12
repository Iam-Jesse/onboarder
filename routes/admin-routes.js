const express = require('express')
const router = express.Router()
const { verifyJWT } = require('../middlewares')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const { body, validationResult } = require('express-validator')
const Entity = mongoose.model('Entity')
const axios = require('axios')
const formidable = require('formidable').formidable
const tmp = require('tmp')
const fs = require('fs')

router.get('/users', verifyJWT, async (req, res) => {
  try {
    const users = await User.find({ 'status.form_submitted': 'complete' })
      .populate('entity')
      .exec()

    res.json({ users })
  } catch (err) {
    res.json({ error: 'Something went wrong!' })
  }
})

router.get('/user/:id', verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('entity').exec()

    res.send(user)
  } catch (err) {
    res.json({
      error: 'Something went wrong! Refresh the page to try again...',
    })
  }
})

router.put(
  '/user/:id',
  verifyJWT,
  body('full_name').trim().not().isEmpty(),
  body('id_type').trim().not().isEmpty(),
  body('id_number').trim().not().isEmpty(),
  body('is_director').trim().not().isEmpty(),
  body('is_shareholder').trim().not().isEmpty(),
  body('email').trim().not().isEmpty(),
  body('nationality').trim().not().isEmpty(),
  body('country_of_birth').trim().not().isEmpty(),
  body('date_of_birth').trim().not().isEmpty(),
  body('country_code').trim().not().isEmpty(),
  body('phone').trim().not().isEmpty(),
  body('local_house_no').trim().not().isEmpty(),
  body('local_street_name').trim().not().isEmpty(),
  async (req, res) => {
    const { errors } = validationResult(req)
    if (errors.length > 0) {
      return res.status(400).send({ error: 'All fields are required!' })
    }
    if (req.body.is_director === 'no' && req.body.is_shareholder === 'no') {
      return res.json({
        error: 'Director and shareholder selection cannot both be No!',
      })
    }
    if (
      req.body.is_shareholder === 'yes' &&
      (!req.body.share_percentage || !Number(req.body.share_percentage))
    ) {
      return res.json({
        error: 'Specify share percentages for shareholder',
      })
    }
    try {
      const user = await User.findOneAndUpdate(
        { 'board_members._id': req.body._id },
        {
          $set: {
            'board_members.$': req.body,
          },
        },
        { new: true }
      )

      if (!user) {
        return res.json({ error: 'Invalid user' })
      }
      return res.json({ success: 'user saved successfully' })
    } catch (err) {
      console.log(err)
      res.json({
        error: 'Something went wrong!',
      })
    }
  }
)

router.post('/user/:id/:status', verifyJWT, async (req, res) => {
  const progress = {
    approved: {
      approved: req.body.result ? 'complete' : 'in_progress',
      screening_complete: req.body.result ? 'in_progress' : 'incomplete',
      signatures_complete: 'incomplete',
      acra: 'incomplete',
    },
    screening_complete: {
      approved: 'complete',
      screening_complete: req.body.result ? 'complete' : 'in_progress',
      signatures_complete: req.body.result ? 'in_progress' : 'incomplete',
      acra: 'incomplete',
    },
    signatures_complete: {
      approved: 'complete',
      screening_complete: 'complete',
      signatures_complete: req.body.result ? 'complete' : 'in_progress',
      acra: req.body.result ? 'in_progress' : 'incomplete',
    },
    acra: {
      approved: 'complete',
      screening_complete: 'complete',
      signatures_complete: 'complete',
      acra: req.body.result ? 'complete' : 'in_progress',
    },
  }
  try {
    const user = await User.findOne({ _id: req.params.id })
    if (!user) {
      throw new Error()
    }
    user.status = { ...user.status, ...progress[req.params.status] }
    user.save()
    res.json({ status: user.status })
    console.log('status updated successfully')
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

router.put(
  '/entity/:id',
  verifyJWT,
  body('entity_name').trim().not().isEmpty(),
  body('type').trim().not().isEmpty(),
  body('suffix').trim().not().isEmpty(),
  body('activity').trim().not().isEmpty(),
  body('registered_office_block_number').trim().not().isEmpty(),
  body('registered_office_street').trim().not().isEmpty(),
  body('registered_office_level').trim().not().isEmpty(),
  body('registered_office_unit').trim().not().isEmpty(),
  body('registered_office_building').trim().not().isEmpty(),
  body('registered_office_postal_code').trim().not().isEmpty(),
  async (req, res) => {
    console.log(req.body)
    const { errors } = validationResult(req)
    if (errors.length > 0) {
      return res.status(400).send({ error: 'All fields are required!' })
    }
    try {
      const activity_number = req.body.activity.replace(/[^0-9]/g, '')
      console.log(activity_number)
      const entity = await Entity.findOneAndUpdate(
        { _id: req.body._id },
        { ...req.body, activity_number },
        { new: true }
      )

      if (!entity) {
        throw new Error()
      }
      return res.json({ success: 'entity saved successfully' })
    } catch (err) {
      console.log(err)
      res.json({
        error: 'Something went wrong!',
      })
    }
  }
)

router.put('/image/:member/:image', verifyJWT, (req, res) => {
  const tmpobj = tmp.dirSync({ unsafeCleanup: true })
  let options = { uploadDir: tmpobj.name, keepExtensions: true }
  const form = formidable(options)

  form.parse(req, async (err, fields, files) => {
    if (err) {
      tmpobj.removeCallback()
      return res.json({ error: 'File is required!' })
    }
    console.log(fields)

    let oldpath = files[req.params.image][0].filepath
    let newName = `${Date.now()}${files[req.params.image][0].newFilename}`
    let newpath = `${process.cwd()}/public/files/${newName}`
    let previouspath = `${process.cwd()}/public/files/${fields.previous[0]}`
    fs.renameSync(oldpath, newpath)

    fs.access(previouspath, fs.constants.F_OK, (error) => {
      if (error) {
        console.log(error)
        return res.json({ error: 'File deletion failed' })
      }
      fs.unlinkSync(previouspath)
    })

    try {
      const user = await User.findOneAndUpdate(
        { 'board_members._id': req.params.member },
        {
          $set: {
            [`board_members.$.${req.params.image}`]: newName,
          },
        },
        { new: true }
      )
      if (!user) {
        throw new Error()
      }
      res.json({ success: 'Image updated successfully' })
    } catch (err) {
      console.log(err)
      tmpobj.removeCallback()
      res.status(500).json({ error: 'Internal server error' })
    }
  })
})

router.post('/sentroweb', verifyJWT, (req, res) => {
  console.log('sentroweb api reached')
  const queries = []
  req.body.forEach((item) => {
    item.fuzzy = true
    item.gender = null
    item.searchEntity = false
    item.searchIndividual = true
    queries.push(item)
  })

  axios
    .post(
      'https://api.ingenique.asia/sentroweb-service/screening/v1.0/search',

      JSON.stringify({ queries }),
      {
        headers: {
          Authorization: `Bearer eyJhbGciOiJIUzUxMiJ9.eyJhY2NvdW50SWQiOiIzMDBsaXZlIiwiaWF0IjoxNjg5NjYwNDcyLCJ1c2VySWQiOiI5MTUifQ.VErt2Dk1qVsekmA5HmEW1zTZM3kmQDq-FDom9lSncUEdzq9LXfTQdM7206CX3C6W04FFZ1incdrdWCPtdAiVlQ`,
          'Content-Type': 'application/json',
          'x-api-key': 'oo7KUatYqm3iLra6MhLta2BAeh6lIpUH9aoBTXg8',
          'x-sector-id': 'SGDJ',
          'X-account-name': '300live',
        },
      }
    )
    .then((result) => {
      res.json({ result: result.data })
    })
    .catch((err) => {
      if (err.response) {
        return res
          .status(err.response.status)
          .json({ error: err.response.statusText })
      }
      return res.status(500).json({ error: 'Something went wrong' })
    })
})

module.exports = router
