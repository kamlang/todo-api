const express = require('express');
const { expressjwt: jwt } = require("express-jwt");
const jwks = require('jwks-rsa');
const port = process.env.PORT || 8080;
const mongoose = require('mongoose');
require('dotenv').config()
const getCurrentUserInfo = require('./auth0Info')
const {Task, TaskList, User} = require('./models')
const app = express();


mongoose.connect(process.env.DATABASE_URL)

const jwkcheck = jwt({
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


app.use(jwkcheck)
app.use(express.json())

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Headers", "Authorization, Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
  next();
});


app.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    res.status(401)
    res.end() 
  } else {
    next(err);
  }
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
    throw new Error("Stopping here couldn't get user info.")
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
    throw new Error("Creating user failed.")
   }
}

async function getCurrentUser(req, res, next) {
  let auth0Sub = req.auth.sub
  let currentUser
  try {
    currentUser = await User.findOne({sub: auth0Sub})
  } catch (error) {
    res.status(500)
    res.end()
  }
  if (!currentUser) {
    console.log("User not found, creating it.")
    try {
      currentUser = await createUser(auth0Sub)
    } catch(error) {
      console.error(error)
      res.status(500)
      res.end()
    }
  }
  res.currentUser = currentUser
  next()
}

app.put('/addTask', getCurrentUser, async function(req, res) {
// Done
  try {
    const newTask = await Task.create({
      body: req.body.body,
      dueDate: req.body.dueDate
    })
    const tl = await TaskList.findOne({author: res.currentUser._id,
      name: req.body.name})
    await tl.tasks.unshift(newTask._id)
    tl.save()
    console.log(tl)
    res.status(201).json(newTask)
  } catch(error) {
    console.error(error)
    if (error.name == "ValidationError") {
      res.status(422).json({"message": "Task cannot be empty."})
      res.end()
    }
    res.status(500)
  }
    res.end()
})

app.patch('/updateTask', getCurrentUser, async function(req, res) {
  const options = { runValidators: true };

  try {
    const task = await Task.findOneAndUpdate({
      _id: req.body._id, author: res.currentUser._id },
      { body: req.body.body, dueDate: req.body.dueDate, completed:req.body.completed}, options,
    )
    res.status(201)
  } catch(error) {
    console.error(error)
    if (error.name == "ValidationError") {
      res.status(422).json({"message": "Task cannot be empty."})
      res.end()
    }
    res.status(500)
  }
    res.end()
})


app.post('/getTasks', getCurrentUser, async function(req, res) {
  try {
    const tasks = await TaskList.findOne({author: res.currentUser._id, name: req.body.name},'tasks -_id')
//      .populate({path: "tasks",select: "createdAt dueDate body completed _id", options: { sort: {'createdAt': -1}}})
      .populate({path: "tasks",select: "createdAt dueDate body completed _id"})
      .exec()
    res.json(tasks.tasks)
  } catch(error) {
    console.error("Unable to get tasks.")
    res.status(500)
  }
    res.end()
})

app.delete('/deleteTask', getCurrentUser, async function(req, res) {
  try {
    await Task.findOneAndDelete({
      _id: req.body._id, author: res.currentUser._id }
    )
    res.status(200)
  } catch(error) {
    res.status(500)
  }
    res.end()
})

app.delete('/deleteTaskList', getCurrentUser, async function(req, res) {
  try {
    const selectedTaskList = await TaskList.findOne({ author: res.currentUser._id, name: req.body.name })
    await selectedTaskList.deleteOne()
    res.status(200)
  } catch (error) {
    console.log(error)
    res.status(500)
  }
  res.end()
})

app.get('/getTaskList', getCurrentUser, async function(req, res) {
//  const tasks = await TaskList.find({author: res.currentUser._id},'name -_id')
  const tasks = await User.findOne({id: res.currentUser._id},'taskLists -_id')
      .populate({path: "taskLists",select: "name _id tasks"})
      .exec()
  console.log(tasks.taskList)
  res.json(tasks.taskLists)
  res.end()
})

app.patch('/updateTaskOrder', getCurrentUser, async function(req, res) {
  /* with $all: we're making sure that all tasks id provided in the request belong to this task list and to this user.
  Request will fail with 422 if task id is maliciously modified. */
    try {
    const result = await TaskList.findOneAndUpdate({ author: res.currentUser._id, name: req.body.name, tasks: {$all :req.body.tasks} },{tasks: req.body.tasks})
    res.status(204)
    result === null && await Promise.reject("Error: Unable to process")
  } catch (error) {
    if (error === "Error: Unable to process") res.status(422)
    else res.status(500)
  }
  res.end()
})

app.patch('/updateTaskListOrder', getCurrentUser, async function(req, res) {
  /* with $all: we're making sure that all tasks id provided in the request belong to this task list and to this user.
  Request will fail with 422 if task id is maliciously modified. */
    try {
    const result = await User.findOneAndUpdate({ author: res.currentUser._id, taskLists: {$all :req.body.taskLists} },{taskLists: req.body.taskLists})
      console.log(result)
    result === null && await Promise.reject("Error: Unable to process")
    res.status(204)
  } catch (error) {
    if (error === "Error: Unable to process") res.status(422)
    else res.status(500)
  }
  res.end()
})

app.patch('/updateTaskList', getCurrentUser, async function(req, res) {
  try {
    await TaskList.findOneAndUpdate({ author: res.currentUser._id, name: req.body.name },{name: req.body.newName})
    res.status(204)
  } catch (error) {
 console.error(error)
    if (error.name == "ValidationError") {
      res.status(422).json({"message": "Task list name cannot be empty"})
      res.end()
    } else if (error.code == "11000") {
      res.status(409).json({"message": "You already have a task list with that name, please choose another one."})
      res.end()
    }

    res.status(500)
  }
  res.end()
})
app.put('/createTaskList', getCurrentUser, async function(req, res) {
  // Done
  try {
    const newTaskList = await TaskList.create({
      author: res.currentUser._id,
      name: req.body.name
    })
    await User.findOneAndUpdate({_id: res.currentUser._id }, {$push:{taskLists: newTaskList._id}})
    res.status(201).json(newTaskList)
  } catch (error) {
    console.error(error)
    if (error.name == "ValidationError") {
      res.status(422).json({"message": "Task list name cannot be empty"})
      res.end()
    } else if (error.code == "11000") {
      res.status(409).json({"message": "You already have a task list with that name, please choose another one."})
      res.end()
    }

    res.status(500)
  }
  res.end()
})

app.listen(port);

