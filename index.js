var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');
var parseServerConfig = require('parse-server-azure-config');
var url = require('url');
var deeplink = require('node-deeplink');
// need to switch to false once we enable SSL pre launch
var options = { allowInsecureHTTP: true };
var config = parseServerConfig(__dirname);

// Modify config as necessary before initializing parse server & dashboard
var app = express();
app.use('/public', express.static(__dirname + '/public'));
//app.use('/parse', new ParseServer(config.server));
//app.use('/parse-dashboard', ParseDashboard(config.dashboard, true));

// need to switch insecure http off once we enable ssl
/*
var api = new ParseServer({
databaseURI: 'mongodb://paprvmdatabase.westus2.cloudapp.azure.com:27017/parse',
cloud: __dirname + '/cloud/main.js',
appId: '671e705a-f735-4ec0-8474-15899a475440',
clientKey:'671e705a-f735-4ec0-8474-15899a475440',
serverURL: 'https://parseserverwest.azurewebsites.net/parse',
liveQuery: {
	classNames: ["PostQuestionMessage","User","PostQuestion"]
}
});

var mountPath = '/parse';
app.use(mountPath, api);
*/

var api = new ParseServer(
{
    databaseURI: 'mongodb://paprvmdatabase.westus2.cloudapp.azure.com:27017/parse',
    appId: "",
    masterKey: "",
    //fileKey: "",
    serverURL: "https://parseserverwest.azurewebsites.net/parse",
    liveQuery: {
        classNames: ['PostQuestionMessage'],
        redisURL: 'redis://user:LGSn+cOIPeASKKw3QGiOCY5hhH63FckdqtjuuerF6P0=@paprtest.redis.cache.windows.net:6379',
        logLevel:'VERBOSE'
    }
});
app.use('/parse', api);

app.use('/parse-dashboard', ParseDashboard(config.dashboard, {allowInsecureHTTP: true}));
app.get('/deeplink', deeplink({
        fallback: 'https://www.facebook.com/',
        android_package_name: 'com.facebook.katana',
        ios_store_link: 'https://itunes.apple.com/us/app/facebook/id284882215?mt=8'
    })
);

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

 app.listen(process.env.PORT || url.parse(config.server.serverURL).port, function () {
   console.log(`Parse Server running at ${config.server.serverURL}`);
 });