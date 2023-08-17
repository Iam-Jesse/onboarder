const express = require('express')
const router = express.Router()
const { verifyJWT } = require('../middlewares')
const mongoose = require('mongoose')
const { json } = require('body-parser')
const User = mongoose.model('User')

router.get('/users', verifyJWT, async (req, res) => {
  try {
    const users = await User.find()
    console.log('users fetched successfully')

    res.json({ users })
  } catch (err) {
    res.json({ error: 'Something went wrong!' })
  }
})

router.get('/user/:id', verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    res.send(user)
  } catch (err) {
    res.json({ error: 'Something went wrong! Refresh the page to try again...' })
  }
})

module.exports = router
