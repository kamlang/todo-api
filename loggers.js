const bunyan = require('bunyan');
const logger = bunyan.createLogger({
  name: 'todoApi',
  streams: [{
    type: 'rotating-file',
    path: './info.log',
    period: '1d',   // daily rotation
    count: 3        // keep 3 back copies
  }]
});

const morgan = require('morgan')
const rfs = require("rotating-file-stream");
const path = require('path')
const accessLogStream = rfs.createStream('access.log', {
  interval: '1d', // rotate daily
  path: path.join(__dirname, 'log')
})
const httpLogger = morgan('combined', { stream: accessLogStream })

module.exports = { logger, httpLogger }