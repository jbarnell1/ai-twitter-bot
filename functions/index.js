

const functions = require("firebase-functions");
const admin = require("firebase-admin") ;
const { DotEnv } = require('dotenv').config();
admin.initializeApp() ;

const YOUR_CLIENT_ID = process.env.clientId;
const YOUR_CLIENT_SECRET = process.env.clientSecret;

const dbRef = admin.firestore().doc('tokens/demo') ;


const TwitterApi = require('twitter-api-v2').default;
const { OpenAIApiAxiosParamCreator } = require("openai");
const twitterClient = new TwitterApi({
    clientId: YOUR_CLIENT_ID,
    clientSecret: YOUR_CLIENT_SECRET,
}) ;

const callbackURL = 'http://127.0.0.1:5000/ai-twitter-bot/us-central1/callback'

const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
    organization: process.env.aiOrg,
    apiKey: process.env.aiApiKey,
});
const openai = new OpenAIApi(configuration);

// step 1
exports.auth = functions.https.onRequest( async (request, response) => {

    const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
        callbackURL,
        { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
    );

    //store verifier
    await dbRef.set({ codeVerifier, state });

    response.redirect(url) ;

}) ;


// step 2
exports.callback = functions.https.onRequest( async (request, response) => {

    const { state, code } = request.query;

    const dbSnapshot = await dbRef.get();
    const { codeVerifier, state: storedState } = dbSnapshot.data();

    if (state !== storedState) {
        return response.status(400).send('Stored tokens did NOT match!');
    }

    const {
        client: loggedClient,
        accessToken,
        refreshToken,
    } = await twitterClient.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: callbackURL,

    });

    await dbRef.set({ accessToken, refreshToken }) ;

    response.sendStatus(200);

}) ;


// // step 3
exports.tweet = functions.https.onRequest( async (request, response) => {
    const { refreshToken } = (await dbRef.get()).data();
  
    const {
      client: refreshedClient,
      accessToken,
      refreshToken: newRefreshToken,
    } = await twitterClient.refreshOAuth2Token(refreshToken);
  
    await dbRef.set({ accessToken, refreshToken: newRefreshToken });
  
    const nextTweet = await openai.createCompletion('text-davinci-001', {
      prompt: 'tweet something cool for #techtwitter',
      max_tokens: 64,
    });
  
    const { data } = await refreshedClient.v2.tweet(
      nextTweet.data.choices[0].text
    );
  
    response.send(data);
  });


  const prompts = [

  ]