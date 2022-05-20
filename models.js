const mongoose = require('mongoose')
const { Schema } = mongoose;

const todoSchema = new Schema({
  author: { 
    type: Schema.Types.ObjectId,
    ref: 'User' ,
    immutable: true 
  },
  body: {
    type: String,
    minLength : 5
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    immutable: true 
  },
  completed: Boolean,
  name: {
    type: String
    minLength : 1
    default : "main"
  }
});

const userSchema = new Schema({
  sub: {
    type: String,
    required :true
  },
  nickname: String,
  email: {
    type: String,
    unique: true
  },
  joinedAt: { 
    type: Date,
    default: Date.now,
    immutable: true
  },
  todos: [todoSchema]
})

const project = new Schema({

})


const Todo = mongoose.model('Todo', todoSchema);
const User = mongoose.model('User', userSchema);

module.exports = { 
  "Todo" : Todo,
  "User" : User
}
