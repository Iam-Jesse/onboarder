const express = require('express')
const router = express.Router()
const stripe = require('stripe')(process.env.STRIPE_API_KEY)
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const axios = require('axios')

router.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']
    console.log(sig)

    let event

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.WEBHOOK_SECRET
      )
    } catch (err) {
      console.log(err)
      res.status(400).json(`webhook error: ${err.message}`)
    }

    // Handle the event
    if (
      event.type === 'checkout.session.completed' &&
      event.data.object.payment_status === 'paid'
    ) {
      const email = event.data.object.customer_details.email
      console.log(email)

      try {
        const newUser = await User.findOneAndUpdate(
          { email },
          {
            email,
            payment_status: 'successful'
          },
          { upsert: true, new: true }
        )

        console.log('new user', newUser)

        const webflowUser = await axios.post(
          `https://api.webflow.com/sites/${process.env.WEBFLOW_SITE_ID}/users/invite`,
          {
            email,
            accessGroups: ['Users'],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              authorization:
                `Bearer ${process.env.WEBFLOW_TOKEN}`,
            },
          }
        )

        if (webflowUser) {
          newUser.webflow_id = webflowUser.data._id
          newUser.save()
        }
      } catch (err) {
        console.log(err)
      }
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true })
  }
)

module.exports = router
