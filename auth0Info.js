require('dotenv').config()
const axios = require("axios").default;
const { writeFile, readFile } = require("fs").promises;
const { logger: log } = require('./loggers.js')
async function getNewToken() {

  const options = {
    method: 'POST',
    url: process.env.AUTH0_DOMAIN + 'oauth/token',
    headers: { 'content-type': 'application/json' },
    data: {
      grant_type: 'client_credentials',
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: process.env.AUTH0_DOMAIN + 'api/v2/'
    }
  };
  try {
    response = await axios.request(options)
    await writeFile(process.env.TOKEN_FILE, JSON.stringify(response.data), 'utf8')
  } catch (error) {
    log.error(error)
    throw new Error("Fetching new access token failed.")
  }
}

async function getTokenFromFile() {
  try {
    let data = await readFile(process.env.TOKEN_FILE, 'utf8')
    data = JSON.parse(data)
    return data.access_token
  } catch (error) {
    log.error(error)
    throw new Error("Couldn't get token.json file.")
  }
}

async function getAccessToken() {
  let accessToken

  try {
    accessToken = await getTokenFromFile()
    return accessToken
  } catch (error) {
    log.error(error)
  }

  try {
    accessToken = await getNewToken()
    return accessToken
  } catch (error) {
    log.error(error)
    throw error
  }
}

async function getCurrentUserInfo(auth0Sub) {
  let accessToken

  try {
    accessToken = await getAccessToken()
  } catch (error) {
    log.error(error)
    throw error
  }

  const options = {
    method: 'GET',
    url: process.env.AUTH0_DOMAIN + 'api/v2/users/' + auth0Sub,
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + accessToken }
  };

  try {
    const response = await axios.request(options)
    return response.data
  } catch (error) {

    if (error.response.status == 401) {
      try {
        log.error("Token has expired, getting a new one.")
        await getNewToken()
        await getCurrentUserInfo(auth0Sub)
      } catch (error) {
        log.error(error)
        throw error
      }
    }
    log.error(error)
    throw new Error("Fetching User info failed.")
  }
}

module.exports = getCurrentUserInfo
