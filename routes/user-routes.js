const express = require('express')
const router = express.Router()
const { verifyJWT } = require('../middlewares')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const stripe = require('stripe')(process.env.STRIPE_API_KEY)
const { body, validationResult } = require('express-validator')
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

router.post('/save_progress', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.current_user })
    if (!user) {
      return res.status(401).json({ error: 'Invalid user' })
    }
    if (user.status.form_submitted === 'complete') {
      return res.json({ error: 'You cannot edit details after submission' })
    }
    const {
      current_user,
      entity_name,
      type,
      suffix,
      registered_office_block_number,
      registered_office_building,
      registered_office_level,
      registered_office_postal_code,
      registered_office_street,
      registered_office_unit,
    } = req.body

    const activity_split = req.body.activity.split(':')
    const activity_number = activity_split[1]
    const activity = activity_split[0]

    console.log(activity)
    console.log(activity_number)

    const entity = await Entity.findOneAndUpdate(
      { associated_user: current_user },
      {
        entity_name,
        activity,
        activity_number,
        associated_user: current_user,
        type,
        suffix,
        registered_office_block_number,
        registered_office_building,
        registered_office_level,
        registered_office_postal_code,
        registered_office_street,
        registered_office_unit,
      },
      { upsert: true, new: true }
    )
    if (!entity) {
      throw new Error()
    }
    console.log(entity)

    const membersArr = []
    for (let key in req.body) {
      if (Array.isArray(req.body[key])) {
        for (let i = 0; i < req.body[key].length; i++) {
          if (membersArr[i]) {
            membersArr[i] = [...membersArr[i], { [key]: req.body[key][i] }]
          } else {
            membersArr[i] = [{ [key]: req.body[key][i] }]
          }
        }
      }
    }
    const board_members = []
    if(membersArr.length) {
      membersArr.forEach((elem) => {
        let board_member = {}
        elem.forEach((member_of_board) => {
          board_member = { ...board_member, ...member_of_board }
          /*if(member_of_board.share_percentage) {
            board_member.is_shareholder = true
          }*/
        })
        board_members.push(board_member)
      })
    } else {
      const {
        full_name,
        id_number,
        id_type,
        share_percentage,
        email,
        nationality,
        country_of_birth,
        date_of_birth,
        country_code,
        phone,
        local_house_no,
        local_street_name,
        local_level,
        local_building,
        local_unit_no,
        local_postal_code,
      } = req.body
      const memberObj = {
        full_name,
        id_number,
        id_type,
        share_percentage,
        email,
        nationality,
        country_of_birth,
        date_of_birth,
        country_code,
        phone,
        local_house_no,
        local_street_name,
        local_level,
        local_building,
        local_unit_no,
        local_postal_code,
      }
      board_members.push(memberObj)
    }
    for (let i = 0; i < board_members.length; i++) {
      let is_director_radio = 'is_director'
      let is_shareholder_radio = 'is_shareholder'
      if (i > 0) {
        is_director_radio = `is_director${i + 1}`
        is_shareholder_radio = `is_shareholder${i + 1}`
      }
      board_members[i].is_director = req.body[is_director_radio]
      board_members[i].is_shareholder = req.body[is_shareholder_radio]
    }

    user.board_members = board_members
    user.entity = entity._id
    user.status.form_submitted = 'in_progress'

    const savedUser = user.save()
    if (!savedUser) {
      throw new Error()
    }

    console.log('user saved succesfully')
    res.json({ success: 'progress saved successfully' })
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/save_details', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.current_user })
    if (!user) {
      return res.status(401).json({ error: 'Invalid user' })
    }
    if (user.status.form_submitted === 'complete') {
      return res.json({ error: 'You cannot edit details after submission' })
    }

    let total = 0

    if (Array.isArray(req.body.share_percentage)) {
      total = req.body.share_percentage.reduce((total, num) => {
        return total + Number(num)
      }, 0)
    }else {
      total = req.body.share_percentage
    }

    if (total < 100) {
      return res.json({
        error: 'Share percentages do not total to 100%, add all shareholders!',
      })
    } else if (total > 100) {
      return res.json({ error: 'Share percentages total greater than 100%!' })
    }

    console.log(req.body)

    const membersArr = []
    for (let key in req.body) {
      if (Array.isArray(req.body[key])) {
        for (let i = 0; i < req.body[key].length; i++) {
          if (membersArr[i]) {
            membersArr[i] = [...membersArr[i], { [key]: req.body[key][i] }]
          } else {
            membersArr[i] = [{ [key]: req.body[key][i] }]
          }
        }
      }
    }
    const board_members = []
    if(membersArr.length) {
      membersArr.forEach((elem) => {
        let board_member = {}
        elem.forEach((member_of_board) => {
          board_member = { ...board_member, ...member_of_board }
          /*if(member_of_board.share_percentage) {
            board_member.is_shareholder = true
          }*/
        })
        board_members.push(board_member)
      })
    } else {
      const {
        full_name,
        id_number,
        id_type,
        share_percentage,
        email,
        nationality,
        country_of_birth,
        date_of_birth,
        country_code,
        phone,
        local_house_no,
        local_street_name,
        local_level,
        local_building,
        local_unit_no,
        local_postal_code,
      } = req.body
      const memberObj = {
        full_name,
        id_number,
        id_type,
        share_percentage,
        email,
        nationality,
        country_of_birth,
        date_of_birth,
        country_code,
        phone,
        local_house_no,
        local_street_name,
        local_level,
        local_building,
        local_unit_no,
        local_postal_code,
      }
      board_members.push(memberObj)
    }

    for (let i = 0; i < board_members.length; i++) {
      let is_director_radio = 'is_director'
      let is_shareholder_radio = 'is_shareholder'
      if (i > 0) {
        is_director_radio = `is_director${i + 1}`
        is_shareholder_radio = `is_shareholder${i + 1}`
      }
      if (
        req.body[is_director_radio] === 'no' &&
        req.body[is_shareholder_radio] === 'no'
      ) {
        return res.json({
          error: 'Director and shareholder selection cannot both be No!',
        })
      }
      if (
        req.body[is_shareholder_radio] === 'yes' &&
        (!req.body.share_percentage[i] || !Number(req.body.share_percentage[i]))
      ) {
        return res.json({
          error: 'Specify share percentages for all shareholders',
        })
      }
      if (
        req.body[is_shareholder_radio] === 'no' &&
        req.body.share_percentage[i] &&
        Number(req.body.share_percentage[i])
      ) {
        return res.json({
          error: 'Only shareholders can have share percentages!',
        })
      }
      board_members[i].is_director = req.body[is_director_radio]
      board_members[i].is_shareholder = req.body[is_shareholder_radio]
    }

    const {
      current_user,
      entity_name,
      type,
      suffix,
      registered_office_block_number,
      registered_office_building,
      registered_office_level,
      registered_office_postal_code,
      registered_office_street,
      registered_office_unit,
    } = req.body

    const activity_split = req.body.activity.split(':')
    const activity_number = activity_split[1]
    const activity = activity_split[0]

    const entity = await Entity.findOneAndUpdate(
      { associated_user: current_user },
      {
        entity_name,
        activity,
        activity_number,
        associated_user: current_user,
        type,
        suffix,
        registered_office_block_number,
        registered_office_building,
        registered_office_level,
        registered_office_postal_code,
        registered_office_street,
        registered_office_unit,
      },
      { upsert: true, new: true }
    )
    if (!entity) {
      throw new Error()
    }

    user.board_members = board_members
    user.entity = entity._id
    user.status.form_submitted = 'complete'
    user.status.approved = 'in_progress'

    const savedUser = user.save()
    if (!savedUser) {
      throw new Error()
    }

    console.log('user saved succesfully')
    res.json({ success: 'user saved successfully' })
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Internal server error' })
  }
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

/*router.post(
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
})*/

module.exports = router
