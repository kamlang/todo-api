const bunyan = require('bunyan');
const logger = bunyan.createLogger({
  name: 'todoApi',
  streams: [{
    type: 'rotating-file',
    path: './log/info.log',
    period: '1d',
    count: 3
  }]
});

const morgan = require('morgan')
const rfs = require("rotating-file-stream");
const path = require('path')
const accessLogStream = rfs.createStream('access.log', {
  interval: '1d',
  path: path.join(__dirname, 'log')
})
const httpLogger = morgan('combined', { stream: accessLogStream })

module.exports = { logger, httpLogger }