require('dotenv').config()
const axios = require("axios");
const { writeFile, readFile } = require("fs").promises;
const { logger: log } = require('./loggers.js')

async function fetchTokenAndWriteItToFile() {

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
    log.info("Requesting a new token from auth0.")
    const response = await axios.request(options)
    log.info("Writing new token to file.")
    await writeFile(process.env.TOKEN_FILE, JSON.stringify(response.data), { flag: 'w' }, 'utf8')
  } catch (error) {
    log.error(error)
    throw new Error("Fetching new access token failed.")
  }
}


async function readTokenFromFile() {
  try {
    log.info("Reading token from file...")
    let data = await readFile(process.env.TOKEN_FILE, 'utf8')
    data = JSON.parse(data)
    return data.access_token
  } catch (error) {
    throw new Error(`${process.env.TOKEN_FILE} not found.`)
  }
}

async function getAccessToken() {
  try {
    let accessToken = await readTokenFromFile()
    return accessToken
  } catch (error) {
    log.error(error)
  }

  try {
    await fetchTokenAndWriteItToFile()
    let accessToken = await readTokenFromFile()
    return accessToken
  } catch (error) {
    log.error(error)
    throw error
  }
}

async function fetchCurrentUserInfo(auth0Sub) {

  let accessToken = await getAccessToken()

  const options = {
    method: 'GET',
    url: process.env.AUTH0_DOMAIN + 'api/v2/users/' + auth0Sub,
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + accessToken }
  };

  try {
    log.info("Getting user info from auth0.")
    const response = await axios.request(options)
    return response.data
  } catch (error) {

    if (error.response.status == 401) {
      try {
        log.info("Token has expired, getting a new one.")
        await fetchTokenAndWriteItToFile()
        await fetchCurrentUserInfo(auth0Sub)
      } catch (error) {
        log.error(error)
        throw error
      }
    } else {
      log.error(error)
      throw new Error("Fetching User info failed.")
    }
  }
}

module.exports = fetchCurrentUserInfo