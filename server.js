const express = require('express');
const { expressjwt: jwt } = require("express-jwt");
const jwks = require('jwks-rsa');
const port = process.env.PORT || 8080;
const mongoose = require('mongoose');
require('dotenv').config()
const getCurrentUserInfo = require('./auth0Info')
const {Todo,User} = require('./models')
const app = express();


mongoose.connect(process.env.DATABASE_URL)

const jwtCheck = jwt({
      secret: jwks.expressJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: process.env.AUTH0_DOMAIN + ".well-known/jwks.json"
    }),
    audience: process.env.AUTH0_AUDIENCE,
    issuer: process.env.AUTH0_DOMAIN,
    algorithms: ['RS256']
});

app.use(jwtCheck);
app.use(express.json())

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Headers", "Authorization, Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
  next();
});

app.use((req, res, next) => {
  console.log('Time:', Date.now())
  next()
})

async function createUser(auth0Sub) {

 try {
    userInfo = await getCurrentUserInfo(auth0Sub)
  } catch (error) {
    console.error(error)
    throw error
  }

  try {
    let newUser = await User.create({ 
      sub: auth0Sub,
      email: userInfo.email,
      nickname: userInfo.nickname,
    });
    console.log("User created successfully.")
    return newUser
  } catch (error) {
    console.error(error)
   }
}

async function getCurrentUser(req, res, next) {
  let auth0Sub = req.auth.sub
  let currentUser = await User.findOne({sub: auth0Sub})
  if (!currentUser) {
    console.log("User not found, creating it.")
    currentUser = await createUser(auth0Sub)
  }
  res.currentUser = currentUser
  next()
}

app.put('/addTask', getCurrentUser, async function(req, res) {

  try {
    todo = await Todo.create({
      author: res.currentUser._id,
      body: req.body.body,
      completed: false
      name: req.body.name
    })
    res.status(201).json(todo)
    res.end()
  } catch(error) {
    console.error(error)
    console.error("Unable to create task.")
    res.status(500).json({message: "Something went wrong. Unable to create task."})
    res.end()
  }
})

app.patch('/updateTask', getCurrentUser, async function(req, res) {
  const options = { runValidators: true };

  try {
    todo = await Todo.findOneAndUpdate({
      _id: req.body._id, author: res.currentUser._id },
      req.body, options
    )
    res.status(201).json({message : "Task has been updated successfully."})
    res.end()
  } catch(error) {
    console.error(error)
    console.error("Unable to update task.")
    res.status(500).json({message: "Something went wrong. Unable to update task."})
    res.end()
  }
})


app.get('/getTodos', getCurrentUser, async function(req, res) {
  res.json(res.currentUser.todos)
    res.end()
})
app.get('/getTasks', getCurrentUser, async function(req, res) {

  try {
    let tasks = await Todo.find({author: res.currentUser._id, name: req.body.name})
      .populate("author","-sub -_id -__v")
      .select("-__v")
      .sort([['createdAt', -1]])
      .exec()
    res.json(tasks)
    res.end()
  } catch(error) {
    console.error("Unable to get tasks.")
    res.status(500).json({message: "Something went wrong. Unable to get tasks."})
    res.end()
  }
})

app.delete('/deleteTask', getCurrentUser, async function(req, res) {

  try {
    todo = await Todo.findOneAndDelete({
      _id: req.body._id, author: res.currentUser._id }
    )
    res.status(201)
    res.end()
    console.log("Task removed")
  } catch(error) {
    console.error(error)
    console.error("Unable to delete task.")
    res.status(500)
    res.end()
  }
})

app.listen(port);

