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

  response = await axios.request(options)
  try {
    await writeFile('token.json', response.data, 'utf8');
    return response.data.access_token
  } catch (error) {
    console.error(error)
    throw "Fetching new access token failed."
  }
}

async function getTokenFromFile() {
  try {
    let data = await readFile('token.json','utf8')
    data = JSON.parse(data)
    return data.access_token
  } catch(error) {
    console.log(error)
    throw "Couldn't get token.json file."
  }
}

async function getAccessToken() {
  let accessToken

  try {
    accessToken = await getTokenFromFile()
    return accessToken
  } catch (error) {
    console.error("Error happend fetching token from file, creating token.json.")
  }

  try {
    accessToken = await getNewToken()
    return accessToken
  } catch (error) {
    console.error(error)
  }
}

async function getUserInfo (auth0Sub) {
  let accessToken

  try {
    accessToken = await getAccessToken()
  } catch (error) {
    console.error(error)
    throw "Couldn't get valid access token"
  }

  const options = {
    method: 'GET',
    url: process.env.AUTH0_DOMAIN + 'api/v2/users/' + auth0Sub,
    headers: {'content-type': 'application/json', authorization: 'Bearer ' + accessToken}
  };
  try {
    response = await axios.request(options)
    return response.data
  } catch (error) {
    console.error(error)

    if (response.data.statusCode == 401) {
      try {
          await getNewToken()
          await getUserInfo(auth0Sub)
        } catch (error) {
          console.error(error)
        }
    }
    throw "Fetching User info failed."
  }
}

module.exports = getUserInfo
