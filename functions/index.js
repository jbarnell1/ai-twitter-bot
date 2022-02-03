const functions = require("firebase-functions");
const admin = require("firebase-admin") ;
admin.initializeApp() ;

<script type="text/javascript" src="/home/jbarnell/twitter-helper/key.js"></script>


const YOUR_CLIENT_ID = data[0].clientId;
const YOUR_CLIENT_SECRET = data[0].clientSecret;

const dbRef = admin.firestore().doc('tokens/demo') ;

const TwitterApi = require('twitter-api-v2').default;
const twitterClient = new TwitterApi({
    clientId: YOUR_CLIENT_ID,
    clientSecret: YOUR_CLIENT_SECRET,
}) ;

const callbackURL = 'http://127.0.0.1:5000/ai-twitter-bot/us-central1/callback'

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });


// step 1
exports.auth = functions.https.onRequest((request, response) => {

    const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
        callbackURL,
        { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']}
    );

    //store verifier
    await dbRef.set({ codeVerifier, state });

    response.redirect(url) ;

}) ;


// step 2
exports.callback = functions.https.onRequest((request, response) => {

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


// step 3
exports.tweet = functions.https.onRequest((request, response) => {}) ;