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
app.use('/parse', new ParseServer(config.server));
//app.use('/parse-dashboard', ParseDashboard(config.dashboard, true));

// need to switch insecure http off once we enable ssl
app.use('/parse-dashboard', ParseDashboard(config.dashboard, {allowInsecureHTTP: true}));
app.get('/deeplink', deeplink({
        fallback: 'https://www.facebook.com/',
        android_package_name: 'com.facebook.katana',
        ios_store_link: 'https://itunes.apple.com/us/app/facebook/id284882215?mt=8'
    })
);
var httpServer = require('http').createServer(app);
httpServer.listen(process.env.PORT || 1337, function() {
console.log('Parse Server running at ${config.server.serverURL}');
});
ParseServer.createLiveQueryServer(httpServer);

/*
app.listen(process.env.PORT || url.parse(config.server.serverURL).port, function () {
  console.log(`Parse Server running at ${config.server.serverURL}`);
});*/