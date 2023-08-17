const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const Admin = mongoose.model('Admin')

const verifyJWT = (req, res, next) => {
  const token = req.headers.authorization.split('Bearer ')[1]

  jwt.verify(token, process.env.JWT_SECRET, async (error, decoded) => {
    if(error){
      return res.json({logout: 'invalid jwt'})
    }

    const user = await Admin.findById(decoded.id)
    if(!user){
      return res.json({logout: 'invalid jwt'})
    }

    req.id = decoded.id
    next()
  })
}

module.exports = {
  verifyJWT
}
