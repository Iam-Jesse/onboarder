const express = require('express')
const router = express.Router()
const authRoutes = require('./auth-routes')
const userRoutes = require('./user-routes')
const entityRoutes = require('./entity-routes')
const adminRoutes = require('./admin-routes')

router.use('/', authRoutes)
router.use('/', userRoutes)
router.use('/', entityRoutes)
router.use('/', adminRoutes)

module.exports = router