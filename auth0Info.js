require('dotenv').config()
const axios = require("axios").default;
const {writeFile, readFile} = require("fs").promises;

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
    console.log(response)
    await writeFile('token.json',JSON.stringify(response.data),'utf8')
  } catch (error) {
    console.error(error)
    throw new Error("Fetching new access token failed.")
  }
}

async function getTokenFromFile() {
  try {
    let data = await readFile('token.json','utf8')
    data = JSON.parse(data)
    return data.access_token
  } catch(error) {
    console.log(error)
    throw new Error("Couldn't get token.json file.")
  }
}

async function getAccessToken() {
  let accessToken

  try {
    accessToken = await getTokenFromFile()
    return accessToken
  } catch (error) {
    throw error
  }

  try {
    accessToken = await getNewToken()
    return accessToken
  } catch (error) {
    throw error
  }
}

async function getCurrentUserInfo (auth0Sub) {
  let accessToken

  try {
    accessToken = await getAccessToken()
  } catch (error) {
    throw error
  }

  const options = {
    method: 'GET',
    url: process.env.AUTH0_DOMAIN + 'api/v2/users/' + auth0Sub,
    headers: {'content-type': 'application/json', authorization: 'Bearer ' + accessToken}
  };

  try {
    const response = await axios.request(options)
    return response.data
  } catch (error) {

    if (error.response.status == 401) {
      try {
          console.log("Token has expired, getting a new one.")
          await getNewToken()
          await getCurrentUserInfo(auth0Sub)
        } catch (error) {
          console.error(error)
          throw error
        }
    }
    console.error(error)
    throw new Error("Fetching User info failed.")
  }
}

module.exports = getCurrentUserInfo
