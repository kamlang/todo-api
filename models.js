const mongoose = require('mongoose')
const { Schema } = mongoose;

const taskSchema = new Schema({
  body: {
    type: String,
    minLength : 1
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    immutable: true 
  },
  completed: {
    type: Boolean,
    default: false
  },
  dueDate: Date
});

const taskListSchema = new Schema({
  author: { 
    type: Schema.Types.ObjectId,
    ref: 'User' ,
    immutable: true 
  },
  name: {
    type: String,
    minLength : 1,
    default : "Main",
    unique: true
  },
  tasks:{
    type: [Schema.Types.ObjectId],
    ref: 'Task'
  }
})

taskListSchema.pre('deleteOne',{document:true}, async function(next) {
  await Task.deleteMany({ _id: {$in: this.tasks}})
  next();
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
})

const Task = mongoose.model('Task', taskSchema);
const User = mongoose.model('User', userSchema);
const TaskList = mongoose.model('TaskList', taskListSchema);

module.exports = { 
  "Task" : Task,
  "TaskList" : TaskList,
  "User" : User
}
