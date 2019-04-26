
var algoliasearch = require('algoliasearch');
var client = algoliasearch('K3ET7YKLTI', '67085f00b6dbdd989eddc47fd1975c9c');
var async = require('async');
var lodash = require('lodash');
var fp = require('lodash/fp');
var _ = require("underscore");
var urlRegex = require('url-regex');
var requestURL = require('request');
var querystring = require('querystring');
var process = require('process');
var mongoClient = require("mongodb").MongoClient;
var Promise = require('promise');
// Initialize the Algolia Search Indexes for posts, users, hashtags and meetings
var indexPosts = client.initIndex('dev_posts');
var indexUsers = client.initIndex('dev_users');
var indexMeetings = client.initIndex('dev_meetings');
var indexChannel = client.initIndex('dev_channels');
var indexWorkspaces = client.initIndex('dev_workspaces');
var indexSkills = client.initIndex('dev_skills');
const requestPromise = require('request-promise');
var fs = require('fs');
Parse.initialize('671e705a-f735-4ec0-8474-15899a475440', '', 'f24d6630-a35a-4db8-9fc7-6a851042bfd6');

let simplifyUser = require('./simplifyUser');

// var im = require('imagemagick');

//const sharp = require('sharp');


// Send Email
var nodemailer = require('nodemailer');
var EmailTemplate = require('email-templates');
var smtpTransport = require('nodemailer-smtp-transport');
var handlebars = require('handlebars');
var fs = require('fs');
// Push Notification
var apn = require('apn');
const path = require('path');

// Set cron job
var cron = require('node-cron');

// Set production mode and add certification and key file accordingly
const isProduction = true;
var fileForPushNotification;
var keyFileForPushNotification;
if( isProduction ){
    fileForPushNotification = 'Papr-Distribution-APNS.pem';
    keyFileForPushNotification = 'Key-Distribution.pem';
} else {
    fileForPushNotification = 'Papr-Development-APNS.pem';
    keyFileForPushNotification = 'Key-Development.pem';
}
var options = {
    cert: path.resolve(fileForPushNotification),
    key: path.resolve(keyFileForPushNotification),
    passphrase: 'papr@123',
    production: isProduction
};
var apnProvider = new apn.Provider(options);

// test cloud code functions
Parse.Cloud.define("cloudCodeTest", function(request, response) {
    Parse.Cloud.run("QueryPostFeed", {
        hit: 10,
        user: "7LW63IRFT6",
        workspace: "SZ8PICViue",
        channel: "all",
        skip: 10

    }).then(function(result) {
        console.log("result: "+ JSON.stringify(result));
        response.success();

    }, function(error) {
        response.error(error);
    });


});

// Cloud API to test Algolia Search
Parse.Cloud.define("searchWorkspaces", function (request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    //get request params
    let query = request.params.query;
    let User = request.params.user;
    let user = new Parse.Object("_User");
    user.id = User;

    let sessionToken = request.user.getSessionToken();

    if (sessionToken) {

        user.fetch(user.id, {

            //useMasterKey: true,
            sessionToken: sessionToken

        }).then((userObject) => {

            const securedApiKey = userObject.get("algoliaSecureAPIKey"); // Use the key generated earlier

            const algoliaClient = algoliasearch("K3ET7YKLTI", securedApiKey);
            const index = algoliaClient.initIndex('dev_workspaces');

            // only query string
            index.search(query, function searchDone(err, content) {
                if (err) {response.error(err);}
                //console.log(content.hits);

                var finalTime = process.hrtime(time);
                console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                response.success(content.hits);
            });


        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
             response.error(error);
        }, { useMasterKey: true , sessionToken: sessionToken});


    } else {

         response.error("A valid user sessionToken is required.");
    }



}, { useMasterKey: true } );

// cloud API and function to test query performance of AlgoliaSearch versus Parse
Parse.Cloud.define("QueryPostFeed", function(request, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    //get request params
    var hit = parseInt(request.params.hit);
    var user = request.params.user;
    var channel = request.params.channel;
    var workspace = request.params.workspace;
    var skip = parseInt(request.params.skip);
    var page = parseInt(request.params.page);

    // Setup Parse query
    var queryPost = Parse.Object.extend("Post");
    var queryPOST = new Parse.Query(queryPost);
    var querypostSocial = Parse.Object.extend("PostSocial");
    var queryPostSocial = new Parse.Query(querypostSocial);

    var PostSocial = new Parse.Object("PostSocial");

    var Workspace = new Parse.Object("WorkSpace");
    Workspace.id = workspace;

    var User = new Parse.Object("_User");
    User.id = user;

    queryPOST.include( ["user", "workspace", "channel"] );
    //queryP.doesNotExist("channel.archive", "workspace.archive", "Archive");

    queryPOST.equalTo("workspace", Workspace);

    // todo get posts that the user is allowed to view

    // setup query filter for post
    //queryP.select(["user.fullname", "user.profileimage.url" ,"ACL", "media_duration", "postImage", "post_File", "audioWave", "imageRatio", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url" , "workspace.image", "workspace.objective", "workspace.mission", "workspace.postCount", "channel.name", "channel.type", "channel.postCount", "channel.image", "channel.category", "channel.purpose", "BookmarkedBy", "isLikedBy", "isBookmarked", "isLiked", "followerCount", "memberCount"]);
    queryPOST.descending("createdAt");
    queryPOST.limit(hit); // limit to hits
    if (page) {
        skip = page * hit;
        queryPOST.skip(skip);
    }
    if (channel == 'all') {
        // do nothing, since we want all channels in a workspace
        var expertWorkspaceRelation = Workspace.relation("experts");
        var expertWorkspaceRelationQuery = expertWorkspaceRelation.query();

    } else if (channel) {
        var Channel = new Parse.Object("Channel");
        Channel.id = channel;
        queryPOST.equalTo("channel", Channel);

        var expertChannelRelation = Channel.relation("experts");
        var expertChannelRelationQuery = expertChannelRelation.query();

    } else {response.error("channel id is or all is required.");}

    //var beforeQuery = process.hrtime(time);
    //console.log(`before query took ${(beforeQuery[0] * NS_PER_SEC + beforeQuery[1])  * MS_PER_NS} milliseconds`);
    //var bQuery = process.hrtime();


    // function to do two queries in parallel async
    //function queryParallel (callback) {

    function getChannelInformation (callback) {

        if (channel == 'all') {
            // do nothing, since we want all channels in a workspace

            Workspace.fetch(Workspace.id, {

                useMasterKey: true,
                sessionToken: request.user.getSessionToken()

            }).then((workspace) => {

                console.log("channelAllExperts: " + JSON.stringify(workspace));

                return callback (null, workspace);

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                return callback (error);
            }, { useMasterKey: true });

        } else if (channel) {

            Channel.fetch(Channel.id, {

                useMasterKey: true,
                sessionToken: request.user.getSessionToken()

            }).then((channel) => {

                console.log("channelExperts: " + JSON.stringify(channel));

                return callback (null, channel);

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                return callback (error);
            }, { useMasterKey: true });
        }

    }

    function getChannelExperts (callback) {

        if (channel == 'all') {
            // do nothing, since we want all channels in a workspace

            expertWorkspaceRelationQuery.find({

                useMasterKey: true,
                sessionToken: request.user.getSessionToken()

            }).then((experts) => {

                console.log("channelAllExperts: " + JSON.stringify(experts));

                return callback (null, experts);

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                return callback (error);
            }, { useMasterKey: true });

        } else if (channel) {

            expertChannelRelationQuery.find({

                useMasterKey: true,
                sessionToken: request.user.getSessionToken()

            }).then((experts) => {

                console.log("channelExperts: " + JSON.stringify(experts));

                return callback (null, experts);

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                return callback (error);
            }, { useMasterKey: true });
        }

    }

    //function to find queryP results
    function queryPostFind (callback) {

        //var NS_PER_SEC = 1e9;
        //const MS_PER_NS = 1e-6;
        //var timequeryPostFind = process.hrtime();
        //var queryPTime;

        queryPOST.find({
            success: function(results) {

                //console.log("queryPostFind: "+results.length);

                //queryPTime = process.hrtime(timequeryPostFind);
                //console.log(`function queryPostFind took ${(queryPTime[0] * NS_PER_SEC + queryPTime[1])  * MS_PER_NS} milliseconds`);
                //console.log("results: "+JSON.stringify(results));

                return callback(null, results);

            },
            error: function(err) {
                response.error("queryPost Error: "+ err);
            }
        });

    }

    // function to find socialPosts results
    function querySocialPostFind (callback) {


        //var NS_PER_SEC = 1e9;
        //const MS_PER_NS = 1e-6;
        //var timequerySocialPostFind = process.hrtime();
        //var querySocialPostFindTime;


        queryPostSocial.equalTo("user", User);
        //queryPostSocial.containedIn("type", ["1", "2"]);
        queryPostSocial.matchesQuery("post", queryPOST);
        queryPostSocial.descending("updatedAt");
        //postSocialRelationQuery.doesNotExist("archive");
        //queryPostSocial.select(["postId", "isBookmarked", "isLiked" ]);
        queryPostSocial.find({
            success: function(postSocialResults) {
                //console.log("postSocialResults 1: "+JSON.stringify(postSocialResults));

                //console.log("querySocialPostFind: "+ postSocialResults.length);

                //querySocialPostFindTime = process.hrtime(timequerySocialPostFind);
                //console.log(`function querySocialPostFindTime took ${(querySocialPostFindTime[0] * NS_PER_SEC + querySocialPostFindTime[1])  * MS_PER_NS} milliseconds`);

                return callback(null, postSocialResults);
            },
            error: function(err) {
                response.error(err);
            }

        });


    }

    async.parallel([
        async.apply(getChannelInformation),
        async.apply(getChannelExperts),
        async.apply(queryPostFind),
        async.apply(querySocialPostFind)

    ], function (err, results) {
        if (err) {
            response.error(err);
        }

        var postResults = results[0];
        var postSocialResults = results[1];

        // using process.hrtime since it's more precise
        //var queryFinal = process.hrtime(time);
        //console.log(`queryFinal took ${(queryFinal[0] * NS_PER_SEC + queryFinal[1])  * MS_PER_NS} milliseconds`);
        //var beforelodash = process.hrtime();


        //var merge = lodash.merge(results[0], results[1]);
        //console.log("postResults: "+ postResults.length);
        //console.log("OnePost: "+ JSON.stringify(postResults[0]));
        //console.log("postSocialResults: "+ postSocialResults.length);
        //var i = 0;

        /*for (var i=0; i<postResults.length;i++) {

         (postResults[i]).set("PostSocial", postSocialResults.find( function(obj){
         //console.log("obj: " + obj);
         //console.log("obj JSON: " + JSON.stringify(obj));



         return ((obj.get("post")).id === item.id);

         }));
         }*/


        /*postResults.map( function(item) {
         //console.log("count: "+ i++);
         //console.log("item id post: " + JSON.stringify(item));


         return item.set("postSocial", postSocialResults.find( function(obj){
         //console.log("obj: " + obj);
         //console.log("obj JSON: " + JSON.stringify(obj));



         return ((obj.get("post")).id === item.id);

         }));



         });*/


        //console.log("postResults: "+ JSON.stringify(postResults));

        var finalTime = process.hrtime(time);
        console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
        response.success(results);
        //return callback (null, resultsToMap);

    });
    // }




});

// cloud API and function to leave a workspace
Parse.Cloud.define("leaveWorkspace", function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    //get request params
    let User = request.params.user;
    let WorkspaceFollower = request.params.workspace_follower;

    var workspaceFollower = new Parse.Object("workspace_follower");
    workspaceFollower.id = WorkspaceFollower;

    var user = new Parse.Object("_User");
    user.id = User;


    if (!request.user) {

         response.error("Please enter use sessionToken it's required.");

    } else {

        let sessionToken = request.user.getSessionToken();

        // update user's workspace follower
        workspaceFollower.set("isFollower", false);
        workspaceFollower.set("isMember", false);
        workspaceFollower.save(null, {

            //useMasterKey: true,
            sessionToken: sessionToken

        }).then((result) => {

            // save was successful
            if(result) {

                console.log("result leaveWorkspace query: " + JSON.stringify(result));

                let queryWorkspaceFollowerSelected = new Parse.Query("workspace_follower");
                queryWorkspaceFollowerSelected.equalTo("isSelected", true);
                queryWorkspaceFollowerSelected.equalTo("user", user);
                //queryWorkspaceFollowerSelected.descending("updatedAt");
                queryWorkspaceFollowerSelected.include("workspace");

                queryWorkspaceFollowerSelected.first({

                    //useMasterKey: true,
                    sessionToken: sessionToken

                }).then((result_workspacefollower) => {
                    // The object was retrieved successfully.
                    //console.log("result_workspacefollower" + JSON.stringify(result_workspacefollower));

                    if (result_workspacefollower) {



                        var finalTime = process.hrtime(time);
                        console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                         response.success(result_workspacefollower.toJSON());

                    } else {



                        var finalTime = process.hrtime(time);
                        console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                         response.success();

                    }

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    response.error(error);
                }, {

                    useMasterKey: true,
                    sessionToken: sessionToken

                });


            } else {

                response.error(result);

            }



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {

            useMasterKey: true,
            sessionToken: sessionToken

        });
    }



}, {useMasterKey: true});

// cloud API and function to add one or multiple skills to skills table.
Parse.Cloud.define("addSkills", function(request, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();
    var skills;
    var skillObjects = [];

    //get request params
    skills = request.params.skills;

    function addLevel (callback) {

        async.forEach(skills, function (skill, cb){

            // add starter level
            var SKILL_1 = new Parse.Object("Skill");
            SKILL_1.set('name', skill.name);
            SKILL_1.set('level','starter');
            SKILL_1.set('nameLevel', skill.name + ':' + 'starter');
            skillObjects.push(SKILL_1);

            // add Ninja level
            var SKILL_2 = new Parse.Object("Skill");
            SKILL_2.set('name', skill.name);
            SKILL_2.set('level','ninja');
            SKILL_2.set('nameLevel', skill.name + ':' + 'ninja');
            skillObjects.push(SKILL_2);


            // add Master level
            var SKILL_3 = new Parse.Object("Skill");
            SKILL_3.set('name', skill.name);
            SKILL_3.set('level','master');
            SKILL_3.set('nameLevel', skill.name + ':' + 'master');
            skillObjects.push(SKILL_3);

            //console.log("skill:s " + JSON.stringify(skillObjects));

            // tell async that that particular element of the iterator is done
            cb(null, skill);

        }, function(err) {
            //console.log('iterating done: ' + JSON.stringify(objectsToIndex));

            //cb(err);

        });

        return callback(null, skills);

    };

    function addLevelFast (callback) {

        _.each(skills, function (skill){

            // add starter level
            var SKILL_1 = new Parse.Object("Skill");
            SKILL_1.set('name', skill.name);
            SKILL_1.set('level','starter');
            SKILL_1.set('nameLevel', skill.name + ':' + 'starter');
            skillObjects.push(SKILL_1);

            // add Ninja level
            var SKILL_2 = new Parse.Object("Skill");
            SKILL_2.set('name', skill.name);
            SKILL_2.set('level','ninja');
            SKILL_2.set('nameLevel', skill.name + ':' + 'ninja');
            skillObjects.push(SKILL_2);


            // add Master level
            var SKILL_3 = new Parse.Object("Skill");
            SKILL_3.set('name', skill.name);
            SKILL_3.set('level','master');
            SKILL_3.set('nameLevel', skill.name + ':' + 'master');
            skillObjects.push(SKILL_3);

            //console.log("skill:s " + JSON.stringify(skillObjects));

            // tell async that that particular element of the iterator is done
            //cb(null, skill);

        }, function(err) {
            //console.log('iterating done: ' + JSON.stringify(objectsToIndex));

            //cb(err);

        });

        return callback(null, skills);

    };

    function addLevelFaster (callback) {

        for (var i = 0; i < skills.length; i++) {

            var skill = skills[i];
            // add starter level
            var SKILL_1 = new Parse.Object("Skill");
            SKILL_1.set('name', skill.name);
            SKILL_1.set('level','starter');
            SKILL_1.set('nameLevel', skill.name + ':' + 'starter');
            skillObjects.push(SKILL_1);

            // add Ninja level
            var SKILL_2 = new Parse.Object("Skill");
            SKILL_2.set('name', skill.name);
            SKILL_2.set('level','ninja');
            SKILL_2.set('nameLevel', skill.name + ':' + 'ninja');
            skillObjects.push(SKILL_2);


            // add Master level
            var SKILL_3 = new Parse.Object("Skill");
            SKILL_3.set('name', skill.name);
            SKILL_3.set('level','master');
            SKILL_3.set('nameLevel', skill.name + ':' + 'master');
            skillObjects.push(SKILL_3);

            //console.log("skill:s " + JSON.stringify(skillObjects));

            // tell async that that particular element of the iterator is done
            //cb(null, skill);

        };

        return callback(null, skills);

    };

    function saveAllSkills (skills, callback) {

        skills = skillObjects;

        //console.log("skills: " + JSON.stringify(skills));

        Parse.Object.saveAll(skills , {
            success: function (result) {
                return callback(null, result);

                console.log('success');
            },
            error: function (err) {
                return callback(err);
                console.log('failed');
            }
        });


    }

    async.waterfall([
        async.apply(addLevelFaster),
        async.apply(saveAllSkills)

    ], function (err, result) {
        if (err) {
            response.error(err);
        }

        var finalTime = process.hrtime(time);
        console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


        response.success(result);

    });



});

// cloud API and function to test query performance of AlgoliaSearch versus Parse
Parse.Cloud.define("QueryLeftNavigationStartup", function(request, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    //get request params
    var hit = parseInt(request.params.hit);
    var user = request.params.user;
    var channel = request.params.channel;
    var workspace = request.params.workspace;
    var skip = parseInt(request.params.skip);

    // Setup Parse query
    var queryWorkspaceFollow = Parse.Object.extend("workspace_follower");
    var queryWORKSPACEFOLLOW = new Parse.Query(queryWorkspaceFollow);
    var queryChannelFollow = Parse.Object.extend("ChannelFollow");
    var queryCHANNELFOLLOW = new Parse.Query(queryChannelFollow);
    var queryCategory = Parse.Object.extend("Category");
    var queryCATEGORY = new Parse.Query(queryCategory);

    var Workspace = new Parse.Object("WorkSpace");
    var queryWORKSPACE = new Parse.Query("WorkSpace");
    Workspace.id = workspace;

    var Channel = new Parse.Object("Channel");
    Channel.id = channel;

    var User = new Parse.Object("_User");
    User.id = user;

    //var beforeQuery = process.hrtime(time);
    //console.log(`before query took ${(beforeQuery[0] * NS_PER_SEC + beforeQuery[1])  * MS_PER_NS} milliseconds`);
    //var bQuery = process.hrtime();


    // todo get posts that the user is allowed to view
    // todo check isMember/isFollower for workspace
    // question - should we give all channels for all workspaces even if they are not selected? an store in local db?

    // setup query filter for post

    //var NS_PER_SEC = 1e9;
    //const MS_PER_NS = 1e-6;
    //var timequerySocialPostFind = process.hrtime();
    //var querySocialPostFindTime;

    //function to find queryP results
    function queryWorkspaceFollowFind (callback) {

        //var NS_PER_SEC = 1e9;
        //const MS_PER_NS = 1e-6;
        //var timequeryPostFind = process.hrtime();
        //var queryPTime;

        queryWORKSPACEFOLLOW.include("workspace");
        queryWORKSPACEFOLLOW.doesNotExist("archive");
        queryWORKSPACEFOLLOW.equalTo("user", User);
        queryWORKSPACEFOLLOW.equalTo("type", "1");
        //queryChannelFollow.select(["ACL", "objectId", "workspace.workspace_name", "archive", "name", "type" , "default", "category", "isMember", "isFollower", "user"]);
        if (!workspace || (workspace === "all")) {
            // do nothing, get all workspaces for the user
        } else {
            // only get workspace that the client is asking for
            queryWORKSPACEFOLLOW.equalTo("workspace", Workspace);

        }

        queryWORKSPACEFOLLOW.find({
            success: function(results) {

                //console.log("queryPostFind: "+results.length);

                //queryPTime = process.hrtime(timequeryPostFind);
                //console.log(`function queryPostFind took ${(queryPTime[0] * NS_PER_SEC + queryPTime[1])  * MS_PER_NS} milliseconds`);
                //console.log("results: "+JSON.stringify(results));

                return callback(null, results);

            },
            error: function(err) {
                response.error("queryPost Error: "+ err);
            }
        });

    }

    // function to find queryChannelFollowFind results
    function queryChannelFollowFind (callback) {


        //var NS_PER_SEC = 1e9;
        //const MS_PER_NS = 1e-6;
        //var timequerySocialPostFind = process.hrtime();
        //var querySocialPostFindTime;

        queryCHANNELFOLLOW.include("channel");
        queryCHANNELFOLLOW.doesNotExist("archive");
        queryCHANNELFOLLOW.equalTo("user", User);
        queryCHANNELFOLLOW.equalTo("type", "1"); // user is either a member of follower of this channel

        //queryCHANNELFOLLOW.select(["ACL", "objectId", "workspace.workspace_name", "archive", "name", "type" , "default", "category", "isMember", "isFollower", "user"]);
        if (!workspace || (workspace === "all")) {
            // do nothing, get all channels for the user
            //queryCHANNELFOLLOW.matchesQuery("workspace", queryWORKSPACE);
        } else {
            // only get workspace that the client is asking for
            queryCHANNELFOLLOW.equalTo("workspace", Workspace);

        }

        if (!channel || (channel === "all")) {
            // do nothing, get all channels for the user
        } else {
            // only get channel that the client is asking for
            queryCHANNELFOLLOW.equalTo("channel", Channel);

        }

        queryCHANNELFOLLOW.find({
            success: function(channelResults) {
                //console.log("postSocialResults 1: "+JSON.stringify(postSocialResults));

                //console.log("querySocialPostFind: "+ postSocialResults.length);

                //querySocialPostFindTime = process.hrtime(timequerySocialPostFind);
                //console.log(`function querySocialPostFindTime took ${(querySocialPostFindTime[0] * NS_PER_SEC + querySocialPostFindTime[1])  * MS_PER_NS} milliseconds`);

                return callback(null, channelResults);
            },
            error: function(err) {
                response.error(err);
            }

        });


    }

    // function to find queryCategoryFind results
    function queryCategoryFind (callback) {

        //var NS_PER_SEC = 1e9;
        //const MS_PER_NS = 1e-6;
        //var timequerySocialPostFind = process.hrtime();
        //var querySocialPostFindTime;

        //queryCategoryFind.matchesQuery("workspaceID", queryWorkspaceFollow);
        //queryCHANNELFOLLOW.select(["ACL", "objectId", "workspace.workspace_name", "archive", "name", "type" , "default", "category", "isMember", "isFollower", "user"]);
        if (!workspace || (workspace === "all")) {
            // get all categories in workspaces for the user that he is either following or is a member of
            //var CategoryObject = new Parse.Object(queryCategory);
            //var workspaceFollowRelation = CategoryObject.relation("workspace_follower");
            //var workspaceFollowRelationQuery = workspaceFollowRelation.query();
            //workspaceFollowRelationQuery.equalTo("user", User);
            //workspaceFollowRelationQuery.doesNotExist("archive");
            //workspaceFollowRelationQuery.equalTo("type", "1");
            queryCATEGORY.matchesQuery("WorkspaceFollow", queryWORKSPACEFOLLOW);
        } else {
            // only get workspace that the client is asking for
            queryCATEGORY.equalTo("workspaceID", Workspace);

        }

        if (!channel || (channel === "all")) {
            // do nothing, get all channels for the user
        } else {
            // only get channel that the client is asking for
            queryCATEGORY.equalTo("channel", Channel);

        }

        queryCATEGORY.find({
            success: function(categoeryResults) {
                //console.log("postSocialResults 1: "+JSON.stringify(postSocialResults));

                //console.log("querySocialPostFind: "+ postSocialResults.length);

                //querySocialPostFindTime = process.hrtime(timequerySocialPostFind);
                //console.log(`function querySocialPostFindTime took ${(querySocialPostFindTime[0] * NS_PER_SEC + querySocialPostFindTime[1])  * MS_PER_NS} milliseconds`);

                return callback(null, categoeryResults);
            },
            error: function(err) {
                response.error(err);
            }

        });


    }

    async.parallel([
        async.apply(queryWorkspaceFollowFind),
        async.apply(queryChannelFollowFind),
        async.apply(queryCategoryFind)

    ], function (err, results) {
        if (err) {
            response.error(err);
        }



        //console.log("postResults: "+ JSON.stringify(results));

        var finalTime = process.hrtime(time);
        console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
        response.success(results);
        //return callback (null, resultsToMap);

    });
    // }




});

// cloud API and function to test query performance of AlgoliaSearch versus Parse
Parse.Cloud.define("QueryPostFeed2", function(request, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    //get request params
    var hit = parseInt(request.params.hit);
    var user = request.params.user;
    var channel = request.params.channel;
    var workspace = request.params.workspace;
    var skip = parseInt(request.params.skip);

    // Setup Parse query
    var queryPost = Parse.Object.extend("Post");
    var queryP = new Parse.Query(queryPost);
    //var querypostSocial = Parse.Object.extend("PostSocial");
    //var queryPostSocial = new Parse.Query(querypostSocial);

    var Workspace = new Parse.Object("WorkSpace");
    Workspace.id = workspace;

    var User = new Parse.Object("_User");
    User.id = user;

    queryP.include( ["user", "workspace", "channel", "postSocial.user", "postSocial.isLiked", "postSocial.isBookmarked"] );
    queryP.doesNotExist("channel.archive", "workspace.archive", "Archive");

    queryP.equalTo("workspace", Workspace);

    // todo get posts that the user is allowed to view

    // setup query filter for post
    //queryP.select(["user.fullname", "user.profileimage.url" ,"ACL", "media_duration", "postImage", "post_File", "audioWave", "imageRatio", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url" , "workspace.image", "workspace.objective", "workspace.mission", "workspace.postCount", "channel.name", "channel.type", "channel.postCount", "channel.image", "channel.category", "channel.purpose", "BookmarkedBy", "isLikedBy", "isBookmarked", "isLiked", "followerCount", "memberCount"]);
    queryP.descending("updatedAt");
    queryP.limit(hit); // limit to hits
    if (skip) {
        queryP.skip(skip);
    }
    if (channel == 'all') {
        // do nothing, since we want all channels in a workspace
    } else if (channel) {
        var channel = new Parse.Object("channel");
        Channel.id = channel;
        queryP.equalTo("channel", Channel);

    }

    var beforeQuery = process.hrtime(time);
    console.log(`before query took ${(beforeQuery[0] * NS_PER_SEC + beforeQuery[1])  * MS_PER_NS} milliseconds`);
    var bQuery = process.hrtime();

    queryP.find({
        success: function(results) {

            var queryTime = process.hrtime(bQuery);
            console.log(`after queryP took ${(queryTime[0] * NS_PER_SEC + queryTime[1])  * MS_PER_NS} milliseconds`);
            var mQuery = process.hrtime();
            //console.log("results: "+JSON.stringify(results));
            var postSocialRelation;
            var postSocialRelationQuery;

            async.map(results, function (object, callback) {

                postSocialRelation = object.relation("postSocial");
                postSocialRelationQuery = postSocialRelation.query();
                postSocialRelationQuery.equalTo("user", User);
                //postSocialRelationQuery.doesNotExist("archive");
                //postSocialRelationQuery.select(["isBookmarked", "isLiked"]);
                postSocialRelationQuery.first({
                    success: function(postSocialResults) {
                        //console.log("postSocialResults 1: "+object);

                        if (postSocialResults) {

                            //console.log("postSocialResults 2: "+ JSON.stringify(object));

                            if (postSocialResults.get("isLiked")) {
                                object.set("isLiked", postSocialResults.get("isLiked"));
                                //console.log("postSocialResults 3: "+JSON.stringify(postSocialResults));
                                if (!object.get("postSocialId")) {
                                    object.set("postSocialId", postSocialResults.id);
                                    //console.log("postSocialResults: "+ JSON.stringify(object));
                                }

                            } else if (postSocialResults.get("isBookmarked")) {

                                object.set("isBookmarked", postSocialResults.id);
                                if (!object.get("postSocialId")) {
                                    object.set("postSocialId", postSocialResults.get("objectId"));
                                }

                            } else {
                                object.set("isLiked", false);
                                object.set("isBookmarked", false);
                            }
                        } else {
                            object.set("isLiked", false);
                            object.set("isBookmarked", false);
                        }
                        var postSocialRelationQueryTime = process.hrtime(mQuery);
                        console.log(`after postSocialRelationQuery took ${(postSocialRelationQueryTime[0] * NS_PER_SEC + postSocialRelationQueryTime[1])  * MS_PER_NS} milliseconds`);

                        return callback(null, object);
                    },
                    error: function(err) {
                        response.error(err);
                    }

                });



            }, function(err, results) {

                //console.log('iterating done: ' + JSON.stringify(results));

                // using process.hrtime since it's more precise
                //getPostFeed_Time = process.hrtime(timeGetPostFeed);
                //console.log(`getPostFeed_Time took ${(getPostFeed_Time[0] * NS_PER_SEC + getPostFeed_Time[1])  * MS_PER_NS} milliseconds`);

                var diff = process.hrtime(time);
                console.log(`queryFinal took ${(diff[0] * NS_PER_SEC + diff[1])  * MS_PER_NS} milliseconds`);
                //console.log("FinalResults: " + JSON.stringify(results));
                //response.render('userPosts', results);
                response.success(results);

            });



            /*for (var j=0;j< results.length; j++) {

             var postSocialRelation = results[j].relation("postSocial");
             var postSocialRelationQuery = postSocialRelation.query();
             postSocialRelationQuery.equalTo("user", User);
             //postSocialRelationQuery.doesNotExist("archive");
             //postSocialRelationQuery.select(["isBookmarked", "isLiked"]);
             postSocialRelationQuery.first({
             success: function(postSocialResults) {
             console.log("postSocialResults 1: "+results[j]);

             if (postSocialResults) {

             console.log("postSocialResults 2: "+ JSON.stringify(results[j]));

             if (postSocialResults.get("isLiked")) {
             console.log("results: "+ JSON.stringify(results[0]));
             results[j].set("isLiked", postSocialResults.get("isLiked"));
             console.log("postSocialResults 3: "+JSON.stringify(postSocialResults));
             if (!results[j].get("postSocialId")) {
             results[j].set("postSocialId", postSocialResults.get("objectId"));
             console.log("postSocialResults: "+ JSON.stringify(postSocialResults));
             }

             } else if (postSocialResults.get("isBookmarked")) {

             results[j].set("isBookmarked", postSocialResults.get("isBookmarked"));
             if (!results[j].get("postSocialId")) {
             results[j].set("postSocialId", postSocialResults.get("objectId"));
             }

             } else {
             results[j].set("isLiked", false);
             results[j].set("isBookmarked", false);
             }
             } else {
             results[j].set("isLiked", false);
             results[j].set("isBookmarked", false);
             }
             //var postSocialRelationQueryTime = process.hrtime(mQuery);
             //console.log(`after postSocialRelationQuery took ${(postSocialRelationQueryTime[0] * NS_PER_SEC + postSocialRelationQueryTime[1])  * MS_PER_NS} milliseconds`);

             },
             error: function(err) {
             response.error(err);
             }

             });

             }*/


        },
        error: function(err) {
            response.error("queryPost Error: "+ err);
        }
    });


});



// cloud API and function to test query performance of AlgoliaSearch versus Parse
Parse.Cloud.define("testQueryPerformance", function(request, response) {

    //var time = new Date().getTime();

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();


    //console.log("timeFirst: " + time);

    //Create a new query for User collection in Parse
    var collection = request.params.collection;
    var search = request.params.search;
    var index;

    var query = new Parse.Query(collection);

    //console.log('collection: ' + request.params.collection);

    switch (collection) {
        case "Post":
            index = indexPosts;
            query.include( ["user", "workspace", "channel"] );
            query.select(["user", "ACL", "media_duration", "postImage", "post_File", "audioWave", "archive", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url" , "channel.name", "channel.type", "channel.archive"]);

            break;
        case "_User":
            index = indexUsers;

            break;
        case "Channel":
            index = indexChannel;
            query.include( ["user", "workspace", "category"] );

            break;
        case "Meeting":
            index = indexMeetings;

            break;
        case "WorkSpace":
            index = indexWorkspaces;

            break;
        default:
            response.error("The collection entered does not exist. Please enter one of the following collections: _User, Post, WorkSpace, Channel, Meeting");
    };

    if (search == 'Parse') {

        query.limit(20); // limit to at most 20 results

        // Find all items
        query.find({
            success: function(objects) {


                // using process.hrtime since it's more precise
                var diffSmall = process.hrtime(time);

                //console.log(`querySmall took ${(diffSmall[0] * NS_PER_SEC + diffSmall[1])  * MS_PER_NS} milliseconds`);


                //return callback(null, query);
                response.success(`querySmall took ${(diffSmall[0] * NS_PER_SEC + diffSmall[1])  * MS_PER_NS} milliseconds`);

            },
            error: function(err) {
                throw err;
            }
        });
    }

    else if (search == 'Algolia') {

        index.search(
            {
                query: '*',
                hitsPerPage: 20,
            },
            function searchDone(err, content) {
                if (err) throw err;


                // using process.hrtime since it's more precise
                var diffSmall = process.hrtime(time);

                console.log(`querySmall took ${(diffSmall[0] * NS_PER_SEC + diffSmall[1])  * MS_PER_NS} milliseconds`);
                response.success(`querySmall took ${(diffSmall[0] * NS_PER_SEC + diffSmall[1])  * MS_PER_NS} milliseconds`);
                //return callback(null, query);
            }
        );


    }

    else {

        response.error("error: this search option is not available, please use algolia or parse");
    }


    /*function querySmall (callback) {

     if (search == 'Parse') {

     query.limit(10); // limit to at most 20 results

     // Find all items
     query.find({
     success: function(objects) {


     // using process.hrtime since it's more precise
     var diffSmall = process.hrtime(time);

     console.log(`querySmall took ${(diffSmall[0] * NS_PER_SEC + diffSmall[1])  * MS_PER_NS} milliseconds`);


     return callback(null, query);

     },
     error: function(err) {
     throw err;
     }
     });
     }

     else if (search == 'Algolia') {

     index.search(
     {
     query: '*',
     hitsPerPage: 10,
     },
     function searchDone(err, content) {
     if (err) throw err;


     // using process.hrtime since it's more precise
     var diffSmall = process.hrtime(time);

     console.log(`querySmall took ${(diffSmall[0] * NS_PER_SEC + diffSmall[1])  * MS_PER_NS} milliseconds`);

     return callback(null, query);
     }
     );


     }

     else {

     response.error("error: this search option is not available, please use algolia or parse");
     }


     };

     function queryMedium (callback) {

     if (search == 'Parse') {

     query.limit(20); // limit to at most 100 results

     // Find all items
     query.find({
     success: function(objects) {

     //console.log("queryMedium: " + JSON.stringify(objects));


     // using process.hrtime since it's more precise
     var diffMedium = process.hrtime(time);

     console.log(`queryMedium took ${(diffMedium[0] * NS_PER_SEC + diffMedium[1])  * MS_PER_NS} milliseconds`);


     return callback(null, query);

     },
     error: function(err) {
     throw err;
     }
     });
     }

     else if (search == 'Algolia') {

     index.search(
     {
     query: '*',
     hitsPerPage: 20,
     },
     function searchDone(err, content) {
     if (err) throw err;



     // using process.hrtime since it's more precise
     var diffMedium = process.hrtime(time);

     console.log(`queryMedium took ${(diffMedium[0] * NS_PER_SEC + diffMedium[1])  * MS_PER_NS} milliseconds`);

     return callback(null, query);
     }
     );


     }

     else {

     response.error("error: this search option is not available, please use algolia or parse");
     }

     };

     function queryLarge (callback) {

     if (search == 'Parse') {

     query.limit(50); // limit to at most 1000 results

     // Find all items
     query.find({
     success: function(objects) {

     //console.log("queryLarge: " + JSON.stringify(objects));


     // using process.hrtime since it's more precise
     var diffLarge = process.hrtime(time);

     console.log(`queryLarge took ${(diffLarge[0] * NS_PER_SEC + diffLarge[1])  * MS_PER_NS} milliseconds`);

     return callback(null, query);

     },
     error: function(err) {
     throw err;
     }
     });

     }

     else if (search == 'Algolia') {

     index.search(
     {
     query: '*',
     hitsPerPage: 50,
     },
     function searchDone(err, content) {
     if (err) throw err;


     // using process.hrtime since it's more precise
     var diffLarge = process.hrtime(time);

     console.log(`queryLarge took ${(diffLarge[0] * NS_PER_SEC + diffLarge[1])  * MS_PER_NS} milliseconds`);

     return callback(null, query);
     }
     );


     }

     else {

     response.error("error: this search option is not available, please use algolia or parse");
     }


     };

     async.parallel([
     async.apply(querySmall),
     async.apply(queryMedium),
     async.apply(queryLarge)

     ], function (err, query) {
     if (err) {
     response.error(err);
     }


     // using process.hrtime since it's more precise
     var diff = process.hrtime(time);

     console.log(`queryFinal took ${(diff[0] * NS_PER_SEC + diff[1])  * MS_PER_NS} milliseconds`);

     response.success(`queryFinal took ${(diff[0] * NS_PER_SEC + diff[1])  * MS_PER_NS} milliseconds`);



     });*/


});



// cloud API and function to index and import all users from Parse to AlgoliaSearch indexUsers
Parse.Cloud.define("indexCollection", function(request, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    var objectsToIndex = [];
    //Create a new query for User collection in Parse

    var collection = request.params.collection;
    var index;
    var skills;
    var skillsToLearn;
    var query = new Parse.Query(collection);
    query.limit(10000); // todo limit to at most 1000 results need to change and iterate until done todo

    console.log('collection: ' + request.params.collection);

    switch (collection) {
        case "Post":
            index = indexPosts;
            query.include( ["user", "workspace", "channel"] );
            //query.select(["user", "ACL", "media_duration", "postImage", "post_File", "audioWave", "archive", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url" , "channel.name", "channel.type", "channel.archive"]);

            break;
        case "_User":
            index = indexUsers;
            skills = "mySkills";
            query.include( ["currentCompany"] );
            skillsToLearn = "skillsToLearn";

            break;
        case "Channel":
            index = indexChannel;
            query.include( ["user", "workspace", "category"] );

            break;
        case "Meeting":
            index = indexMeetings;

            break;
        case "WorkSpace":
            query.include( ["user"] );
            query.select(["user.fullname", "user.displayName", "user.isOnline", "user.showAvailability", "user.profileimage", "user.createdAt", "user.updatedAt", "user.objectId", "type", "archive","workspace_url", "workspace_name", "experts", "ACL", "objectId", "mission", "description","createdAt", "updatedAt", "followerCount", "memberCount", "isNew", "skills", "image"]);
            index = indexWorkspaces;
            skills = "skills";

            break;
        case "Skill":
            index = indexSkills;

            break;
        default:
            response.error("The collection entered does not exist. Please enter one of the following collections: _User, Post, WorkSpace, Channel, Meeting");
    };

    query.find({useMasterKey: true})
        .then((objectsToIndex) => {
            // The object was retrieved successfully.
            //console.log("Result from get " + JSON.stringify(Workspace));

            var workspaces = objectsToIndex;
            console.log("ObjectToSave length: " + JSON.stringify(workspaces.length));

            async.map(objectsToIndex, function (object, cb) {

                var workspace = object;
                var workspaceToSave = object.toJSON();

                function getSkills(callback) {

                 if (collection != "WorkSpace") {

                 return callback(null, object);

                 } else {

                 // todo need to check if skills is dirty, if yes then query to update algolia if not then ignore.

                 var skillObject = Parse.Object.extend("Skill");
                 //var skillsRelation = new skillObject.relation("skills");
                 skillObject = workspace.get("skills");
                 //console.log("Skills: " + JSON.stringify(skillObject));
                 //console.log("Skill Length:" + skillObject);

                 var skillObjectQuery = skillObject.query();
                 skillObjectQuery.ascending("level");
                 skillObjectQuery.find({

                 success: function (skill) {

                 //console.log("Skills: " + JSON.stringify(skill));

                 return callback(null, skill);

                 },
                 error: function (error) {
                 alert("Error: " + error.code + " " + error.message);
                 return callback(error);
                 }
                 }, {useMasterKey: true});
                 }

                 }

                 function getExperts(callback) {

                 if (collection != "WorkSpace") {

                 return callback(null, object);

                 } else {

                 // todo check if expert is dirty, if no ignore and return callback

                 var expertObject = Parse.Object.extend("_User");
                 expertObject = workspace.get("experts");
                 //console.log("Experts: " + JSON.stringify(expertObject));

                 expertObject.query().select(["fullname", "displayName", "isOnline", "showAvailability", "profileimage", "createdAt", "updatedAt", "objectId"]).find({

                 success: function (experts) {


                 //console.log("\n Experts: " + JSON.stringify(experts));

                 return callback(null, experts);


                 },
                 error: function (error) {
                 alert("Error: " + error.code + " " + error.message);
                 return callback(error);
                 }
                 }, {useMasterKey: true});

                 }

                 }

                 function getWorkspaceFollowers(callback) {

                 //todo check for when we should be updating workspace_follower in Algolia Index
                 // get workspace_followers only in the following scenarios (1) user isFollower or isMember == true (2) workspace admin sent request for a user to join a workspace it's viewable to that user.

                 if (collection != "WorkSpace") {

                 return callback(null, object);

                 } else {

                 var WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
                 var queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);

                 let viewableBy = [];

                 queryWorkspaceFollower.equalTo("workspace", workspace);

                 // todo if there is more than 10k people following workspace need to split algolia index into two objects and implement pagination here.
                 queryWorkspaceFollower.limit(10000);
                 // queryWorkspaceFollower.include( ["workspace"] );

                 queryWorkspaceFollower.find({

                 success: function (followers) {

                 //console.log("workspace.type: " + JSON.stringify(workspaceToSave.type));

                 delete workspaceToSave.skills;
                 delete workspaceToSave.experts;

                 workspaceToSave.objectID = workspaceToSave.objectId;
                 workspaceToSave['followers'] = followers;


                 for (var i = 0; i < followers.length; i++) {

                 if (workspaceToSave.type === 'private') {
                 viewableBy.push(followers[i].toJSON().user.objectId);
                 //console.log("user id viewableBy: " + followers[i].toJSON().user.objectId) ;
                 }


                 }

                 if (workspaceToSave.type === 'private') {

                 workspaceToSave._tags= viewableBy;
                 //console.log("workspace 2: " + JSON.stringify(workspaceToSave));

                 } else if (workspaceToSave.type === 'public') {

                 workspaceToSave._tags = ['*'];

                 }

                 //console.log("followers: " + JSON.stringify(workspaceToSave.followers));

                 return callback(null, workspaceToSave);

                 },
                 error: function (error) {
                 alert("Error: " + error.code + " " + error.message);
                 return callback(error);
                 }
                 }, {useMasterKey: true});

                 }


                 }

                async.parallel([
                    async.apply(getSkills),
                    async.apply(getExperts),
                    async.apply(getWorkspaceFollowers)

                ], function (err, results) {
                    if (err) {
                        return cb(err);
                    }

                    console.log("results length: " + JSON.stringify(results));

                    if (collection === "WorkSpace") {

                        workspaceToSave = results[2];
                        var skillsToSave = results[0];
                        var expertsToSave = results[1];

                        console.log("skillsToSave: " + JSON.stringify(skillsToSave));
                        console.log("expertsToSave: " + JSON.stringify(expertsToSave));
                        console.log("workspaceToSave: " + JSON.stringify(workspaceToSave));

                        workspaceToSave["skills"] = skillsToSave;
                        workspaceToSave["experts"] = expertsToSave;

                        object = workspaceToSave;

                        console.log("object: " + JSON.stringify(object));

                        return cb(null, object);


                    }
                    else {

                        // convert to regular key/value JavaScript object
                        object = results[3];
                        object = object.toJSON();
                        // Specify Algolia's objectID with the Parse.Object unique ID
                        object.objectID = object.objectId;

                        return cb(null, object);
                    }

                });


            }, function (err, objectsToIndex) {

                console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                // Add or update new objects
                indexWorkspaces.partialUpdateObjects(objectsToIndex, true, function (err, content) {
                    if (err) response.error(err);

                    console.log("Parse<>Algolia workspace saved from indexCollection function ");

                    var finalTime = process.hrtime(time);
                    console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                    response.success();

                });

            });



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {useMasterKey: true});


}, {useMasterKey: true});


// Run beforeSave functions for hashtags, mentions, URL and luis.ai intents
Parse.Cloud.beforeSave('_User', function(req, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let user = req.object;
    let socialProfilePicURL = user.get("socialProfilePicURL");
    let profileImage = user.get("profileimage");

    let workspaceFollower = Parse.Object.extend("workspace_follower");
    let queryWorkspaceFollower = new Parse.Query(workspaceFollower);
    queryWorkspaceFollower.equalTo("isSelected", true);
    queryWorkspaceFollower.equalTo("user", user);

    let userObject = Parse.Object.extend("_User");
    let userQuery = new Parse.Query(userObject);
    userQuery.equalTo("objectId", user.id);

    console.log("_User req: " + JSON.stringify(req.user));

    //let expiresAt = session.get("expiresAt");
    let _tagPublic = '_tags:' + '*';
    let _tagUserId = '_tags:' + user.id;

    if (user.get("isLogin")) {

        user.set("isLogin", false);

        // new session, create a new algoliaAPIKey for this user

        // generate a public API key for user 42. Here, records are tagged with:
        //  - 'user_XXXX' if they are visible by user XXXX
        const user_public_key = client.generateSecuredApiKey(
            '4cbf716235b59cc21f2fa38eb29c4e39',
            {
                //validUntil: expiresAt,
                tagFilters: [ [_tagUserId , _tagPublic] ],
                userToken: user.id
            }
        );


        user.set("algoliaSecureAPIKey", user_public_key);

    }


    if (user.dirty("profileimage")) {

        user.set("isDirtyProfileimage", true);

        console.log("Profileimage url: " + JSON.stringify(profileImage.toJSON().url));


    }
    else if (!user.dirty("profileimage")) {user.set("isDirtyProfileimage", false);}

    if (user.dirty("isOnline")) {
        user.set("isDirtyIsOnline", true);

    }
    else if (!user.dirty("isOnline")) {user.set("isDirtyIsOnline", false);}

    if (user.isNew()) {
        user.set("isNew", true);
        user.set("showAvailability", true);
    }
    else if (!user.isNew()) {

        user.set("isNew", false);

       /* if (user.dirty("isSelectedWorkspaceFollower")) {

            userQuery.first({

                //useMasterKey: true,
                sessionToken: req.user.getSessionToken()

            }).then((User) => {

                console.log("BeforeSave _User userQuery result: " + JSON.stringify(User));

                let isSelectedWorkspaceFollower_Previous = User.get("isSelectedWorkspaceFollower");
                console.log("user.isisSelectedWorkspaceFollower: " + JSON.stringify(isSelectedWorkspaceFollower_Previous));
                isSelectedWorkspaceFollower_Previous.set("isSelected", false);
                isSelectedWorkspaceFollower_Previous.save(null, {

                    //useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                });

                let finalTime = process.hrtime(time);
                console.log(`finalTime took _User beforeSave ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                response.success();

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error(error);
            }, {

                useMasterKey: true,
                sessionToken: req.user.getSessionToken()

            });


        }*/


    }



    if (user.isNew() && socialProfilePicURL!=null) {

        var displayName = user.get("displayName");
        var fileName = user.id + displayName + '_profilePicture';

        const options = {
            uri: socialProfilePicURL,
            resolveWithFullResponse: true,
            encoding: null, // <-- this is important for binary data like images.
        };

        requestPromise(options)
            .then((response) => {
                const data = Array.from(Buffer.from(response.body, 'binary'));
                const contentType = response.headers['content-type'];
                const file = new Parse.File(fileName, data, contentType);
                return file.save();
            })
            .then((file) => {

                user.set("profileimage", file);

                let finalTime = process.hrtime(time);
                console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                response.success();
            })
            .catch(console.error);

    } else {

        let finalTime = process.hrtime(time);
        console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

        response.success();}


}, {useMasterKey: true});

// Run beforeSave functions workspace
Parse.Cloud.beforeSave('WorkSpace', function(req, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let workspace = req.object;
    let owner = new Parse.Object("_User");
    owner = workspace.get("user");

    console.log("request.object: " + JSON.stringify(req.object));
    if(workspace.get("experts")) {
        let workspaceExpertObjects = req.object.toJSON().experts.objects;
        let exp__op = req.object.toJSON().experts.__op;

    }


    //console.log("request: " + JSON.stringify(req));
    //console.log("workspaceExperts__op: " + JSON.stringify(workspaceExpertObjects));

    let expertRelation = workspace.relation("experts");
    let expertArray = [];

    if (

        !req.user || !req.user.getSessionToken()) {response.error("beforeSave WorkSpace Session token: X-Parse-Session-Token is required");

    } else {

        //var WORKSPACE = Parse.Object.extend("WorkSpace");
        let WORKspace = new Parse.Object("WorkSpace");

        let queryWorkspace = new Parse.Query(WORKspace);

        if (workspace.isNew()) {


            queryWorkspace.equalTo("workspace_url", workspace.get("workspace_url"));

            queryWorkspace.first({

                useMasterKey: true,
                sessionToken: req.user.getSessionToken()

            }).then((results) => {
                // The object was retrieved successfully.

                if (results) {

                    // workspace url is not unique return error

                    response.error(results);

                } else {

                    // set the workspace owner as an expert
                    expertRelation.add(owner);

                    workspace.set("isNew", true);

                    owner.fetch(owner.id, {

                        useMasterKey: true,
                        sessionToken: req.user.getSessionToken()

                    }).then((expert) => {

                        let expertOwner = simplifyUser(expert);

                        //expertArray.push(expertOwner);
                        workspace.addUnique("expertsArray", expertOwner);

                        let finalTime = process.hrtime(time);
                        console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                        response.success();

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true,
                        sessionToken: req.user.getSessionToken()

                    });

                    //console.log("request: " + JSON.stringify(req));


                }


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error(error);
            }, {

                useMasterKey: true,
                sessionToken: req.user.getSessionToken()

            });


        }
        else if (!workspace.isNew() && workspace.dirty("workspace_url")) {

            workspace.set("isNew", false);

            queryWorkspace.equalTo("workspace_url", workspace.get("workspace_url"));

            queryWorkspace.first({

                useMasterKey: true,
                sessionToken: req.user.getSessionToken()

            }).then((results) => {
                // The object was retrieved successfully.

                if (results) {

                    // workspace url is not unique return error

                    response.error(results);

                } else {

                    if (workspace.dirty("experts") === true) {

                        workspace.set("isDirtyExperts", true);

                        if (exp__op === "AddRelation") {

                            // add expert to expertsArray

                            async.map(workspaceExpertObjects, function (object, cb) {


                                let workspaceExpertObject = new Parse.Object("_User");
                                workspaceExpertObject.set("objectId", object.objectId);

                                //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));

                                workspaceExpertObject.fetch(workspaceExpertObject.id, {

                                    useMasterKey: true,
                                    sessionToken: req.user.getSessionToken()

                                }).then((expert) => {

                                    let expertOwner = simplifyUser(expert);

                                    //console.log("expertOwner 2: " + JSON.stringify(expertOwner));

                                    //o[key] = expertOwner;

                                    workspace.addUnique("expertsArray", expertOwner);
                                    /*workspace.save(null, {

                                     useMasterKey: true,
                                     sessionToken: req.user.getSessionToken()

                                     });*/

                                    object = expertOwner;
                                    //expertArray.push(expertOwner);

                                    return cb (null, object);

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    response.error(error);
                                }, {

                                    useMasterKey: true,
                                    sessionToken: req.user.getSessionToken()

                                });

                            }, function (err, workspaceExpertObjects) {

                                //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                                if (err) {response.error(err);} else {



                                    //expertArray = result.get("expertsArray");
                                    //console.log("result: " + JSON.stringify(result));

                                    //result.Add("expertsArray", JSON.stringify(workspaceExpertObjects[0]));
                                    //console.log("expertsArray: " + JSON.stringify(result.get("expertsArray")));

                                    //workspace.addUnique("expertsArray", workspaceExpertObjects[0]);
                                    //console.log("expertsArray Result: " + JSON.stringify(workspace.get("expertsArray")));

                                    //workspace.set("expertsArray", workspaceExpertObjects);
                                    //console.log("workspace 2: " + JSON.stringify(workspace));

                                    let finalTime = process.hrtime(time);
                                    console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                                    response.success();



                                }

                            });



                        }
                        else if (exp__op === "RemoveRelation") {

                            // remove expert from expertsArray

                            async.map(workspaceExpertObjects, function (object, cb) {

                                let workspaceExpertObject = new Parse.Object("_User");
                                workspaceExpertObject.set("objectId", object.objectId);

                                //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));

                                workspaceExpertObject.fetch(workspaceExpertObject.id, {

                                    useMasterKey: true,
                                    sessionToken: req.user.getSessionToken()

                                }).then((expert) => {

                                    let expertOwner = simplifyUser(expert);

                                    //console.log("expertOwner 2: " + JSON.stringify(expertOwner));

                                    object = expertOwner;
                                    workspace.remove("expertsArray", expertOwner);
                                    //expertArray.push(expertOwner);

                                    return cb (null, object);

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    response.error(error);
                                }, {

                                    useMasterKey: true,
                                    sessionToken: req.user.getSessionToken()

                                });

                            }, function (err, workspaceExpertObjects) {

                                //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                                if (err) {response.error(err);} else {

                                    //workspace.set("expertsArray", workspaceExpertObjects);
                                    //workspace.remove("expertsArray", workspaceExpertObjects);
                                    //console.log("workspace 2: " + JSON.stringify(workspace));

                                    let finalTime = process.hrtime(time);
                                    console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                                    response.success();


                                }

                            });



                        }
                        else {

                            // do nothing to expertArray

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                            response.success();
                        }




                    } else {

                        workspace.set("isDirtyExperts", false);

                        let finalTime = process.hrtime(time);
                        console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                        response.success();
                    }


                }


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error(error);
            }, {

                useMasterKey: true,
                sessionToken: req.user.getSessionToken()

            });


        }
        else if (!workspace.isNew() && !workspace.dirty("workspace_url")) {

            workspace.set("isNew", false);

            //console.log("workspace.dirty: " + workspace.dirty("experts"));

            if (workspace.dirty("experts") === true) {

                workspace.set("isDirtyExperts", true);

                if (exp__op === "AddRelation") {

                    // add expert to expertsArray

                    async.map(workspaceExpertObjects, function (object, cb) {


                        let workspaceExpertObject = new Parse.Object("_User");
                        workspaceExpertObject.set("objectId", object.objectId);

                        //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));

                        workspaceExpertObject.fetch(workspaceExpertObject.id, {

                            useMasterKey: true,
                            sessionToken: req.user.getSessionToken()

                        }).then((expert) => {

                            let expertOwner = simplifyUser(expert);

                            console.log("expertOwner 2: " + JSON.stringify(expertOwner));

                            //o[key] = expertOwner;

                            workspace.addUnique("expertsArray", expertOwner);
                            /*workspace.save(null, {

                             useMasterKey: true,
                             sessionToken: req.user.getSessionToken()

                             });*/

                            object = expertOwner;
                            //expertArray.push(expertOwner);

                            return cb (null, object);

                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            response.error(error);
                        }, {

                            useMasterKey: true,
                            sessionToken: req.user.getSessionToken()

                        });

                    }, function (err, workspaceExpertObjects) {

                        //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                        if (err) {response.error(err);} else {



                            //expertArray = result.get("expertsArray");
                            //console.log("result: " + JSON.stringify(result));

                            //result.Add("expertsArray", JSON.stringify(workspaceExpertObjects[0]));
                            //console.log("expertsArray: " + JSON.stringify(result.get("expertsArray")));

                            //workspace.addUnique("expertsArray", workspaceExpertObjects[0]);
                            //console.log("expertsArray Result: " + JSON.stringify(workspace.get("expertsArray")));

                            //workspace.set("expertsArray", workspaceExpertObjects);
                            //console.log("workspace 2: " + JSON.stringify(workspace));

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                            response.success();



                        }

                    });







                }
                else if (exp__op === "RemoveRelation") {



                    async.map(workspaceExpertObjects, function (object, cb) {

                        let workspaceExpertObject = new Parse.Object("_User");
                        workspaceExpertObject.set("objectId", object.objectId);

                        //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));

                        workspaceExpertObject.fetch(workspaceExpertObject.id, {

                            useMasterKey: true,
                            sessionToken: req.user.getSessionToken()

                        }).then((expert) => {

                            let expertOwner = simplifyUser(expert);

                            //console.log("expertOwner 2: " + JSON.stringify(expertOwner));

                            object = expertOwner;
                            workspace.remove("expertsArray", expertOwner);
                            //expertArray.push(expertOwner);

                            return cb (null, object);

                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            response.error(error);
                        }, {

                            useMasterKey: true,
                            sessionToken: req.user.getSessionToken()

                        });

                    }, function (err, workspaceExpertObjects) {

                        //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                        if (err) {response.error(err);} else {

                            //workspace.set("expertsArray", workspaceExpertObjects);
                            //workspace.remove("expertsArray", workspaceExpertObjects);
                            //console.log("workspace 2: " + JSON.stringify(workspace));

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                            response.success();


                        }

                    });


                } else {

                    // do nothing to expertArray

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                    response.success();
                }




            } else {

                workspace.set("isDirtyExperts", false);

                let finalTime = process.hrtime(time);
                console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                response.success();
            }


        }
        else {


            let finalTime = process.hrtime(time);
            console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

            response.success();

        }


    }


}, {useMasterKey: true});

// Run beforeSave functions channel
Parse.Cloud.beforeSave('Channel', function(req, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();
    var channel = req.object;

    var channelACL = new Parse.ACL();

    if (!req.user) {

        response.error("beforeSave Channel Session token: X-Parse-Session-Token is required");

    } else if (req.user) {

        if (!req.user.getSessionToken()) {


            response.error("beforeSave Channel Session token: X-Parse-Session-Token is required");

        } else {

            console.log("req.user SessionToken: " + JSON.stringify(req.user.getSessionToken()));

            //var owner = new Parse.Object("_User");
            var owner = channel.get("user");
            var expertRelation = channel.relation("experts");

            //var WORKSPACE = new Parse.Object("WORKSPACE");
            var workspace = channel.get("workspace");

            let channelName = channel.get("name");
            channelName = channelName.toLowerCase().trim();
            channel.set("name", channelName);

            //var CHANNEL = new Parse.Object("Channel");
            var queryChannel = new Parse.Query("Channel");

            //console.log("channel.isNew: " + channel.isNew());

            if (channel.isNew()) {

                //console.log("channel isNew: " + channel.isNew());

                if (!channel.get("name")) {
                    response.error("Channel name is required.");
                }
                if (!channel.get("user")) {
                    response.error("User who is the channel creator is required when creating a new channel");
                }
                if (!channel.get("workspace")) {
                    response.error("Workspace is required when creating a new channel");
                }
                if (!channel.get("type")) {
                    response.error("Channel type field is required.");
                }

                var nameWorkspaceID = channel.get("name") + '-' + channel.get("workspace").id;
                channel.set("nameWorkspaceID", nameWorkspaceID);
                //console.log("nameWorkspaceID: " + nameWorkspaceID);

                queryChannel.equalTo("nameWorkspaceID", nameWorkspaceID);

                queryChannel.first({

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                }).then((results) => {
                    // The object was retrieved successfully.
                    //console.log("results beforeSave Channel: " + JSON.stringify(results));
                    if (results) {

                        // channel is not unique return error
                        var finalTime = process.hrtime(time);
                        console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                        response.error("There is already a channel with this name: " + channel.get("name") + ' ' + "please use a channel name that isn't already taken.");

                    } else {

                        //console.log("nice no channel with this name, create it!");

                        // set isNew to true so we can use this in afterSave Channel if needed.
                        channel.set("isNew", true);

                        // set channel to not be default if user didn't specify it
                        if (!channel.get("default")) {
                            channel.set("default", false);
                        }

                        // set 0 for countPosts, countFollowers and countMembers
                        channel.set("postCount", 0);
                        channel.set("memberCount", 0);
                        channel.set("followerCount", 0);

                        // by default archive needs to be set to false
                        channel.set("archive", false);

                        // By default allowMemberPostCreation is set to false
                        if (!channel.get("allowMemberPostCreation")) {
                            channel.set("allowMemberPostCreation", false);

                            // todo add role ACL to members to be able to create posts in this workspace

                        }

                        //console.log("channel: " + JSON.stringify(channel));

                        // If this is a private channel, set ACL for owner to read and write
                        if (channel.get("type") === 'private') {
                            channelACL.setPublicReadAccess(false);
                            channelACL.setPublicWriteAccess(false);
                            channelACL.setReadAccess(owner, true);
                            channelACL.setWriteAccess(owner, true);
                            channel.setACL(channelACL);

                            var finalTime = process.hrtime(time);
                            console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                            response.success();

                        } else if (channel.get("type") === 'privateMembers') {

                            // get member role for this workspace
                            var queryMemberRole = new Parse.Query(Parse.Role);
                            var memberName = 'member-' + workspace.id;

                            queryMemberRole.equalTo('name', memberName);
                            queryMemberRole.first({useMasterKey: true})
                                .then((memberRole) => {
                                    // The object was retrieved successfully.

                                    //console.log("memberRole" + JSON.stringify(memberRole));

                                    // private workspace, but this is a channel that is accessible to all members of this private workspace
                                    channelACL.setPublicReadAccess(false);
                                    channelACL.setPublicWriteAccess(false);
                                    channelACL.setReadAccess(memberRole, true);
                                    channelACL.setWriteAccess(memberRole, true);
                                    channel.setACL(channelACL);

                                    var finalTime = process.hrtime(time);
                                    console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                    response.success();


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    response.error(error);
                                }, {useMasterKey: true});


                        } else if (channel.get("type") === 'privateExperts') {

                            // get member role for this workspace
                            var queryRole = new Parse.Query(Parse.Role);
                            var Name = 'expert-' + workspace.id;

                            queryRole.equalTo('name', Name);
                            queryRole.first({useMasterKey: true})
                                .then((Role) => {
                                    // The object was retrieved successfully.

                                    //console.log("memberRole" + JSON.stringify(memberRole));

                                    // private workspace, but this is a channel that is accessible to all members of this private workspace
                                    channelACL.setPublicReadAccess(false);
                                    channelACL.setPublicWriteAccess(false);
                                    channelACL.setReadAccess(Role, true);
                                    channelACL.setWriteAccess(Role, true);
                                    channel.setACL(channelACL);

                                    var finalTime = process.hrtime(time);
                                    console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                    response.success();


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    response.error(error);
                                }, {useMasterKey: true});


                        } else if (channel.get("type") === 'privateAdmins') {

                            // get member role for this workspace
                            var queryRole = new Parse.Query(Parse.Role);
                            var Name = 'admin-' + workspace.id;

                            queryRole.equalTo('name', Name);
                            queryRole.first({useMasterKey: true})
                                .then((Role) => {
                                    // The object was retrieved successfully.

                                    //console.log("memberRole" + JSON.stringify(memberRole));

                                    // private workspace, but this is a channel that is accessible to all members of this private workspace
                                    channelACL.setPublicReadAccess(false);
                                    channelACL.setPublicWriteAccess(false);
                                    channelACL.setReadAccess(Role, true);
                                    channelACL.setWriteAccess(Role, true);
                                    channel.setACL(channelACL);

                                    var finalTime = process.hrtime(time);
                                    console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                    response.success();


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    response.error(error);
                                }, {useMasterKey: true});


                        } else if (channel.get("type") === 'privateModerators') {

                            // get member role for this workspace
                            var queryRole = new Parse.Query(Parse.Role);
                            var Name = 'moderator-' + workspace.id;

                            queryRole.equalTo('name', Name);
                            queryRole.first({useMasterKey: true})
                                .then((Role) => {
                                    // The object was retrieved successfully.

                                    //console.log("memberRole" + JSON.stringify(memberRole));

                                    // private workspace, but this is a channel that is accessible to all members of this private workspace
                                    channelACL.setPublicReadAccess(false);
                                    channelACL.setPublicWriteAccess(false);
                                    channelACL.setReadAccess(Role, true);
                                    channelACL.setWriteAccess(Role, true);
                                    channel.setACL(channelACL);

                                    var finalTime = process.hrtime(time);
                                    console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                    response.success();


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    response.error(error);
                                }, {useMasterKey: true});


                        } else if (channel.get("type") === 'privateOwners') {

                            // get member role for this workspace
                            var queryRole = new Parse.Query(Parse.Role);
                            var Name = 'owner-' + workspace.id;

                            queryRole.equalTo('name', Name);
                            queryRole.first({useMasterKey: true})
                                .then((Role) => {
                                    // The object was retrieved successfully.

                                    //console.log("memberRole" + JSON.stringify(memberRole));

                                    // private workspace, but this is a channel that is accessible to all members of this private workspace
                                    channelACL.setPublicReadAccess(false);
                                    channelACL.setPublicWriteAccess(false);
                                    channelACL.setReadAccess(Role, true);
                                    channelACL.setWriteAccess(Role, true);
                                    channel.setACL(channelACL);

                                    var finalTime = process.hrtime(time);
                                    console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                    response.success();


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    response.error(error);
                                }, {useMasterKey: true});

                        } else if (channel.get("type") === 'public') {

                            //console.log("channel is: " + JSON.stringify(channel.get("type")));
                            //console.log("channelACL: " + JSON.stringify(channelACL));
                            // private workspace, but this is a channel that is accessible to all members of this private workspace
                            channelACL.setPublicReadAccess(true);
                            channelACL.setPublicWriteAccess(true);
                            channelACL.setReadAccess(owner, true);
                            channelACL.setWriteAccess(owner, true);

                            //console.log("channelACL: " + JSON.stringify(channelACL));
                            channel.setACL(channelACL);

                            response.success();


                        } else if (channel.get("type") != 'private' || channel.get("type") != 'public' || channel.get("type") != 'privateOwners' || channel.get("type") != 'privateModerators' || channel.get("type") != 'privateAdmins' || channel.get("type") != 'privateExperts' || channel.get("type") != 'privateMembers') {

                            //var finalTime = process.hrtime(time);
                            //console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
                            response.error("Channel type field is needs to be one of the following: private, public, privateOwners, privateModerators,  privateAdmins, privateExperts, privateMembers");
                        } else {

                            //var finalTime = process.hrtime(time);
                            //console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                            response.success();

                        }

                    }


                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    response.error(error);
                }, {useMasterKey: true});


            }
            else if (!channel.isNew() && channel.dirty("name")) {


                channel.set("isNew", false);
                //console.log("Channel is New, and name updated");

                queryChannel.equalTo("workspace", channel.get("workspace"));
                queryChannel.equalTo("name", channel.get("name"));

                queryChannel.first({

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                }).then((results) => {
                    // The object was retrieved successfully.

                    if (results) {
                        // channel name is not unique return error
                        response.error(results);

                    } else {

                        // By default allowMemberPostCreation is set to false
                        if (channel.dirty("allowMemberPostCreation")) {

                            // todo add role ACL to members to be able to creat posts in this workspace

                        }

                        if (channel.dirty("type")) {

                            //channelACL = new Parse.ACL();

                            // If this is a private channel, set ACL for owner to read and write
                            if (channel.get("type") === 'private') {
                                channelACL.setPublicReadAccess(false);
                                channelACL.setPublicWriteAccess(false);
                                channelACL.setReadAccess(owner, true);
                                channelACL.setWriteAccess(owner, true);
                                channel.setACL(channelACL);

                                // todo send a notification to members and followers that now this channel is private

                                response.success();

                            } else if (channel.get("type") === 'privateMembers') {

                                // todo send notification to all users who are not members since they won't get access to this channel anymore

                                // get member role for this workspace
                                var queryMemberRole = new Parse.Query(Parse.Role);
                                var memberName = 'member-' + workspace.id;

                                queryMemberRole.equalTo('name', memberName);
                                queryMemberRole.first({useMasterKey: true})
                                    .then((memberRole) => {
                                        // The object was retrieved successfully.

                                        //console.log("memberRole" + JSON.stringify(memberRole));

                                        // private workspace, but this is a channel that is accessible to all members of this private workspace
                                        channelACL.setPublicReadAccess(false);
                                        channelACL.setPublicWriteAccess(false);
                                        channelACL.setReadAccess(memberRole, true);
                                        channelACL.setWriteAccess(memberRole, true);
                                        channelACL.setReadAccess(owner, true);
                                        channelACL.setWriteAccess(owner, true);
                                        channel.setACL(channelACL);

                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});


                            } else if (channel.get("type") === 'privateExperts') {

                                // todo send notification to all users who are not experts since they won't get access to this channel anymore


                                // get member role for this workspace
                                var queryRole = new Parse.Query(Parse.Role);
                                var Name = 'expert-' + workspace.id;

                                queryRole.equalTo('name', Name);
                                queryRole.first({useMasterKey: true})
                                    .then((Role) => {
                                        // The object was retrieved successfully.

                                        //console.log("memberRole" + JSON.stringify(Role));

                                        // private workspace, but this is a channel that is accessible to all members of this private workspace
                                        channelACL.setPublicReadAccess(false);
                                        channelACL.setPublicWriteAccess(false);
                                        channelACL.setReadAccess(Role, true);
                                        channelACL.setWriteAccess(Role, true);
                                        channelACL.setReadAccess(owner, true);
                                        channelACL.setWriteAccess(owner, true);
                                        channel.setACL(channelACL);

                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});


                            } else if (channel.get("type") === 'privateAdmins') {

                                // todo send notification to all users who are not admins since they won't get access to this channel anymore


                                // get member role for this workspace
                                var queryRole = new Parse.Query(Parse.Role);
                                var Name = 'admin-' + workspace.id;

                                queryRole.equalTo('name', Name);
                                queryRole.first({useMasterKey: true})
                                    .then((Role) => {
                                        // The object was retrieved successfully.

                                        //console.log("memberRole" + JSON.stringify(Role));

                                        // private workspace, but this is a channel that is accessible to all members of this private workspace
                                        channelACL.setPublicReadAccess(false);
                                        channelACL.setPublicWriteAccess(false);
                                        channelACL.setReadAccess(Role, true);
                                        channelACL.setWriteAccess(Role, true);
                                        channelACL.setReadAccess(owner, true);
                                        channelACL.setWriteAccess(owner, true);
                                        channel.setACL(channelACL);

                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});

                            } else if (channel.get("type") === 'privateModerators') {

                                // todo send notification to all users who are not moderators since they won't get access to this channel anymore

                                // get member role for this workspace
                                var queryRole = new Parse.Query(Parse.Role);
                                var Name = 'moderator-' + workspace.id;

                                queryRole.equalTo('name', Name);
                                queryRole.first({useMasterKey: true})
                                    .then((Role) => {
                                        // The object was retrieved successfully.

                                        //console.log("memberRole" + JSON.stringify(Role));

                                        // private workspace, but this is a channel that is accessible to all members of this private workspace
                                        channelACL.setPublicReadAccess(false);
                                        channelACL.setPublicWriteAccess(false);
                                        channelACL.setReadAccess(Role, true);
                                        channelACL.setWriteAccess(Role, true);
                                        channelACL.setReadAccess(owner, true);
                                        channelACL.setWriteAccess(owner, true);
                                        channel.setACL(channelACL);

                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});

                            } else if (channel.get("type") === 'privateOwners') {

                                // todo send notification to all users who are not privateOwners since they won't get access to this channel anymore


                                // get member role for this workspace
                                var queryRole = new Parse.Query(Parse.Role);
                                var Name = 'owner-' + workspace.id;

                                queryRole.equalTo('name', Name);
                                queryRole.first({useMasterKey: true})
                                    .then((Role) => {
                                        // The object was retrieved successfully.

                                        //console.log("memberRole" + JSON.stringify(Role));

                                        // private workspace, but this is a channel that is accessible to all members of this private workspace
                                        channelACL.setPublicReadAccess(false);
                                        channelACL.setPublicWriteAccess(false);
                                        channelACL.setReadAccess(Role, true);
                                        channelACL.setWriteAccess(Role, true);
                                        channelACL.setReadAccess(owner, true);
                                        channelACL.setWriteAccess(owner, true);
                                        channel.setACL(channelACL);

                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});

                            } else if (channel.get("type") === 'public') {

                                // private workspace, but this is a channel that is accessible to all members of this private workspace
                                channelACL.setPublicReadAccess(true);
                                channelACL.setPublicWriteAccess(true);
                                channelACL.setReadAccess(owner, true);
                                channelACL.setWriteAccess(owner, true);
                                channel.setACL(channelACL);

                                var finalTime = process.hrtime(time);
                                console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                response.success();


                            } else if (channel.get("type") != 'private' || channel.get("type") != 'public' || channel.get("type") != 'privateOwners' || channel.get("type") != 'privateModerators' || channel.get("type") != 'privateAdmins' || channel.get("type") != 'privateExperts' || channel.get("type") != 'privateMembers') {

                                response.error("Channel type field is needs to be one of the following: private, public, privateOwners, privateModerators,  privateAdmins, privateExperts, privateMembers");
                            } else {

                                response.success();

                            }


                        } else {
                            response.success();
                        }


                    }


                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    response.error(error);
                }, {useMasterKey: true});

            }
            else if (!channel.isNew() && !channel.dirty("name")) {

                channel.set("isNew", false);
                console.log("Channel is not new and name didn't change: " + JSON.stringify(channel));


                // By default allowMemberPostCreation is set to false
                if (channel.dirty("allowMemberPostCreation")) {

                    // todo add role ACL to members to be able to create posts in this workspace

                }

                if (channel.dirty("type")) {

                    //channelACL = new Parse.ACL();

                    // If this is a private channel, set ACL for owner to read and write
                    if (channel.get("type") === 'private') {
                        channelACL.setPublicReadAccess(false);
                        channelACL.setPublicWriteAccess(false);
                        channelACL.setReadAccess(owner, true);
                        channelACL.setWriteAccess(owner, true);
                        channel.setACL(channelACL);

                        console.log("channel update, type changed, private.");

                        // todo send a notification to members and followers that now this channel is private

                        response.success();

                    } else if (channel.get("type") === 'privateMembers') {

                        // todo send notification to all users who are not members since they won't get access to this channel anymore

                        // get member role for this workspace
                        var queryMemberRole = new Parse.Query(Parse.Role);
                        var memberName = 'member-' + workspace.id;

                        queryMemberRole.equalTo('name', memberName);
                        queryMemberRole.first({useMasterKey: true})
                            .then((memberRole) => {
                                // The object was retrieved successfully.

                                console.log("memberRole" + JSON.stringify(memberRole));

                                // private workspace, but this is a channel that is accessible to all members of this private workspace
                                channelACL.setPublicReadAccess(false);
                                channelACL.setPublicWriteAccess(false);
                                channelACL.setReadAccess(memberRole, true);
                                channelACL.setWriteAccess(memberRole, true);
                                channelACL.setReadAccess(owner, true);
                                channelACL.setWriteAccess(owner, true);
                                channel.setACL(channelACL);

                                response.success();


                            }, (error) => {
                                // The object was not retrieved successfully.
                                // error is a Parse.Error with an error code and message.
                                response.error(error);
                            }, {useMasterKey: true});


                    } else if (channel.get("type") === 'privateExperts') {

                        // todo send notification to all users who are not experts since they won't get access to this channel anymore


                        // get member role for this workspace
                        var queryRole = new Parse.Query(Parse.Role);
                        var Name = 'expert-' + workspace.id;

                        queryRole.equalTo('name', Name);
                        queryRole.first({useMasterKey: true})
                            .then((Role) => {
                                // The object was retrieved successfully.

                                console.log("memberRole" + JSON.stringify(Role));

                                // private workspace, but this is a channel that is accessible to all members of this private workspace
                                channelACL.setPublicReadAccess(false);
                                channelACL.setPublicWriteAccess(false);
                                channelACL.setReadAccess(Role, true);
                                channelACL.setWriteAccess(Role, true);
                                channelACL.setReadAccess(owner, true);
                                channelACL.setWriteAccess(owner, true);
                                channel.setACL(channelACL);

                                response.success();


                            }, (error) => {
                                // The object was not retrieved successfully.
                                // error is a Parse.Error with an error code and message.
                                response.error(error);
                            }, {useMasterKey: true});


                    } else if (channel.get("type") === 'privateAdmins') {

                        // todo send notification to all users who are not admins since they won't get access to this channel anymore


                        // get member role for this workspace
                        var queryRole = new Parse.Query(Parse.Role);
                        var Name = 'admin-' + workspace.id;

                        queryRole.equalTo('name', Name);
                        queryRole.first({useMasterKey: true})
                            .then((Role) => {
                                // The object was retrieved successfully.

                                console.log("memberRole" + JSON.stringify(Role));

                                // private workspace, but this is a channel that is accessible to all members of this private workspace
                                channelACL.setPublicReadAccess(false);
                                channelACL.setPublicWriteAccess(false);
                                channelACL.setReadAccess(Role, true);
                                channelACL.setWriteAccess(Role, true);
                                channel.setACL(channelACL);

                                response.success();


                            }, (error) => {
                                // The object was not retrieved successfully.
                                // error is a Parse.Error with an error code and message.
                                response.error(error);
                            }, {useMasterKey: true});

                    } else if (channel.get("type") === 'privateModerators') {

                        // todo send notification to all users who are not moderators since they won't get access to this channel anymore

                        // get member role for this workspace
                        var queryRole = new Parse.Query(Parse.Role);
                        var Name = 'moderator-' + workspace.id;

                        queryRole.equalTo('name', Name);
                        queryRole.first({useMasterKey: true})
                            .then((Role) => {
                                // The object was retrieved successfully.

                                console.log("memberRole" + JSON.stringify(Role));

                                // private workspace, but this is a channel that is accessible to all members of this private workspace
                                channelACL.setPublicReadAccess(false);
                                channelACL.setPublicWriteAccess(false);
                                channelACL.setReadAccess(Role, true);
                                channelACL.setWriteAccess(Role, true);
                                channel.setACL(channelACL);

                                response.success();


                            }, (error) => {
                                // The object was not retrieved successfully.
                                // error is a Parse.Error with an error code and message.
                                response.error(error);
                            }, {useMasterKey: true});

                    } else if (channel.get("type") === 'privateOwners') {

                        // todo send notification to all users who are not privateOwners since they won't get access to this channel anymore


                        // get member role for this workspace
                        var queryRole = new Parse.Query(Parse.Role);
                        var Name = 'owner-' + workspace.id;

                        queryRole.equalTo('name', Name);
                        queryRole.first({useMasterKey: true})
                            .then((Role) => {
                                // The object was retrieved successfully.

                                console.log("memberRole" + JSON.stringify(Role));

                                // private workspace, but this is a channel that is accessible to all members of this private workspace
                                channelACL.setPublicReadAccess(false);
                                channelACL.setPublicWriteAccess(false);
                                channelACL.setReadAccess(Role, true);
                                channelACL.setWriteAccess(Role, true);
                                channel.setACL(channelACL);

                                response.success();


                            }, (error) => {
                                // The object was not retrieved successfully.
                                // error is a Parse.Error with an error code and message.
                                response.error(error);
                            }, {useMasterKey: true});

                    } else if (channel.get("type") === 'public') {

                        // private workspace, but this is a channel that is accessible to all members of this private workspace
                        channelACL.setPublicReadAccess(true);
                        channelACL.setPublicWriteAccess(true);
                        channelACL.setReadAccess(owner, true);
                        channelACL.setWriteAccess(owner, true);
                        channel.setACL(channelACL);

                        var finalTime = process.hrtime(time);
                        console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                        response.success();


                    } else if (channel.get("type") != 'private' || channel.get("type") != 'public' || channel.get("type") != 'privateOwners' || channel.get("type") != 'privateModerators' || channel.get("type") != 'privateAdmins' || channel.get("type") != 'privateExperts' || channel.get("type") != 'privateMembers') {

                        response.error("Channel type field is needs to be one of the following: private, public, privateOwners, privateModerators,  privateAdmins, privateExperts, privateMembers");
                    } else {

                        response.success();

                    }


                } else {
                    console.log("channel change, type is not updated.");
                    response.success();
                }


            } else {
                if (!channel.get("isNew")) {
                    channel.set("isNew", false);
                }

                var finalTime = process.hrtime(time);
                console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                response.success();
            }


        }
    }

}, {useMasterKey: true});

// Run beforeSave functions for Skills to validate data and prevent duplicate entries.
Parse.Cloud.beforeSave('Skill', function(req, response) {

    /*var NS_PER_SEC = 1e9;
     const MS_PER_NS = 1e-6;
     var time = process.hrtime();*/

    var skill = req.object;
    console.log("Levels: " + skill.get('level'));
    var level = skill.get("level");
    var name = skill.get("name");
    if (level) {level = level.trim();};
    if (name) {name = name.trim();};
    var verifyNameLevel = name + ':' + level;
    var nameLevel;

    // Setup Parse query
    var querySkill = Parse.Object.extend("Skill");
    var querySKILL = new Parse.Query(querySkill);

    nameLevel =  skill.get("nameLevel");
    if (nameLevel) {nameLevel.trim();}
    querySKILL.equalTo("nameLevel", nameLevel);

    //console.log("nameLevel: " + JSON.stringify(nameLevel));



    if (skill.isNew()) {

        querySKILL.first({
            success: function(results) {

                if (results) {

                    //Skill already exists in DB in Skill table, return an error because it needs to be unique

                    response.error(results);

                } else {

                    //Skill doesn't exist, let's add it but before check if level is valid

                    if (nameLevel && name && level) {

                        //console.log("skill.dirty level: " + skill.dirty("level"));

                        if (nameLevel != verifyNameLevel) { response.error("Error 1: NameLevel: " + nameLevel + " Should include the same name: " + name + "and level: " + level + "seperated by : just like this: " + name + ':' + level);}

                        level = level.toLowerCase();
                        //console.log("skill: " + JSON.stringify(skill));

                        switch (level) {
                            case "starter":
                                skill.set('level', level);
                                //skill.set('nameLevel', name + ':' + level);
                                response.success();

                                break;
                            case "ninja":
                                skill.set('level', level);
                                //skill.set('nameLevel', name + ':' + level);
                                response.success();

                                break;
                            case "master":
                                skill.set('level', level);
                                //skill.set('nameLevel', name + ':' + level);
                                response.success();

                                break;
                            default:
                                response.error("Please enter one of the following valid levels: starter, ninja or master");
                        };


                    } else { response.error("nameLevel, name and level fields are all required to add a skill."); }


                }


            },
            error: function(err) {
                response.error("An error occured: " + err);

            }
        });


    } else if (!skill.isNew() && skill.dirty("level")) {

        // can't allow updates to nameLevel, name or level to make sure data is consistent, we can allow delete then add instead
        response.error("We currently don't allow modifications of level.");

    } else if (!skill.isNew() && skill.dirty("name") && skill.dirty("nameLevel")) {

        // verify first that nameLevel is correct with name and level.
        if (nameLevel != verifyNameLevel) { response.error("NameLevel: " + nameLevel + "Should include the same name: " + name + "and level: " + level + "seperated by : just like this: " + name + ':' + level);}

        // now let's check to make sure this nameLevel doesn't already exist
        querySKILL.first({
            success: function(results) {

                if (results) {

                    //Skill already exists in DB in Skill table, return an error because it needs to be unique

                    response.error(results);

                } else {

                    //Skill doesn't exist, let's add it
                    response.success();

                }

            },
            error: function(err) {
                response.error("An error occured: " + err);

            }
        });

        //response.success();

    } else { response.error("Please update both name and nameLevel fields."); }


});


// Run beforeSave functions for hashtags, mentions, URL and luis.ai intents
Parse.Cloud.beforeSave('Post', function(req, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    var post = req.object;
    var text = post.get("text");
    var workspace = post.get("workspace");
    //console.log("workspace_post: " + JSON.stringify(workspace));
    var channel = post.get("channel");
    //console.log("channel_post: " + JSON.stringify(channel));

    var toLowerCase = function(w) { return w.toLowerCase(); };
    //console.log("post: " + JSON.stringify(post));

    // Function to count number of posts
    function countPosts (callback) {

        var NS_PER_SEC = 1e9;
        const MS_PER_NS = 1e-6;
        var timeCountPosts = process.hrtime();
        var countPosts_Time;

        // if there is a post that got added, then increase counter, else ignoremyObject
        if (post.isNew()) {

            var POST = Parse.Object.extend("Post");
            var Post = new POST();
            Post.id = post.objectId;

            // add counter for posts to workspace collection
            var WORKSPACE = Parse.Object.extend("WorkSpace");
            var Workspace = new WORKSPACE();
            Workspace.id = workspace.id;

            // Convert Parse.Object to JSON
            //var objectToSave = Workspace.id.toJSON();

            //var Post = Parse.Object.extend("Post");
            //var queryWorkspace = new Parse.Query(Workspace);
            Workspace.increment("postCount");
            Workspace.save(null, {

                useMasterKey: true,
                sessionToken: req.user.getSessionToken()

            });


            if (channel) {
                // add counter for posts to channel collection
                var CHANNEL = Parse.Object.extend("Channel");
                var Channel = new CHANNEL();
                Channel.id = channel.id;

                Channel.increment("postCount");
                Channel.save(null, {

                    //useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                });

                return callback(null, post);



            } else {

                //post = Post;
                countPosts_Time = process.hrtime(timeCountPosts);
                console.log(`countPosts_Time took ${(countPosts_Time[0] * NS_PER_SEC + countPosts_Time[1])  * MS_PER_NS} milliseconds`);

                return callback(null, post);

            }



        }

        else {

            countPosts_Time = process.hrtime(timeCountPosts);
            console.log(`countPosts_Time took ${(countPosts_Time[0] * NS_PER_SEC + countPosts_Time[1])  * MS_PER_NS} milliseconds`);

            return callback(null, post);

        }



    }

    // Function to capture hashtags from text posts
    function getHashtags (callback) {
        var NS_PER_SEC = 1e9;
        const MS_PER_NS = 1e-6;
        var timeCountPosts = process.hrtime();
        var getHashtags_Time;

        var hashtags;

        // if there is a post that got added and no hashtags from client then add hashtags
        if (post.isNew() && !post.hashtags) {

            hashtags = text.match(/(^|\s)(#[a-z\d-]+)/gi);
            hashtags = _.map(hashtags, toLowerCase);
            hashtags = hashtags.map(function (hashtag) {
                return hashtag.trim();
            });
            req.object.set("hashtags", hashtags);
            //console.log("getHashtags: " + JSON.stringify(hashtags));

            getHashtags_Time = process.hrtime(timeCountPosts);
            console.log(`getHashtags_Time took ${(getHashtags_Time[0] * NS_PER_SEC + getHashtags_Time[1])  * MS_PER_NS} milliseconds`);


            return callback(null, post);
        }

        // if an updated for text field (only) in a post occured, and there was no hashtags from client then get hashtags
        else if (!post.isNew() && post.dirty("text") && !post.dirty("hashtags")) {

            hashtags = text.match(/(^|\s)(#[a-z\d-]+)/gi);
            hashtags = _.map(hashtags, toLowerCase);
            hashtags = hashtags.map(function (hashtag) {
                return hashtag.trim();
            });
            req.object.set("hashtags", hashtags);
            //console.log("getHashtags: " + JSON.stringify(hashtags));

            getHashtags_Time = process.hrtime(timeCountPosts);
            console.log(`getHashtags_Time took ${(getHashtags_Time[0] * NS_PER_SEC + getHashtags_Time[1])  * MS_PER_NS} milliseconds`);

            return callback(null, post);

        }
        else {

            getHashtags_Time = process.hrtime(timeCountPosts);
            console.log(`getHashtags_Time took ${(getHashtags_Time[0] * NS_PER_SEC + getHashtags_Time[1])  * MS_PER_NS} milliseconds`);


            return callback(null, post);

        }


    }

    // Function to capture mentions from text posts
    function getMentions (callback) {

        var NS_PER_SEC = 1e9;
        const MS_PER_NS = 1e-6;
        var timeCountPosts = process.hrtime();
        var getMentions_Time;

        var mentions;

        // if there is a post that got added and no mentions from client then add mentions
        if (post.isNew() && !post.mentions) {

            mentions = text.match(/(^|\s)(@[a-z\d-]+)/gi);
            mentions = _.map(mentions, toLowerCase);
            mentions = mentions.map(function (mention) {
                return mention.trim();
            });
            req.object.set("mentions", mentions);
            //console.log("getMentions: " + JSON.stringify(mentions));

            getMentions_Time = process.hrtime(timeCountPosts);
            console.log(`getMentions_Time took ${(getMentions_Time[0] * NS_PER_SEC + getMentions_Time[1])  * MS_PER_NS} milliseconds`);


            return callback(null, post);
        }

        // if an updated for text field (only) in a post occured, and there was no mentions from client then get hashtags
        else if (!post.isNew() && post.dirty("text") && !post.dirty("mentions")) {

            mentions = text.match(/(^|\s)(@[a-z\d-]+)/gi);
            mentions = _.map(mentions, toLowerCase);
            mentions = mentions.map(function (mention) {
                return mention.trim();
            });
            req.object.set("mentions", mentions);
            //console.log("getMentions: " + JSON.stringify(mentions));

            getMentions_Time = process.hrtime(timeCountPosts);
            console.log(`getMentions_Time took ${(getMentions_Time[0] * NS_PER_SEC + getMentions_Time[1])  * MS_PER_NS} milliseconds`);

            return callback(null, post);

        }
        else {

            getMentions_Time = process.hrtime(timeCountPosts);
            console.log(`getMentions_Time took ${(getMentions_Time[0] * NS_PER_SEC + getMentions_Time[1])  * MS_PER_NS} milliseconds`);


            return callback(null, post);

        }

    }

    // function to archive/unarchive postSocial relatio if a post is archived/unarchived
    function archivePostSocial (callback) {
        var NS_PER_SEC = 1e9;
        const MS_PER_NS = 1e-6;
        var timeArchive = process.hrtime();
        var archive_Time;

        // if post is updated and specifically the archive field is updated then update postSocial archive field.
        if (!post.isNew() && post.dirty("archive")) {

            var postSocialRelation = post.relation("postSocial");
            var postSocialRelationQuery = postSocialRelation.query();
            postSocialRelationQuery.find({
                success: function(postSocialResults) {

                    for (var i = 0; i < postSocialResults.length; i++) {

                        postSocialResults[i].set("archive", post.get("archive"));
                        postSocialResults[i].save(null, {

                            useMasterKey: true,
                            sessionToken: req.user.getSessionToken()

                        });

                    }

                    archive_Time = process.hrtime(timeArchive);
                    console.log(`archive_Time took ${(archive_Time[0] * NS_PER_SEC + archive_Time[1]) * MS_PER_NS} milliseconds`);

                    return callback(null, post);

                },
                error: function(err) {
                    // if there is no postSocial results, then just ignore
                    return callback(null, post);
                }

            });


        } else { return callback(null, post);}

    }

    // todo function get qna for question posts

    function getQnA (callback) {}

    // todo function get messages for posts

    function getMessages (callback) {}




    // Function to identify if a text post hasURL
    function getURL (callback) {

        var NS_PER_SEC = 1e9;
        const MS_PER_NS = 1e-6;
        var timeCountPosts = process.hrtime();
        var getURL_Time;

        var hasurl;

        // if there is a post that got added and no hasURL from client then add hasURL
        if (post.isNew() && !post.hasURL) {

            hasurl = urlRegex().test(text);
            //console.log("hasURL: " + JSON.stringify(hasurl));

            req.object.set("hasURL", hasurl);

            getURL_Time = process.hrtime(timeCountPosts);
            console.log(`getURL_Time took ${(getURL_Time[0] * NS_PER_SEC + getURL_Time[1])  * MS_PER_NS} milliseconds`);

            return callback(null, post);
        }

        // if an updated for text field (only) in a post occured, and there was no hasURL from client then get hashtags
        else if (!post.isNew() && post.dirty("text") && !post.dirty("hasURL")) {

            hasurl = urlRegex().test(text);
            //console.log("hasURL: " + JSON.stringify(hasurl));

            req.object.set("hasURL", hasurl);

            getURL_Time = process.hrtime(timeCountPosts);
            console.log(`getURL_Time took ${(getURL_Time[0] * NS_PER_SEC + getURL_Time[1])  * MS_PER_NS} milliseconds`);

            return callback(null, post);

        }
        else {

            getURL_Time = process.hrtime(timeCountPosts);
            console.log(`getURL_Time took ${(getURL_Time[0] * NS_PER_SEC + getURL_Time[1])  * MS_PER_NS} milliseconds`);

            return callback(null, post);

        }

    }

    // Function to get luis.ai topIntent from text post
    function getIntents (callback) {

        var NS_PER_SEC = 1e9;
        const MS_PER_NS = 1e-6;
        var timegetIntents = process.hrtime();
        var getIntents_Time;

        var endpoint =
            "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/";

        // Set the LUIS_APP_ID environment variable
        // to df67dcdb-c37d-46af-88e1-8b97951ca1c2, which is the ID
        // of a public sample application.
        var luisAppId = "685c7d5b-9d64-4182-a69d-bb220a7482ae";

        var utterance = text;
        utterance = utterance.substring(utterance, 500);

        // Set the LUIS_SUBSCRIPTION_KEY environment variable
        // to the value of your Cognitive Services subscription key
        var queryParams = {
            "subscription-key": "0dd6f5d766284cfc94828371ecce99a0",
            "staging": true,
            "timezoneOffset": "-480",
            "verbose":  true,
            "q": utterance
        };

        var luisRequest;

        // if there is a post that got added and no topIntent from client then add hasURL
        if (post.isNew() && !post.topIntent) {

            luisRequest =
                endpoint + luisAppId +
                '?' + querystring.stringify(queryParams);

            requestURL(luisRequest,
                function (err,
                          response, body) {
                    if (err)
                        console.log(err);
                    else {
                        var data = JSON.parse(body);

                        //console.log(`Query: ${data.query}`);
                        //console.log(`Top Intent: ${data.topScoringIntent.intent}`);
                        if (data.topScoringIntent) {

                            console.log('Intent:'+ data.topScoringIntent.intent);
                            req.object.set("topIntent", data.topScoringIntent.intent);
                        }
                        //console.log('Intent:'+ data.topScoringIntent.intent);

                        //console.log("Input post: " + JSON.stringify(post));
                        getIntents_Time = process.hrtime(timegetIntents);
                        console.log(`getIntents_Time took ${(getIntents_Time[0] * NS_PER_SEC + getIntents_Time[1])  * MS_PER_NS} milliseconds`);

                        return callback(null, post);

                    }
                });


        }

        // if an updated for text field (only) in a post occured, and there was no hasURL from client then get hashtags
        else if (!post.isNew() && post.dirty("text") && !post.dirty("topIntent")) {

            luisRequest =
                endpoint + luisAppId +
                '?' + querystring.stringify(queryParams);

            requestURL(luisRequest,
                function (err,
                          response, body) {
                    if (err)
                        console.log(err);
                    else {
                        var data = JSON.parse(body);

                        //console.log(`Query: ${data.query}`);
                        //console.log(`Top Intent: ${data.topScoringIntent.intent}`);
                        if (data.topScoringIntent) {

                            console.log('Intent:'+ data.topScoringIntent.intent);
                            req.object.set("topIntent", data.topScoringIntent.intent);
                        }
                        //console.log('Intent:'+ data.topScoringIntent.intent);

                        //console.log("Input post: " + JSON.stringify(post));
                        getIntents_Time = process.hrtime(timegetIntents);
                        console.log(`getIntents_Time took ${(getIntents_Time[0] * NS_PER_SEC + getIntents_Time[1])  * MS_PER_NS} milliseconds`);

                        return callback(null, post);

                    }
                });


        }
        else {

            getIntents_Time = process.hrtime(timegetIntents);
            console.log(`getIntents_Time took ${(getIntents_Time[0] * NS_PER_SEC + getIntents_Time[1])  * MS_PER_NS} milliseconds`);

            return callback(null, post);

        }


    }

    async.parallel([
        async.apply(countPosts),
        async.apply(getHashtags),
        async.apply(getMentions),
        async.apply(getURL),
        async.apply(archivePostSocial),
        //async.apply(createPostSocial)
        //async.apply(getIntents)

    ], function (err, post) {
        if (err) {
            response.error(err);
        }

        //console.log("final post: " + JSON.stringify(post));

        var beforeSave_Time = process.hrtime(time);
        console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

        response.success();
    });


});



// Run beforeSave functions to count number of workspace followers abd members
Parse.Cloud.beforeSave('workspace_follower', function(req, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let workspace_follower = req.object;

    if (!req.user) {

        response.error("beforeSave workspace_follower Session token: X-Parse-Session-Token is required");

    } else if (req.user) {

        if (!req.user.getSessionToken()) {

            response.error("beforeSave workspace_follower Session token: X-Parse-Session-Token is required");

        } else {

            let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
            let WorkspaceFollower = new WORKSPACEFOLLOWER();
            WorkspaceFollower.id = workspace_follower.id;
            let queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);
            queryWorkspaceFollower.include(["user", "workspace"]);

            let user = new Parse.Object("_User");
            user = workspace_follower.get("user");
            if (!user) { return response.error("please add _User it's required when adding new or updating workspace follower");}
            let userRolesRelation = user.relation("roles");

            let previousQueryWorkspaceFollowerJoin = new Parse.Query(WORKSPACEFOLLOWER);
            previousQueryWorkspaceFollowerJoin.include("workspace");
            previousQueryWorkspaceFollowerJoin.equalTo("user", user);
            previousQueryWorkspaceFollowerJoin.equalTo("isSelected", true);

            let previousQueryWorkspaceFollowerLeave = new Parse.Query(WORKSPACEFOLLOWER);
            previousQueryWorkspaceFollowerLeave.include("workspace");
            previousQueryWorkspaceFollowerLeave.equalTo("user", user);
            previousQueryWorkspaceFollowerLeave.equalTo("isSelected", false);
            previousQueryWorkspaceFollowerLeave.descending("updatedAt");

            let queryMemberRole = new Parse.Query(Parse.Role);
            let queryfollowerRole = new Parse.Query(Parse.Role);

            function createDefaultChannelFollows (callback) {

                defaultChannelQuery.find({

                    //useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                }).then((defaultChannels) => {
                    // The object was retrieved successfully.

                    if (defaultChannels) {

                        async.map(defaultChannels, function (channel, cb) {

                            let ChannelFollower = Parse.Object.extend("ChannelFollow");
                            let channelFollower = new Parse.Object(ChannelFollower);

                            //console.log("ObjectToSave: " + JSON.stringify(channel.getACL()));

                            channelFollower.set("archive", false);
                            channelFollower.set("user", user);
                            channelFollower.set("workspace", Workspace);
                            channelFollower.set("channel", channel);
                            channelFollower.set("notificationCount", 0);
                            if (channel.get("name") === 'general') {
                                channelFollower.set("isSelected", true);
                            } else {
                                channelFollower.set("isSelected", false);
                            }

                            channelFollower.set("isMember", true);
                            channelFollower.set("isFollower", true);

                            //console.log("channelFollow: " + JSON.stringify(channelFollow));

                            channelFollower.save(null, {

                                //useMasterKey: true,
                                sessionToken: req.user.getSessionToken()

                            });

                            channel = channelFollower;

                            return cb (null, channel);


                        }, function (err, defaultChannels) {

                            //console.log("defaultChannels length: " + JSON.stringify(defaultChannels.length));

                            if (err) {
                                return callback (err);
                            } else {

                                return callback (null, defaultChannels);


                            }

                        });




                    } else {

                        return callback (null, defaultChannels);
                    }


                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return callback(error);
                }, {

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                });
            }

            function addFollowerRole (callback) {

                // now add follower since a member is by default a follower
                queryfollowerRole.equalTo('name', followerName);

                queryfollowerRole.first({

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                }).then((followerRole) => {
                    // The object was retrieved successfully.

                    followerRole.getUsers().add(user);
                    followerRole.save(null, {

                        useMasterKey: true,
                        sessionToken: req.user.getSessionToken()

                    });

                    console.log("followerRole: " + JSON.stringify(followerRole));


                    return callback (null, followerRole);

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return callback (error);
                }, {

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                });

            }

            function addMemberRole (callback) {

                queryMemberRole.equalTo('name', memberName);
                queryMemberRole.first({

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                }).then((memberRole) => {
                    // The object was retrieved successfully.

                    //console.log("queryMemberRole result from query: "+JSON.stringify(memberRole));

                    memberRole.getUsers().add(user);
                    memberRole.save(null, {

                        useMasterKey: true,
                        sessionToken: req.user.getSessionToken()

                    });

                    return callback (null, memberRole);


                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return callback (error);
                }, {

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                });


            }

            function removeFollowerRole (callback) {

                // now add follower since a member is by default a follower
                queryfollowerRole.equalTo('name', followerName);

                queryfollowerRole.first({

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                }).then((followerRole) => {
                    // The object was retrieved successfully.

                    followerRole.getUsers().remove(user);
                    followerRole.save(null, {

                        useMasterKey: true,
                        sessionToken: req.user.getSessionToken()

                    });

                    console.log("followerRole: " + JSON.stringify(followerRole));


                    return callback (null, followerRole);

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return callback (error);
                }, {

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                });

            }

            function removeMemberRole (callback) {

                queryMemberRole.equalTo('name', memberName);
                queryMemberRole.first({

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                }).then((memberRole) => {
                    // The object was retrieved successfully.

                    //console.log("queryMemberRole result from query: "+JSON.stringify(memberRole));

                    memberRole.getUsers().remove(user);
                    memberRole.save(null, {

                        useMasterKey: true,
                        sessionToken: req.user.getSessionToken()

                    });

                    return callback (null, memberRole);


                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return callback (error);
                }, {

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                });


            }


            // if there is a new workspace_follower object increase counter for number of followers and members on a workspace
            if (workspace_follower.isNew()) {

                let workspace = workspace_follower.get("workspace");

                let WORKSPACE = Parse.Object.extend("WorkSpace");
                let Workspace = new WORKSPACE();
                Workspace.id = workspace.id;

                let Channel = Parse.Object.extend("Channel");
                let defaultChannelQuery = new Parse.Query(Channel);
                defaultChannelQuery.equalTo("default", true);
                defaultChannelQuery.equalTo("workspace", Workspace);

                let memberName = "member-" + Workspace.id;
                let followerName = "Follower-" + Workspace.id;

                let workspaceFollowerName = workspace_follower.get("user").id + "-" + workspace_follower.get("workspace").id;
                console.log("workspaceFollowerName user: " + JSON.stringify(workspaceFollowerName));

                workspace_follower.set("name", workspaceFollowerName);
                workspace_follower.set("archive", false);
                if (!workspace_follower.get("isMemberRequestedByWorkspaceAdmin")) {
                    workspace_follower.set("isMemberRequestedByWorkspaceAdmin", false);
                }
                if (!workspace_follower.get("isMemberRequestedByUser")) {
                    workspace_follower.set("isMemberRequestedByUser", false);
                }
                if (!workspace_follower.get("isSelected")) {
                    workspace_follower.set("isSelected", false);
                }
                if (!workspace_follower.get("isNotified")) {
                    workspace_follower.set("isNotified", false);
                }
                if (!workspace_follower.get("isUnRead")) {
                    workspace_follower.set("isUnRead", false);
                }


                queryWorkspaceFollower.equalTo("name", workspaceFollowerName);

                // check to make sure that the workspace_follower for a user - workspace is unique
                queryWorkspaceFollower.first({

                    //useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                }).then((results) => {

                    if (results) {

                        //Workspace_follower already exists in DB in Skill table, return an error because it needs to be unique
                        let beforeSaveElse_Time = process.hrtime(time);
                        console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                        response.error(results);

                    } else {



                        if (workspace_follower.get("isFollower") === true && workspace_follower.get("isMember") === true) {

                            Workspace.increment("followerCount");
                            Workspace.increment("memberCount");


                            // mark this workspace_follower as isSelected = true, set pointer to new workspace_follower then mark previous selected workspace to false in beforeSave user
                            workspace_follower.set("isSelected", true);
                            //user.set("isSelectedWorkspaceFollower", workspace_follower);

                            // a member is already a follower so only add member role for this user.

                            console.log("workspace.isNew() user: " + JSON.stringify(user));

                            /*queryMemberRole.equalTo('name', memberName);
                            queryMemberRole.first({
                                success: function (memberRole) { // Role Object
                                    //console.log("Okay, that's a start... in success 1 with memberRole: " + JSON.stringify(memberRole));

                                    memberRole.getUsers().add(user);
                                    memberRole.save(null, {

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });

                                    userRolesRelation.add(memberRole);

                                    // now add follower since a member is by default a follower
                                    queryfollowerRole.equalTo('name', followerName);
                                    queryfollowerRole.first({
                                        success: function (followerRole) { // Role Object
                                            //console.log("Okay, that's a start... in success 1 with followerRole: " + JSON.stringify(followerRole));

                                            followerRole.getUsers().add(user);
                                            followerRole.save(null, {

                                                useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()

                                            });

                                            var userRolesRelation = user.relation("roles");
                                            userRolesRelation.add(followerRole);
                                            user.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()

                                            });

                                            beforeSave_Time = process.hrtime(time);
                                            console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                                            response.success();

                                        },
                                        error: function (error) {
                                            console.log("Bruh, can't find the Admin role");
                                            response.error(error);
                                        }
                                    });

                                },
                                error: function (error) {
                                    console.log("Bruh, can't find the Admin role");
                                    response.error(error);
                                }
                            });*/


                            async.parallel([
                                async.apply(addFollowerRole),
                                async.apply(addMemberRole),
                                async.apply(createDefaultChannelFollows)

                            ], function (err, results) {
                                if (err) {
                                    response.error(err);
                                } else {

                                    let followerRole = results[0];
                                    let memberRole = results[1];

                                    if (followerRole) {
                                        userRolesRelation.add(followerRole);
                                    }

                                    if (memberRole) {
                                        userRolesRelation.add(memberRole);

                                    }

                                    user.save(null, {

                                        //useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });

                                    Workspace.save(null, {

                                        //useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });

                                    let beforeSaveElse_Time = process.hrtime(time);
                                    console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                    response.success();

                                }
                            });


                        }
                        else if (workspace_follower.get("isFollower") === true && workspace_follower.get("isMember") === false) {
                            Workspace.increment("followerCount");
                            Workspace.save(null, {

                                useMasterKey: true,
                                sessionToken: req.user.getSessionToken()

                            });

                            // mark this workspace_follower as isSelected = true, set pointer to new workspace_follower then mark previous selected workspace to false in beforeSave user
                            workspace_follower.set("isSelected", true);
                            user.set("isSelectedWorkspaceFollower", workspace_follower);

                            async.parallel([
                                async.apply(addFollowerRole),
                                async.apply(createDefaultChannelFollows)

                            ], function (err, results) {
                                if (err) {
                                    response.error(err);
                                } else {

                                    let followerRole = results[0];

                                    if (followerRole) {
                                        userRolesRelation.add(followerRole);
                                    }

                                    user.save(null, {

                                        //useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });

                                    let beforeSaveElse_Time = process.hrtime(time);
                                    console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                     response.success();

                                }
                            });



                            /*queryfollowerRole.equalTo('name', followerName);
                            queryfollowerRole.first({
                                success: function (followerRole) { // Role Object
                                    //console.log("Okay, that's a start... in success 1 with followerRole: " + JSON.stringify(followerRole));

                                    followerRole.getUsers().add(user);
                                    followerRole.save(null, {

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });

                                    var userRolesRelation = user.relation("roles");
                                    userRolesRelation.add(followerRole);
                                    user.save(null, {

                                        //useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });

                                    beforeSave_Time = process.hrtime(time);
                                    console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                                    response.success();

                                },
                                error: function (error) {
                                    console.log("Bruh, can't find the Admin role");
                                    response.error(error);
                                }
                            });*/


                        }
                        else if (workspace_follower.get("isFollower") === false && workspace_follower.get("isMember") === true) {
                            Workspace.increment("memberCount");
                            Workspace.increment("followerCount");
                            Workspace.save(null, {

                                useMasterKey: true,
                                sessionToken: req.user.getSessionToken()

                            });

                            // a member is already a follower so only add member role for this user.
                            workspace_follower.set("isFollower", true);

                            // mark this workspace_follower as isSelected = true, set pointer to new workspace_follower then mark previous selected workspace to false in beforeSave user
                            workspace_follower.set("isSelected", true);
                            user.set("isSelectedWorkspaceFollower", workspace_follower);

                            async.parallel([
                                async.apply(addFollowerRole),
                                async.apply(addMemberRole),
                                async.apply(createDefaultChannelFollows)

                            ], function (err, results) {
                                if (err) {
                                    response.error(err);
                                } else {

                                    let followerRole = results[0];
                                    let memberRole = results[1];

                                    if (followerRole) {
                                        userRolesRelation.add(followerRole);
                                    }

                                    if (memberRole) {
                                        userRolesRelation.add(memberRole);

                                    }

                                    user.save(null, {

                                        //useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });

                                    let beforeSaveElse_Time = process.hrtime(time);
                                    console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                    response.success();

                                }
                            });


                        }
                        else {

                            let beforeSaveElse_Time = process.hrtime(time);
                            console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                            response.error("isFollower and isMember are both required fields and one has to be set to true");

                        }


                    }


                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                    response.error(error);
                }, {

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                });


            }
            else if (!workspace_follower.isNew() && (workspace_follower.dirty("isFollower") || workspace_follower.dirty("isMember"))) {

                function getCurrentWorkspaceFollower (callback) {

                    queryWorkspaceFollower.get(WorkspaceFollower.id, {

                        //useMasterKey: true,
                        sessionToken: req.user.getSessionToken()

                    }).then((result) => {
                        // The object was retrieved successfully.

                        return callback (null, result);

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true,
                        sessionToken: req.user.getSessionToken()

                    });

                }

                function getPreviousSelectedWorkspaceFollowerJoin (callback) {

                    previousQueryWorkspaceFollowerJoin.first( {

                        //useMasterKey: true,
                        sessionToken: req.user.getSessionToken()

                    }).then((result) => {
                        // The object was retrieved successfully.

                        if (result) {

                            // There is a previous workspace that was selected, need to return it so we can un-select that previous workspacefollower
                            return callback (null, result);

                        } else {

                            // there was no workspace that was previously selected, return empty

                            return callback (null, result);
                        }



                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true,
                        sessionToken: req.user.getSessionToken()

                    });

                }

                function getPreviousSelectedWorkspaceFollowerLeave (callback) {

                    previousQueryWorkspaceFollowerLeave.first( {

                        //useMasterKey: true,
                        sessionToken: req.user.getSessionToken()

                    }).then((result) => {
                        // The object was retrieved successfully.

                        if (result) {

                            // There is a previous workspace that was selected, need to return it so we can un-select that previous workspacefollower
                            return callback (null, result);

                        } else {

                            // there was no workspace that was previously selected, return empty

                            return callback (null, result);
                        }



                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true,
                        sessionToken: req.user.getSessionToken()

                    });

                }

                async.parallel([
                    async.apply(getCurrentWorkspaceFollower),
                    async.apply(getPreviousSelectedWorkspaceFollowerJoin),
                    async.apply(getPreviousSelectedWorkspaceFollowerLeave)

                ], function (err, results) {
                    if (err) {
                        response.error(err);
                    } else {

                        let Channel = Parse.Object.extend("Channel");
                        let defaultChannelQuery = new Parse.Query(Channel);
                        defaultChannelQuery.equalTo("default", true);
                        defaultChannelQuery.equalTo("workspace", Workspace);

                        let memberName = "member-" + Workspace.id;
                        let followerName = "Follower-" + Workspace.id;

                        let result = results[0]; // current workspace_follower that is in the DB
                        let previousWorkspaceFollowJoin = results[1];
                        let previousWorkspaceFollowLeave = results[2];

                        console.log("workspace_follower result from query: " + JSON.stringify(result.get("name")));
                        console.log("previousWorkspaceFollowJoin result from query: " + JSON.stringify(previousWorkspaceFollowJoin.get("name")));
                        console.log("previousWorkspaceFollowLeave result from query: " + JSON.stringify(previousWorkspaceFollowLeave.get("name")));

                        Workspace = result.get("workspace");
                        let workspaceACL = Workspace.getACL();
                        let workspaceFollowACLPrivate = result.getACL();
                        user = result.get("user");

                        let expertWorkspaceRelation = Workspace.relation("experts");
                        //console.log("userRole: " + JSON.stringify(userRoleRelation));

                        //var expertRoleName = "expert-" + workspace_follower.get("workspace").id;


                        //console.log("old isFollower: "+JSON.stringify(result.get("isFollower")) + " New isFollower: " + JSON.stringify(workspace_follower.get("isFollower")) + " isFollower.dirty: "+JSON.stringify(workspace_follower.dirty("isFollower")));
                        //console.log("old isMember: "+JSON.stringify(result.get("isMember")) + " New isMember: " + JSON.stringify(workspace_follower.get("isMember")) + " isMember.dirty: "+JSON.stringify(workspace_follower.dirty("isMember")));

                        //queryPTime = process.hrtime(timequeryPostFind);
                        //console.log(`function queryPostFind took ${(queryPTime[0] * NS_PER_SEC + queryPTime[1])  * MS_PER_NS} milliseconds`);

                        if (workspace_follower.dirty("isFollower") && workspace_follower.dirty("isMember")) {

                            if ((result.get("isFollower") === false || !result.get("isFollower") ) && workspace_follower.get("isFollower") === true) {

                                Workspace.increment("followerCount");
                                console.log("increment Follower");

                                let userRolesRelation = user.relation("roles");

                                if (Workspace.get("type") === 'private') {

                                    // if Workspace is private add user ACL so he/she has access to the private Workspace or workspace_follower

                                    workspaceACL.setReadAccess(user, true);
                                    workspaceACL.setWriteAccess(user, true);
                                    Workspace.setACL(workspaceACL);

                                    workspaceFollowACLPrivate.setReadAccess(user, true);
                                    workspaceFollowACLPrivate.setWriteAccess(user, true);

                                    workspace_follower.setACL(workspaceFollowACLPrivate);

                                }

                                // set isSelected for this workspace_follower to true and set previous workspace_follower that was selected to false
                                workspace_follower.set("isSelected", true);
                                user.set("isSelectedWorkspaceFollower", workspace_follower);

                                // joining a workspace follower, so mark previous one as false
                                if (previousWorkspaceFollowJoin) {
                                    previousWorkspaceFollowJoin.set("isSelected", false);

                                    previousWorkspaceFollowJoin.save(null, {

                                        //useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()
                                    });

                                }

                                // if isFollower === false then isMember has to also be false. but we will check anyway
                                if ((result.get("isMember") === false || !result.get("isMember") ) && workspace_follower.get("isMember") === true) {

                                    // user isFollow is true  && user isMember also true so make the user both a follower and member
                                    Workspace.increment("memberCount");
                                    console.log("increment  Member");

                                    // create channelFollows for default channel for this new user

                                    async.parallel([
                                        async.apply(addFollowerRole),
                                        async.apply(addMemberRole),
                                        async.apply(createDefaultChannelFollows)

                                    ], function (err, results) {
                                        if (err) {
                                            response.error(err);
                                        } else {

                                            let followerRole = results[0];
                                            let memberRole = results[1];

                                            if (followerRole) {
                                                userRolesRelation.add(followerRole);
                                            }

                                            if (memberRole) {
                                                userRolesRelation.add(memberRole);

                                            }

                                            user.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()

                                            });

                                            Workspace.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            let beforeSaveElse_Time = process.hrtime(time);
                                            console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                            response.success();

                                        }
                                    });


                                }
                                else if ((result.get("isMember") === false || !result.get("isMember") ) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                                    // user isFollow is true but user is not a member, make user only follower

                                    async.parallel([
                                        async.apply(addFollowerRole),
                                        async.apply(createDefaultChannelFollows)

                                    ], function (err, results) {
                                        if (err) {
                                            response.error(err);
                                        } else {

                                            let followerRole = results[0];

                                            if (followerRole) {
                                                userRolesRelation.add(followerRole);
                                            }

                                            user.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()

                                            });

                                            Workspace.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            let beforeSaveElse_Time = process.hrtime(time);
                                            console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                            response.success();

                                        }
                                    });

                                    /*queryfollowerRole.equalTo('name', followerName);
                                    queryfollowerRole.first({

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    }).then((followerRole) => {
                                        // The object was retrieved successfully.

                                        //console.log("queryfollowerRole result from query: "+JSON.stringify(followerRole));

                                        followerRole.getUsers().add(user);
                                        followerRole.save(null, {

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.add(followerRole);
                                        user.save(null, {

                                            //useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });

                                        Workspace.save(null, {

                                            //useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()
                                        });

                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    },{

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });*/



                                }
                                else if ((result.get("isMember") === true) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                                    // user can't be a follower and not a member, keep him a member, sand make him a follower
                                    workspace_follower.set("isMember", true);

                                    async.parallel([
                                        async.apply(addFollowerRole),
                                        async.apply(createDefaultChannelFollows)

                                    ], function (err, results) {
                                        if (err) {
                                            response.error(err);
                                        } else {

                                            let followerRole = results[0];

                                            if (followerRole) {
                                                userRolesRelation.add(followerRole);
                                            }

                                            user.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()

                                            });

                                            Workspace.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            let beforeSaveElse_Time = process.hrtime(time);
                                            console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                            response.success();

                                        }
                                    });


                                }
                                else if (result.get("isMember") === true && workspace_follower.get("isMember") === true) {

                                    // user can't be a member if he wasn't already a follower this really can't happen

                                    Workspace.save(null, {

                                        //useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()
                                    });

                                    let beforeSaveElse_Time = process.hrtime(time);
                                    console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                    response.success();

                                }

                            }
                            else if (result.get("isFollower") === true && workspace_follower.get("isFollower") === false) {

                                // User was a follower but now is not a follower
                                workspace_follower.set("isSelected", false);

                                // remove user as follower of that channel
                                Workspace.increment("followerCount", -1);
                                console.log("decrement Follower");

                                // remove this user as workspace expert since he/she is a workspace expert and un-followed this workspace
                                expertWorkspaceRelation.remove(user);

                                let expert = simplifyUser(user);

                                Workspace.remove("expertsArray", expert);

                                if (Workspace.get("type") === 'private') {

                                    // check if this user is a Workspace owner then don't remove the ACL or he won't be able to come back to his Workspace

                                    if (Workspace.get("user").toJSON().objectId === user.toJSON().objectId) {

                                        // this user who is unfollowing is also the Workspace owner, don't remove his ACL.

                                    } else {

                                        // this user is not the Workspace owner it's ok to remove his/her ACL

                                        // if Workspace is private remove user ACL so he/she doesn't have access to the private channel or Workspacefollow
                                        // user will need to be added again by Workspace owner since it's a private Workspace

                                        workspaceACL.setReadAccess(user, false);
                                        workspaceACL.setWriteAccess(user, false);
                                        Workspace.setACL(workspaceACL);


                                        workspaceFollowACLPrivate.setReadAccess(user, false);
                                        workspaceFollowACLPrivate.setWriteAccess(user, false);

                                        workspace_follower.setACL(workspaceFollowACLPrivate);

                                    }


                                }

                                // joining a workspace follower, so mark previous one as false
                                if (previousWorkspaceFollowLeave) {
                                    previousWorkspaceFollowLeave.set("isSelected", true);
                                    user.set("isSelectedWorkspaceFollower", previousWorkspaceFollowLeave);

                                    previousWorkspaceFollowLeave.save(null, {

                                        //useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()
                                    });

                                }


                                if ((result.get("isMember") === false || !result.get("isMember") ) && workspace_follower.get("isMember") === true) {

                                    // user want's to be member but remove as follower, can't happen. remove him as member and follower
                                    workspace_follower.set("isMember", false);

                                    async.parallel([
                                        async.apply(removeFollowerRole),
                                        async.apply(removeMemberRole)
                                    ], function (err, results) {
                                        if (err) {
                                            response.error(err);
                                        } else {

                                            let followerRole = results[0];
                                            let memberRole = results[1];

                                            if (followerRole) {
                                                userRolesRelation.remove(followerRole);
                                            }

                                            if (memberRole) {
                                                userRolesRelation.remove(memberRole);

                                            }

                                            user.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()

                                            });

                                            Workspace.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            let beforeSaveElse_Time = process.hrtime(time);
                                            console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                            response.success();

                                        }
                                    });


                                    /*queryfollowerRole.equalTo('name', followerName);
                                    queryfollowerRole.first({

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    }).then((followerRole) => {
                                        // The object was retrieved successfully.

                                        //console.log("queryfollowerRole result from query: "+JSON.stringify(followerRole));

                                        followerRole.getUsers().remove(user);
                                        followerRole.save(null, {

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.remove(followerRole);
                                        user.save(null, {

                                            //useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });

                                        Workspace.save(null, {

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()
                                        });

                                        let beforeSaveElse_Time = process.hrtime(time);
                                        console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        let beforeSaveElse_Time = process.hrtime(time);
                                        console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                        response.error(error);
                                    }, {

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });*/



                                }
                                else if ((result.get("isMember") === false || !result.get("isMember") ) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                                    // user is not a member, was a follower and now wants to un-follow

                                    async.parallel([
                                        async.apply(removeFollowerRole)
                                    ], function (err, results) {
                                        if (err) {
                                            response.error(err);
                                        } else {

                                            let followerRole = results[0];

                                            if (followerRole) {
                                                userRolesRelation.remove(followerRole);
                                            }


                                            user.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()

                                            });

                                            Workspace.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            let beforeSaveElse_Time = process.hrtime(time);
                                            console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                            response.success();

                                        }
                                    });


                                    /*queryfollowerRole.equalTo('name', followerName);
                                    queryfollowerRole.first({

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    }).then((followerRole) => {
                                        // The object was retrieved successfully.

                                        //console.log("queryfollowerRole result from query: "+JSON.stringify(followerRole));

                                        followerRole.getUsers().remove(user);
                                        followerRole.save(null, {

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.remove(followerRole);
                                        user.save(null, {

                                            //useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });

                                        Workspace.save(null, {

                                            //useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()
                                        });



                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });*/


                                }
                                else if ((result.get("isMember") === true) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                                    // user was a follower and member and now wants to both un-follow and not be a member anymore
                                    Workspace.increment("memberCount", -1);
                                    console.log("decrement Member");

                                    // now remove both member and follower roles since the user is leaving the workspace and un-following it.

                                    async.parallel([
                                        async.apply(removeFollowerRole),
                                        async.apply(removeMemberRole)
                                    ], function (err, results) {
                                        if (err) {
                                            response.error(err);
                                        } else {

                                            let followerRole = results[0];
                                            let memberRole = results[1];

                                            if (followerRole) {
                                                userRolesRelation.remove(followerRole);
                                            }

                                            if (memberRole) {
                                                userRolesRelation.remove(memberRole);

                                            }

                                            user.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()

                                            });

                                            Workspace.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            let beforeSaveElse_Time = process.hrtime(time);
                                            console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                            response.success();

                                        }
                                    });


                                   /* queryMemberRole.equalTo('name', memberName);
                                    queryMemberRole.first({

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    }).then((memberRole) => {
                                        // The object was retrieved successfully.

                                        console.log("queryMemberRole result from query: "+JSON.stringify(memberRole));

                                        memberRole.getUsers().remove(user);
                                        memberRole.save(null, {

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });

                                        var userRolesRelation = user.relation("roles");

                                        userRolesRelation.remove(memberRole);

                                        // now add follower since a member is by default a follower
                                        queryfollowerRole.equalTo('name', followerName);

                                        queryfollowerRole.first({

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        }).then((followerRole) => {
                                            // The object was retrieved successfully.

                                            followerRole.getUsers().remove(user);
                                            followerRole.save(null, {

                                                useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()

                                            });

                                            //var userRolesRelation = user.relation("roles");
                                            userRolesRelation.remove(followerRole);
                                            user.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            Workspace.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();


                                        }, (error) => {
                                            // The object was not retrieved successfully.
                                            // error is a Parse.Error with an error code and message.
                                            response.error(error);
                                        }, {

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });*/


                                }
                                else if (result.get("isMember") === true && workspace_follower.get("isMember") === true) {

                                    // user can't stay a member since he is un-following this workspace so make him not a member
                                    workspace_follower.set("isMember", false);
                                    Workspace.increment("memberCount", -1);
                                    console.log("decrement Member");

                                    // now remove both member and follower roles since the user is leaving the workspace and un-following it.

                                    async.parallel([
                                        async.apply(removeFollowerRole),
                                        async.apply(removeMemberRole)
                                    ], function (err, results) {
                                        if (err) {
                                            response.error(err);
                                        } else {

                                            let followerRole = results[0];
                                            let memberRole = results[1];

                                            if (followerRole) {
                                                userRolesRelation.remove(followerRole);
                                            }

                                            if (memberRole) {
                                                userRolesRelation.remove(memberRole);

                                            }

                                            user.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()

                                            });

                                            Workspace.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            let beforeSaveElse_Time = process.hrtime(time);
                                            console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                            response.success();

                                        }
                                    });

                                    /*queryMemberRole.equalTo('name', memberName);
                                    queryMemberRole.first({

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    }).then((memberRole) => {
                                        // The object was retrieved successfully.

                                        //console.log("queryMemberRole result from query: "+JSON.stringify(memberRole));

                                        memberRole.getUsers().remove(user);
                                        memberRole.save(null, {

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.remove(memberRole);

                                        // now add follower since a member is by default a follower
                                        queryfollowerRole.equalTo('name', followerName);

                                        queryfollowerRole.first({

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        }).then((followerRole) => {
                                            // The object was retrieved successfully.

                                            followerRole.getUsers().remove(user);
                                            followerRole.save(null, {

                                                useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()

                                            });

                                            var userRolesRelation = user.relation("roles");
                                            userRolesRelation.remove(followerRole);
                                            user.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()

                                            });

                                            Workspace.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        }, (error) => {
                                            // The object was not retrieved successfully.
                                            // error is a Parse.Error with an error code and message.
                                            response.error(error);
                                        }, {

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });*/


                                }


                            }
                            else if (result.get("isFollower") === true && workspace_follower.get("isFollower") === true) {

                                // User was a follower and wants to stay a follower
                                if ((result.get("isMember") === false || !result.get("isMember") ) && workspace_follower.get("isMember") === true) {

                                    // user wants to be a member now
                                    Workspace.increment("memberCount");
                                    console.log("increment  Member");

                                    // now add both member and follower roles since the user is leaving the workspace and un-following it.
                                    queryMemberRole.equalTo('name', memberName);
                                    queryMemberRole.first({

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    }).then((memberRole) => {
                                        // The object was retrieved successfully.

                                        //console.log("queryMemberRole result from query: "+JSON.stringify(memberRole));

                                        memberRole.getUsers().add(user);
                                        memberRole.save(null, {

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.add(memberRole);
                                        user.save(null, {

                                            //useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });

                                        Workspace.save(null, {

                                            //useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()
                                        });

                                         response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                         response.error(error);
                                    }, {

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });


                                }
                                else if ((result.get("isMember") === false || !result.get("isMember") ) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                                    // do nothing since isMember and isFollower did not change

                                    response.success();

                                }
                                else if ((result.get("isMember") === true) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                                    // user want's to stay as a follower but removed as member
                                    Workspace.increment("memberCount", -1);
                                    console.log("decrement Member");

                                    queryMemberRole.equalTo('name', memberName);
                                    queryMemberRole.first({

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    }).then((memberRole) => {
                                        // The object was retrieved successfully.

                                        //console.log("queryMemberRole result from query: "+JSON.stringify(memberRole));

                                        memberRole.getUsers().remove(user);
                                        memberRole.save(null, {

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.remove(memberRole);
                                        user.save(null, {

                                            //useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });

                                        Workspace.save(null, {

                                            //useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()
                                        });

                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });

                                }
                                else if (result.get("isMember") === true && workspace_follower.get("isMember") === true) {

                                    // do nothing since isMember and isFollower did not change

                                    response.success();

                                }

                            }
                            else if ((!result.get("isFollower") || result.get("isFollower") === false) && workspace_follower.get("isFollower") === false) {

                                // User wasn't a follower but now wants to be a member so make him also a follower
                                if ((result.get("isMember") === false || !result.get("isMember") ) && workspace_follower.get("isMember") === true) {

                                    // user can't be a member unless isFollower === true
                                    workspace_follower.set("isFollower", true);

                                    Workspace.increment("followerCount");
                                    console.log("increment Follower");

                                    // user wants to be a member now
                                    Workspace.increment("memberCount");
                                    console.log("increment  Member");


                                    if (Workspace.get("type") === 'private') {

                                        // if channel is private add user ACL so he/she has access to the private channel or channelfollow

                                        workspaceACL.setReadAccess(user, true);
                                        workspaceACL.setWriteAccess(user, true);
                                        Workspace.setACL(workspaceACL);

                                        // set correct ACL for channelFollow

                                        workspaceFollowACLPrivate.setReadAccess(user, true);
                                        workspaceFollowACLPrivate.setWriteAccess(user, true);

                                        workspace_follower.setACL(workspaceFollowACLPrivate);

                                    }

                                    // set isSelected for this workspace_follower to true and set previous workspace_follower that was selected to false
                                    workspace_follower.set("isSelected", true);
                                    user.set("isSelectedWorkspaceFollower", workspace_follower);

                                    // now add both member and follower roles
                                    queryMemberRole.equalTo('name', memberName);
                                    queryMemberRole.first({

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    }).then((memberRole) => {
                                        // The object was retrieved successfully.

                                        //console.log("queryMemberRole result from query: "+JSON.stringify(memberRole));

                                        memberRole.getUsers().add(user);
                                        memberRole.save(null, {

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.add(memberRole);

                                        // now add follower since a member is by default a follower
                                        queryfollowerRole.equalTo('name', followerName);

                                        queryfollowerRole.first({

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        }).then((followerRole) => {
                                            // The object was retrieved successfully.

                                            followerRole.getUsers().add(user);
                                            followerRole.save(null, {

                                                useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()

                                            });

                                            var userRolesRelation = user.relation("roles");
                                            userRolesRelation.add(followerRole);
                                            user.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()

                                            });

                                            Workspace.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();


                                        }, (error) => {
                                            // The object was not retrieved successfully.
                                            // error is a Parse.Error with an error code and message.
                                            response.error(error);
                                        }, {

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {

                                        useMasterKey: true,
                                        sessionToken: req.user.getSessionToken()

                                    });


                                }
                                else if ((result.get("isMember") === false || !result.get("isMember") ) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                                    // do nothing since isMember and isFollower did not change
                                     response.success();


                                }
                                else if ((result.get("isMember") === true) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                                    // user was a member but now is not a member or follower - note this case can't happen because he will always be a follower if he is a member


                                     response.success();

                                }
                                else if (result.get("isMember") === true && workspace_follower.get("isMember") === true) {

                                    // do nothing since isMember and isFollower did not change
                                     response.success();


                                }

                            }


                        }
                        else if (workspace_follower.dirty("isFollower") && !workspace_follower.dirty("isMember")) {

                            response.error("Please enter both isFollower and isMember when updating either member of follower.");

                        }
                        else if (!workspace_follower.dirty("isFollower") && workspace_follower.dirty("isMember")) {

                            response.error("Please enter both isFollower and isMember when updating either member of follower.");

                        }
                        else {

                            // isMember and isFollower not updated, return success.
                            response.success();
                        }

                    }

                });


            }
            else {

                console.log("do nothing at all");

                let beforeSaveElse_Time = process.hrtime(time);
                console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                 response.success();

            }


        }
    }



}, {useMasterKey: true});

// Run beforeSave functions to count number of channel followers and members
Parse.Cloud.beforeSave('ChannelFollow', function(req, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    var channelfollow = req.object;
    var channel = channelfollow.get("channel");
    //console.log("channel: " + JSON.stringify(channel));
    console.log("req.user: " + JSON.stringify(req.user));


    if (!req.user) {

        response.error("beforeSave ChannelFollow Session token: X-Parse-Session-Token is required");

    } else if (req.user) {

        if (!req.user.getSessionToken()) {

            response.error("beforeSave ChannelFollow Session token: X-Parse-Session-Token is required");

        } else {

            var queryChannelFollow = new Parse.Query("ChannelFollow");
            var queryChannel = new Parse.Query("Channel");

            //console.log("post: " + JSON.stringify(channelfollow));

            // if there is a post that got added, then increase counter, else ignoremyObject
            if (channelfollow.isNew()) {

                var beforeSave_Time;

                var channelFollowName = channelfollow.get("user").id + "-" + channelfollow.get("workspace").id + "-" + channelfollow.get("channel").id;
                console.log("channelFollowName user: " + JSON.stringify(channelFollowName));

                queryChannelFollow.equalTo("name", channelFollowName);
                queryChannelFollow.include(["user", "workspace", "channel"]);


                // check to make sure that the workspace_follower for a user - workspace is unique
                queryChannelFollow.first({

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                }).then((results) => {
                    // The object was retrieved successfully.

                    if (results) {

                        //channelfollow already exists in db, return an error because it needs to be unique
                        console.log("channelfollow already exists in db, return an error because it needs to be unique");
                        response.error(results);

                    } else {

                        if (!channelfollow.get("channel")) {
                            response.error("Channel is required.");
                        }
                        if (!channelfollow.get("user")) {
                            response.error("User who is the channel creator is required when creating a new channel");
                        }
                        if (!channelfollow.get("workspace")) {
                            response.error("Workspace is required when creating a new channel");
                        }
                        if (!channelfollow.get("archive")) {
                            channelfollow.set("archive", false);
                        }
                        if (!channelfollow.get("notificationCount")) {
                            channelfollow.set("notificationCount", 0);
                        }

                        let workspace = channelfollow.get("workspace");

                        queryChannel.get(channel.id, {

                            useMasterKey: true,
                            sessionToken: req.user.getSessionToken()

                        }).then((channelObject) => {
                            // The object was retrieved successfully.

                            let user = channelfollow.get("user");


                            var Channel = channelObject;
                            let ownerChannel = Channel.get("user");
                            console.log("channelType: " + JSON.stringify(Channel.get("type")));

                            function addExpertsArrayToChannel (callback) {

                                //var userRole = user.get("roles");
                                var userRoleRelation = user.relation("roles");
                                var expertChannelRelation = Channel.relation("experts");
                                //console.log("userRole: " + JSON.stringify(userRoleRelation));

                                var expertRoleName = "expert-" + channelfollow.get("workspace").id;

                                var userRoleRelationQuery = userRoleRelation.query();
                                userRoleRelationQuery.equalTo("name", expertRoleName);
                                userRoleRelationQuery.first({

                                    useMasterKey: true,
                                    sessionToken: req.user.getSessionToken()

                                }).then((results) => {
                                    // The object was retrieved successfully.

                                    if (results) {

                                        // expert role exists, add as channel expert
                                        console.log("channelExpert: " + JSON.stringify(results));

                                        expertChannelRelation.add(user);

                                        user.fetch(user.id, {

                                            useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        }).then((User) => {

                                            console.log("addExpertsArrayToChannel User: " + JSON.stringify(User));

                                            let expertOwner = simplifyUser(User);


                                            Channel.addUnique("expertsArray", expertOwner);
                                            /*Channel.save(null, {

                                             //useMasterKey: true,
                                             sessionToken: req.user.getSessionToken()

                                             }
                                             );*/

                                            return callback (null, Channel);



                                        }, (error) => {
                                            // Error

                                            return callback (error);
                                        }, { useMasterKey: true,
                                            sessionToken: req.user.getSessionToken()

                                        });


                                    } else {
                                        // no role exists don't add experts to channel

                                        return callback (null, Channel);
                                    }
                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("userRoleRelationQuery no result");
                                    return callback (error);
                                }, {

                                    useMasterKey: true,
                                    sessionToken: req.user.getSessionToken()

                                });


                            }

                            function updateFollowersInChannel (callback) {


                                var queryChannelFollowIsSelected = new Parse.Query("ChannelFollow");
                                queryChannelFollowIsSelected.equalTo("user", user);
                                //queryChannelFollowIsSelected.equalTo("channel", Channel);
                                queryChannelFollowIsSelected.equalTo("workspace", workspace);
                                queryChannelFollowIsSelected.equalTo("isSelected", true);

                                queryChannelFollowIsSelected.first({

                                    useMasterKey: true,
                                    sessionToken: req.user.getSessionToken()

                                }).then((ChannelFollowIsSelected) => {
                                    // The object was retrieved successfully.



                                    channelfollow.set("name", channelFollowName);
                                    //console.log("Channel.getACL(): " + JSON.stringify(Channel.getACL()));

                                    var channelACL = Channel.getACL();
                                    var channelFollowACLPrivate = channelACL;
                                    var channelFollowACL = new Parse.ACL();

                                    // If this is a private channel, set ACL for owner to read and write
                                    if (Channel.get("type") === 'private') {

                                        var adminRolePrivate = new Parse.Role();
                                        var adminNamePrivate = 'admin-' + channelfollow.get("workspace").id;
                                        adminRolePrivate.set("name", adminNamePrivate);

                                        channelACL.setReadAccess(user, true);
                                        channelACL.setWriteAccess(user, true);
                                        Channel.setACL(channelACL);

                                        // set correct ACL for channelFollow
                                        //channelFollowACL.setPublicReadAccess(false);
                                        //channelFollowACL.setPublicWriteAccess(false);
                                        channelFollowACLPrivate.setReadAccess(user, true);
                                        channelFollowACLPrivate.setWriteAccess(user, true);
                                        //channelFollowACL.setReadAccess(ownerChannel, true);
                                        //channelFollowACL.setWriteAccess(ownerChannel, true);
                                        channelfollow.setACL(channelFollowACLPrivate);

                                        if (channelfollow.get("isFollower") === true && channelfollow.get("isMember") === true) {
                                            Channel.increment("followerCount");
                                            Channel.increment("memberCount");

                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);


                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }

                                            return callback (null, Channel);



                                        } else if (channelfollow.get("isFollower") === true && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {
                                            Channel.increment("followerCount");

                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }

                                            return callback (null, Channel);



                                        } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && channelfollow.get("isMember") === true) {
                                            // a member is by default always a follower.
                                            Channel.increment("memberCount");
                                            Channel.increment("followerCount");
                                            channelfollow.set("isFollower", true);
                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }

                                            return callback (null, Channel);

                                        } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            response.error("Please set isFollower:true or isMember:true since one if required.");

                                        } else {

                                            beforeSave_Time = process.hrtime(time);
                                            console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1]) * MS_PER_NS} milliseconds`);

                                            return callback (null, Channel);

                                        }

                                    } else if (Channel.get("type") === 'privateMembers') {

                                        // get member role for this workspace
                                        //var queryMemberRole = new Parse.Query(Parse.Role);
                                        var memberRole = new Parse.Role();
                                        var memberName = 'member-' + channelfollow.get("workspace").id;
                                        memberRole.set("name", memberName);

                                        // set correct ACL for channelFollow
                                        channelFollowACL.setPublicReadAccess(false);
                                        channelFollowACL.setPublicWriteAccess(false);
                                        channelFollowACL.setReadAccess(memberRole, true);
                                        channelFollowACL.setWriteAccess(memberRole, false);
                                        channelFollowACL.setReadAccess(user, true);
                                        channelFollowACL.setWriteAccess(user, true);
                                        channelFollowACL.setReadAccess(ownerChannel, true);
                                        channelFollowACL.setWriteAccess(ownerChannel, true);
                                        channelfollow.setACL(channelFollowACL);

                                        if (channelfollow.get("isFollower") === true && channelfollow.get("isMember") === true) {
                                            Channel.increment("followerCount");
                                            Channel.increment("memberCount");

                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }

                                            return callback (null, Channel);

                                        } else if (channelfollow.get("isFollower") === true && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {
                                            Channel.increment("followerCount");

                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && channelfollow.get("isMember") === true) {
                                            // a member is by default always a follower.
                                            Channel.increment("memberCount");
                                            Channel.increment("followerCount");
                                            channelfollow.set("isFollower", true);

                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            response.error("Please set isFollower:true or isMember:true since one if required.");

                                        } else {

                                            return callback (null, Channel);

                                        }

                                        /*queryMemberRole.equalTo('name', memberName);
                                         queryMemberRole.first({useMasterKey: true})
                                         .then((memberRole) = > {
                                         // The object was retrieved successfully.

                                         // set correct ACL for channelFollow
                                         channelFollowACL.setPublicReadAccess(false);
                                         channelFollowACL.setPublicWriteAccess(false);
                                         channelFollowACL.setReadAccess(memberRole, true);
                                         channelFollowACL.setWriteAccess(user, true);
                                         channelfollow.setACL(channelFollowACL);


                                         },(error) => {
                                         // The object was not retrieved successfully.
                                         // error is a Parse.Error with an error code and message.
                                         response.error(error);
                                         }, { useMasterKey: true });*/


                                    } else if (Channel.get("type") === 'privateExperts') {

                                        // get expert role for this workspace
                                        var expertRole = new Parse.Role();
                                        var expertName = 'expert-' + channelfollow.get("workspace").id;
                                        expertRole.set("name", expertName);

                                        // set correct ACL for channelFollow
                                        channelFollowACL.setPublicReadAccess(false);
                                        channelFollowACL.setPublicWriteAccess(false);
                                        channelFollowACL.setReadAccess(expertRole, true);
                                        channelFollowACL.setWriteAccess(expertRole, false);
                                        channelFollowACL.setReadAccess(user, true);
                                        channelFollowACL.setWriteAccess(user, true);
                                        channelFollowACL.setReadAccess(ownerChannel, true);
                                        channelFollowACL.setWriteAccess(ownerChannel, true);
                                        channelfollow.setACL(channelFollowACL);

                                        if (channelfollow.get("isFollower") === true && channelfollow.get("isMember") === true) {
                                            Channel.increment("followerCount");
                                            Channel.increment("memberCount");

                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if (channelfollow.get("isFollower") === true && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {
                                            Channel.increment("followerCount");
                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && channelfollow.get("isMember") === true) {
                                            // a member is by default always a follower.
                                            Channel.increment("memberCount");
                                            Channel.increment("followerCount");
                                            channelfollow.set("isFollower", true);
                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            response.error("Please set isFollower:true or isMember:true since one if required.");

                                        } else {

                                            return callback (null, Channel);
                                        }

                                        /*queryRole.equalTo('name', Name);
                                         queryRole.first({useMasterKey: true})
                                         .then((Role) = > {
                                         // The object was retrieved successfully.

                                         console.log("Role" + JSON.stringify(Role));

                                         // set correct ACL for channelFollow
                                         channelFollowACL.setPublicReadAccess(false);
                                         channelFollowACL.setPublicWriteAccess(false);
                                         channelFollowACL.setReadAccess(Role, true);
                                         channelFollowACL.setWriteAccess(user, true);
                                         channelfollow.setACL(channelFollowACL);


                                         },(error) => {
                                         // The object was not retrieved successfully.
                                         // error is a Parse.Error with an error code and message.
                                         response.error(error);
                                         }, { useMasterKey: true });*/

                                    } else if (Channel.get("type") === 'privateAdmins') {

                                        // get admin role for this workspace
                                        var adminRole = new Parse.Role();
                                        var adminName = 'expert-' + channelfollow.get("workspace").id;
                                        adminRole.set("name", adminName);

                                        // set correct ACL for channelFollow
                                        channelFollowACL.setPublicReadAccess(false);
                                        channelFollowACL.setPublicWriteAccess(false);
                                        channelFollowACL.setReadAccess(adminRole, true);
                                        channelFollowACL.setWriteAccess(adminRole, false);
                                        channelFollowACL.setReadAccess(user, true);
                                        channelFollowACL.setWriteAccess(user, true);
                                        channelFollowACL.setReadAccess(ownerChannel, true);
                                        channelFollowACL.setWriteAccess(ownerChannel, true);
                                        channelfollow.setACL(channelFollowACL);

                                        if (channelfollow.get("isFollower") === true && channelfollow.get("isMember") === true) {
                                            Channel.increment("followerCount");
                                            Channel.increment("memberCount");
                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if (channelfollow.get("isFollower") === true && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {
                                            Channel.increment("followerCount");
                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && channelfollow.get("isMember") === true) {
                                            // a member is by default always a follower.
                                            Channel.increment("memberCount");
                                            Channel.increment("followerCount");
                                            channelfollow.set("isFollower", true);
                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            response.error("Please set isFollower:true or isMember:true since one if required.");

                                        } else {

                                            return callback (null, Channel);

                                        }

                                        /*queryRole.equalTo('name', Name);
                                         queryRole.first({useMasterKey: true})
                                         .then((Role) = > {
                                         // The object was retrieved successfully.

                                         console.log("Role" + JSON.stringify(Role));

                                         // set correct ACL for channelFollow
                                         channelFollowACL.setPublicReadAccess(false);
                                         channelFollowACL.setPublicWriteAccess(false);
                                         channelFollowACL.setReadAccess(Role, true);
                                         channelFollowACL.setWriteAccess(user, true);
                                         channelfollow.setACL(channelFollowACL);


                                         },(error) => {
                                         // The object was not retrieved successfully.
                                         // error is a Parse.Error with an error code and message.
                                         response.error(error);
                                         }, { useMasterKey: true });*/


                                    } else if (Channel.get("type") === 'privateModerators') {

                                        // get moderator role for this workspace
                                        var moderatorRole = new Parse.Role();
                                        var moderatorName = 'expert-' + channelfollow.get("workspace").id;
                                        moderatorRole.set("name", moderatorName);

                                        // set correct ACL for channelFollow
                                        channelFollowACL.setPublicReadAccess(false);
                                        channelFollowACL.setPublicWriteAccess(false);
                                        channelFollowACL.setReadAccess(moderatorRole, true);
                                        channelFollowACL.setWriteAccess(moderatorRole, false);
                                        channelFollowACL.setReadAccess(user, true);
                                        channelFollowACL.setWriteAccess(user, true);
                                        channelFollowACL.setReadAccess(ownerChannel, true);
                                        channelFollowACL.setWriteAccess(ownerChannel, true);
                                        channelfollow.setACL(channelFollowACL);

                                        if (channelfollow.get("isFollower") === true && channelfollow.get("isMember") === true) {
                                            Channel.increment("followerCount");
                                            Channel.increment("memberCount");
                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if (channelfollow.get("isFollower") === true && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {
                                            Channel.increment("followerCount");

                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && channelfollow.get("isMember") === true) {
                                            // a member is by default always a follower.
                                            Channel.increment("memberCount");
                                            Channel.increment("followerCount");
                                            channelfollow.set("isFollower", true);
                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            response.error("Please set isFollower:true or isMember:true since one if required.");

                                        } else {

                                            return callback (null, Channel);
                                        }

                                        /*queryRole.equalTo('name', Name);
                                         queryRole.first({useMasterKey: true})
                                         .then((Role) = > {
                                         // The object was retrieved successfully.

                                         console.log("Role" + JSON.stringify(Role));

                                         // set correct ACL for channelFollow
                                         channelFollowACL.setPublicReadAccess(false);
                                         channelFollowACL.setPublicWriteAccess(false);
                                         channelFollowACL.setReadAccess(Role, true);
                                         channelFollowACL.setWriteAccess(user, true);
                                         channelfollow.setACL(channelFollowACL);


                                         },(error) => {
                                         // The object was not retrieved successfully.
                                         // error is a Parse.Error with an error code and message.
                                         response.error(error);
                                         }, { useMasterKey: true });*/


                                    } else if (Channel.get("type") === 'privateOwners') {

                                        // get owner role for this workspace
                                        var ownerRole = new Parse.Role();
                                        var ownerName = 'expert-' + channelfollow.get("workspace").id;
                                        ownerRole.set("name", ownerName);

                                        // set correct ACL for channelFollow
                                        channelFollowACL.setPublicReadAccess(false);
                                        channelFollowACL.setPublicWriteAccess(false);
                                        channelFollowACL.setReadAccess(ownerRole, true);
                                        channelFollowACL.setWriteAccess(ownerRole, false);
                                        channelFollowACL.setReadAccess(user, true);
                                        channelFollowACL.setWriteAccess(user, true);
                                        channelFollowACL.setReadAccess(ownerChannel, true);
                                        channelFollowACL.setWriteAccess(ownerChannel, true);
                                        channelfollow.setACL(channelFollowACL);

                                        if (channelfollow.get("isFollower") === true && channelfollow.get("isMember") === true) {
                                            Channel.increment("followerCount");
                                            Channel.increment("memberCount");
                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if (channelfollow.get("isFollower") === true && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {
                                            Channel.increment("followerCount");
                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            ChannelFollowIsSelected("isSelected", false);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && channelfollow.get("isMember") === true) {
                                            // a member is by default always a follower.
                                            Channel.increment("memberCount");
                                            Channel.increment("followerCount");
                                            channelfollow.set("isFollower", true);
                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            response.error("Please set isFollower:true or isMember:true since one if required.");

                                        } else {

                                            return callback (null, Channel);

                                        }

                                        /*queryRole.equalTo('name', Name);
                                         queryRole.first({useMasterKey: true})
                                         .then((Role) = > {
                                         // The object was retrieved successfully.

                                         console.log("Role" + JSON.stringify(Role));

                                         // set correct ACL for channelFollow
                                         channelFollowACL.setPublicReadAccess(false);
                                         channelFollowACL.setPublicWriteAccess(false);
                                         channelFollowACL.setReadAccess(Role, true);
                                         channelFollowACL.setWriteAccess(user, true);
                                         channelfollow.setACL(channelFollowACL);


                                         },(error) => {
                                         // The object was not retrieved successfully.
                                         // error is a Parse.Error with an error code and message.
                                         response.error(error);
                                         }, { useMasterKey: true });*/


                                    } else if (Channel.get("type") === "public") {

                                        // do nothing, since ACL will be public read/write by default
                                        channelFollowACL.setPublicReadAccess(true);
                                        channelFollowACL.setPublicWriteAccess(false);
                                        channelFollowACL.setReadAccess(ownerChannel, true);
                                        channelFollowACL.setWriteAccess(ownerChannel, true);
                                        channelFollowACL.setReadAccess(user, true);
                                        channelFollowACL.setWriteAccess(user, true);
                                        channelfollow.setACL(channelFollowACL);

                                        if (channelfollow.get("isFollower") === true && channelfollow.get("isMember") === true) {
                                            Channel.increment("followerCount");
                                            Channel.increment("memberCount");
                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if (channelfollow.get("isFollower") === true && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {
                                            Channel.increment("followerCount");
                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && channelfollow.get("isMember") === true) {
                                            // a member is by default always a follower.
                                            Channel.increment("memberCount");
                                            Channel.increment("followerCount");
                                            channelfollow.set("isFollower", true);
                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);
                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }
                                            return callback (null, Channel);

                                        } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            response.error("Please set isFollower:true or isMember:true since one if required.");

                                        } else {

                                            return callback (null, Channel);

                                        }


                                    } else if (channel.get("type") != 'private' || channel.get("type") != 'public' || channel.get("type") != 'privateOwners' || channel.get("type") != 'privateModerators' || channel.get("type") != 'privateAdmins' || channel.get("type") != 'privateExperts' || channel.get("type") != 'privateMembers') {

                                        var finalTime = process.hrtime(time);
                                        console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                        response.error("Channel type field is needs to be one of the following: private, public, privateOwners, privateModerators,  privateAdmins, privateExperts, privateMembers");
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelfollowisSelected not found");
                                    response.error(error);
                                }, {

                                    useMasterKey: true,
                                    sessionToken: req.user.getSessionToken()

                                });

                            }

                            async.parallel([
                                async.apply(addExpertsArrayToChannel),
                                async.apply(updateFollowersInChannel)

                            ], function (err, results) {
                                if (err) {
                                    response.error(err);
                                }

                                Channel = results[1];
                                Channel.set("expertsArray", results[0].get("expertsArray"));

                                console.log("Channel async.Parallels: " + JSON.stringify(Channel));

                                Channel.save(null, {

                                    //useMasterKey: true,
                                    sessionToken: req.user.getSessionToken()

                                });
                                beforeSave_Time = process.hrtime(time);
                                console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1]) * MS_PER_NS} milliseconds`);

                                response.success();
                                //return callback (null, resultsToMap);

                            });




                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            console.log("channelQuery not found");
                            response.error(error);
                        }, {

                            useMasterKey: true,
                            sessionToken: req.user.getSessionToken()

                        });
                    }

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    console.log("channelFollowQuery not found");
                    response.error(error);
                }, {

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                });


            }
            else if (!channelfollow.isNew() && (channelfollow.dirty("isFollower") || channelfollow.dirty("isMember"))) {

                console.log("channelfollow.id: " + JSON.stringify(channelfollow.id));

                queryChannelFollow.include(["user", "workspace", "channel"]);
                queryChannelFollow.get(channelfollow.id, {

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                }).then((result) => {
                    // The object was retrieved successfully.

                    console.log("channelfollow result from query: " + JSON.stringify(result));

                    //console.log("old isFollower: "+JSON.stringify(result.get("isFollower")) + " New isFollower: " + JSON.stringify(workspace_follower.get("isFollower")) + " isFollower.dirty: "+JSON.stringify(workspace_follower.dirty("isFollower")));
                    //console.log("old isMember: "+JSON.stringify(result.get("isMember")) + " New isMember: " + JSON.stringify(workspace_follower.get("isMember")) + " isMember.dirty: "+JSON.stringify(workspace_follower.dirty("isMember")));

                    //queryPTime = process.hrtime(timequeryPostFind);
                    //console.log(`function queryPostFind took ${(queryPTime[0] * NS_PER_SEC + queryPTime[1])  * MS_PER_NS} milliseconds`);


                    var Channel = result.get("channel");
                    var channelACL = Channel.getACL();
                    var channelFollowACLPrivate = result.getACL();
                    var user = result.get("user");
                    var workspace = result.get("workspace");
                    //var userRole = user.get("roles");
                    console.log("channelfollow user: " + JSON.stringify(user));

                    let expertsArray = Channel.get("expertsArray");
                    if (expertsArray === undefined || !expertsArray) { expertsArray = []; Channel.set("expertsArray", []);}

                    var userRoleRelation = user.relation("roles");
                    var expertChannelRelation = Channel.relation("experts");
                    //console.log("userRole: " + JSON.stringify(userRoleRelation));

                    var expertRoleName = "expert-" + channelfollow.get("workspace").id;

                    var userRoleRelationQuery = userRoleRelation.query();
                    userRoleRelationQuery.equalTo("name", expertRoleName);
                    userRoleRelationQuery.first({

                        useMasterKey: true,
                        sessionToken: req.user.getSessionToken()

                    }).then((results) => {
                        // The object was retrieved successfully.

                        var queryChannelFollowIsSelected = new Parse.Query("ChannelFollow");
                        queryChannelFollowIsSelected.equalTo("user", user);
                        queryChannelFollowIsSelected.equalTo("workspace", workspace);
                        queryChannelFollowIsSelected.equalTo("isSelected", true);

                        queryChannelFollowIsSelected.first({

                            useMasterKey: true,
                            sessionToken: req.user.getSessionToken()

                        }).then((ChannelFollowIsSelected) => {
                            // The object was retrieved successfully.


                            if (results) {

                                // expert role exists, add as channel expert
                                console.log("channelExpert: " + JSON.stringify(results));

                                if (channelfollow.dirty("isFollower") && channelfollow.dirty("isMember")) {

                                    if ((result.get("isFollower") === false || !result.get("isFollower") ) && channelfollow.get("isFollower") === true) {

                                        Channel.increment("followerCount");
                                        console.log("increment Follower");

                                        // add this user as channel expert since he/she is a workspace expert and followed this channel
                                        expertChannelRelation.add(user);

                                        let expertOwner = simplifyUser(user);

                                        Channel.addUnique("expertsArray", expertOwner);

                                        if (Channel.get("type") === 'private') {

                                            // if channel is private add user ACL so he/she has access to the private channel or channelfollow

                                            channelACL.setReadAccess(user, true);
                                            channelACL.setWriteAccess(user, true);
                                            Channel.setACL(channelACL);

                                            // set correct ACL for channelFollow
                                            //channelFollowACL.setPublicReadAccess(false);
                                            //channelFollowACL.setPublicWriteAccess(false);
                                            channelFollowACLPrivate.setReadAccess(user, true);
                                            channelFollowACLPrivate.setWriteAccess(user, true);
                                            //channelFollowACL.setReadAccess(ownerChannel, true);
                                            //channelFollowACL.setWriteAccess(ownerChannel, true);
                                            channelfollow.setACL(channelFollowACLPrivate);

                                        }

                                        // set isSelected for this channel to true and set previous channel that was selected to false
                                        channelfollow.set("isSelected", true);

                                        if (ChannelFollowIsSelected) {

                                            ChannelFollowIsSelected.set("isSelected", false);
                                            ChannelFollowIsSelected.save(null, {

                                                    //useMasterKey: true,
                                                    sessionToken: req.user.getSessionToken()
                                                }
                                            );

                                        }

                                        // if isFollower === false then isMember has to also be false. but we will check anyway
                                        if ((result.get("isMember") === false || !result.get("isMember") ) && channelfollow.get("isMember") === true) {

                                            // user isFollow is true  && user isMember also true so make the user both a follower and member
                                            Channel.increment("memberCount");
                                            console.log("increment  Member");


                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        } else if ((result.get("isMember") === false || !result.get("isMember") ) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // user isFollow is true but user is not a member, make user only follower

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        } else if ((result.get("isMember") === true) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // user can't be a follower and not a member, keep him a member, sand make him a follower
                                            channelfollow.set("isMember", true);

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        } else if (result.get("isMember") === true && channelfollow.get("isMember") === true) {

                                            // user can't be a member if he wasn't already a follower this really can't happen

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        }

                                    }
                                    else if (result.get("isFollower") === true && channelfollow.get("isFollower") === false) {

                                        // User was a follower but now is not a follower
                                        if (channelfollow.get("isSelected") === true) {
                                            channelfollow.set("isSelected", false);
                                        }

                                        // remove user as follower of that channel
                                        Channel.increment("followerCount", -1);
                                        console.log("decrement Follower");

                                        // remove this user as channel expert since he/she is a workspace expert and un-followed this channel
                                        expertChannelRelation.remove(user);

                                        let expertOwner = simplifyUser(user);

                                        Channel.remove("expertsArray", expertOwner);

                                        if (Channel.get("type") === 'private') {

                                            // check if this user is a channel owner then don't remove the ACL or he won't be able to come back to his channel

                                            if (Channel.get("user").toJSON().objectId === expertOwner.objectId) {

                                                // this user who is unfollowing is also the channel owner, don't remove his ACL.



                                            } else {

                                                // this user is not the channel owner it's ok to remove his/her ACL

                                                // if channel is private remove user ACL so he/she doesn't have access to the private channel or channelfollow
                                                // user will need to be added again by channel owner since it's a private channel

                                                channelACL.setReadAccess(user, false);
                                                channelACL.setWriteAccess(user, false);
                                                Channel.setACL(channelACL);

                                                // set correct ACL for channelFollow
                                                //channelFollowACL.setPublicReadAccess(false);
                                                //channelFollowACL.setPublicWriteAccess(false);
                                                channelFollowACLPrivate.setReadAccess(user, false);
                                                channelFollowACLPrivate.setWriteAccess(user, false);
                                                //channelFollowACL.setReadAccess(ownerChannel, true);
                                                //channelFollowACL.setWriteAccess(ownerChannel, true);
                                                channelfollow.setACL(channelFollowACLPrivate);


                                            }


                                        }

                                        // set isSelected for this channel to true and set previous channel that was selected to false
                                        channelfollow.set("isSelected", false);

                                        // since user unfollowed this channel we unselect it and by default then no channel is selected so we display 'all' channels


                                        if ((result.get("isMember") === false || !result.get("isMember") ) && channelfollow.get("isMember") === true) {

                                            // user want's to stay as member but remove as follower, can't happen. remove him as member and follower
                                            channelfollow.set("isMember", false);

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        } else if ((result.get("isMember") === false || !result.get("isMember") ) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // user is not a member, was a follower and now wants to un-follow

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        } else if ((result.get("isMember") === true) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // user was a follower and member and now wants to both un-follow and not be a member anymore
                                            Channel.increment("memberCount", -1);
                                            console.log("decrement Member");

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        } else if (result.get("isMember") === true && channelfollow.get("isMember") === true) {

                                            // user can't stay a member since he is un-following this workspace so make him not a member
                                            channelfollow.set("isMember", false);
                                            Channel.increment("memberCount", -1);
                                            console.log("decrement Member");

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        }

                                    }
                                    else if (result.get("isFollower") === true && channelfollow.get("isFollower") === true) {

                                        // User was a follower and wants to stay a follower
                                        if ((result.get("isMember") === false || !result.get("isMember") ) && channelfollow.get("isMember") === true) {

                                            // user wants to be a member now
                                            Channel.increment("memberCount");
                                            console.log("increment  Member");

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();


                                        } else if ((result.get("isMember") === false || !result.get("isMember") ) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // do nothing since isMember and isFollower did not change

                                            response.success();

                                        } else if ((result.get("isMember") === true) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // user want's to stay as a follower but removed as member
                                            Channel.increment("memberCount", -1);
                                            console.log("decrement Member");

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        } else if (result.get("isMember") === true && channelfollow.get("isMember") === true) {

                                            // do nothing since isMember and isFollower did not change

                                            response.success();

                                        }

                                    }
                                    else if ((!result.get("isFollower") || result.get("isFollower") === false) && channelfollow.get("isFollower") === false) {

                                        // User wasn't a follower but now wants to be a member so make him also a follower
                                        if ((result.get("isMember") === false || !result.get("isMember") ) && channelfollow.get("isMember") === true) {

                                            // user can't be a member unless isFollower === true
                                            channelfollow.set("isFollower", true);

                                            Channel.increment("followerCount");
                                            console.log("increment Follower");

                                            // add this user as channel expert since he/she is a workspace expert and followed this channel
                                            expertChannelRelation.add(user);

                                            let expertOwner = simplifyUser(user);

                                            Channel.addUnique("expertsArray", expertOwner);

                                            if (Channel.get("type") === 'private') {

                                                // if channel is private add user ACL so he/she has access to the private channel or channelfollow

                                                channelACL.setReadAccess(user, true);
                                                channelACL.setWriteAccess(user, true);
                                                Channel.setACL(channelACL);

                                                // set correct ACL for channelFollow
                                                //channelFollowACL.setPublicReadAccess(false);
                                                //channelFollowACL.setPublicWriteAccess(false);
                                                channelFollowACLPrivate.setReadAccess(user, true);
                                                channelFollowACLPrivate.setWriteAccess(user, true);
                                                //channelFollowACL.setReadAccess(ownerChannel, true);
                                                //channelFollowACL.setWriteAccess(ownerChannel, true);
                                                channelfollow.setACL(channelFollowACLPrivate);

                                            }

                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);

                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }

                                            // user wants to be a member now
                                            Channel.increment("memberCount");
                                            console.log("increment  Member");

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();


                                        } else if ((result.get("isMember") === false || !result.get("isMember") ) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // do nothing since isMember and isFollower did not change
                                            response.success();


                                        } else if ((result.get("isMember") === true) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // user was a member but now is not a member or follower - note this case can't happen because he will always be a follower if he is a member


                                            response.success();

                                        } else if (result.get("isMember") === true && channelfollow.get("isMember") === true) {

                                            // do nothing since isMember and isFollower did not change
                                            response.success();


                                        }

                                    }



                                }
                                else if (channelfollow.dirty("isFollower") && !channelfollow.dirty("isMember")) {

                                    response.error("Please enter both isFollower and isMember when updating either member of follower.");

                                }
                                else if (!channelfollow.dirty("isFollower") && channelfollow.dirty("isMember")) {

                                    response.error("Please enter both isFollower and isMember when updating either member of follower.");

                                }
                                else {

                                    // isMember and isFollower not updated, return success.
                                    response.success();
                                }



                            } else {
                                // no role exists don't add or remove experts from channel

                                if (channelfollow.dirty("isFollower") && channelfollow.dirty("isMember")) {

                                    if ((result.get("isFollower") === false || !result.get("isFollower") ) && channelfollow.get("isFollower") === true) {

                                        Channel.increment("followerCount");
                                        console.log("increment Follower");


                                        if (Channel.get("type") === 'private') {

                                            // if channel is private add user ACL so he/she has access to the private channel or channelfollow

                                            channelACL.setReadAccess(user, true);
                                            channelACL.setWriteAccess(user, true);
                                            Channel.setACL(channelACL);

                                            // set correct ACL for channelFollow
                                            //channelFollowACL.setPublicReadAccess(false);
                                            //channelFollowACL.setPublicWriteAccess(false);
                                            channelFollowACLPrivate.setReadAccess(user, true);
                                            channelFollowACLPrivate.setWriteAccess(user, true);
                                            //channelFollowACL.setReadAccess(ownerChannel, true);
                                            //channelFollowACL.setWriteAccess(ownerChannel, true);
                                            channelfollow.setACL(channelFollowACLPrivate);

                                        }

                                        // set isSelected for this channel to true and set previous channel that was selected to false
                                        channelfollow.set("isSelected", true);

                                        if (ChannelFollowIsSelected) {

                                            ChannelFollowIsSelected.set("isSelected", false);
                                            ChannelFollowIsSelected.save(null, {

                                                    //useMasterKey: true,
                                                    sessionToken: req.user.getSessionToken()
                                                }
                                            );

                                        }

                                        // if isFollower === false then isMember has to also be false. but we will check anyway
                                        if ((result.get("isMember") === false || !result.get("isMember") ) && channelfollow.get("isMember") === true) {

                                            // user isFollow is true  && user isMember also true so make the user both a follower and member
                                            Channel.increment("memberCount");
                                            console.log("increment  Member");

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        } else if ((result.get("isMember") === false || !result.get("isMember") ) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // user isFollow is true but user is not a member, make user only follower

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                        } else if ((result.get("isMember") === true) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // user can't be a follower and not a member, keep him a member, sand make him a follower
                                            channelfollow.set("isMember", true);

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        } else if (result.get("isMember") === true && channelfollow.get("isMember") === true) {

                                            // user can't be a member if he wasn't already a follower this really can't happen

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        }

                                    }
                                    else if (result.get("isFollower") === true && channelfollow.get("isFollower") === false) {

                                        // User was a follower but now is not a follower
                                        if (channelfollow.get("isSelected") === true) {
                                            channelfollow.set("isSelected", false);
                                        }

                                        // remove user as follower of that channel
                                        Channel.increment("followerCount", -1);
                                        console.log("decrement Follower");


                                        if (Channel.get("type") === 'private') {

                                            // check if this user is a channel owner then don't remove the ACL or he won't be able to come back to his channel

                                            if (Channel.get("user").toJSON().objectId === user.toJSON().objectId) {

                                                // this user who is unfollowing is also the channel owner, don't remove his ACL.



                                            } else {

                                                // this user is not the channel owner it's ok to remove his/her ACL

                                                // if channel is private remove user ACL so he/she doesn't have access to the private channel or channelfollow
                                                // user will need to be added again by channel owner since it's a private channel

                                                channelACL.setReadAccess(user, false);
                                                channelACL.setWriteAccess(user, false);
                                                Channel.setACL(channelACL);

                                                // set correct ACL for channelFollow
                                                //channelFollowACL.setPublicReadAccess(false);
                                                //channelFollowACL.setPublicWriteAccess(false);
                                                channelFollowACLPrivate.setReadAccess(user, false);
                                                channelFollowACLPrivate.setWriteAccess(user, false);
                                                //channelFollowACL.setReadAccess(ownerChannel, true);
                                                //channelFollowACL.setWriteAccess(ownerChannel, true);
                                                channelfollow.setACL(channelFollowACLPrivate);


                                            }

                                        }


                                        if ((result.get("isMember") === false || !result.get("isMember") ) && channelfollow.get("isMember") === true) {

                                            // user want's to stay as member but remove as follower, can't happen. remove him as member and follower
                                            channelfollow.set("isMember", false);

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        } else if ((result.get("isMember") === false || !result.get("isMember") ) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // user is not a member, was a follower and now wants to un-follow

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        } else if ((result.get("isMember") === true) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // user was a follower and member and now wants to both un-follow and not be a member anymore
                                            Channel.increment("memberCount", -1);
                                            console.log("decrement Member");

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        } else if (result.get("isMember") === true && channelfollow.get("isMember") === true) {

                                            // user can't stay a member since he is un-following this workspace so make him not a member
                                            channelfollow.set("isMember", false);
                                            Channel.increment("memberCount", -1);
                                            console.log("decrement Member");

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        }

                                    }  else if (result.get("isFollower") === true && channelfollow.get("isFollower") === true) {

                                        // User was a follower and wants to stay a follower
                                        if ((result.get("isMember") === false || !result.get("isMember") ) && channelfollow.get("isMember") === true) {

                                            // user wants to be a member now
                                            Channel.increment("memberCount");
                                            console.log("increment  Member");

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();


                                        } else if ((result.get("isMember") === false || !result.get("isMember") ) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // do nothing since isMember and isFollower did not change

                                            response.success();

                                        } else if ((result.get("isMember") === true) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // user want's to stay as a follower but removed as member
                                            Channel.increment("memberCount", -1);
                                            console.log("decrement Member");

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();

                                        } else if (result.get("isMember") === true && channelfollow.get("isMember") === true) {

                                            // do nothing since isMember and isFollower did not change

                                            response.success();

                                        }

                                    }  else if ((!result.get("isFollower") || result.get("isFollower") === false) && channelfollow.get("isFollower") === false) {

                                        // User wasn't a follower but now wants to be a member so make him also a follower
                                        if ((result.get("isMember") === false || !result.get("isMember") ) && channelfollow.get("isMember") === true) {

                                            // user can't be a member unless isFollower === true
                                            channelfollow.set("isFollower", true);

                                            Channel.increment("followerCount");
                                            console.log("increment Follower");


                                            if (Channel.get("type") === 'private') {

                                                // if channel is private add user ACL so he/she has access to the private channel or channelfollow

                                                channelACL.setReadAccess(user, true);
                                                channelACL.setWriteAccess(user, true);
                                                Channel.setACL(channelACL);

                                                // set correct ACL for channelFollow
                                                //channelFollowACL.setPublicReadAccess(false);
                                                //channelFollowACL.setPublicWriteAccess(false);
                                                channelFollowACLPrivate.setReadAccess(user, true);
                                                channelFollowACLPrivate.setWriteAccess(user, true);
                                                //channelFollowACL.setReadAccess(ownerChannel, true);
                                                //channelFollowACL.setWriteAccess(ownerChannel, true);
                                                channelfollow.setACL(channelFollowACLPrivate);

                                            }

                                            // set isSelected for this channel to true and set previous channel that was selected to false
                                            channelfollow.set("isSelected", true);

                                            if (ChannelFollowIsSelected) {

                                                ChannelFollowIsSelected.set("isSelected", false);
                                                ChannelFollowIsSelected.save(null, {

                                                        //useMasterKey: true,
                                                        sessionToken: req.user.getSessionToken()
                                                    }
                                                );

                                            }

                                            // user wants to be a member now
                                            Channel.increment("memberCount");
                                            console.log("increment  Member");

                                            Channel.save(null, {

                                                //useMasterKey: true,
                                                sessionToken: req.user.getSessionToken()
                                            });

                                            response.success();


                                        } else if ((result.get("isMember") === false || !result.get("isMember") ) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // do nothing since isMember and isFollower did not change
                                            response.success();


                                        } else if ((result.get("isMember") === true) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                            // user was a member but now is not a member or follower - note this case can't happen because he will always be a follower if he is a member


                                            response.success();

                                        } else if (result.get("isMember") === true && channelfollow.get("isMember") === true) {

                                            // do nothing since isMember and isFollower did not change
                                            response.success();


                                        }

                                    }



                                }
                                else if (channelfollow.dirty("isFollower") && !channelfollow.dirty("isMember")) {

                                    response.error("Please enter both isFollower and isMember when updating either member of follower.");

                                }
                                else if (!channelfollow.dirty("isFollower") && channelfollow.dirty("isMember")) {

                                    response.error("Please enter both isFollower and isMember when updating either member of follower.");

                                }
                                else {

                                    // isMember and isFollower not updated, return success.
                                    response.success();
                                }


                            }

                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            response.error(error);
                        }, {

                            useMasterKey: true,
                            sessionToken: req.user.getSessionToken()

                        });

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true,
                        sessionToken: req.user.getSessionToken()

                    });



                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    response.error(error);
                }, {

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                });


            } else {

                var beforeSaveElse_Time = process.hrtime(time);
                console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                response.success();

            }


        }
    }


}, {useMasterKey: true});

// auto-add type when isBookmarked, isLiked or Comment is added
Parse.Cloud.beforeSave('PostSocial', function(request, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();


    // Convert Parse.Object to JSON
    var postSocial = request.object;



    if (postSocial.isNew()) {

        console.log("isLiked: "+postSocial.get("isLiked"));
        console.log("isBookmarked: "+postSocial.get("isBookmarked"));
        console.log("Comments: "+postSocial.get("comment"));

        if (!postSocial.get("isLiked")) {postSocial.set("isLiked", false); }
        if (!postSocial.get("isBookmarked")) {postSocial.set("isBookmarked", false);}


        if(postSocial.get("isLiked") === true || postSocial.get("isBookmarked")=== true) {
            postSocial.set("type", "1");
        }
        else if (postSocial.get("isLiked") === false && postSocial.get("isBookmarked")=== false && !postSocial.get("comment")) {
            postSocial.set("type", "0");
        }
        else if (postSocial.get("comment")) {
            postSocial.set("type", "2");
        }

    } else {}


    var diff = process.hrtime(time);
    console.log(`PostSocial took ${(diff[0] * NS_PER_SEC + diff[1])  * MS_PER_NS} milliseconds`);
    response.success();


});

// Create relationship from post to PostSocial after a PostSocial is saved
Parse.Cloud.afterSave('PostSocial', function(request, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    // Convert Parse.Object to JSON
    var postSocial = request.object;
    var post = postSocial.get("post");

    var relation = post.relation("postSocial");
    //console.log("beforeAdd: " + JSON.stringify(relation));

    relation.add(postSocial);
    //console.log("afterAdd: " + JSON.stringify(relation));

    post.save(null, {

        useMasterKey: true,
        sessionToken: request.user.getSessionToken()

    });

    var diff = process.hrtime(time);
    console.log(`PostSocial took ${(diff[0] * NS_PER_SEC + diff[1])  * MS_PER_NS} milliseconds`);
    response.success();


});

// Add and Update AlgoliaSearch post object if it's deleted from Parse
Parse.Cloud.afterSave('Post', function(request, response) {

    // Convert Parse.Object to JSON
    var objectToSave = request.object.toJSON();

    //var Post = Parse.Object.extend("Post");
    var queryPost = new Parse.Query("Post");
    queryPost.include( ["user", "workspace", "channel"] );
    queryPost.select(["user", "ACL", "media_duration", "postImage", "post_File", "audioWave", "archive", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url", "channel.name", "channel.type", "channel.archive", "post_title", "questionAnswerEnabled" /*,"transcript"*/]);
    queryPost.equalTo("objectId", objectToSave.objectId);

    //console.log("Request: " + JSON.stringify(request));
    //console.log("objectID: " + objectToSave.objectId);
    //console.log("objectID: " + objectToSave.user.objectId);

    queryPost.first({
        success: function(post) {

            function prepIndex (callback) {

                // Successfully retrieved the object.
                //console.log("ObjectToSave: " + JSON.stringify(post));

                // Convert Parse.Object to JSON
                post = post.toJSON();

                // Specify Algolia's objectID with the Parse.Object unique ID
                post.objectID = post.objectId;

                return callback(null, post);

            };


            function addObjectAlgolia (post, callback) {

                //console.log("objectToSave: "+ JSON.stringify(post));

                // Add or update object
                indexPosts.saveObject(post, function(err, content) {
                    if (err) {
                        throw err;
                    }
                    console.log('Parse<>Algolia object saved');
                    return callback(null, post);

                });

            };

            async.waterfall([
                async.apply(prepIndex),
                async.apply(addObjectAlgolia)

            ], function (err, post) {
                if (err) {
                    response.error(err);
                }

                //console.log("final meeting: " + JSON.stringify(post));
                response.success();
            });

        },
        error: function(error) {
            alert("Error: " + error.code + " " + error.message);
        }
    });


});

// Create QnA's from meetingsSnippet
Parse.Cloud.afterSave('MeetingSnippet', function(req, response) {

    var objectsToIndex = [];

    // Convert Parse.Object to JSON
    //var meeting = req.object.toJSON();
    //var meetingURL = req.object.MeetingJson.url;
    //console.log("meetingObject1: " + JSON.stringify(meeting));

    function getMeetingObject (callback) {

        var meetingSnippetObject = Parse.Object.extend("MeetingSnippet");
        var query = new Parse.Query(meetingSnippetObject);
        query.include( ["meeting"] );

        query.get(req.object.id, {
            success: function(meetingSnippetObject) {
                // The object was retrieved successfully.
                //console.log("meetingSnippetObject: " + JSON.stringify(meetingSnippetObject));

                return callback(null, meetingSnippetObject);

            },
            error: function(object, error) {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error("error: " + error);

            }
        });

    };

    function createQnACard (meetingSnippetObject, callback) {

        //console.log("meetingSnippetObject: " + JSON.stringify( meetingSnippetObject ));

        if (meetingSnippetObject.get("meeting")) {

            //console.log("no post id availble and meeting is completed");

            var PostQuestion = Parse.Object.extend("PostQuestion");
            var postQuestion = new PostQuestion("PostQuestion");

            var meetingObject = Parse.Object.extend("meeting");
            meetingObject = meetingSnippetObject.get("meeting");
            //console.log("meetingObject: " + JSON.stringify(meetingObject));
            //console.log("user: " + JSON.stringify(meetingObject.get("user")));
            //console.log("post: " + JSON.stringify(meetingObject.get("post")));
            //console.log("snippet_file: " + JSON.stringify(meetingSnippetObject.get("snippet_file")));
            //console.log("transcript: " + JSON.stringify(meetingSnippetObject.get("transcript")));

            var User = new Parse.Object("_User");
            User.id = meetingObject.get("user").id;
            if (meetingObject.get("user")) {postQuestion.set("user", User);}
            //console.log("User ID: "  + JSON.stringify(User.id));

            var Post = new Parse.Object("Post");
            Post.id = meetingObject.get("post").id;
            if (meetingObject.get("post")) {postQuestion.set("post", Post);}

            postQuestion.set("question_like_count", 0);
            if (meetingSnippetObject.get("transcript")) {postQuestion.set("question_transcript", meetingSnippetObject.get("transcript"));}
            if (meetingSnippetObject.get("snippet_file")) {postQuestion.set("question_video", meetingSnippetObject.get("snippet_file"));}
            postQuestion.set("question_caption", "Office Hours QnA");
            postQuestion.set("question_video_thumbnail",

                {
                    "__type": "File",
                    "name": "office_hours_default.png",
                    "url": "https://parseserverstoragewest.blob.core.windows.net/parse/office_hours_default.png"
                }

            );

            //console.log("postQuestion: " + JSON.stringify(postQuestion));

            //else { return callback(null, meetingSnippetObject); }


            /*else if (!meetingObject.get("post")) {
             meetingPost.set("post_type", '3'); //video post for office hours QNA
             meetingPost.set("privacy", '3');
             //meetingPost.set("text", 'We are starting our #office-hours session now, look forward to answering your questions!');
             meetingPost.set("post_title", 'Office Hours QnA');
             meetingPost.set("questionAnswerEnabled", true);
             if (meetingObject.get("FullMeetingText")) {meetingPost.set("text", meetingObject.get("FullMeetingText"));}
             meetingPost.set("postNumberOfLines", 3);
             meetingPost.set("likesCount", 0);
             meetingPost.set("media_duration", meetingObject.get("MeetingDuration"));

             }
             */

            postQuestion.save(null, {

                useMasterKey: true,
                sessionToken: req.user.getSessionToken()

            }).then((postQuestion) => {
                // Execute any logic that should take place after the object is saved.
                //alert('New object created with objectId: ' + postQuestion.id);
                //console.log("postQuestion 123: " + JSON.stringify(postQuestion.id));


                return callback(null, postQuestion);
            }, (error) => {
                // Execute any logic that should take place if the save fails.
                // error is a Parse.Error with an error code and message.
                //alert('Failed to create new object, with error code: ' + error.message);

                return callback(null, postQuestion);

            });


        }  else {

            //console.log("post id exists or meeting is not completed");
            return callback(null, postQuestion);

        }


    };

    function attachQuestiontoPost (postQuestion, callback) {

        //console.log("postQuestion-callback:" + JSON.stringify(postQuestion));

        var Post = new Parse.Object("Post");
        Post.id = postQuestion.get("post").id;

        var postQuestionRelation = Post.relation("post_questions");
        postQuestionRelation.add(postQuestion);
        Post.save(null, {

            useMasterKey: true,
            sessionToken: req.user.getSessionToken()

        });

        return callback(null, postQuestion);

    }




    async.waterfall([
        async.apply(getMeetingObject),
        async.apply(createQnACard),
        async.apply(attachQuestiontoPost)

    ], function (err, objectsToIndex) {
        if (err) {
            response.error(err);
        }

        //console.log("final meeting: " + JSON.stringify(objectsToIndex));
        response.success();
    });


});



// Add and Update AlgoliaSearch meetings object if it's deleted from Parse
Parse.Cloud.afterSave('Meeting', function(req, response) {

    var objectsToIndex = [];

    // Convert Parse.Object to JSON
    var meeting = req.object.toJSON();
    //var meetingURL = req.object.MeetingJson.url;
    //console.log("meetingObject1: " + JSON.stringify(meeting));

    function getMeetingObject (callback) {

        var meetingObject = Parse.Object.extend("Meeting");
        var query = new Parse.Query(meetingObject);
        query.get(req.object.id, {
            success: function(meetingObject) {
                // The object was retrieved successfully.
                //console.log("meetingObject2: " + JSON.stringify(meetingObject));

                return callback(null, meetingObject);

            },
            error: function(object, error) {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error("error: " + error);

            }
        });

    };

    function createMeetingPost (meetingObject, callback) {

        //console.log("post: " + JSON.stringify(meetingObject.get("post")));
        if (!meetingObject.get("FullMeetingText") || !meetingObject.get("FullProccessingMeetingURL") || !meetingObject.get("MeetingJson") ) {

            return callback(null, meetingObject);

        }
        else {

            console.log("meetingObjectDirty: " + req.object.dirty("post"));
            console.log("iNew: " + meetingObject.isNew());

            if (meetingObject.get("MeetingEvents") === "completed" && !meetingObject.isNew()) {

                //console.log("no post id availble and meeting is completed");

                var MeetingPost = Parse.Object.extend("Post");
                var meetingPost = new MeetingPost();

                var postFile_name = "RE8fed007fb1cb025f8c566ee6135c678a_proc.flac";
                //console.log("postFile_name: " + postFile_name);
                var postFile_url = meetingObject.get("FullProccessingMeetingURL");
                //console.log("postFile_url: " + postFile_url);

                var Workspace = new Parse.Object("WorkSpace");
                Workspace.id = meetingObject.get("workspace");
                //console.log("workspace ID: "  + JSON.stringify(Workspace.id));

                var Channel = new Parse.Object("Channel");
                Channel.id = meetingObject.get("channel");
                //console.log("Channel ID: "  + JSON.stringify(Channel.id));

                var User = new Parse.Object("_User");
                User.id = meetingObject.get("user");
                //console.log("User ID: "  + JSON.stringify(User.id));

                //console.log("meetingPost: " + JSON.stringify(meetingPost));

                if (meetingObject.get("workspace")) {meetingPost.set("workspace", Workspace.id);}
                if (meetingObject.get("channel")) {meetingPost.set("channel", Channel.id);}
                if (meetingObject.get("user")) { meetingPost.set("user", User.id);}
                meetingPost.set("transcript", meetingObject.get("FullMeetingText"));

                if (postFile_name && postFile_url) { meetingPost.set("post_file",
                    {
                        "__type": "File",
                        "name": postFile_name,
                        "url": postFile_url
                    }
                );
                };

                meetingPost.set("transcript_file", meetingObject.get("MeetingJson"));


                if (meetingObject.get("post")) {
                    meetingPost.id = meetingObject.get("post").id;
                    //console.log("Post: " + JSON.stringify(meetingPost));

                }

                else if (!meetingObject.get("post")) {
                    meetingPost.set("post_type", '3'); //video post for office hours QNA
                    meetingPost.set("privacy", '3');
                    meetingPost.set("post_title", 'Office Hours QnA');
                    meetingPost.set("questionAnswerEnabled", true);
                    meetingPost.set("text", meetingObject.get("FullMeetingText"));
                    meetingPost.set("postNumberOfLines", 3);
                    meetingPost.set("CommentCount", 0);
                    meetingPost.set("likesCount", 0);
                    meetingPost.set("media_duration", meetingObject.get("MeetingDuration"));

                }

                //console.log("meetingPost2: " + JSON.stringify(meetingPost));


                meetingPost.save(null, {

                    useMasterKey: true,
                    sessionToken: req.user.getSessionToken()

                }).then((meetingPost) => {
                    // Execute any logic that should take place after the object is saved.
                    //alert('New object created with objectId: ' + meetingPost.id);
                    //console.log("meetingPost3: " + JSON.stringify(meetingPost.id));

                    if (!meetingObject.get("post")) {
                        meetingObject.set("post", meetingPost);
                        meetingObject.save(null, {

                            useMasterKey: true,
                            sessionToken: req.user.getSessionToken()

                        });
                    }

                    return callback(null, meetingObject);
                }, (error) => {
                    // Execute any logic that should take place if the save fails.
                    // error is a Parse.Error with an error code and message.
                    //alert('Failed to create new object, with error code: ' + error.message);
                    return callback(null, meetingObject);

                });


            }  else {

                //console.log("post id exists or meeting is not completed");
                return callback(null, meetingObject);

            }



        }


    };
    function getMeetingTranscript (meetingObject, callback) {

        //if(meetingObject.dirty("MeetingJson")) {

        //console.log("\n meetingObject3: " + JSON.stringify(meetingObject));

        //console.log("\n Meetingurl: " + JSON.stringify(meetingObject.MeetingJson.url));
        var meetingFile = meetingObject.get("MeetingJson");
        //console.log("MeetingFile: " + JSON.stringify(meetingFile));
        //console.log("MeetingURL: " + JSON.stringify(meetingFile.url()) );

        requestURL({
            url: meetingFile.url(),
            json: true
        }, function (error, resp, body) {

            console.log("error: " + error);
            //console.log("response: " + JSON.stringify(resp));
            //console.log("body: " + JSON.stringify(body));

            if (!error && resp.statusCode === 200) {
                //console.log("body: " + JSON.stringify(body)); // Print the json response

                objectsToIndex = body.IBMjson.results;

                return callback(null, objectsToIndex);

            }
        });


        //} else { return callback(null, objectsToIndex);}


    };

    function prepIndex (objectsToIndex, callback) {

        // Specify Algolia's objectID with the Parse.Object unique ID



        async.forEach(objectsToIndex, function (meetingUtterance, callback){

            //console.log("meetingUtterance: " + JSON.stringify(meetingUtterance));


            //meetingUtterance = meetingUtterance.alternatives[0];

            //console.log("meetingUtterance1: "+ JSON.stringify(meetingUtterance)); // print the key
            //var updatedUtterance = meetingUtterance.toJSON();
            //console.log("ConferenceID: " + JSON.stringify(meeting.ConferenceID));
            //console.log("MeetingObject: " + JSON.stringify(meeting));

            meetingUtterance['ConferenceID'] = meeting.ConferenceID;
            meetingUtterance['MeetingEvents'] = meeting.MeetingEvents;
            meetingUtterance['MeetingInfo'] = meeting.MeetingInfo;
            meetingUtterance['meetingID'] = meeting.objectId;
            meetingUtterance['FullMeetingURL'] = meeting.FullMeetingURL;
            //meetingUtterance['FullMeetingText'] = meeting.FullMeetingText;
            meetingUtterance['objectID'] = meetingUtterance.alternatives[0].objectID;

            //console.log("meetingUtterance2: "+ JSON.stringify(meetingUtterance));

            // tell async that that particular element of the iterator is done
            callback(null, meetingUtterance);

        }, function(err) {
            //console.log('iterating done: ' + JSON.stringify(objectsToIndex));

        });

        return callback(null, objectsToIndex);

    };

    function addObjectsAlgolia (objectsToIndex, callback) {

        //console.log("objectToIndex2: "+ JSON.stringify(objectsToIndex));

        indexMeetings.saveObjects(objectsToIndex, function(err, content) {
            if (err) {
                throw err;
            }
            console.log('Parse<>Algolia objects saved');

            return callback(null, objectsToIndex);

        });

    };

    async.waterfall([
        async.apply(getMeetingObject),
        async.apply(createMeetingPost),
        async.apply(getMeetingTranscript),
        async.apply(prepIndex),
        async.apply(addObjectsAlgolia)

    ], function (err, objectsToIndex) {
        if (err) {
            response.error(err);
        }

        //console.log("final meeting: " + JSON.stringify(objectsToIndex));
        response.success();
    });


});


// Add and Update AlgoliaSearch user object if it's deleted from Parse
Parse.Cloud.afterSave('_User', function(request, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    var objectToSave = request.object.toJSON();

    var queryUser = new Parse.Query("_User");
    queryUser.include( ["currentCompany"] );


    //queryUser.equalTo("objectId", objectToSave.objectId);

    queryUser.get(objectToSave.objectId , {useMasterKey: true})
        .then((user) => {
            // The object was retrieved successfully.
            //console.log("Result from get " + JSON.stringify(Workspace));

            console.log("isNew: " + JSON.stringify(user.get("isNew")));
            console.log("isDirtyProfileimage: " + JSON.stringify(user.get("isDirtyProfileimage")));

            function updateAlgoliaWorkspaceExpertProfileImage (callback) {

                console.log("displayName: " + JSON.stringify(user.toJSON().displayName));

                if (user.get("isDirtyProfileimage") != true && user.get("isDirtyIsOnline") != true) {

                    console.log("no update to workspaces in algolia: " + user.get("isDirtyProfileimage") + " " + user.get("isDirtyIsOnline"));

                    return callback (null, user);

                }

                if (user.get("isNew") === true) {

                    return callback (null, user);
                }


                var WORKSPACE = Parse.Object.extend("WorkSpace");
                var workspaceQuery = new Parse.Query(WORKSPACE);
                var User = Parse.Object.extend("_User");
                var userQuery = new Parse.Query(User);


                userQuery.equalTo("objectId", objectToSave.objectId);
                console.log("username: " + JSON.stringify(objectToSave.username));
                workspaceQuery.matchesQuery("experts", userQuery);
                workspaceQuery.select(["user.fullname", "user.displayName", "user.isOnline", "user.showAvailability", "user.profileimage", "user.createdAt", "user.updatedAt", "user.objectId", "type", "archive","workspace_url", "workspace_name", "experts", "ACL", "objectId", "mission", "description","createdAt", "updatedAt", "followerCount", "memberCount", "isNew", "image"]);

                workspaceQuery.find({useMasterKey: true})
                    .then((objectsToIndex) => {
                        // The object was retrieved successfully.
                        console.log("Result from get " + JSON.stringify(objectsToIndex.length));

                        var workspaces = objectsToIndex;
                        console.log("ObjectToSave length: " + JSON.stringify(workspaces.length));

                        async.map(objectsToIndex, function (object, cb) {

                            var workspace = object;
                            var workspaceToSave = object.toJSON();
                            workspaceToSave.objectID = workspaceToSave.objectId;

                            delete workspaceToSave.skills;

                            var expertObject = Parse.Object.extend("_User");
                            expertObject = workspace.get("experts");
                            //console.log("Experts: " + JSON.stringify(expertObject));

                            expertObject.query().select(["fullname", "displayName", "isOnline", "showAvailability", "profileimage", "createdAt", "updatedAt", "objectId"]).find({

                                success: function (experts) {


                                    //console.log("\n Experts: " + JSON.stringify(experts));


                                    workspaceToSave["experts"] = experts;

                                    object = workspaceToSave;

                                    //console.log("object: " + JSON.stringify(object));

                                    return cb(null, object);


                                },
                                error: function (error) {
                                    alert("Error: " + error.code + " " + error.message);
                                    return cb(error);
                                }
                            }, {useMasterKey: true});


                        }, function (err, objectsToIndex) {

                            //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                            // Add or update new objects
                            indexWorkspaces.partialUpdateObjects(objectsToIndex, true, function (err, content) {
                                if (err) response.error(err);

                                console.log("Parse<>Algolia workspace saved from afterSave _User function ");

                                var finalTime = process.hrtime(time);
                                console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                return callback (null, objectsToIndex);

                            });

                        });

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback (error);

                    }, {useMasterKey: true});


                /*workspaceQuery.find({

                 success: function (workspaces) {


                 async.map(workspaces, function (workspace, cb){

                 //var workspace = workspaces[i];
                 var skillObject = Parse.Object.extend("Skill");
                 //var skillsRelation = new skillObject.relation("skills");
                 skillObject = workspace.get("skills");
                 //console.log("Skills: " + JSON.stringify(skillObject));
                 //console.log("Skill Length:" + skillObject);

                 var expertObject = Parse.Object.extend("_User");
                 expertObject = workspace.get("experts");
                 //console.log("Experts: " + JSON.stringify(expertObject));

                 // if (skillObject.length===0) {console.log("cool skillObject" + skillObject); return callback (null, workspace);}
                 var skillObjectQuery = skillObject.query();
                 skillObjectQuery.ascending("level");
                 skillObjectQuery.find({

                 success: function(skills) {


                 // Convert Parse.Object to JSON
                 //workspace = workspace.toJSON();

                 let arraySkill = [];

                 skills.forEach(v => arraySkill.push(v));


                 //console.log("skills: " + JSON.stringify(arraySkill));

                 workspace.set("objectID", workspace.toJSON().objectId);
                 var WorkSpace = workspace.toJSON();
                 WorkSpace.skills =  arraySkill;
                 //console.log("Updated workspace with skills: " + JSON.stringify(WorkSpace));

                 // Specify Algolia's objectID with the Parse.Object unique ID
                 //workspace.objectID = workspace.objectId;

                 //return callback(null, Workspace);

                 expertObject.query().find({

                 success: function(experts) {

                 // Convert Parse.Object to JSON
                 //workspace = workspace.toJSON();
                 //var User = new Parse.Object("_User");
                 let arrayExperts = [];

                 WorkSpace.experts = arrayExperts;
                 //console.log("New Workspace experts: " + JSON.stringify(WorkSpace));


                 //workspace = JSON.parse(WorkSpace);
                 // tell async that that particular element of the iterator is done
                 return cb(null, WorkSpace);


                 },
                 error: function(error) {
                 alert("Error: " + error.code + " " + error.message);
                 return callback (error);
                 }
                 }, {useMasterKey: true});


                 },
                 error: function(error) {
                 alert("Error: " + error.code + " " + error.message);
                 return callback (error);
                 }
                 }, {useMasterKey: true});


                 //console.log("skill:s " + JSON.stringify(skillObjects));


                 }, function(err, results) {

                 if (err) return callback (err);
                 var diff = process.hrtime(time);
                 console.log(`queryFinal took ${(diff[0] * NS_PER_SEC + diff[1])  * MS_PER_NS} milliseconds`);
                 //console.log("FinalResults: " + JSON.stringify(results));
                 //response.render('userPosts', results);
                 //console.log("partialWorkspaces: " + JSON.stringify(results));

                 // update Algolia index for Workspaces if user objects changes or got updated
                 indexWorkspaces.partialUpdateObjects(results, function(err, content) {
                 if (err) return callback (err);

                 console.log("Parse<>Algolia workspaces with updated user profile images saved: "+ JSON.stringify(content));

                 return callback (null, user);

                 });

                 });



                 },
                 error: function(error) {
                 console.log("Error _User afterSave WorkspaceQuery.find: " + error.code + " " + error.message);
                 //user is not an expert don't update aloglia workspace index
                 return callback (null, user);
                 }

                 }, {useMasterKey: true}); */


            }

            function addUserAlgolia (callback) {

                var mySkillObject = Parse.Object.extend("Skill");
                //var skillsRelation = new skillObject.relation("skills");
                mySkillObject = user.get("mySkills");
                //console.log("Skills: " + JSON.stringify(mySkillObject));

                var mySkillObjectQuery = mySkillObject.query();
                mySkillObjectQuery.ascending("level");
                mySkillObjectQuery.find({

                    success: function(skill) {

                        //skill;
                        //skill.add(workspace);

                        //console.log("Skills: " + JSON.stringify(skill));


                        // Convert Parse.Object to JSON
                        user = user.toJSON();

                        user['mySkills'] = skill;
                        //console.log("New User: " + JSON.stringify(user));

                        // Specify Algolia's objectID with the Parse.Object unique ID
                        user.objectID = user.objectId;

                        // Add or update object
                        indexUsers.saveObject(user, function(err, content) {
                            if (err) {
                                throw err;
                            }
                            console.log('Parse<>Algolia object saved: ' + JSON.stringify(content));
                            return callback (null, content);

                        });
                    },
                    error: function(error) {
                        alert("Error: " + error.code + " " + error.message);
                        return callback (error);
                    }
                }, {useMasterKey: true});


            }

            async.parallel([
                async.apply(addUserAlgolia),
                async.apply(updateAlgoliaWorkspaceExpertProfileImage)

            ], function (err, results) {
                if (err) {
                    response.error(err);
                }

                var finalTime = process.hrtime(time);
                console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
                response.success();
                //return callback (null, resultsToMap);

            });

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {useMasterKey: true});


}, {useMasterKey: true});


Parse.Cloud.afterSave('ChannelFollow', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    // Convert Parse.Object to JSON
    let channelfollow = request.object;

    let user = channelfollow.get("user");
    let workspace = channelfollow.get("workspace");

    console.log("afterSave ChannelFollow: " + JSON.stringify(channelfollow));

    if (!request.user) {

        response.error("afterSave ChannelFollow Session token: X-Parse-Session-Token is required");

    } else if (request.user) {

        if (!request.user.getSessionToken()) {

            response.error("afterSave ChannelFollow Session token: X-Parse-Session-Token is required");

        } else {


            function addIsSelectedChannelFollowPointerWorkspaceFollow (callback) {

                console.log("channelfollow.isSelected: " + channelfollow.toJSON().isSelected);

                if (channelfollow.toJSON().isSelected === true) {

                    // add selected ChannelFollow as pointer to workspace_follower
                    let queryWorkspaceFollow = new Parse.Query("workspace_follower");
                    queryWorkspaceFollow.equalTo("user", user);
                    queryWorkspaceFollow.equalTo("workspace", workspace);

                    queryWorkspaceFollow.first({

                        useMasterKey: true,
                        sessionToken: request.user.getSessionToken()

                    }).then((workspaceFollow) => {
                        // The object was retrieved successfully.

                        workspaceFollow.set("isSelectedChannelFollow", channelfollow);
                        workspaceFollow.save(null, {

                                //useMasterKey: true,
                                sessionToken: request.user.getSessionToken()

                            }

                        );

                        return callback (null, channelfollow);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        //console.log("channelfollowisSelected not found");
                        response.error(error);
                    }, {

                        useMasterKey: true,
                        sessionToken: request.user.getSessionToken()

                    });

                } else if (channelfollow.toJSON().isSelected === false) {

                    // add selected ChannelFollow as pointer to workspace_follower
                    let queryWorkspaceFollow = new Parse.Query("workspace_follower");
                    queryWorkspaceFollow.equalTo("user", user);
                    queryWorkspaceFollow.equalTo("workspace", workspace);

                    queryWorkspaceFollow.first({

                        useMasterKey: true,
                        sessionToken: request.user.getSessionToken()

                    }).then((workspaceFollow) => {
                        // The object was retrieved successfully.

                        workspaceFollow.set("isSelectedChannelFollow", null);
                        workspaceFollow.save(null, {

                                //useMasterKey: true,
                                sessionToken: request.user.getSessionToken()

                            }

                        );

                        return callback (null, channelfollow);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        //console.log("channelfollowisSelected not found");
                        response.error(error);
                    }, {

                        useMasterKey: true,
                        sessionToken: request.user.getSessionToken()

                    });


                } else {



                    return callback (null, channelfollow);


                }


            }


            async.parallel([
                async.apply(addIsSelectedChannelFollowPointerWorkspaceFollow)
                // async.apply(addChannelsToAlgolia)

            ], function (err, results) {
                if (err) {

                    var finalTime = process.hrtime(time);
                    console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
                    response.error(err);
                }

                //console.log("results length: " + JSON.stringify(results));

                var finalTime = process.hrtime(time);
                console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
                response.success(results);


            });



        }
    }



}, {useMasterKey: true});


Parse.Cloud.afterSave('Channel', function(request, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    // Convert Parse.Object to JSON
    var objectToSave = request.object.toJSON();

    console.log("afterSaveChannel req.user: " + JSON.stringify(request.user));

    if (!request.user) {

        response.error("afterSave Channel Session token: X-Parse-Session-Token is required");

    } else if (request.user) {

        if (!request.user.getSessionToken()) {

            response.error("afterSave Channel Session token: X-Parse-Session-Token is required");

        } else {


            var queryChannel = new Parse.Query("Channel");
            //queryChannel.equalTo("objectId", request.object.id);
            queryChannel.include( ["user", "workspace", "category"] );
            //queryChannel.select(["user", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url", "channel.name", "channel.type", "channel.archive"]);

            // channel is new so let's add a channelfollow row for the channel creator so he can see the channel
            var CHANNELFOLLOW = Parse.Object.extend("ChannelFollow");
            var channelFollow = new Parse.Object("ChannelFollow");

            //console.log("Request: " + JSON.stringify(request));
            //console.log("objectID: " + objectToSave.objectId);
            //console.log("objectID: " + objectToSave.user.objectId);

            queryChannel.get(request.object.id, {

                useMasterKey: true,
                sessionToken: request.user.getSessionToken()

            }).then((channel) => {
                // The object was retrieved successfully.
                //console.log("Result from get channel" + JSON.stringify(channel));

                var channelToSave = channel.toJSON();

                function createOwnerChannelFollow (callback) {

                    //console.log("channel isNew: " + channel.get("isNew"));
                    //console.log("ACL Channel: " + JSON.stringify(channel.getACL()));

                    if (channel.get("isNew") === true) {


                        //console.log("ObjectToSave: " + JSON.stringify(channel.getACL()));

                        channelFollow.set("archive", false);
                        channelFollow.set("user", channel.get("user"));
                        channelFollow.set("workspace", channel.get("workspace"));
                        channelFollow.set("channel", channel);
                        channelFollow.set("notificationCount", 0);
                        channelFollow.set("isSelected", false);

                        // set correct ACL for channelFollow
                        var channelFollowACL = new Parse.ACL();
                        channelFollowACL.setPublicReadAccess(false);
                        channelFollowACL.setPublicWriteAccess(false);
                        channelFollowACL.setReadAccess(channel.get("user"), true);
                        channelFollowACL.setWriteAccess(channel.get("user"), true);
                        channelFollow.setACL(channelFollowACL);

                        // since workspace followers can't create a channel, for now we are setting each channel creator as isMember = true
                        channelFollow.set("isMember", true);
                        channelFollow.set("isFollower", true);

                        //console.log("channelFollow: " + JSON.stringify(channelFollow));

                        channelFollow.save(null, {

                            //useMasterKey: true,
                            sessionToken: request.user.getSessionToken()

                        });

                        return callback(null, channelFollow);


                    } else {return callback (null, channel);}


                }

                function addChannelsToAlgolia (callback) {

                    // Specify Algolia's objectID with the Parse.Object unique ID
                    channelToSave.objectID = channel.id;

                    // Add or update object
                    indexChannel.saveObject(channelToSave, function(err, content) {
                        if (err) {
                            return error(err);
                        }
                        console.log('Parse<>Algolia channel object saved');
                        return callback(null, channelToSave);

                    });


                }


                async.parallel([
                    async.apply(createOwnerChannelFollow),
                    async.apply(addChannelsToAlgolia)

                ], function (err, results) {
                    if (err) {

                        var finalTime = process.hrtime(time);
                        console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
                        response.error(err);
                    }

                    //console.log("results length: " + JSON.stringify(results));

                    var finalTime = process.hrtime(time);
                    console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
                    response.success(results);


                });

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
                response.error(error);
            }, {

                useMasterKey: true,
                sessionToken: request.user.getSessionToken()

            });

        }
    }



}, {useMasterKey: true});




// Add and Update AlgoliaSearch user object if it's deleted from Parse
Parse.Cloud.afterSave('Skill', function(request) {

    // Convert Parse.Object to JSON
    var objectToSave = request.object.toJSON();

    // Specify Algolia's objectID with the Parse.Object unique ID
    objectToSave.objectID = objectToSave.objectId;

    // Add or update object
    indexSkills.saveObject(objectToSave, function(err, content) {
        if (err) {
            throw err;
        }
        console.log('Parse<>Algolia object saved');
    });
});





// Add and Update AlgoliaSearch Workspace object if it's deleted from Parse & create Workspace roles
Parse.Cloud.afterSave('WorkSpace', function(request, response) {


    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    if (!request.user || !request.user.getSessionToken()) {

        response.error("afterSave WorkSpace Session token: a valid X-Parse-Session-Token is required");

    } else {

        // Convert Parse.Object to JSON
        var workspace = request.object;

        var workspaceToSave = request.object.toJSON();

        var WORKSPACE = Parse.Object.extend("WorkSpace");
        var queryWorkspace = new Parse.Query(WORKSPACE);

        var WORKSPACE_FOLLOW = Parse.Object.extend("workspace_follower");
        var workspaceFollower = new Parse.Object(WORKSPACE_FOLLOW);

        var owner = new Parse.Object("_User");
        owner = workspace.get("user");

        queryWorkspace.equalTo("objectId", workspaceToSave.objectId);
        queryWorkspace.include( ["user"] );
        queryWorkspace.select(["expertsArray", "user.fullname", "user.displayName", "user.isOnline", "user.showAvailability", "user.profileimage", "user.createdAt", "user.updatedAt", "user.objectId", "type", "archive","workspace_url", "workspace_name", "experts", "ACL", "objectId", "mission", "description","createdAt", "updatedAt", "followerCount", "memberCount", "isNew", "skills", "image"]);

        //console.log("Workspace Object: " + JSON.stringify(workspace.id));
        //console.log("objectID: " + objectToSave.objectId);
        //console.log("objectID: " + objectToSave.user.objectId);

        //var Workspace = new Parse.Object("WorkSpace");

        queryWorkspace.get(workspace.id , {

            useMasterKey: true,
            sessionToken: request.user.getSessionToken()

        })
            .then((Workspace) => {
                // The object was retrieved successfully.
                //console.log("Result from get " + JSON.stringify(Workspace));

                var workspace = Parse.Object.extend("WorkSpace");
                workspace = Workspace;
                workspaceToSave = Workspace.toJSON();
                //console.log("ObjectToSave: " + JSON.stringify(workspace));

                function createWorkspaceRoles (callback) {

                    console.log("isNew: " + workspace.get("isNew"));

                    if (workspace.get("isNew") === true) {

                        //workspace.set("isNew", false);

                        // create roles
                        var roleACL = new Parse.ACL();
                        roleACL.setPublicReadAccess(true);
                        //roleACL.setPublicWriteAccess(true);

                        var followerName = "Follower-" + workspace.id;
                        //console.log("followerName: " + followerName);

                        var followerRole = new Parse.Role(followerName, roleACL);
                        followerRole.set("workspace", workspace);
                        //followerRole["name"] = followerName;
                        followerRole.set("PermissionBundle", {
                            "canAddCategory": false,
                            "canUpdateCategory": false,
                            "canDeleteCategory": false,
                            "canAddChanneltoCategory": false,
                            "canInvitePeopleToWorkspace": false,
                            "canCreateChannel": false,
                            "canAddPeopleToChannel": true,
                            "canCreatePost": false,
                            "NumberOfCreatePostAllowed": "0",
                            "canCreateQuestionPost": true,
                            "NumberOfCreateQuestionsPostAllowed": "3",
                            "canAskQuestionOnPost": true,
                            "NumberOfCanAskQuestionOnPostAllowed": "3",
                            "canCreateOfficeHoursPost": false,
                            "NumberOfCanCreateOfficeHoursPostAllowed": "0",
                            "canMentionMembers": false
                        });
                        //followerRole.save(null, {useMasterKey: true});
                        //console.log("followerRole: " + JSON.stringify(followerRole));

                        var memberName = "member-" + workspace.id;

                        var memberRole = new Parse.Role(memberName, roleACL);
                        memberRole.set("workspace", workspace);
                        //memberRole.set("name", memberName);
                        memberRole.set("PermissionBundle", {
                            "canAddCategory": false,
                            "canUpdateCategory": false,
                            "canDeleteCategory": false,
                            "canAddChanneltoCategory": true,
                            "canInvitePeopleToWorkspace": false,
                            "canCreateChannel": true,
                            "canAddPeopleToChannel": true,
                            "canCreatePost": true,
                            "NumberOfCreatePostAllowed": "unlimited",
                            "canCreateQuestionPost": true,
                            "NumberOfCreateQuestionsPostAllowed": "unlimited",
                            "canAskQuestionOnPost": true,
                            "NumberOfCanAskQuestionOnPostAllowed": "unlimited",
                            "canCreateOfficeHoursPost": true,
                            "NumberOfCanCreateOfficeHoursPostAllowed": "unlimited",
                            "canMentionMembers": true
                        });
                        //memberRole.save(null, {useMasterKey: true});

                        var moderatorName = "moderator-" + workspace.id;

                        var moderatorRole = new Parse.Role(moderatorName, roleACL);
                        moderatorRole.set("workspace", workspace);
                        //moderatorRole.set("name", moderatorName);
                        moderatorRole.set("PermissionBundle", {
                            "canAddCategory": false,
                            "canUpdateCategory": false,
                            "canDeleteCategory": false,
                            "canAddChanneltoCategory": true,
                            "canInvitePeopleToWorkspace": false,
                            "canCreateChannel": true,
                            "canAddPeopleToChannel": true,
                            "canCreatePost": true,
                            "NumberOfCreatePostAllowed": "unlimited",
                            "canCreateQuestionPost": true,
                            "NumberOfCreateQuestionsPostAllowed": "unlimited",
                            "canAskQuestionOnPost": true,
                            "NumberOfCanAskQuestionOnPostAllowed": "unlimited",
                            "canCreateOfficeHoursPost": true,
                            "NumberOfCanCreateOfficeHoursPostAllowed": "unlimited",
                            "canMentionMembers": true
                        });
                        //moderatorRole.save(null, {useMasterKey: true});

                        var adminName = "admin-" + workspace.id;

                        var adminRole = new Parse.Role(adminName, roleACL);
                        adminRole.set("workspace", workspace);
                        //adminRole.set("name", adminName);
                        adminRole.set("PermissionBundle", {
                            "canAddCategory": true,
                            "canUpdateCategory": true,
                            "canDeleteCategory": true,
                            "canAddChanneltoCategory": true,
                            "canInvitePeopleToWorkspace": true,
                            "canCreateChannel": true,
                            "canAddPeopleToChannel": true,
                            "canCreatePost": true,
                            "NumberOfCreatePostAllowed": "unlimited",
                            "canCreateQuestionPost": true,
                            "NumberOfCreateQuestionsPostAllowed": "unlimited",
                            "canAskQuestionOnPost": true,
                            "NumberOfCanAskQuestionOnPostAllowed": "unlimited",
                            "canCreateOfficeHoursPost": true,
                            "NumberOfCanCreateOfficeHoursPostAllowed": "unlimited",
                            "canMentionMembers": true
                        });
                        //adminRole.save(null, {useMasterKey: true});

                        var expertName = "expert-" + workspace.id;

                        var expertRole = new Parse.Role(expertName, roleACL);
                        expertRole.set("workspace", workspace);
                        //expertRole.set("name", expertName);
                        expertRole.set("PermissionBundle", {
                            "canAddCategory": true,
                            "canUpdateCategory": true,
                            "canDeleteCategory": true,
                            "canAddChanneltoCategory": true,
                            "canInvitePeopleToWorkspace": true,
                            "canCreateChannel": true,
                            "canAddPeopleToChannel": true,
                            "canCreatePost": true,
                            "NumberOfCreatePostAllowed": "unlimited",
                            "canCreateQuestionPost": true,
                            "NumberOfCreateQuestionsPostAllowed": "unlimited",
                            "canAskQuestionOnPost": true,
                            "NumberOfCanAskQuestionOnPostAllowed": "unlimited",
                            "canCreateOfficeHoursPost": true,
                            "NumberOfCanCreateOfficeHoursPostAllowed": "unlimited",
                            "canMentionMembers": true
                        });
                        //expertRole.save(null, {useMasterKey: true});


                        var ownerName = "owner-" + workspace.id;
                        var ownerRole = new Parse.Role(ownerName, roleACL);
                        console.log("ownerRole 1: " + JSON.stringify(ownerRole));
                        ownerRole.set("workspace", workspace);
                        //ownerRole.set("name", ownerName);
                        ownerRole.set("PermissionBundle", {
                            "canAddCategory": true,
                            "canUpdateCategory": true,
                            "canDeleteCategory": true,
                            "canAddChanneltoCategory": true,
                            "canInvitePeopleToWorkspace": true,
                            "canCreateChannel": true,
                            "canAddPeopleToChannel": true,
                            "canCreatePost": true,
                            "NumberOfCreatePostAllowed": "unlimited",
                            "canCreateQuestionPost": true,
                            "NumberOfCreateQuestionsPostAllowed": "unlimited",
                            "canAskQuestionOnPost": true,
                            "NumberOfCanAskQuestionOnPostAllowed": "unlimited",
                            "canCreateOfficeHoursPost": true,
                            "NumberOfCanCreateOfficeHoursPostAllowed": "unlimited",
                            "canMentionMembers": true
                        });
                        //console.log("ownerRole 2: " + JSON.stringify(ownerRole));
                        //ownerRole.save(null, {useMasterKey: true});
                        //console.log("ownerRole 3: " + JSON.stringify(ownerRole));


                        Parse.Object.saveAll([ownerRole, expertRole, adminRole, moderatorRole, memberRole, followerRole], {

                            useMasterKey: true,
                            sessionToken: request.user.getSessionToken()

                        }).then((savedRoles) => {

                            console.log("savedRoles: " + JSON.stringify(savedRoles));

                            var memberrole = savedRoles[4];
                            //memberrole.getUsers().add(usersToAddToRole);
                            memberrole.getRoles().add(followerRole);
                            memberrole.save(null, {

                                useMasterKey: true,
                                sessionToken: request.user.getSessionToken()

                            });

                            var moderatorrole = savedRoles[3];
                            //memberrole.getUsers().add(usersToAddToRole);
                            moderatorrole.getRoles().add(memberRole);
                            moderatorrole.save(null, {

                                useMasterKey: true,
                                sessionToken: request.user.getSessionToken()

                            });

                            var adminrole = savedRoles[2];
                            //memberrole.getUsers().add(usersToAddToRole);
                            adminrole.getRoles().add(moderatorRole);
                            adminrole.save(null, {

                                useMasterKey: true,
                                sessionToken: request.user.getSessionToken()

                            });

                            var expertrole = savedRoles[1];
                            //expertrole.getUsers().add(usersToAddToRole);
                            expertrole.getRoles().add(moderatorRole);
                            expertrole.save(null, {

                                useMasterKey: true,
                                sessionToken: request.user.getSessionToken()

                            });

                            var ownerrole = savedRoles[0];
                            ownerrole.getUsers().add(owner);
                            ownerrole.getRoles().add(expertRole);
                            ownerrole.getRoles().add(adminRole);
                            ownerrole.save(null, {

                                useMasterKey: true,
                                sessionToken: request.user.getSessionToken()

                            });

                            var userRolesRelation = owner.relation("roles");
                            userRolesRelation.add(ownerRole); // add owner role to the user roles field.
                            owner.save(null, {

                                useMasterKey: true,
                                sessionToken: request.user.getSessionToken()

                            });


                            return callback (null, savedRoles);


                        });


                    }
                    else {return callback (null, workspace);}



                }

                function getSkills (callback) {

                    // todo need to check if skills is dirty, if yes then query to update algolia if not then ignore.

                    var skillObject = Parse.Object.extend("Skill");
                    //var skillsRelation = new skillObject.relation("skills");
                    skillObject = workspace.get("skills");
                    //console.log("Skills: " + JSON.stringify(skillObject));
                    //console.log("Skill Length:" + skillObject);

                    var skillObjectQuery = skillObject.query();
                    skillObjectQuery.ascending("level");

                    skillObjectQuery.find({

                        useMasterKey: true,
                        sessionToken: request.user.getSessionToken()

                    }).then((skill) => {

                        return callback (null, skill);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback (null, error);
                    }, {

                        useMasterKey: true,
                        sessionToken: request.user.getSessionToken()

                    });

                }

                function getExperts (callback) {

                    let expertObject = Parse.Object.extend("_User");
                    expertObject = workspace.get("experts");
                    let expertsArray = [];

                    if (workspace.get("isNew")) {

                        expertsArray = workspace.get("expertsArray");

                        console.log("isNew Workspace expertsArray: " + JSON.stringify(expertsArray));

                        return callback (null, expertsArray);

                    } else {

                        console.log("workspace.dirty_experts: " + JSON.stringify(workspace.dirty("experts")));

                        if (workspace.dirty("experts")) {

                            // expert being added or removed, update algolia, else return callback.

                            expertObject.query().select(["fullname", "displayName", "isOnline", "showAvailability", "profileimage", "createdAt", "updatedAt", "objectId"]).find({

                                useMasterKey: true,
                                sessionToken: request.user.getSessionToken()

                            }).then((experts) => {

                                // Convert Parse.Object to JSON
                                //workspace = workspace.toJSON();
                                let User = new Parse.Object("_User");
                                let queryRole = new Parse.Query(Parse.Role);

                                //console.log("\n Experts: " + JSON.stringify(experts));

                                queryRole.equalTo('name', 'expert-' + workspace.id);

                                queryRole.first({

                                    useMasterKey: true,
                                    sessionToken: request.user.getSessionToken()

                                }).then((role) => {

                                    let expertrole = role;

                                    console.log("Role: " + JSON.stringify(role));

                                    expertrole.getUsers().add(experts);
                                    expertrole.save(null, {

                                        useMasterKey: true,
                                        sessionToken: request.user.getSessionToken()

                                    });
                                    //var userRolesRelation;

                                    for (let i = 0; i < experts.length; i++) {

                                        let expertObject = experts[i];

                                        let userRolesRelation = expertObject.relation("roles");
                                        console.log("userRolesRelation afterSave Workspace: " + JSON.stringify(userRolesRelation));
                                        userRolesRelation.add(expertrole); // add owner role to the user roles field.
                                        expertObject.save(null, {

                                            useMasterKey: true,
                                            sessionToken: request.user.getSessionToken()

                                        });

                                    }

                                    return callback (null, experts);


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    return callback (null, error);
                                }, {

                                    useMasterKey: true,
                                    sessionToken: request.user.getSessionToken()

                                });


                            }, (error) => {
                                // The object was not retrieved successfully.
                                // error is a Parse.Error with an error code and message.
                                return callback (null, error);
                            }, {

                                useMasterKey: true,
                                sessionToken: request.user.getSessionToken()

                            });


                        }
                        else {

                            expertsArray = workspace.get("expertsArray");

                            console.log("isNew Workspace expertsArray: isDirtyExperts false " + JSON.stringify(expertsArray));

                            return callback (null, expertsArray);


                        }


                    }


                }

                function getWorkspaceFollowers (callback) {

                    //todo check for when we should be updating workspace_follower in Algolia Index
                    // get workspace_followers only in the following scenarios (1) user isFollower or isMember == true (2) workspace admin sent request for a user to join a workspace it's viewable to that user.

                    // Convert Parse.Object to JSON
                    // var workspace_follower = request.object;

                    // Specify Algolia's objectID with the Parse.Object unique ID
                    // var objectToSave = request.object.toJSON();

                    //var WORKSPACEFollower = Parse.Object.extend("workspace_follower");
                    //var workspaceFollower = new Parse.Object(WORKSPACEFollower);

                    //console.log("workspace type: " + JSON.stringify(workspace.id));
                    var WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
                    var queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);

                    let viewableBy = [];

                    queryWorkspaceFollower.equalTo("workspace", workspace);

                    // todo if there is more than 10k people following workspace need to split algolia index into two objects and implement pagination here.
                    queryWorkspaceFollower.limit(10000);
                    // queryWorkspaceFollower.include( ["workspace"] );

                    queryWorkspaceFollower.find({

                        useMasterKey: true,
                        sessionToken: request.user.getSessionToken()

                    }).then((followers) => {

                        //console.log("workspace.type: " + JSON.stringify(workspaceToSave.type));

                        delete workspaceToSave.skills;
                        delete workspaceToSave.experts;

                        workspaceToSave.objectID = workspaceToSave.objectId;
                        workspaceToSave['followers'] = followers;


                        for (var i = 0; i < followers.length; i++) {

                            if (workspaceToSave.type === 'private') {
                                viewableBy.push(followers[i].toJSON().user.objectId);
                                //console.log("user id viewableBy: " + followers[i].toJSON().user.objectId) ;
                            }


                        }

                        if (workspaceToSave.type === 'private') {

                            workspaceToSave._tags= viewableBy;
                            //console.log("workspace 2: " + JSON.stringify(workspaceToSave));

                        } else if (workspaceToSave.type === 'public') {

                            workspaceToSave._tags = ['*'];

                        }

                        // console.log("followers: " + JSON.stringify(workspaceToSave.followers));

                        return callback (null, workspaceToSave);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback (null, error);
                    }, {

                        useMasterKey: true,
                        sessionToken: request.user.getSessionToken()

                    });


                }

                function createOwnerWorkspaceFollower (callback) {

                    //console.log("channel isNew: " + channel.get("isNew"));
                    //console.log("ACL Channel: " + JSON.stringify(channel.getACL()));

                    if (workspace.get("isNew") === true) {


                        console.log("createOwnerWorkspaceFollower ACL: " + JSON.stringify(channel.getACL()));

                        workspaceFollower.set("archive", false);
                        workspaceFollower.set("user", workspace.get("user"));
                        workspaceFollower.set("workspace", workspace.get("workspace"));
                        workspaceFollower.set("notificationCount", 0);
                        workspaceFollower.set("isSelected", false);

                        // set correct ACL for channelFollow
                        var workspaceFollowACL = new Parse.ACL();
                        workspaceFollowACL.setPublicReadAccess(false);
                        workspaceFollowACL.setPublicWriteAccess(false);
                        workspaceFollowACL.setReadAccess(workspace.get("user"), true);
                        workspaceFollowACL.setWriteAccess(workspace.get("user"), true);
                        workspaceFollower.setACL(workspaceFollowACL);

                        // since workspace followers can't create a channel, for now we are setting each channel creator as isMember = true
                        workspaceFollower.set("isMember", true);
                        workspaceFollower.set("isFollower", true);
                        workspaceFollower.set("isMemberRequestedByWorkspaceAdmin", false);
                        workspaceFollower.set("isMemberRequestedByUser", false);

                        //console.log("channelFollow: " + JSON.stringify(channelFollow));

                        workspaceFollower.save(null, {

                            //useMasterKey: true,
                            sessionToken: request.user.getSessionToken()

                        });

                        return callback(null, workspaceFollower);


                    } else {return callback (null, workspace);}


                }

                function createGeneralChannel (callback) {

                    if (workspace.get("isNew") === true) {

                        var CHANNEL = Parse.Object.extend("Channel");
                        var Channel = new Parse.Object(CHANNEL);

                        Channel.set("name", "general");
                        Channel.set("default", true);
                        Channel.set("type", "public");
                        Channel.set("purpose", "Community wide announcements and general questions");
                        Channel.set("allowMemberPostCreation", false);
                        Channel.set("workspace", workspace);
                        Channel.set("user", owner);
                        Channel.save(null, {

                                //useMasterKey: true,
                                sessionToken: request.user.getSessionToken()

                            }
                        );

                        return callback (null, Channel);


                    }
                    else {

                        return callback (null, workspace);
                    }


                }

                async.parallel([
                    async.apply(createWorkspaceRoles),
                    async.apply(getSkills),
                    async.apply(getExperts),
                    async.apply(getWorkspaceFollowers),
                    async.apply(createGeneralChannel),
                    async.apply(createOwnerWorkspaceFollower)

                ], function (err, results) {
                    if (err) {
                        response.error(err);
                    }

                    console.log("results length: " + JSON.stringify(results));

                    workspaceToSave = results[3];
                    let skillsToSave = results[1];
                    let expertsToSave = results[2];

                    workspaceToSave["skills"] = skillsToSave;
                    if (workspace.dirty("experts")) {
                        workspaceToSave["experts"] = expertsToSave;
                    } else {
                        delete workspaceToSave.experts;
                    }

                    //console.log("skillsToSave: " + JSON.stringify(skillsToSave));
                    //console.log("expertsToSave: " + JSON.stringify(expertsToSave));
                    //console.log("workspaceToSave: " + JSON.stringify(workspaceToSave));

                    indexWorkspaces.partialUpdateObject(workspaceToSave, true, function(err, content) {
                        if (err) response.error(err);

                        console.log("Parse<>Algolia workspace saved from AfterSave Workspace function ");

                        var finalTime = process.hrtime(time);
                        console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
                        response.success();

                    });


                });

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error(error);
            }, {

                useMasterKey: true,
                sessionToken: request.user.getSessionToken()

            });


    }


}, {useMasterKey: true});





// Delete AlgoliaSearch post object if it's deleted from Parse
Parse.Cloud.afterDelete('Post', function(request) {

    // Get Algolia objectID
    var objectID = request.object.id;

    // Remove the object from Algolia
    indexPosts.deleteObject(objectID, function(err, content) {
        if (err) {
            throw err;
        }
        console.log('Parse<>Algolia object deleted');
    });
});

// Delete AlgoliaSearch channel object if it's deleted from Parse
Parse.Cloud.afterDelete('Channel', function(request) {

    // Get Algolia objectID
    var objectID = request.object.id;

    // Remove the object from Algolia
    indexChannel.deleteObject(objectID, function(err, content) {
        if (err) {
            throw err;
        }
        console.log('Parse<>Algolia object deleted');
    });
});



// Delete AlgoliaSearch meetings object if it's deleted from Parse
/*Parse.Cloud.afterDelete('Meeting', function(request, response) {

 // Get Algolia objectID
 //var meetingID = request.object.id;

 var objectsToIndex = [];
 var objectsID = [];

 function getMeetingObject (callback) {

 var meetingObject = Parse.Object.extend("Meeting");
 var query = new Parse.Query(meetingObject);
 console.log("objectId: " + JSON.stringify(request.object.id));

 query.get(request.object.id, {
 success: function(meetingObject) {
 // The object was retrieved successfully.
 console.log("meetingObject2: " + JSON.stringify(meetingObject));

 return callback(null, meetingObject);

 },
 error: function(object, error) {
 // The object was not retrieved successfully.
 // error is a Parse.Error with an error code and message.
 response.error("error: " + error);

 }
 });

 };

 function getMeetingTranscript (meetingObject, callback) {

 console.log("req: " + JSON.stringify(request));

 var meetingFile = meetingObject.get("MeetingJson");
 console.log("MeetingFile: " + JSON.stringify(meetingFile));
 console.log("MeetingURL: " + JSON.stringify(meetingFile.url()) );

 console.log("meetingObject: " + JSON.stringify(meetingObject));

 requestURL({
 url: meetingFile.url(),
 json: true
 }, function (error, resp, body) {

 console.log("error: " + error);
 console.log("response: " + JSON.stringify(resp));
 console.log("body: " + JSON.stringify(body));

 if (!error && resp.statusCode === 200) {
 console.log("body: " + body); // Print the json response

 objectsToIndex = body.IBMjson.results;

 return callback(null, objectsToIndex);

 }
 });


 };

 // function to get the utterance ID to delete multiple utterances in AlgoliaSearch Meeting Index tied to a given meeting ID
 function getUtteranceID (objectsToIndex, callback) {


 console.log("objectsToIndex: " + JSON.stringify(objectsToIndex));

 //console.log("objectID: " + meetingObject.objectId);
 //console.log("objectID: " + meetingObject.user.objectId);

 //objectsToIndex = objectsToIndex.results;

 async.forEach(objectsToIndex, function (meetingUtterance, callback){

 //meetingUtterance = meetingUtterance.alternatives;
 //meetingUtterance['objectID'] = meetingUtterance.alternatives[0].AternativeID;

 console.log("meetingUtteranceID: "+ JSON.stringify(meetingUtterance.objectID)); // print the key

 objectsID.push(meetingUtterance.objectID);

 callback(null, objectsID);

 }, function(err, objectsID) {
 console.log('iterating done: ' + JSON.stringify(objectsToIndex));
 return objectsID;
 });

 return callback(null, objectsID);

 };

 function deleteObjectsAlgolia (objectsID, callback) {

 console.log("objectToIndex2: "+ JSON.stringify(objectsID));

 // Remove the object from Algolia
 // todo need to filter and only query the utterances with MeetingID to optimize performance
 indexMeetings.deleteObjects(objectsID, function(err, content) {
 if (err) {
 throw err;
 }
 console.log('Parse<>Algolia object deleted: ' + JSON.stringify(content));
 });

 return callback(null, objectsID);

 };

 async.waterfall([
 async.apply(getMeetingObject),
 async.apply(getMeetingTranscript),
 async.apply(getUtteranceID),
 async.apply(deleteObjectsAlgolia)

 ], function (err, objectsID) {
 if (err) {
 throw err;
 }

 console.log("deleted the following meeting utterances: " + JSON.stringify(objectsID));

 });


 });*/

// Delete AlgoliaSearch workspace object if it's deleted from Parse
Parse.Cloud.afterDelete('WorkSpace', function(request) {

    // Get Algolia objectID
    var objectID = request.object.id;

    // Remove the object from Algolia
    indexWorkspaces.deleteObject(objectID, function(err, content) {
        if (err) {
            throw err;
        }
        console.log('Parse<>Algolia object deleted');
    });
});

// Update followers list in Workspace after deleting workspace_follower row
Parse.Cloud.afterDelete('workspace_follower', function(request, response) {

    // todo remove ACL for users who unfollow or are not members anymore

    // Get workspace
    var workspace = request.object.get("workspace");

    // get isFollower and isMember
    var isFollower = request.object.get("isFollower");
    var isMember = request.object.get("isMember");

    // remove this user as a follower or member of that workspace
    if(isFollower === true && isMember === true) {

        workspace.increment("followerCount", -1);
        workspace.increment("memberCount", -1);
        workspace.save(null, {

            useMasterKey: true,
            sessionToken: request.user.getSessionToken()

        });
        response.success();

    } else if (isFollower === true && (isMember === false || !isMember)) {

        workspace.increment("followerCount", -1);
        workspace.save(null, {

            useMasterKey: true,
            sessionToken: request.user.getSessionToken()

        });
        response.success();


    } else if ((isFollower === false || !isFollower) &&(isMember === false || !isMember)) {

        // do nothing since this user should not be a follower or member for that workspace
        response.success();


    } else if (isMember === true && (isFollower === false || !isFollower)) {

        // this case should never exist since a member is always also a follower
        workspace.increment("memberCount", -1);
        workspace.save(null, {

            useMasterKey: true,
            sessionToken: request.user.getSessionToken()

        });
        response.success();
    } else {

        // do nothing
        response.success();
    }


});

// Update followers list in Channel after deleting workspace_follower row
Parse.Cloud.afterDelete('ChannelFollow', function(request, response) {

    var channelfollow = request.object;
    var CHANNEL = request.object.get("channel");
    console.log("channel afterDelete: " + JSON.stringify(CHANNEL));

    if (!request.user.getSessionToken()) {

        response.error("beforeSave ChannelFollow Session token: X-Parse-Session-Token is required");

    } else {

        CHANNEL.fetch(CHANNEL.toJSON().objectId, {

            //useMasterKey: true,
            sessionToken: request.user.getSessionToken()

        }).then((channel) => {
            // The object was retrieved successfully.

            // get isFollower and isMember
            var isFollower = channelfollow.get("isFollower");
            var isMember = channelfollow.get("isMember");
            let user = channelfollow.get("user");
            let Channel = channel;
            let channelACL = Channel.getACL();


            var userRoleRelation = user.relation("roles");
            var expertChannelRelation = Channel.relation("experts");
            //console.log("userRole: " + JSON.stringify(userRoleRelation));

            var expertRoleName = "expert-" + Channel.get("workspace").id;

            var userRoleRelationQuery = userRoleRelation.query();
            userRoleRelationQuery.equalTo("name", expertRoleName);
            userRoleRelationQuery.first({

                useMasterKey: true,
                sessionToken: request.user.getSessionToken()

            }).then((results) => {
                // The object was retrieved successfully.

                if (results) {

                    // expert role exists, add as channel expert
                    //console.log("channelExpert: " + JSON.stringify(results));

                    // remove this user as a follower or member of that workspace
                    if(isFollower === true && isMember === true) {

                        channel.increment("followerCount", -1);
                        channel.increment("memberCount", -1);

                        // remove this user as channel expert since he/she is a workspace expert and now either un-followed or un-joined this channel
                        expertChannelRelation.remove(user);

                        let expertOwner = user.toJSON();
                        if (expertOwner.socialProfilePicURL) {delete expertOwner.socialProfilePicURL;}
                        if (expertOwner.isTyping === true || expertOwner.isTyping === false) {delete expertOwner.isTyping;}
                        if (expertOwner.deviceToken) {delete expertOwner.deviceToken;}
                        if (expertOwner.emailVerified === true || expertOwner.emailVerified === false) {delete expertOwner.emailVerified;}
                        if (expertOwner.user_location) {delete expertOwner.user_location;}
                        if (expertOwner.LinkedInURL || expertOwner.LinkedInURL === null) {delete expertOwner.LinkedInURL;}
                        if (expertOwner.authData) {delete expertOwner.authData;}
                        if (expertOwner.username) {delete expertOwner.username;}
                        if (expertOwner.completedProfileSignup === true || expertOwner.completedProfileSignup ===  false) {delete expertOwner.completedProfileSignup;}
                        if (expertOwner.passion) {delete expertOwner.passion;}
                        if (expertOwner.identities) {delete expertOwner.identities;}
                        if (expertOwner.email) {delete expertOwner.email;}
                        if (expertOwner.isDirtyProfileimage === true || expertOwner.isDirtyProfileimage === false) {delete expertOwner.isDirtyProfileimage;}
                        if (expertOwner.isDirtyIsOnline === true || expertOwner.isDirtyIsOnline === false) {delete expertOwner.isDirtyIsOnline;}
                        if (expertOwner.website) {delete expertOwner.website;}
                        if (expertOwner.isNew === true || expertOwner.isNew === false) {delete expertOwner.isNew;}
                        if (expertOwner.phoneNumber) {delete expertOwner.phoneNumber;}
                        if (expertOwner.createdAt) {delete expertOwner.createdAt;}
                        if (expertOwner.updatedAt) {delete expertOwner.updatedAt;}
                        if (expertOwner.mySkills) {delete expertOwner.mySkills;}
                        if (expertOwner.skillsToLearn) {delete expertOwner.skillsToLearn;}
                        if (expertOwner.roles) {delete expertOwner.roles;}

                        Channel.remove("expertsArray", expertOwner);

                        if (channel.get("type") === 'private') {


                            // check if this user is a channel owner then don't remove the ACL or he won't be able to come back to his channel

                            if (Channel.get("user").toJSON().objectId === expertOwner.objectId) {

                                // this user who is unfollowing is also the channel owner, don't remove his ACL.



                            } else {

                                // this user is not the channel owner it's ok to remove his/her ACL

                                // if channel is private remove user ACL so he/she doesn't have access to the private channel or channelfollow
                                // user will need to be added again by channel owner since it's a private channel

                                channelACL.setReadAccess(user, false);
                                channelACL.setWriteAccess(user, false);
                                Channel.setACL(channelACL);


                            }





                        }
                        channel.save(null, {

                            //useMasterKey: true,
                            sessionToken: request.user.getSessionToken()

                        });
                        response.success();

                    }
                    else if (isFollower === true && (isMember === false || !isMember)) {

                        channel.increment("followerCount", -1);

                        // remove this user as channel expert since he/she is a workspace expert and now either un-followed or un-joined this channel
                        expertChannelRelation.remove(user);

                        let expertOwner = user.toJSON();
                        if (expertOwner.socialProfilePicURL) {delete expertOwner.socialProfilePicURL;}
                        if (expertOwner.isTyping === true || expertOwner.isTyping === false) {delete expertOwner.isTyping;}
                        if (expertOwner.deviceToken) {delete expertOwner.deviceToken;}
                        if (expertOwner.emailVerified === true || expertOwner.emailVerified === false) {delete expertOwner.emailVerified;}
                        if (expertOwner.user_location) {delete expertOwner.user_location;}
                        if (expertOwner.LinkedInURL || expertOwner.LinkedInURL === null) {delete expertOwner.LinkedInURL;}
                        if (expertOwner.authData) {delete expertOwner.authData;}
                        if (expertOwner.username) {delete expertOwner.username;}
                        if (expertOwner.completedProfileSignup === true || expertOwner.completedProfileSignup ===  false) {delete expertOwner.completedProfileSignup;}
                        if (expertOwner.passion) {delete expertOwner.passion;}
                        if (expertOwner.identities) {delete expertOwner.identities;}
                        if (expertOwner.email) {delete expertOwner.email;}
                        if (expertOwner.isDirtyProfileimage === true || expertOwner.isDirtyProfileimage === false) {delete expertOwner.isDirtyProfileimage;}
                        if (expertOwner.isDirtyIsOnline === true || expertOwner.isDirtyIsOnline === false) {delete expertOwner.isDirtyIsOnline;}
                        if (expertOwner.website) {delete expertOwner.website;}
                        if (expertOwner.isNew === true || expertOwner.isNew === false) {delete expertOwner.isNew;}
                        if (expertOwner.phoneNumber) {delete expertOwner.phoneNumber;}
                        if (expertOwner.createdAt) {delete expertOwner.createdAt;}
                        if (expertOwner.updatedAt) {delete expertOwner.updatedAt;}
                        if (expertOwner.mySkills) {delete expertOwner.mySkills;}
                        if (expertOwner.skillsToLearn) {delete expertOwner.skillsToLearn;}
                        if (expertOwner.roles) {delete expertOwner.roles;}

                        Channel.remove("expertsArray", expertOwner);

                        if (channel.get("type") === 'private') {


                            // check if this user is a channel owner then don't remove the ACL or he won't be able to come back to his channel

                            if (Channel.get("user").toJSON().objectId === expertOwner.objectId) {

                                // this user who is unfollowing is also the channel owner, don't remove his ACL.



                            } else {

                                // this user is not the channel owner it's ok to remove his/her ACL

                                // if channel is private remove user ACL so he/she doesn't have access to the private channel or channelfollow
                                // user will need to be added again by channel owner since it's a private channel

                                channelACL.setReadAccess(user, false);
                                channelACL.setWriteAccess(user, false);
                                Channel.setACL(channelACL);


                            }




                        }
                        channel.save(null, {

                            //useMasterKey: true,
                            sessionToken: request.user.getSessionToken()

                        });
                        response.success();


                    } else if ((isFollower === false || !isFollower) &&(isMember === false || !isMember)) {

                        // do nothing since this user should not be a follower or member for that workspace
                        response.success();


                    } else if (isMember === true && (isFollower === false || !isFollower)) {

                        // this case should never exist since a member is always also a follower
                        channel.increment("memberCount", -1);

                        // remove this user as channel expert since he/she is a workspace expert and now either un-followed or un-joined this channel
                        expertChannelRelation.remove(user);

                        let expertOwner = user.toJSON();
                        if (expertOwner.socialProfilePicURL) {delete expertOwner.socialProfilePicURL;}
                        if (expertOwner.isTyping === true || expertOwner.isTyping === false) {delete expertOwner.isTyping;}
                        if (expertOwner.deviceToken) {delete expertOwner.deviceToken;}
                        if (expertOwner.emailVerified === true || expertOwner.emailVerified === false) {delete expertOwner.emailVerified;}
                        if (expertOwner.user_location) {delete expertOwner.user_location;}
                        if (expertOwner.LinkedInURL || expertOwner.LinkedInURL === null) {delete expertOwner.LinkedInURL;}
                        if (expertOwner.authData) {delete expertOwner.authData;}
                        if (expertOwner.username) {delete expertOwner.username;}
                        if (expertOwner.completedProfileSignup === true || expertOwner.completedProfileSignup ===  false) {delete expertOwner.completedProfileSignup;}
                        if (expertOwner.passion) {delete expertOwner.passion;}
                        if (expertOwner.identities) {delete expertOwner.identities;}
                        if (expertOwner.email) {delete expertOwner.email;}
                        if (expertOwner.isDirtyProfileimage === true || expertOwner.isDirtyProfileimage === false) {delete expertOwner.isDirtyProfileimage;}
                        if (expertOwner.isDirtyIsOnline === true || expertOwner.isDirtyIsOnline === false) {delete expertOwner.isDirtyIsOnline;}
                        if (expertOwner.website) {delete expertOwner.website;}
                        if (expertOwner.isNew === true || expertOwner.isNew === false) {delete expertOwner.isNew;}
                        if (expertOwner.phoneNumber) {delete expertOwner.phoneNumber;}
                        if (expertOwner.createdAt) {delete expertOwner.createdAt;}
                        if (expertOwner.updatedAt) {delete expertOwner.updatedAt;}
                        if (expertOwner.mySkills) {delete expertOwner.mySkills;}
                        if (expertOwner.skillsToLearn) {delete expertOwner.skillsToLearn;}
                        if (expertOwner.roles) {delete expertOwner.roles;}

                        Channel.remove("expertsArray", expertOwner);

                        if (channel.get("type") === 'private') {



                            // check if this user is a channel owner then don't remove the ACL or he won't be able to come back to his channel

                            if (Channel.get("user").toJSON().objectId === user.toJSON().objectId) {

                                // this user who is unfollowing is also the channel owner, don't remove his ACL.



                            } else {

                                // this user is not the channel owner it's ok to remove his/her ACL

                                // if channel is private remove user ACL so he/she doesn't have access to the private channel or channelfollow
                                // user will need to be added again by channel owner since it's a private channel

                                channelACL.setReadAccess(user, false);
                                channelACL.setWriteAccess(user, false);
                                Channel.setACL(channelACL);


                            }



                        }
                        channel.save(null, {

                            //useMasterKey: true,
                            sessionToken: request.user.getSessionToken()

                        });
                        response.success();
                    } else {

                        // do nothing
                        response.success();
                    }




                } else {
                    // no role exists don't add or remove experts from channel

                    // remove this user as a follower or member of that workspace
                    if(isFollower === true && isMember === true) {

                        channel.increment("followerCount", -1);
                        channel.increment("memberCount", -1);

                        if (channel.get("type") === 'private') {

                            // check if this user is a channel owner then don't remove the ACL or he won't be able to come back to his channel

                            if (Channel.get("user").toJSON().objectId === user.toJSON().objectId) {

                                // this user who is unfollowing is also the channel owner, don't remove his ACL.



                            } else {

                                // this user is not the channel owner it's ok to remove his/her ACL

                                // if channel is private remove user ACL so he/she doesn't have access to the private channel or channelfollow
                                // user will need to be added again by channel owner since it's a private channel

                                channelACL.setReadAccess(user, false);
                                channelACL.setWriteAccess(user, false);
                                Channel.setACL(channelACL);


                            }



                        }
                        channel.save(null, {

                            //useMasterKey: true,
                            sessionToken: request.user.getSessionToken()

                        });
                        response.success();

                    }
                    else if (isFollower === true && (isMember === false || !isMember)) {

                        channel.increment("followerCount", -1);


                        if (channel.get("type") === 'private') {

                            // check if this user is a channel owner then don't remove the ACL or he won't be able to come back to his channel

                            if (Channel.get("user").toJSON().objectId === user.toJSON().objectId) {

                                // this user who is unfollowing is also the channel owner, don't remove his ACL.



                            } else {

                                // this user is not the channel owner it's ok to remove his/her ACL

                                // if channel is private remove user ACL so he/she doesn't have access to the private channel or channelfollow
                                // user will need to be added again by channel owner since it's a private channel

                                channelACL.setReadAccess(user, false);
                                channelACL.setWriteAccess(user, false);
                                Channel.setACL(channelACL);


                            }


                        }
                        channel.save(null, {

                            //useMasterKey: true,
                            sessionToken: request.user.getSessionToken()

                        });
                        response.success();


                    } else if ((isFollower === false || !isFollower) &&(isMember === false || !isMember)) {

                        // do nothing since this user should not be a follower or member for that workspace
                        response.success();


                    } else if (isMember === true && (isFollower === false || !isFollower)) {

                        // this case should never exist since a member is always also a follower
                        channel.increment("memberCount", -1);


                        if (channel.get("type") === 'private') {

                            // check if this user is a channel owner then don't remove the ACL or he won't be able to come back to his channel

                            if (Channel.get("user").toJSON().objectId === user.toJSON().objectId) {

                                // this user who is unfollowing is also the channel owner, don't remove his ACL.



                            } else {

                                // this user is not the channel owner it's ok to remove his/her ACL

                                // if channel is private remove user ACL so he/she doesn't have access to the private channel or channelfollow
                                // user will need to be added again by channel owner since it's a private channel

                                channelACL.setReadAccess(user, false);
                                channelACL.setWriteAccess(user, false);
                                Channel.setACL(channelACL);


                            }


                        }
                        channel.save(null, {

                            //useMasterKey: true,
                            sessionToken: request.user.getSessionToken()

                        });
                        response.success();
                    } else {

                        // do nothing
                        response.success();
                    }
                }
            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error(error);
            }, {
                //useMasterKey: true,
                sessionToken: request.user.getSessionToken()

            });

        }, (error) => {
            // No Channel, maybe was delete so ignore removing the channel experts and updating follower/member count for channel

            response.success();

        }, {

            //useMasterKey: true,
            sessionToken: request.user.getSessionToken()

        });



    }



}, {useMasterKey: true});

// Delete AlgoliaSearch workspace object if it's deleted from Parse
Parse.Cloud.afterDelete('Skill', function(request) {

    // Get Algolia objectID
    var objectID = request.object.id;

    // Remove the object from Algolia
    indexSkills.deleteObject(objectID, function(err, content) {
        if (err) {
            throw err;
        }
        console.log('Parse<>Algolia object deleted');
    });
});





// Delete AlgoliaSearch user object if it's deleted from Parse
Parse.Cloud.afterDelete('_User', function(request) {

    // Get Algolia objectID
    var objectID = request.object.id;

    // Remove the object from Algolia
    indexUsers.deleteObject(objectID, function(err, content) {
        if (err) {
            throw err;
        }
        console.log('Parse<>Algolia object deleted');
    });
});

Parse.Cloud.define("sendEmail", function(request, response) {
    // Email configuration
    var transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        auth: {
            user: 'testmail.team5@gmail.com',
            pass: '123team5'
        }
        // host: 'smtp.mandrillapp.com',
        // port: 587,
        // secure: false,
        // auth: {
        //   user: 'Papr, Inc.',
        //   pass: 'fCWj2D9rBGfJsaU1RSFU5w'
        // }
    });
    var readHTMLFile = function(path, callback) {
        fs.readFile(path, {encoding: 'utf-8'}, function (err, html) {
            if (err) {
                throw err;
                callback(err);
            }
            else {
                callback(null, html);
            }
        });
    }
    // var i = 0;
    let allMail = request.params.emails
    var counter = require('counter'),
        count = counter(0, { target: Object.keys(allMail).length - 1, once: true }),
        i, l = Object.keys(allMail).length - 1;
    count.on('target', function() {
        console.log("Total count : ", Object.keys(allMail).length);
    }).start();
    var flag = 0;
    for (key in allMail) {
        readHTMLFile(__dirname + '/templates/email-template.html', function(err, html) {
            var template = handlebars.compile(html);
            var temp = {
                workspace : request.params.workspaceName,
                username : request.params.username,
                workspaceId : request.params.workspaceID,
                email : request.params.emails[count.value]
            }
            var htmlToSend = template(temp);
            var mailOptions = {
                from: 'testmail.team5@gmail.com',
                // from: 'Papr, Inc.',
                to : request.params.emails[count.value],
                subject : 'Papr.ai',
                html : htmlToSend
            };
            transporter.sendMail(mailOptions).then(function(info){
                console.log("Mail sent ", info.response);
            }).catch(function(err){
                console.log(err);
                response.error(err);
            });
            count.value += 1;
            if(Object.keys(allMail).length == count.value){
                response.success("Mail sent");
            }
        });
    }
});

Parse.Cloud.define("sendNotification", function(request, response) {
    var User = Parse.Object.extend('User');
    var user = new Parse.Query(User);
    user.exists("deviceToken");
    var Notification = Parse.Object.extend('Notification');
    var query = new Parse.Query(Notification);
    query.include('userTo.deviceToken');
    query.matchesQuery("userTo", user);
    query.notEqualTo('hasSent', true);
    query.find({
        success: function(results) {
            async.each(results, function (result, callback) {
                var note = new apn.Notification();
                note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
                note.title = "Papr.ai",
                    note.body = result.get("message"),
                    note.payload = {
                        'workspace' : result.get("workspace"),
                        'type' : result.get("type"),
                        'post' : result.get("post"),
                        'postQuestionMessage' : result.get("postQuestionMessage"),
                        'postQuestion' : result.get("postQuestion"),
                    };
                note.topic = "com.bluelabellabs.bl248";
                apnProvider.send(note, result.get("userTo").get("deviceToken")).then( (res) => {
                    result.set("hasSent", true);
                    result.save();
                    if((res.sent).length == 1) {
                        console.log("Sent To ", res.sent[0].device);
                    } else{
                        console.log("Error Sending Notification: \nUsername : " + result.get("userTo").get("username") + "\nDevice Token : " + res.failed[0].device + "\nReason : " + res.failed[0].response.reason);
                    }
                }).catch(err => {
                    console.log(err);
                });
                callback(null, result);
            }, function(err) {
                if (err){
                    console.log('ERROR', err);
                    response.error(err);
                }
                response.success("Notification sent to all users");
            });
        },
        error: function(e) {
            console.error(e);
            response.error(e);
        }
    });
});

cron.schedule('*/1 * * * *', () => {
    console.log("Cron Job Called at : ", new Date());
    var User = Parse.Object.extend('User');
    var user = new Parse.Query(User);
    user.exists("deviceToken");
    var Notification = Parse.Object.extend('Notification');
    var query = new Parse.Query(Notification);
    query.include('userTo.deviceToken');
    query.matchesQuery("userTo", user);
    query.notEqualTo('hasSent', true);
    query.find({
        success: function(results) {
            async.each(results, function (result, callback) {
                var note = new apn.Notification();
                note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
                note.title = "Papr.ai",
                    note.body = result.get("message"),
                    note.payload = {
                        'workspace' : result.get("workspace"),
                        'type' : result.get("type"),
                        'post' : result.get("post"),
                        'postQuestionMessage' : result.get("postQuestionMessage"),
                        'postQuestion' : result.get("postQuestion"),
                    };
                note.topic = "com.bluelabellabs.bl248";
                apnProvider.send(note, result.get("userTo").get("deviceToken")).then( (res) => {
                    result.set("hasSent", true);
                    result.save();
                    if((res.sent).length == 1) {
                        console.log("Sent To ", res.sent[0].device);
                    } else{
                        console.log("Error Sending Notification: \nUsername : " + result.get("userTo").get("username") + "\nDevice Token : " + res.failed[0].device + "\nReason : " + res.failed[0].response.reason);
                    }
                }).catch(err => {
                    console.log(err);
                });
                callback(null, result);
            }, function(err) {
                if (err){
                    console.log('ERROR', err);
                    response.error(err);
                }
                response.success("Notification sent to all users");
            });
        },
        error: function(e) {
            console.error(e);
            response.error(e);
        }
    });
});

Parse.Cloud.define('sendStaticPushNotification', (request, response) => {
    // let deviceToken = "60e4c51275d60d79b9a73332cd14c9f82e8474176ed19de4a41131a21363ef96"; // Production true
    // let deviceToken = "7689db229f040ad9e35a59732a5506b7fd27bb5c0b6f151615383ff8c71caddf"; // Production false
    let deviceToken = request.params.token;
    let production = request.params.production;
    if( production ){
        fileForPushNotification = 'Papr-Distribution-APNS.pem';
        keyFileForPushNotification = 'Key-Distribution.pem';
    } else {
        fileForPushNotification = 'Papr-Development-APNS.pem';
        keyFileForPushNotification = 'Key-Development.pem';
    }
    var options = {
        cert: path.resolve(fileForPushNotification),
        key: path.resolve(keyFileForPushNotification),
        passphrase: 'papr@123',
        production: production
    };
    var apnProvider = new apn.Provider(options);
    var note = new apn.Notification();
    note.expiry = Math.floor(Date.now() / 1000) + 3600;
    note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
    note.title = "Papr.ai";
    note.body = "test message";
    note.payload = {'messageFrom': 'John Doe'};
    note.topic = "com.bluelabellabs.bl248";
    apnProvider.send(note, deviceToken).then( (result) => {
        if((result.sent).length == 1) {
            console.log("Sent To ", deviceToken);
        } else{
            console.log("Error Sending Notification: \nDevice Token : " + result.failed[0].device + " \nReason : " + result.failed[0].response.reason);
        }
        response.success(result);
    }).catch(err => {
        console.log(JSON.stringify(err));
        response.error(JSON.stringify(err))
    });
});

