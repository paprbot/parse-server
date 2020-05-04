var express = require('express');
const { default: ParseServer, ParseGraphQLServer } = require('parse-server');

//var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');
var parseServerConfig = require('parse-server-azure-config');
var url = require('url');
var deeplink = require('node-deeplink');
// need to switch to false once we enable SSL pre launch
var options = { allowInsecureHTTP: true };
var config = parseServerConfig(__dirname);
var path = require('path');
const yn = require("yn");

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {

    console.log('DATABASE_URI not specified, falling back to localhost.');

}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var api = new ParseServer(config.server);

// Client-keys like the javascript key or the .NET key are not necessary with parse-server

// If you wish you require them, you can set them as options in the initialization above:

// javascriptKey, restAPIKey, dotNetKey, clientKey



var app = express();


const parseGraphQLServer = new ParseGraphQLServer(
    api,
    {
        graphQLPath: '/graphql',
        playgroundPath: '/playground'
    }
);



// Serve static assets from the /public folder

app.use('/public', express.static(path.join(__dirname, '/public')));



// Serve the Parse API on the /parse URL prefix

var mountPath = process.env.PARSE_MOUNT || '/parse';


app.use(function (req, res, next) {

    res.set({ // since there is no res.header class in Parse, we use the equivalent to set the response headers
        'Access-Control-Allow-Origin': '*/*',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, X-Parse-Session-Token'
    });
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept, X-Parse-Session-Token');

    next();
});

app.use(mountPath, api.app);
// Mounts the GraphQL API using graphQLPath: '/graphql'
parseGraphQLServer.applyGraphQL(app);
// (Optional) Mounts the GraphQL Playground - do NOT use in Production
parseGraphQLServer.applyPlayground(app);
app.use('/parse-dashboard', ParseDashboard(config.dashboard, {allowInsecureHTTP: true}));



// Parse Server plays nicely with the rest of your web routes

app.get('/', function(req, res) {

    res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');

});



// There will be a test page available on the /test path of your server url

// Remove this before launching your app

app.get('/test', function(req, res) {

    res.sendFile(path.join(__dirname, '/public/test.html'));

});



var port = process.env.PORT || 1337;

var httpServer = require('http').createServer(app);

httpServer.listen(port, function() {

    console.log(`master key ${process.env.REDIS_URL}`);

    console.log(`Parse Server running at ${config.server.serverURL}`);
    console.log(`Parse LiveQuery Server running at ${config.server.liveQuery.serverURL}`);
    console.log(`GraphQL API running on ${config.server.graphQLServerURL}`);
    console.log(`GraphQL Playground running on ${config.dashboard.apps[0].graphQLServerURL}`);

});



// This will enable the Live Query real-time server

ParseServer.createLiveQueryServer(httpServer, {
    redisURL: process.env.REDIS_URL // Redis URL from main app
});



// Modify config as necessary before initializing parse server & dashboard
/* this
 var app = express();
 app.use('/public', express.static(__dirname + '/public'));

 */
//app.use('/parse', new ParseServer(config.server));
//app.use('/parse-dashboard', ParseDashboard(config.dashboard, true));

// need to switch insecure http off once we enable ssl
/*
 var api = new ParseServer({
 databaseURI: 'mongodb://paprvmdatabase.westus2.cloudapp.azure.com:27017/parse',
 cloud: __dirname + '/cloud/main.js',
 appId: process.env.APP_ID,
 clientKey:'',
 serverURL: 'https://parseserverwest.azurewebsites.net/parse',
 liveQuery: {
 classNames: ["PostQuestionMessage","User","PostQuestion"]
 }
 });

 var mountPath = '/parse';
 app.use(mountPath, api);
 */
/*
 var api = new ParseServer(
 {
 databaseURI: 'mongodb://paprvmdatabase.westus2.cloudapp.azure.com:27017/parse',
 appId: process.env.APP_ID,
 masterKey: process.env.MASTER_KEY,
 //fileKey: "",
 serverURL: "https://parseserverwest.azurewebsites.net/parse",
 liveQuery: {
 classNames: ['PostQuestionMessage']
 redisURL: 'redis://user:LGSn+cOIPeASKKw3QGiOCY5hhH63FckdqtjuuerF6P0=@paprtest.redis.cache.windows.net:6379'
 logLevel:'VERBOSE'
 }
 });
 app.use('/parse', api);
 */
/* this
 app.use('/parse', new ParseServer(config.server));

 app.use('/parse-dashboard', ParseDashboard(config.dashboard, {allowInsecureHTTP: true}));
 app.get('/deeplink', deeplink({
 fallback: 'https://www.facebook.com/',
 android_package_name: 'com.facebook.katana',
 ios_store_link: 'https://itunes.apple.com/us/app/facebook/id284882215?mt=8'
 })
 );*/



//Parse.liveQueryServerURL = 'ws://parseserverwest.azurewebsites.net/parse';

/*
 var httpServer = require('http').createServer(app);
 var port = process.env.PORT || 1337;
 //var port = 1337;


 httpServer.listen(port, function() {
 console.log('Parse Server running at ${port}');
 });
 // httpServer.listen(1337, function() {
 // console.log('Parse Server running at ${config.server.serverURL}');
 // });
 ParseServer.createLiveQueryServer(httpServer);
 */
/* this
 var port = process.env.PORT || url.parse(config.server.serverURL).port;
 let httpServer = require('http').createServer(app);
 httpServer.listen(port, function () {
 console.log(`Parse Server running at ${config.server.serverURL}`);
 });
 var parseLiveQueryServer = ParseServer.createLiveQueryServer(httpServer);*/

/*app.listen(process.env.PORT || url.parse(config.server.serverURL).port, function () {
 console.log(`Parse Server running at ${config.server.serverURL}`);
 });*/