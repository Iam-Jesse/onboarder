const express = require('express')
const router = express.Router()
const { verifyJWT } = require('../middlewares')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const stripe = require('stripe')(process.env.STRIPE_API_KEY)
const { body, validationResult } = require('express-validator')
const Entity = mongoose.model('Entity')
const formidable = require('formidable').formidable
const tmp = require('tmp')
const fs = require('fs')
const path = require('path')

router.post(
  '/stripe',
  body('plan').trim().not().isEmpty(),
  async (req, res) => {
    const { errors } = validationResult(req)
    if (errors.length > 0) {
      return res.status(400).send({ error: 'Invalid plan ID selected' })
    }

    //Stripe
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: req.body.plan,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `https://inc.sg/payment-success`,
      cancel_url: `https://inc.sg/business-registration-plans`,
    })
    res.json({ url: session.url })
  }
)

router.post('/user', async (req, res) => {
  const { email } = req.body
  try {
    const user = await User.findOne({ email })
    if (!user) {
      throw new Error()
    }

    res.send({ status: user.status })
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/save', (req, res) => {
  const status = req.query.status
  const tmpobj = tmp.dirSync({ unsafeCleanup: true })
  let options = { uploadDir: tmpobj.name, keepExtensions: true }

  if (status === 'progress') {
    options.allowEmptyFiles = true
    options.minFileSize = 0
  }

  const form = formidable(options)

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.log(err)
      tmpobj.removeCallback()
      return res.json({ error: 'All files are required!' })
    }
    try {
      const user = await User.findOne({ email: fields.current_user[0] })
      if (!user) {
        tmpobj.removeCallback()
        return res.status(401).json({ error: 'Invalid user' })
      }
      if (user.status.form_submitted === 'complete') {
        tmpobj.removeCallback()
        return res.json({ error: 'You cannot edit details after submission' })
      }

      //Do this validation on form submit
      if (status === 'completed') {
        let total = 0
        if (Array.isArray(fields.share_percentage)) {
          total = fields.share_percentage.reduce((total, num) => {
            return total + Number(num)
          }, 0)
        } else {
          total = fields.share_percentage
        }
        if (total < 100) {
          tmpobj.removeCallback()
          return res.json({
            error:
              'Share percentages do not total to 100%, add all shareholders!',
          })
        } else if (total > 100) {
          tmpobj.removeCallback()
          return res.json({
            error: 'Share percentages total greater than 100%!',
          })
        }
      }
      //Validation end

      const membersArr = []
      for (let key in fields) {
        if (Array.isArray(fields[key])) {
          for (let i = 0; i < fields[key].length; i++) {
            if (membersArr[i]) {
              membersArr[i] = [...membersArr[i], { [key]: fields[key][i] }]
            } else {
              membersArr[i] = [{ [key]: fields[key][i] }]
            }
          }
        }
      }
      const board_members = []
      if (membersArr.length) {
        membersArr.forEach((elem) => {
          let board_member = {}
          elem.forEach((member_of_board) => {
            board_member = { ...board_member, ...member_of_board }
          })
          board_members.push(board_member)
        })
      }

      for (let i = 0; i < board_members.length; i++) {
        let is_director_radio = 'is_director'
        let is_shareholder_radio = 'is_shareholder'
        if (i > 0) {
          is_director_radio = `is_director${i + 1}`
          is_shareholder_radio = `is_shareholder${i + 1}`
        }

        //Do this validation only on form submission
        if (status === 'completed') {
          if (
            fields[is_director_radio][0] === 'no' &&
            fields[is_shareholder_radio][0] === 'no'
          ) {
            tmpobj.removeCallback()
            return res.json({
              error: 'Director and shareholder selection cannot both be No!',
            })
          }
          if (
            fields[is_shareholder_radio][0] === 'yes' &&
            (!fields.share_percentage[i] || !Number(fields.share_percentage[i]))
          ) {
            tmpobj.removeCallback()
            return res.json({
              error: 'Specify share percentages for all shareholders',
            })
          }
          if (
            fields[is_shareholder_radio] === 'no' &&
            fields.share_percentage[i] &&
            Number(fields.share_percentage[i])
          ) {
            tmpobj.removeCallback()
            return res.json({
              error: 'Only shareholders can have share percentages!',
            })
          }
          for (key in files) {
            let oldpath = files[key][i].filepath
            let newName = `${Date.now()}${files[key][i].newFilename}`
            let newpath = path.join(__dirname, `/public/files/${newName}`)
            fs.rename(oldpath, newpath, function (err) {
              if (err) {
                console.log(err)
                return res.json({ error: 'File upload failed' })
              }
            })
            board_members[i][key] = newName
          }
        }
        //Validation end
        console.log(fields)
        if (fields[is_director_radio] && fields[is_shareholder_radio]) {
          board_members[i].is_director = fields[is_director_radio][0]
          board_members[i].is_shareholder = fields[is_shareholder_radio][0]
        }
      }

      console.log(board_members)

      const activity_number = fields.activity[0].replace(/[^0-9]/g, '')
      const entity = await Entity.findOneAndUpdate(
        { associated_user: fields.current_user[0] },
        {
          entity_name: fields.entity_name[0],
          activity: fields.activity[0],
          activity_number,
          associated_user: fields.current_user[0],
          type: fields.type[0],
          suffix: fields.suffix[0],
          registered_office_block_number:
            fields.registered_office_block_number[0],
          registered_office_building: fields.registered_office_building[0],
          registered_office_level: fields.registered_office_level[0],
          registered_office_postal_code:
            fields.registered_office_postal_code[0],
          registered_office_street: fields.registered_office_street[0],
          registered_office_unit: fields.registered_office_unit[0],
        },
        { upsert: true, new: true }
      )
      if (!entity) {
        throw new Error()
      }
      user.board_members = board_members

      if (status === 'completed') {
        user.status.form_submitted = 'complete'
        user.status.approved = 'in_progress'
      } else {
        user.status.form_submitted = 'in_progress'
      }

      const savedUser = user.save()
      if (!savedUser) {
        throw new Error()
      }
      tmpobj.removeCallback()
      console.log('user saved succesfully')
      res.json({ success: 'user saved successfully' })
    } catch (err) {
      console.log(err)
      tmpobj.removeCallback()
      res.status(500).json({ error: 'Internal server error' })
    }
  })
})

router.post('/load_details', async (req, res) => {
  const { email } = req.body
  try {
    const user = await User.findOne({ email }).populate('entity').exec()
    if (!user) {
      throw new Error()
    }

    res.send(user)
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
