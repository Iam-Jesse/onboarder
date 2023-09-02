const express = require('express')
const router = express.Router()
const { verifyJWT } = require('../middlewares')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const { body, validationResult } = require('express-validator')
const Entity = mongoose.model('Entity')
const axios = require('axios')

router.get('/users', verifyJWT, async (req, res) => {
  try {
    const users = await User.find({ 'status.form_submitted': 'complete' })
      .populate('entity')
      .exec()
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

router.put('/user/:id', verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.json({ error: 'Invalid user' })
    }

    user.board_members.forEach((member) => {
      if (member._id == req.body._id) {
        console.log('matched')
        delete req.body._id
        console.log('old_member', member)
        member = req.body
        console.log('new member', member)
        user.save()
        return res.json({ success: 'user saved successfully' })
      }
    })
  } catch (err) {
    console.log(err)
    res.json({
      error: 'Something went wrong!',
    })
  }
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
      res.json({result: result.data})
    })
    .catch((err) => {
      console.log(err)
      return res.status(500).json({ error: 'Something went wrong' })
    })
})

module.exports = router
