if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const express = require('express')
const mongoose = require('mongoose')
const path = require('path')

//Database connection
mongoose.connect(process.env.CONN).catch((error) => {
  //handle errors
  console.log(error)
})

//Models
require('./models/Admin')
require('./models/User')

const routes = require('./routes')
const bodyParser = require('body-parser')
const app = express()
var methodOverride = require('method-override')

app.use(bodyParser.json())
app.use(methodOverride('_method'))
app.use(express.static(path.resolve(__dirname, "./build")));

//Routes
app.use('/api/', routes)

//All other GET requests not handled before will return our React app
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "./build", "index.html"));
});

app.listen(3001, () => {
  console.log('server is running')
})
