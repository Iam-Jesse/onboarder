const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const mongoose = require('mongoose')
const Admin = mongoose.model('Admin')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

router.post(
  '/login',
  body('email').isEmail().withMessage('Invalid email').trim(),
  body('password')
    .trim()
    .not()
    .isEmpty()
    .withMessage('All fields are required'),
  async (req, res) => {
    const { errors } = validationResult(req)
    console.log(errors)
    if (errors.length > 0) {
      return res.status(401).send({ error: errors[0].msg })
    }

    const { email, password } = req.body

    try {
      const user = await Admin.findOne({ email })

      if (!user) {
        console.log('no user found')
        return res.status(401).send({ error: 'Invalid email or password' })
      }

      const verifiedPassword = await bcrypt.compare(password, user.password)

      if (!verifiedPassword) {
        console.log('invalid password')
        return res.status(401).send({ error: 'Invalid email or password' })
      }

      console.log(user)
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '15m',
      })
      return res.status(200).send({ token })
    } catch (err) {
      console.log(err)
      res.status(500).send({ error: 'Internal server error' })
    }
  }
)

module.exports = router
