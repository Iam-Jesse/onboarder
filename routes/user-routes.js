const express = require('express')
const router = express.Router()
const { verifyJWT } = require('../middlewares')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const stripe = require('stripe')(process.env.STRIPE_API_KEY)
const { body, validationResult } = require('express-validator')
const Webflow = require('webflow-api')
const webflow = new Webflow({ token: process.env.WEBFLOW_TOKEN })
const Entity = mongoose.model('Entity')

router.get('/users', verifyJWT, async (req, res) => {
  try {
    const users = await User.find().populate('entity').exec()
    console.log('users fetched successfully')

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
          price: 'price_1MOZRTJp6DOEkx8J79J1JPxR',
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `https://incsingapore.webflow.io/payment-success`,
      cancel_url: `https://incsingapore.webflow.io/payment-error`,
    })
    res.json({ url: session.url })
  }
)

router.post(
  '/shareholder',
  body('full_name').trim().not().isEmpty(),
  body('id_type').trim().not().isEmpty(),
  body('id_number').trim().not().isEmpty(),
  body('role').trim().not().isEmpty(),
  body('email').trim().isEmail(),
  body('nationality').trim().not().isEmpty(),
  body('country_of_birth').trim().not().isEmpty(),
  body('date_of_birth').trim().not().isEmpty(),
  body('country_code').trim().not().isEmpty(),
  body('phone').trim().not().isEmpty(),
  body('local_house_no').trim().not().isEmpty(),
  body('local_level').trim().not().isEmpty(),
  body('local_building').trim().not().isEmpty(),
  body('local_unit_no').trim().not().isEmpty(),
  body('local_postal_code').trim().not().isEmpty(),
  body('foreign_address_1').trim().not().isEmpty(),
  body('foreign_address_2').trim().not().isEmpty(),
  async (req, res) => {
    const { errors } = validationResult(req)
    if (errors.length > 0) {
      return res
        .status(400)
        .send({ error: 'All fields marked asterisks are required!' })
    }

    const is_shareholder = req.body.share_percentage.trim() ? true : false

    try {
      const authenticatedUser = await webflow.authenticatedUser()
      const user = await User.findOne({
        webflow_id: authenticatedUser.user._id,
      })
      console.log(authenticatedUser, user)
      if (!user) {
        return res.status(401).json({ error: 'Invalid user' })
      }
      user.board_members.push({ ...req.body, is_shareholder })
      user.save()

      res.send('board member added successfully!')
    } catch (err) {
      console.log(err)
      res.status(500).json({ error: 'Something went wrong!' })
    }
  }
)

router.post(
  '/entity',
  body('name').trim().not().isEmpty(),
  body('type').trim().not().isEmpty(),
  body('suffix').trim().not().isEmpty(),
  body('activity').trim().not().isEmpty(),
  body('registered_office_block_number').trim().not().isEmpty(),
  body('registered_office_street').trim().not().isEmpty(),
  body('registered_office_level').trim().not().isEmpty(),
  body('registered_office_building').trim().not().isEmpty(),
  body('registered_office_unit').trim().not().isEmpty(),
  body('registered_office_postal_code').trim().not().isEmpty(),
  body('other_address_1').trim().not().isEmpty(),
  body('other_address_2').trim().not().isEmpty(),
  async (req, res) => {
    const { errors } = validationResult(req)
    if (errors.length > 0) {
      return res
        .status(400)
        .send({ error: 'All fields marked asterisks are required!' })
    }

    const activity_split = req.body.activity.split(':')
    const activity_number = activity_split[1]
    const activity = activity_split[0]

    try {
      const authenticatedUser = await webflow.authenticatedUser()
      const user = await User.findOne({
        webflow_id: authenticatedUser.user._id,
      })
      console.log(authenticatedUser, user)
      if (!user) {
        return res.status(401).json({ error: 'Invalid user' })
      }

      const entity = await Entity.findOneAndUpdate(
        { associated_user: authenticatedUser.user._id },
        { ...req.body, activity_number },
        { upsert: true, new: true }
      )
      if (!entity) {
        throw new Error()
      }

      user.entity = entity._id
      user.save()

      res.send('entity added successfully!')
    } catch (err) {
      console.log(err)
      res.status(500).json({ error: 'Something went wrong!' })
    }
  }
)

router.post('/onboarding_details', async (req, res) => {
  try {
    const authenticatedUser = await webflow.authenticatedUser()

    if (!authenticatedUser) {
      res.status(401).json({ error: 'Invalid user' })
    }

    console.log(authenticatedUser)

    const user = await User.findOne({ webflow_id: authenticatedUser.user._id })
      .populate('entity')
      .exec()
    if (!user) {
      throw new Error('User not found')
    }

    res.send(user)
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Something went wrong!' })
  }
})

router.post('/submit_onboarding_details', async (req, res) => {
  try {
    const authenticatedUser = await webflow.authenticatedUser()

    if (!authenticatedUser) {
      res.status(401).json({ error: 'Invalid user' })
    }

    const user = await User.findOne({ webflow_id: authenticatedUser.user._id })
    if (!user) {
      throw new Error('User not found')
    }
    const numBoard = user.board_members.length
    console.log(numBoard)
    const membersArr = []

    for (let key in req.body) {
      if (Array.isArray(req.body[key])) {
        if (req.body[key].length !== numBoard) {
          return res.status(400).json({ error: 'Bad request' })
        }
        for (let i = 0; i < req.body[key].length; i++) {
          req.body[key][i].trim()
          if (key != 'share_percentage[]' && req.body[key][i] === '') {
            return res
              .status(400)
              .json({ error: 'All fields marked asterisks are required' })
          }
          const newKey = key.split('[')[0]
          if (membersArr[i]) {
            membersArr[i] = [...membersArr[i], { [newKey]: req.body[key][i] }]
          } else {
            membersArr[i] = [{ [newKey]: req.body[key][i] }]
          }
        }
      } else {
        req.body[key].trim()
        if (req.body[key] === '') {
          return res
            .status(400)
            .json({ error: 'All fields marked asterisks are required' })
        }
      }
    }

    const board_members = []
    membersArr.forEach(elem => {
      let board_member = {}
      elem.forEach(member_of_board => {
        board_member = {...board_member, ...member_of_board}
        if(member_of_board.share_percentage) {
          board_member.is_shareholder = true
        }
      })
      board_members.push(board_member)
    })

    console.log(board_members)

    const {
      entity_name: name,
      type,
      suffix,
      activity,
      registered_office_block_number,
      registered_office_street,
      registered_office_level,
      registered_office_building,
      registered_office_unit,
      registered_office_postal_code,
      other_address_1,
      other_address_2,
    } = req.body
    Entity.findOneAndUpdate(
      { _id: user.entity },
      {
        name,
        type,
        suffix,
        activity,
        registered_office_block_number,
        registered_office_building,
        registered_office_level,
        registered_office_postal_code,
        registered_office_street,
        registered_office_unit,
        other_address_1,
        other_address_2,
      }
    )

    //Update user
    user.board_members = board_members
    user.form_status = 'Complete'
    user.save()

    res.send('Form submitted successfully')
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Something went wrong!' })
  }
})

module.exports = router
