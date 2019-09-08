
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
var indexPostMessage = client.initIndex('dev_postMessages');

const requestPromise = require('request-promise');
var fs = require('fs');
Parse.initialize('671e705a-f735-4ec0-8474-15899a475440', '', 'f24d6630-a35a-4db8-9fc7-6a851042bfd6');

let simplifyUser = require('./simplifyClass/_User/simplifyUser');
let simplifyUserMentions = require('./simplifyClass/_User/simplifyUserMentions');
let simplifyPost = require('./simplifyClass/Post/simplifyPost');
let simplifyPostQuestion = require('./simplifyClass/Post/simplifyPostQuestion');
let simplifyPostText = require('./simplifyClass/Post/simplifyPostText');
let simplifyPostVideo = require('./simplifyClass/Post/simplifyPostVideo');
let simplifyPostAudio = require('./simplifyClass/Post/simplifyPostAudio');
let simplifyPostChatMessage = require('./simplifyClass/Post/simplifyPostChatMessage');
let simplifyPostSocial = require('./simplifyClass/Post/simplifyPostSocial');
let simplifyPostQuestionMessage = require('./simplifyClass/Post/simplifyPostQuestionMessage');
let simplifyWorkspaceFollowersUserIndex = require('./simplifyClass/WorkspaceFollowers/simplifyWorkspaceFollowersUserIndex');
let simplifyPostMessage = require('./simplifyClass/Post/simplifyPostMessage');
let simplifyWorkspace = require('./simplifyClass/Workspace/simplifyWorkspace');
let simplifyChannel = require('./simplifyClass/Channel/simplifyChannel');
let simplifyPostMessageSocialQuestion = require('./simplifyClass/Post/simplifyPostMessageSocial');


var selectPostMessageComment = ["message", "likedCount", "updatedAt"];
var selectPostMessageQuestion = ["message", "likedCount", "updatedAt", "childPostMessageCount", "type", "mediaType", "file", "video", "image", "videoThumbnail", "thumbnailRatio"];
var selectPostMessageAnswer = ["message", "numberOfUpVotes", "numberOfDownVotes", "updatedAt", "seenByExpert", "upVotedByExpert"];
var selectPostMessage = ["message", "type", "mediaType", "workspace", "channel", "post", "parentPostMessage", "hasURL", "hashtags", "mentions", "ACL", "file", "image" , "video", "numberOfUpVotes", "numberOfDownVotes", "createdAt", "seenByExpert", "upVotedByExpert",  "likedCount", "updatedAt", "childPostMessageCount", "videoThumbnail", "thumbnailRatio"];
var selectParentPostMessage = ["parentPostMessage.message"];


var selectUser = ["user.displayName", "user.fullname","user.profileimage","user.showAvailability","user.isOnline"];

var selectWorkspace = ["workspace.expertsArray", "workspace.workspace_name", "workspace.mission", "workspace.image", "workspace.generalChannel"];
var selectChannel = ["channel.expertsArray", "channel.name", "channel.purpose"];

var PostMessageCommentArray = selectPostMessageComment.concat(selectUser);
var PostMessageQuestionArray = selectPostMessageQuestion.concat(selectUser);
var PostMessageAnswerArray = selectPostMessageAnswer.concat(selectUser);
var PostMessageArray = selectPostMessage.concat(selectUser);
var PostMessageReplyArray_1 = PostMessageCommentArray.concat(selectPostMessageQuestion);
PostMessageReplyArray_1 = PostMessageReplyArray_1.concat(selectPostMessageAnswer);
var PostMessageReplyArray_2 = PostMessageCommentArray.concat(selectPostMessageAnswer);
PostMessageArray = PostMessageArray.concat(selectParentPostMessage);

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
    fileForPushNotification = 'apns-prod-cert.pem';
    keyFileForPushNotification = 'Key-Distribution.pem';
} else {
    fileForPushNotification = 'apns-dev-cert.pem';
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

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((userObject) => {

            const securedApiKey = userObject.get("algoliaSecureAPIKey"); // Use the key generated earlier

            const algoliaClient = algoliasearch("K3ET7YKLTI", securedApiKey);
            const index = algoliaClient.initIndex('dev_workspaces');

            // only query string
            index.search(query, function searchDone(err, content) {
                if (err) {response.error(err);}
                //console.log(content.hits);

                let finalTime = process.hrtime(time);
                console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                response.success(content.hits);
            });


        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {
            useMasterKey: true
            //sessionToken: sessionToken
        });


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

                useMasterKey: true

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

                useMasterKey: true

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

                useMasterKey: true

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

                useMasterKey: true

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


// cloud API and function to addExperts to a workspace
Parse.Cloud.define("setAsExpert", function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.cloudFunction.setAsExpert.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    //get request params
    let UserIdArray = request.params.userIdArray;
    let WorkspaceId = request.params.workspaceId;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = WorkspaceId;

    async.map(UserIdArray, function (userId, cb) {

        userId = userId.objectId;

        console.log("userId: " + JSON.stringify(userId));

        let USER = Parse.Object.extend("_User");
        let user = new USER();
        user.id = userId;

        return cb (null, user);


    }, function (err, result) {

        //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

        if (err) {response.error(err);} else {

            let expertRelation = workspace.relation("experts");
            expertRelation.add(result);

            workspace.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((result) => {

                // save was successful
                if(result) {

                    console.log("expert added: " + JSON.stringify(result));

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime  setAsExpert  took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                    response.success(result);


                } else {

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime setAsExpert took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                    response.error(result);

                }


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });



        }

    });



}, {useMasterKey: true});

// cloud API and function to removeExpert to a workspace
Parse.Cloud.define("removeExpert", function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.cloudFunction.removeExpert.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    //get request params
    let UserIdArray = request.params.userIdArray;
    let WorkspaceId = request.params.workspaceId;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = WorkspaceId;

    async.map(UserIdArray, function (userId, cb) {

        userId = userId.objectId;

        console.log("userId: " + JSON.stringify(userId));

        let USER = Parse.Object.extend("_User");
        let user = new USER();
        user.id = userId;

        return cb (null, user);


    }, function (err, result) {

        //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

        if (err) {response.error(err);} else {

            let expertRelation = workspace.relation("experts");
            expertRelation.remove(result);

            workspace.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((result) => {

                // save was successful
                if(result) {

                    console.log("expert added: " + JSON.stringify(result));

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime  removeExpert  took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                    response.success(result);


                } else {

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime removeExpert took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                    response.error(result);

                }


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });



        }

    });



}, {useMasterKey: true});

// cloud API and function to setAsOwner to a workspace
Parse.Cloud.define("setAsFounder", function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.cloudFunction.setAsFounder.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    //get request params
    let UserIdArray = request.params.userIdArray;
    let WorkspaceId = request.params.workspaceId;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = WorkspaceId;

    let queryOwnerRole = new Parse.Query(Parse.Role);
    let ownerName = 'owner-' + workspace.id;

    queryOwnerRole.equalTo('name', ownerName);
    queryOwnerRole.first({useMasterKey: true})
        .then((ownerRole) => {
            // The object was retrieved successfully.

            //console.log("ownerRole" + JSON.stringify(ownerRole));

            async.map(UserIdArray, function (userId, cb) {

                userId = userId.objectId;

                console.log("userId: " + JSON.stringify(userId));

                let USER = Parse.Object.extend("_User");
                let user = new USER();
                user.id = userId;

                // set user role now then save
                let roleRelation = user.relation("roles");
                roleRelation.add(ownerRole);
                user.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                return cb (null, user);


            }, function (err, result) {

                //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                if (err) {response.error(err);} else {

                    // add user to this role and save it
                    ownerRole.getUsers().add(result);

                    ownerRole.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((final_result) => {

                        // save was successful
                        if(final_result) {

                            //console.log("expert added: " + JSON.stringify(final_result));

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime  setAsFounder  took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                            response.success(final_result);


                        } else {

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime setAsFounder took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                            response.error(final_result);

                        }


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });



                }

            });



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {useMasterKey: true});



}, {useMasterKey: true});

// cloud API and function to setAsOwner to a workspace
Parse.Cloud.define("removeFounder", function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.cloudFunction.removeFounder.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    //get request params
    let UserIdArray = request.params.userIdArray;
    let WorkspaceId = request.params.workspaceId;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = WorkspaceId;

    let queryOwnerRole = new Parse.Query(Parse.Role);
    let ownerName = 'owner-' + workspace.id;

    queryOwnerRole.equalTo('name', ownerName);
    queryOwnerRole.first({useMasterKey: true})
        .then((ownerRole) => {
            // The object was retrieved successfully.

            //console.log("ownerRole" + JSON.stringify(ownerRole));

            async.map(UserIdArray, function (userId, cb) {

                userId = userId.objectId;

                console.log("userId: " + JSON.stringify(userId));

                let USER = Parse.Object.extend("_User");
                let user = new USER();
                user.id = userId;

                // set user role now then save
                let roleRelation = user.relation("roles");
                roleRelation.remove(ownerRole);
                user.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                return cb (null, user);


            }, function (err, result) {

                //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                if (err) {response.error(err);} else {

                    // add user to this role and save it
                    ownerRole.getUsers().remove(result);

                    ownerRole.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((final_result) => {

                        // save was successful
                        if(final_result) {

                            //console.log("expert added: " + JSON.stringify(final_result));

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime  removeFounder  took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                            response.success(final_result);


                        } else {

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime removeFounder took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                            response.error(final_result);

                        }


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });



                }

            });



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {useMasterKey: true});


}, {useMasterKey: true});

// cloud API and function to setAsAdmin to a workspace
Parse.Cloud.define("setAsAdmin", function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.cloudFunction.setAsAdmin.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    //get request params
    let UserIdArray = request.params.userIdArray;
    let WorkspaceId = request.params.workspaceId;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = WorkspaceId;

    let queryAdminRole = new Parse.Query(Parse.Role);
    let adminName = 'admin-' + workspace.id;

    queryAdminRole.equalTo('name', adminName);
    queryAdminRole.first({useMasterKey: true})
        .then((adminRole) => {
            // The object was retrieved successfully.

            //console.log("ownerRole" + JSON.stringify(ownerRole));

            async.map(UserIdArray, function (userId, cb) {

                userId = userId.objectId;

                console.log("userId: " + JSON.stringify(userId));

                let USER = Parse.Object.extend("_User");
                let user = new USER();
                user.id = userId;

                // set user role now then save
                let roleRelation = user.relation("roles");
                roleRelation.add(adminRole);
                user.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                return cb (null, user);


            }, function (err, result) {

                //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                if (err) {response.error(err);} else {

                    // add user to this role and save it
                    adminRole.getUsers().add(result);

                    adminRole.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((final_result) => {

                        // save was successful
                        if(final_result) {

                            //console.log("expert added: " + JSON.stringify(final_result));

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime  setAsAdmin  took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                            response.success(final_result);


                        } else {

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime setAsAdmin took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                            response.error(final_result);

                        }


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });



                }

            });



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {useMasterKey: true});



}, {useMasterKey: true});

// cloud API and function to setAsAdmin to a workspace
Parse.Cloud.define("removeAdmin", function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.cloudFunction.removeAdmin.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    //get request params
    let UserIdArray = request.params.userIdArray;
    let WorkspaceId = request.params.workspaceId;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = WorkspaceId;

    let queryAdminRole = new Parse.Query(Parse.Role);
    let adminName = 'admin-' + workspace.id;

    queryAdminRole.equalTo('name', adminName);
    queryAdminRole.first({useMasterKey: true})
        .then((adminRole) => {
            // The object was retrieved successfully.

            //console.log("ownerRole" + JSON.stringify(ownerRole));

            async.map(UserIdArray, function (userId, cb) {

                userId = userId.objectId;

                console.log("userId: " + JSON.stringify(userId));

                let USER = Parse.Object.extend("_User");
                let user = new USER();
                user.id = userId;

                // set user role now then save
                let roleRelation = user.relation("roles");
                roleRelation.remove(adminRole);
                user.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                return cb (null, user);


            }, function (err, result) {

                //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                if (err) {response.error(err);} else {

                    // add user to this role and save it
                    adminRole.getUsers().remove(result);

                    adminRole.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((final_result) => {

                        // save was successful
                        if(final_result) {

                            //console.log("expert added: " + JSON.stringify(final_result));

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime  removeAdmin  took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                            response.success(final_result);


                        } else {

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime removeAdmin took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                            response.error(final_result);

                        }


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });



                }

            });



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {useMasterKey: true});




}, {useMasterKey: true});

// cloud API and function to setAsModerator to a workspace
Parse.Cloud.define("setAsModerator", function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.cloudFunction.setAsModerator.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let UserIdArray = request.params.userIdArray;
    let WorkspaceId = request.params.workspaceId;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = WorkspaceId;

    let queryModeratorRole = new Parse.Query(Parse.Role);
    let moderatorName = 'moderator-' + workspace.id;

    console.log("running queryModeratorRole");

    console.log("UserIdArray" + JSON.stringify(UserIdArray));


    queryModeratorRole.equalTo('name', moderatorName);
    queryModeratorRole.first({useMasterKey: true})
        .then((moderatorRole) => {
            // The object was retrieved successfully.

            console.log("moderatorRole" + JSON.stringify(moderatorRole));

            async.map(UserIdArray, function (userId, cb) {

                userId = userId.objectId;

                console.log("userId: " + JSON.stringify(userId));

                let USER = Parse.Object.extend("_User");
                let user = new USER();
                user.id = userId;

                user.fetch(user.id , {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((User) => {


                    // set user role now then save
                    let roleRelation = User.relation("roles");
                    roleRelation.add(moderatorRole);
                    User.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    return cb (null, User);

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    response.error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });



            }, function (err, result) {

                //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                if (err) {response.error(err);} else {

                    // add user to this role and save it
                    moderatorRole.getUsers().add(result);

                    moderatorRole.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((final_result) => {

                        // save was successful
                        if(final_result) {

                            //console.log("expert added: " + JSON.stringify(final_result));

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime  setAsModerator  took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                            response.success(final_result);


                        } else {

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime setAsModerator took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                            response.error(final_result);

                        }


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });



                }

            });



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {useMasterKey: true});

}, {useMasterKey: true});

// cloud API and function to setAsModerator to a workspace
Parse.Cloud.define("removeModerator", function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.cloudFunction.removeModerator.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let UserIdArray = request.params.userIdArray;
    let WorkspaceId = request.params.workspaceId;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = WorkspaceId;

    let queryModeratorRole = new Parse.Query(Parse.Role);
    let moderatorName = 'moderator-' + workspace.id;

    queryModeratorRole.equalTo('name', moderatorName);
    queryModeratorRole.first({useMasterKey: true})
        .then((moderatorRole) => {
            // The object was retrieved successfully.

            //console.log("ownerRole" + JSON.stringify(ownerRole));

            async.map(UserIdArray, function (userId, cb) {

                userId = userId.objectId;

                console.log("userId: " + JSON.stringify(userId));

                let USER = Parse.Object.extend("_User");
                let user = new USER();
                user.id = userId;

                // set user role now then save
                let roleRelation = user.relation("roles");
                roleRelation.remove(moderatorRole);
                user.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                return cb (null, user);


            }, function (err, result) {

                //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                if (err) {response.error(err);} else {

                    // add user to this role and save it
                    moderatorRole.getUsers().remove(result);

                    moderatorRole.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((final_result) => {

                        // save was successful
                        if(final_result) {

                            //console.log("expert added: " + JSON.stringify(final_result));

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime  removeModerator  took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                            response.success(final_result);


                        } else {

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime removeModerator took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                            response.error(final_result);

                        }


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });



                }

            });



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {useMasterKey: true});

}, {useMasterKey: true});


// cloud API and function to leave a workspace
Parse.Cloud.define("leaveWorkspace", function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.013.leaveWorkspace.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    //get request params
    let User = request.params.user;
    let WorkspaceFollower = request.params.workspace_follower;

    let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
    let workspaceFollower = new WORKSPACEFOLLOWER();
    workspaceFollower.id = WorkspaceFollower;

    let USER = Parse.Object.extend("_User");
    let user = new USER();
    user.id = User;

    // update user's workspace follower
    workspaceFollower.set("isFollower", false);
    workspaceFollower.set("isMember", false);
    workspaceFollower.set("user", user);
    workspaceFollower.save(null, {

        useMasterKey: true
        //sessionToken: sessionToken

    }).then((result) => {

        // save was successful
        if(result) {

            console.log("result leaveWorkspace query: " + JSON.stringify(result));

            let queryWorkspaceFollowerSelected = new Parse.Query(WORKSPACEFOLLOWER);
            queryWorkspaceFollowerSelected.equalTo("isSelected", true);
            queryWorkspaceFollowerSelected.equalTo("user", user);
            queryWorkspaceFollowerSelected.equalTo("isFollower", true);
            queryWorkspaceFollowerSelected.descending("updatedAt");
            queryWorkspaceFollowerSelected.include("workspace");

            queryWorkspaceFollowerSelected.first({

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((result_workspacefollower) => {
                // The object was retrieved successfully.
                console.log("result_workspacefollower" + JSON.stringify(result_workspacefollower));

                if (result_workspacefollower) {

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took LeaveWorkspace CloudFunction ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                    response.success(result_workspacefollower);

                } else {


                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took LeaveWorkspace CloudFunction ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                    response.success();

                }

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


        } else {

            response.error(result);

        }



    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        response.error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });


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

// cloud API and function to add one or multiple skills to skills table.
Parse.Cloud.define("createWorkspace", function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.014.CreateWOrkspace.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();

    let workspaceToSave = new WORKSPACE();
    workspaceToSave = request.params;

    let USER = Parse.Object.extend("_User");
    let user = new USER();
    user.id = workspaceToSave.get("user").id;


    // set required fields
    if (!workspaceToSave.toJSON().image) {

        return response.error("Please attach a picture for your workspace its required.");

    }
    if (!workspaceToSave.toJSON().name) {

        return response.error("Please enter a workspace name it's a required field.");

    }
    if (!workspaceToSave.toJSON().url) {

        return response.error("Please enter a workspace url it's a required field.");

    }


    function createWorkspace (callback) {

        let expertsArray = [];

        if (workspaceToSave.toJSON().archive) {workspace.set("archive", workspaceToSave.toJSON().archive);}
        if (workspaceToSave.toJSON().user) {workspace.set("user", workspaceToSave.toJSON().user); workspace.set("expertsArray", expertsArray.push(workspaceToSave.toJSON().user))}
        if (workspaceToSave.toJSON().workspace_name) {workspace.set("workspace_name", workspaceToSave.toJSON().workspace_name);}
        if (workspaceToSave.toJSON().workspace_url) {workspace.set("workspace_url", workspaceToSave.toJSON().workspace_url);}
        if (workspaceToSave.toJSON().mission) {workspace.set("mission", workspaceToSave.toJSON().mission);}
        if (workspaceToSave.toJSON().description) {workspace.set("description", workspaceToSave.toJSON().description);}
        if (workspaceToSave.toJSON().type) {workspace.set("type", workspaceToSave.toJSON().type);}
        if (workspaceToSave.toJSON().name) {workspace.set("name", workspaceToSave.toJSON().name);}
        if (workspaceToSave.toJSON().skills) {workspace.set("skills", workspaceToSave.toJSON().skills);}


        workspaceToSave.save(null, {

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((workspaceResult) => {

            // save was successful
            if(workspaceResult) {

                console.log("result leaveWorkspace query: " + JSON.stringify(workspaceResult));

                return callback (null, workspaceResult);


            } else {

                console.log("no result from createWorkspace cloud function " + JSON.stringify(workspaceResult));


                return callback (null, workspaceResult);

            }



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });


    }

    function createOwnerWorkspaceFollower (callback, workspaceResult) {

        if (workspaceResult) {

            console.log("createWorkspace Result: " + JSON.stringify(workspaceResult));

            workspace.id = workspaceResult.id;


            if (workspaceResult.get("isNew") === true) {

                let viewableBy = [];
                let followersArray = [];

                let workspaceFollower = new Parse.Object("workspace_follower");

                //console.log("createOwnerWorkspaceFollower ACL: " + JSON.stringify(workspace));

                workspaceFollower.set("archive", false);
                workspaceFollower.set("user", user);
                workspaceFollower.set("workspace", workspace);
                workspaceFollower.set("notificationCount", 0);
                workspaceFollower.set("isSelected", true);
                workspaceFollower.set("isNewWorkspace", true);
                workspaceFollower.set("isMember", true);
                workspaceFollower.set("isFollower", true);
                workspaceFollower.set("isMemberRequestedByWorkspaceAdmin", false);
                workspaceFollower.set("isMemberRequestedByUser", false);

                console.log("createOwnerWorkspaceFollower workspaceFollower: " + JSON.stringify(workspaceFollower));

                workspaceFollower.save(null, {

                    useMasterKey: true,
                    //sessionToken: sessionToken

                }).then((result) => {

                    // save was successful

                    //console.log("workspace new workspace: " + JSON.stringify(result));

                    workspaceFollower = result;

                    console.log("createOwnerWorkspaceFollower workspace new workspace to save: " + JSON.stringify(workspaceFollower));


                    workspaceToSave.objectID = workspaceToSave.objectId;
                    followersArray.push(workspaceFollower);
                    workspaceToSave['followers'] = followersArray;

                    console.log("createOwnerWorkspaceFollower workspaceToSave with followers: " + JSON.stringify(workspaceToSave));


                    // add _tags for this workspacefollower so it's visible in algolia

                    if (workspaceToSave.get("type") === 'private') {
                        viewableBy.push(workspaceFollower.toJSON().user.objectId);
                        //console.log("user id viewableBy: " + followers[i].toJSON().user.objectId) ;
                    }


                    if (workspaceToSave.get("type") === 'private') {

                        workspaceToSave._tags= viewableBy;
                        //console.log("workspace 2: " + JSON.stringify(workspaceToSave));

                    } else if (workspaceToSave.get("type")=== 'public') {

                        workspaceToSave._tags = ['*'];

                    }



                    return callback(null, workspaceToSave);



                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return callback(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });


            } else {

                return callback (null);
            }


        } else {


            return callback (null);
        }



    }



    async.waterfall([
        async.apply(createWorkspace),
        async.apply(createOwnerWorkspaceFollower)

    ], function (err, results) {
        if (err) {
            response.error(err);
        }

        if (results) {

            workspaceToSave = results[1];

            indexWorkspaces.partialUpdateObject(workspaceToSave, true, function(err, content) {
                if (err) return response.error(err);

                console.log("Parse<>Algolia workspace saved from AfterSave Workspace function ");

                let finalTime = process.hrtime(time);
                console.log(`finalTime took createWorkspace Cloud Function ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
                return response.success(results);

            });


        }


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
            //query.select(["user", "ACL", "media_duration", "postImage", "post_File", "audioWave", "archive", "post_type", "privacy","text", "likesCount",  "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url" , "channel.name", "channel.type", "channel.archive"]);

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

// cloud API and function to index and import all posts from Parse to AlgoliaSearch indexUsers
Parse.Cloud.define("indexAlgolia", function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let collection = request.params.collection;
    let index;

    let query = new Parse.Query(collection);
    query.limit(10000); // todo limit to at most 1000 results need to change and iterate until done todo

    console.log('collection: ' + request.params.collection);

    switch (collection) {
        case "Post":

            break;
        case "_User":

            break;
        case "Channel":

            break;
        case "Meeting":

            break;
        case "WorkSpace":

            break;
        case "Skill":

            break;
        case "PostQuestionMessage":

            break;

        case "PostChatMessage":

            break;

        default:
            return response.error("The collection entered does not exist. Please enter one of the following collections: _User, Post, WorkSpace, Channel, Meeting, PostChatMessage or PostQuestionMessage");
    }

    query.find({useMasterKey: true})
        .then((objectsToIndex) => {
            // The object was retrieved successfully.
            //console.log("Result from get " + JSON.stringify(Workspace));

            let objects = objectsToIndex;
            console.log("ObjectToSave length: " + JSON.stringify(objects.length));

            async.forEach(objects, function (object, cb) {

                let PARSEOBJECT = Parse.Object.extend(collection);
                let parseObject = new PARSEOBJECT();
                parseObject.id = object.id;

                parseObject.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                return cb (null, object);

            }, function (err) {

                if (err) {

                    return response.error(err);
                } else {

                    console.log("PrepIndex completed: " + JSON.stringify(objects.length));

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took indexAlgolia ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                    return response.success();

                }


            });



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            return response.error(error);
        }, {useMasterKey: true});


}, {useMasterKey: true});



// cloud API and function to index and import all users from Parse to AlgoliaSearch indexUsers
Parse.Cloud.define("indexCollection", function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let objectsToIndex = [];
    //Create a new query for User collection in Parse

    let collection = request.params.collection;
    let index;
    let skills;
    let skillsToLearn;
    let query = new Parse.Query(collection);
    query.limit(50); // todo limit to at most 1000 results need to change and iterate until done todo

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
            query.select(["user.fullname", "user.displayName", "user.isOnline", "user.showAvailability", "user.profileimage", "user.createdAt", "user.updatedAt", "user.objectId", "type", "archive","workspace_url", "workspace_name", "experts", "ACL", "objectId", "mission", "description","createdAt", "updatedAt", "followerCount", "memberCount", "isNew", "skills", "image", "channelCount", "expertsArray", "notificationCount"]);
            index = indexWorkspaces;
            skills = "skills";

            break;
        case "Skill":
            index = indexSkills;

            break;
        default:
            response.error("The collection entered does not exist. Please enter one of the following collections: _User, Post, WorkSpace, Channel, Meeting");
    }

    query.find({useMasterKey: true})
        .then((objectsToIndex) => {
            // The object was retrieved successfully.
            //console.log("Result from get " + JSON.stringify(Workspace));

            let objects = objectsToIndex;
            console.log("ObjectToSave length: " + JSON.stringify(objects.length));

            async.map(objects, function (object, cb) {

                let WORKSPACE = Parse.Object.extend("WorkSpace");
                let workspace = new WORKSPACE();
                workspace = object;
                let workspaceToSave = workspace.toJSON();

                let skillObject = Parse.Object.extend("Skill");
                //var skillsRelation = new skillObject.relation("skills");
                skillObject = workspace.get("skills");
                console.log("skillObject: " + JSON.stringify(skillObject));

                function getSkills(callback) {

                    if (collection !== "WorkSpace") {

                        return callback(null, object);

                    }
                    else {

                        //console.log("Skill Length:" + skillObject);

                        let skillObjectQuery = skillObject.query();
                        skillObjectQuery.ascending("level");

                        skillObjectQuery.find({

                            useMasterKey: true
                        }).then((skill) => {

                            let skillObject = [];

                            if (skill) {

                                // skills exist return then then
                                skillObject = skill;
                            } else {

                                // do nothing and return empty skill object no skills;

                            }

                            return callback (null, skillObject);


                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            return callback (error);
                        }, {

                            useMasterKey: true
                        });


                    }

                }

                function getExperts(callback) {

                    if (collection !== "WorkSpace") {

                        return callback(null, object);

                    }
                    else {

                        // todo check if expert is dirty, if no ignore and return callback

                        //let expertObject = Parse.Object.extend("_User");

                        let experts = workspace.get("expertsArray");

                        if (experts) {

                            console.log("experts getExperts: " + JSON.stringify(experts));

                            return callback (null, experts);

                        } else {

                            experts = [];
                            console.log("experts getExperts else: " + JSON.stringify(experts));

                            return callback (null, experts);

                        }

                        //console.log("Experts: " + JSON.stringify(expertObject));

                        /*expertObject.query().select(["fullname", "displayName", "isOnline", "showAvailability", "profileimage", "createdAt", "updatedAt", "objectId"]).find({

                            useMasterKey: true
                        }).then((experts) => {

                            if (experts) {

                                return callback(null, experts);

                            } else {

                                let expertsEmpty = [];
                                return callback (null, expertsEmpty);

                            }

                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            return callback (null, error);
                        }, {

                            useMasterKey: true
                        });*/


                    }

                }

                function getWorkspaceFollowers(callback) {

                    //todo check for when we should be updating workspace_follower in Algolia Index
                    // get workspace_followers only in the following scenarios (1) user isFollower or isMember == true (2) workspace admin sent request for a user to join a workspace it's viewable to that user.

                    if (collection !== "WorkSpace") {

                        return callback(null, object);

                    }
                    else {

                        let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
                        let queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);

                        let viewableBy = [];

                        queryWorkspaceFollower.equalTo("workspace", workspace);

                        // todo if there is more than 10k people following workspace need to split algolia index into two objects and implement pagination here.
                        queryWorkspaceFollower.limit(10000);
                        // queryWorkspaceFollower.include( ["workspace"] );

                        queryWorkspaceFollower.find({useMasterKey: true})
                            .then((followers) => {
                                // The object was retrieved successfully.

                                //console.log("workspace.type: " + JSON.stringify(workspaceToSave.type));

                                delete workspaceToSave.skills;
                                delete workspaceToSave.experts;

                                workspaceToSave.objectID = workspaceToSave.objectId;

                                if (followers) {

                                    workspaceToSave['followers'] = followers;

                                    for (var i = 0; i < followers.length; i++) {

                                        if (workspaceToSave.type === 'private') {
                                            viewableBy.push(followers[i].toJSON().user.objectId);
                                            console.log("user id viewableBy: " + followers[i].toJSON().user.objectId) ;
                                        }


                                    }

                                    if (workspaceToSave.type === 'private') {

                                        workspaceToSave._tags= viewableBy;
                                        console.log("private _tags: " + JSON.stringify(workspaceToSave._tags));

                                    } else if (workspaceToSave.type === 'public') {

                                        workspaceToSave._tags = ['*'];

                                    }

                                } else {

                                    // this case should never exist, we should always have a follower for a workspace (owner)

                                    followers = [];
                                    workspaceToSave['followers'] = followers;

                                    workspaceToSave._tags = ['*'];


                                }




                                //console.log("followers: " + JSON.stringify(workspaceToSave.followers));

                                return callback(null, workspaceToSave);



                            }, (error) => {
                                // The object was not retrieved successfully.
                                // error is a Parse.Error with an error code and message.
                                response.error(error);
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

                    //console.log("results length: " + JSON.stringify(results));

                    if (collection === "WorkSpace") {

                        workspaceToSave = results[2];
                        let skillsToSave = results[0];
                        let expertsToSave = results[1];

                        //console.log("skillsToSave: " + JSON.stringify(skillsToSave));
                        //console.log("expertsToSave: " + JSON.stringify(expertsToSave));
                        //console.log("workspaceToSave: " + JSON.stringify(workspaceToSave));

                        workspaceToSave["skills"] = skillsToSave;
                        workspaceToSave["experts"] = expertsToSave;

                        object = workspaceToSave;

                        //console.log("object: " + JSON.stringify(object));

                        return cb(null, object);


                    }
                    else {

                        // convert to regular key/value JavaScript object
                        object = results[2];
                        object = object.toJSON();
                        // Specify Algolia's objectID with the Parse.Object unique ID
                        object.objectID = object.objectId;
                        object._tags = ['*'];

                        return cb(null, object);
                    }

                });


            }, function (err, objects) {

                console.log("PrepIndex completed: " + JSON.stringify(objects.length));

                // Add or update new objects
                index.partialUpdateObjects(objects, true, function (err, content) {
                    if (err) response.error(err);

                    console.log("Parse<>Algolia workspace saved from indexCollection function ");

                    let finalTime = process.hrtime(time);
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

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.009.beforeSave-User.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

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

    //console.log("_User req: " + JSON.stringify(req));

    //let expiresAt = session.get("expiresAt");
    let _tagPublic = '*';
    let _tagUserId = user.id;


    if (user.dirty("profileimage") || user.get("isWorkspaceUpdated") === true || user.get("isChannelUpdated") === true || user.dirty("title") || user.dirty("displayName") || user.dirty("fullname") || user.dirty("roles") || user.dirty("isOnline") || user.dirty("showAvailability")) {

        user.set("isUpdateAlgoliaIndex", true);


    } else {

        user.set("isUpdateAlgoliaIndex", false);

    }

    if ( !user.get("isWorkspaceUpdated")  || !user.get("isChannelUpdated") ) {

        user.set("isWorkspaceUpdated", false);
        user.set("isChannelUpdated", false);


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

    if (user.dirty("showAvailability")) {
        user.set("isDirtyShowAvailability", true);

    }
    else if (!user.dirty("showAvailability")) {user.set("isDirtyShowAvailability", false);}

    if (user.dirty("isTyping")) {
        user.set("isDirtyTyping", true);

    }
    else if (!user.dirty("isTyping")) {user.set("isDirtyTyping", false);}

    if (user.isNew()) {
        user.set("isNew", true);
        user.set("showAvailability", true);

        if (user.get("isLogin") === true) {

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

            console.log("new algoliaPublic key generated for " + JSON.stringify(user.id));


            user.set("algoliaSecureAPIKey", user_public_key);


        }

        if (socialProfilePicURL!== null)  {

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

    }
    else if (!user.isNew()) {

        user.set("isNew", false);

        if (user.get("isLogin") === true) {

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

            console.log("new algoliaPublic key generated for " + JSON.stringify(user.id));


            user.set("algoliaSecureAPIKey", user_public_key);

            response.success();


        } else {

            response.success();


        }


    }




}, {useMasterKey: true});

// Run beforeSave functions workspace
Parse.Cloud.beforeSave('WorkSpace', function(req, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let workspace = req.object;
    let owner = new Parse.Object("_User");
    owner = workspace.get("user");

    //console.log("WorkSpace request.object: " + JSON.stringify(req.object));

    //console.log("request: " + JSON.stringify(req));
    //console.log("workspaceExperts__op: " + JSON.stringify(workspaceExpertObjects));

    let expertRelation = workspace.relation("experts");
    let expertArray = [];

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.007.beforeSave-WorkSpace.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    //var WORKSPACE = Parse.Object.extend("WorkSpace");
    let WORKspace = new Parse.Object("WorkSpace");

    let queryWorkspace = new Parse.Query(WORKspace);

    if (workspace.dirty("skills")) {
        workspace.set("isDirtySkills", true);
    } else if (!workspace.dirty("skills")) {
        workspace.set("isDirtySkills", false);

    }

    function archiveWorkspaceFollowers (callback) {

        let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");

        let queryWorksapceFollower = new Parse.Query(WORKSPACEFOLLOWER);
        queryWorksapceFollower.equalTo("workspace", workspace);
        queryWorksapceFollower.limit(10000);
        queryWorksapceFollower.find({
            useMasterKey: true

        }).then((workspacefollowers) => {


            if (workspacefollowers) {

                async.map(workspacefollowers, function (object, cb) {

                    let workspaceFollower = new WORKSPACEFOLLOWER();
                    workspaceFollower.id = object.id;

                    workspaceFollower.set("archive", true);
                    workspaceFollower.set("user", object.get("user"));

                    object = workspaceFollower;

                    console.log("archive workspacefollowerobject: " + JSON.stringify(object));

                    return cb (null, object);

                    //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));



                }, function (err, workspacefollowers) {

                    //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                    if (err) {response.error(err);} else {



                        Parse.Object.saveAll(workspacefollowers, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        }).then((savedWorkspaceFollowers) => {

                            //console.log("savedWorkspaceFollowers: " + JSON.stringify(savedWorkspaceFollowers));


                            return callback (null, savedWorkspaceFollowers);


                        });


                    }

                });





            } else {

                workspacefollowers = [];
                // no workspaceFollowers to delete return
                return callback(null, workspacefollowers);

            }



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken
        });

    }

    function unarchiveWorkspaceFollowers (callback) {

        let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");

        let queryWorksapceFollower = new Parse.Query(WORKSPACEFOLLOWER);
        queryWorksapceFollower.equalTo("workspace", workspace);
        queryWorksapceFollower.limit(10000);
        queryWorksapceFollower.find({
            useMasterKey: true
            //sessionToken: sessionToken
        }).then((workspacefollowers) => {


            if (workspacefollowers) {

                async.map(workspacefollowers, function (object, cb) {

                    let workspaceFollower = new WORKSPACEFOLLOWER();
                    workspaceFollower.id = object.id;

                    workspaceFollower.set("archive", false);
                    workspaceFollower.set("user", object.set("user"));
                    if (object.get("user").id === req.user.toJSON().objectId) {

                        workspaceFollower.set("isSelected", true);


                    }

                    object = workspaceFollower;

                    console.log("unarchive workspacefollowerobject: " + JSON.stringify(object));

                    return cb (null, object);

                    //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));



                }, function (err, workspacefollowers) {

                    //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                    if (err) {response.error(err);} else {



                        Parse.Object.saveAll(workspacefollowers, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        }).then((savedWorkspaceFollowers) => {

                            //console.log("savedWorkspaceFollowers: " + JSON.stringify(savedWorkspaceFollowers));


                            return callback (null, savedWorkspaceFollowers);



                        });


                    }

                });





            } else {

                workspacefollowers = [];
                // no workspaceFollowers to delete return
                return callback(null, workspacefollowers);

            }



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {
            useMasterKey: true
            //sessionToken: sessionToken
        });

    }

    if (workspace.isNew()) {


        queryWorkspace.equalTo("workspace_url", workspace.get("workspace_url"));

        queryWorkspace.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((results) => {
            // The object was retrieved successfully.

            if (results) {

                // workspace url is not unique return error

                let finalTime = process.hrtime(time);
                console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                return response.error(results);

            } else {

                // set the workspace owner as an expert
                expertRelation.add(owner);

                workspace.set("isNew", true);
                workspace.set("followerCount", 0);
                workspace.set("memberCount", 0);
                workspace.set("channelCount", 0);
                workspace.set("isDirtyExperts", false);
                workspace.increment("followerCount");
                workspace.increment("memberCount");
                workspace.increment("channelCount");

                workspace.set("isDirtySkills", false);

                owner.fetch(owner.id, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((expert) => {

                    let expertOwner = simplifyUser(expert);

                    //expertArray.push(expertOwner);
                    workspace.addUnique("expertsArray", expertOwner);

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Workspace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                    return response.success();

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    response.error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                //console.log("request: " + JSON.stringify(req));

            }


        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });


    }
    else if (!workspace.isNew() && workspace.dirty("workspace_url")) {

        workspace.set("isNew", false);

        queryWorkspace.equalTo("workspace_url", workspace.get("workspace_url"));

        queryWorkspace.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((results) => {
            // The object was retrieved successfully.

            if (results) {

                // workspace url is not unique return error

                return response.error(results);

            } else {

                if (workspace.dirty("experts")) {

                    let workspaceExpertObjects = req.object.toJSON().experts.objects;
                    let exp__op = req.object.toJSON().experts.__op;

                    workspace.set("isDirtyExperts", true);

                    if (exp__op === "AddRelation") {

                        // add expert to expertsArray

                        async.map(workspaceExpertObjects, function (object, cb) {

                            let workspaceExpertObject = new Parse.Object("_User");
                            workspaceExpertObject.set("objectId", object.objectId);

                            //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));

                            workspaceExpertObject.fetch(workspaceExpertObject.id, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            }).then((expert) => {

                                let expertOwner = simplifyUser(expert);

                                //console.log("expertOwner 2: " + JSON.stringify(expertOwner));

                                //o[key] = expertOwner;

                                workspace.addUnique("expertsArray", expertOwner);
                                /*workspace.save(null, {

                                 useMasterKey: true
                                 //sessionToken: sessionToken

                                 });*/

                                object = expertOwner;
                                //expertArray.push(expertOwner);

                                return cb (null, object);

                            }, (error) => {
                                // The object was not retrieved successfully.
                                // error is a Parse.Error with an error code and message.
                                response.error(error);
                            }, {

                                useMasterKey: true
                                //sessionToken: sessionToken

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
                                console.log(`finalTime took beforeSave WorkSpace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

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

                                useMasterKey: true
                                //sessionToken: sessionToken

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

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });

                        }, function (err, workspaceExpertObjects) {

                            //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                            if (err) {response.error(err);} else {

                                //workspace.set("expertsArray", workspaceExpertObjects);
                                //workspace.remove("expertsArray", workspaceExpertObjects);
                                //console.log("workspace 2: " + JSON.stringify(workspace));

                                let finalTime = process.hrtime(time);
                                console.log(`finalTime took beforeSave WorkSpace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                                response.success();


                            }

                        });



                    }
                    else {

                        // do nothing to expertArray

                        let finalTime = process.hrtime(time);
                        console.log(`finalTime took beforeSave WorkSpace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                        response.success();
                    }




                }
                else {

                    workspace.set("isDirtyExperts", false);

                    if (workspace.dirty("archive")) {

                        queryWorkspace.get(workspace.id, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        }).then((Workspace) => {
                            // The object was retrieved successfully.

                            if (Workspace) {

                                if (Workspace.get("archive") === false && workspace.get("archive") === true) {

                                    // user wants to archive a workspace then archive it

                                    async.parallel([
                                        async.apply(archiveWorkspaceFollowers)
                                    ], function (err, results) {
                                        if (err) {
                                            response.error(err);
                                        }

                                        //console.log("final results: " + JSON.stringify(results));

                                        let beforeSave_Time = process.hrtime(time);
                                        console.log(`beforeSave_Time beforeSave Workspace took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                                        response.success();
                                    });

                                } else if (Workspace.get("archive") === true && workspace.get("archive") === false) {

                                    // user wants to un-archive a workspace then un-archive it

                                    async.parallel([
                                        async.apply(unarchiveWorkspaceFollowers)
                                    ], function (err, results) {
                                        if (err) {
                                            response.error(err);
                                        }

                                        //console.log("final results: " + JSON.stringify(results));

                                        let beforeSave_Time = process.hrtime(time);
                                        console.log(`beforeSave_Time beforeSave Workspace Follower took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                                        response.success();
                                    });

                                }


                            } else {
                                let beforeSave_Time = process.hrtime(time);
                                console.log(`beforeSave_Time beforeSave Workspace Follower took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                                response.error("No Workspace Found when user was trying to archive it.")

                            }


                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            response.error(error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });




                    } else {

                        let finalTime = process.hrtime(time);
                        console.log(`finalTime took beforeSave Workspace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                        response.success();


                    }
                }


            }


        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });


    }
    else if (!workspace.isNew() && !workspace.dirty("workspace_url")) {


        workspace.set("isNew", false);

        console.log("workspace Experts.dirty: " + workspace.dirty("experts"));

        if (workspace.dirty("experts")) {

            workspace.set("isDirtyExperts", true);

            let workspaceExpertObjects = req.object.toJSON().experts.objects;
            let exp__op = req.object.toJSON().experts.__op;

            if (exp__op === "AddRelation") {

                // add expert to expertsArray

                async.map(workspaceExpertObjects, function (object, cb) {


                    let workspaceExpertObject = new Parse.Object("_User");
                    workspaceExpertObject.set("objectId", object.objectId);

                    //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));

                    workspaceExpertObject.fetch(workspaceExpertObject.id, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((expert) => {

                        let expertOwner = simplifyUser(expert);

                        //console.log("expertOwner 2: " + JSON.stringify(expertOwner));

                        //o[key] = expertOwner;

                        workspace.addUnique("expertsArray", expertOwner);
                        /*workspace.save(null, {

                         useMasterKey: true
                         //sessionToken: sessionToken

                         });*/

                        object = expertOwner;
                        //expertArray.push(expertOwner);

                        return cb (null, object);

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

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
                        console.log(`finalTime took beforeSave WorkSpace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

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

                        useMasterKey: true
                        //sessionToken: sessionToken

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

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                }, function (err, workspaceExpertObjects) {

                    //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                    if (err) {response.error(err);} else {

                        //workspace.set("expertsArray", workspaceExpertObjects);
                        //workspace.remove("expertsArray", workspaceExpertObjects);
                        //console.log("workspace 2: " + JSON.stringify(workspace));

                        let finalTime = process.hrtime(time);
                        console.log(`finalTime took beforeSave WorkSpace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                        response.success();

                    }

                });


            }

            else {

                // do nothing to expertArray

                let finalTime = process.hrtime(time);
                console.log(`finalTime took beforeSave WorkSpace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                response.success();
            }



        }
        else {

            workspace.set("isDirtyExperts", false);

            if (workspace.dirty("archive")) {

                queryWorkspace.get(workspace.id, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((Workspace) => {
                    // The object was retrieved successfully.

                    if (Workspace) {

                        if (Workspace.get("archive") === false && workspace.get("archive") === true) {

                            // user wants to archive a workspace then archive it

                            async.parallel([
                                async.apply(archiveWorkspaceFollowers)
                            ], function (err, results) {
                                if (err) {
                                    response.error(err);
                                }

                                //console.log("final results: " + JSON.stringify(results));

                                let beforeSave_Time = process.hrtime(time);
                                console.log(`beforeSave_Time beforeSave Workspace ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                                response.success();
                            });

                        } else if (Workspace.get("archive") === true && workspace.get("archive") === false) {

                            // user wants to un-archive a workspace then un-archive it

                            async.parallel([
                                async.apply(unarchiveWorkspaceFollowers)
                            ], function (err, results) {
                                if (err) {
                                    response.error(err);
                                }

                                //console.log("final results: " + JSON.stringify(results));

                                let beforeSave_Time = process.hrtime(time);
                                console.log(`beforeSave_Time beforeSave Workspace took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                                response.success();
                            });

                        }


                    } else {

                        let beforeSave_Time = process.hrtime(time);
                        console.log(`beforeSave_Time beforeSave Workspace took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                        response.error("No Workspace Found when user was trying to archive it.")


                    }




                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    response.error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });




            } else {

                let finalTime = process.hrtime(time);
                console.log(`finalTime took beforeSave Workspace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                response.success();


            }

        }


    }
    else {


        let finalTime = process.hrtime(time);
        console.log(`finalTime took beforeSave Workspace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

        response.success();

    }

}, {useMasterKey: true});

// Run beforeSave functions channel
Parse.Cloud.beforeSave('Channel', function(req, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();
    let channel = req.object;

    let channelACL = new Parse.ACL();

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.003.beforeSave-Channel.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    //console.log("req.user SessionToken: " + JSON.stringify(req.user.getSessionToken()));
    let CHANNEL = Parse.Object.extend("Channel");
    let Channel =  new CHANNEL();
    Channel.id = channel.id;

    //var CHANNEL = new Parse.Object("Channel");
    let queryChannel = new Parse.Query(CHANNEL);

    //console.log("channel.isNew: " + channel.isNew());

    if (channel.isNew()) {

        //console.log("channel isNew: " + channel.isNew());
        if (!channel.get("isNewWorkspace")) {
            channel.set("isNewWorkspace", false);
        }

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

        //var owner = new Parse.Object("_User");
        let owner = channel.get("user");
        //let expertRelation = Channel.relation("experts");
        //console.log("expertRelation in beforeSave Channel: " + JSON.stringify(expertRelation));

        //var WORKSPACE = new Parse.Object("WORKSPACE");
        let workspace = channel.get("workspace");

        let channelName = channel.get("name");
        channelName = channelName.toLowerCase().trim();
        channel.set("name", channelName);

        let nameWorkspaceID = channel.get("name") + '-' + channel.get("workspace").id;
        channel.set("nameWorkspaceID", nameWorkspaceID);
        //console.log("nameWorkspaceID: " + nameWorkspaceID);

        queryChannel.equalTo("nameWorkspaceID", nameWorkspaceID);
        //queryChannel.include("user");

        queryChannel.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((results) => {
            // The object was retrieved successfully.
            //console.log("results beforeSave Channel: " + JSON.stringify(results));
            if (results) {

                // channel is not unique return error
                let finalTime = process.hrtime(time);
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

                // since this is a new channel then by default the channel creator is both a member and follower increment member/follower for this channel
                channel.increment("memberCount");
                channel.increment("followerCount");

                owner.fetch(owner.id, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((User) => {
                    // The object was retrieved successfully.

                    //console.log("user object: " + JSON.stringify(User));
                    let userRoleRelation = User.relation("roles");
                    //let expertChannelRelation = channelObject.relation("experts");
                    //console.log("userRole: " + JSON.stringify(userRoleRelation));
                    //console.log("expertChannelRelation: " + JSON.stringify(expertChannelRelation));

                    let expertRoleName = "expert-" + workspace.id;

                    let userRoleRelationQuery = userRoleRelation.query();
                    userRoleRelationQuery.equalTo("name", expertRoleName);
                    userRoleRelationQuery.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((results) => {
                        // The object was retrieved successfully.

                        if (results) {

                            // expert role exists, add as channel expert
                            console.log("channelExpert: " + JSON.stringify(results));


                            let expertOwner = simplifyUser(User);
                            console.log("expertOnwer: " + JSON.stringify(expertOwner));


                            channel.addUnique("expertsArray", expertOwner);


                            console.log("addExpertsArrayToChannel channel: " + JSON.stringify(channel));

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

                                let finalTime = process.hrtime(time);
                                console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                response.success();

                            }
                            else if (channel.get("type") === 'privateMembers') {

                                // get member role for this workspace
                                let queryMemberRole = new Parse.Query(Parse.Role);
                                let memberName = 'member-' + workspace.id;

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

                                        let finalTime = process.hrtime(time);
                                        console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});


                            }
                            else if (channel.get("type") === 'privateExperts') {

                                // get member role for this workspace
                                let queryRole = new Parse.Query(Parse.Role);
                                let Name = 'expert-' + workspace.id;

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

                                        let finalTime = process.hrtime(time);
                                        console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});


                            }
                            else if (channel.get("type") === 'privateAdmins') {

                                // get member role for this workspace
                                let queryRole = new Parse.Query(Parse.Role);
                                let Name = 'admin-' + workspace.id;

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

                                        let finalTime = process.hrtime(time);
                                        console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});


                            }
                            else if (channel.get("type") === 'privateModerators') {

                                // get member role for this workspace
                                let queryRole = new Parse.Query(Parse.Role);
                                let Name = 'moderator-' + workspace.id;

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

                                        let finalTime = process.hrtime(time);
                                        console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});


                            }
                            else if (channel.get("type") === 'privateOwners') {

                                // get member role for this workspace
                                let queryRole = new Parse.Query(Parse.Role);
                                let Name = 'owner-' + workspace.id;

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

                                        let finalTime = process.hrtime(time);
                                        console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});

                            }
                            else if (channel.get("type") === 'public') {

                                //console.log("channel is: " + JSON.stringify(channel.get("type")));
                                //console.log("channelACL: " + JSON.stringify(channelACL));
                                // private workspace, but this is a channel that is accessible to all members of this private workspace
                                channelACL.setPublicReadAccess(true);
                                channelACL.setPublicWriteAccess(true);
                                channelACL.setReadAccess(owner, true);
                                channelACL.setWriteAccess(owner, true);

                                //console.log("channelACL: " + JSON.stringify(channelACL));
                                channel.setACL(channelACL);

                                let finalTime = process.hrtime(time);
                                console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                                response.success();


                            }
                            else if (channel.get("type") !== 'private' || channel.get("type") !== 'public' || channel.get("type") !== 'privateOwners' || channel.get("type") !== 'privateModerators' || channel.get("type") !== 'privateAdmins' || channel.get("type") !== 'privateExperts' || channel.get("type") !== 'privateMembers') {

                                let finalTime = process.hrtime(time);
                                console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                                response.error("Channel type field is needs to be one of the following: private, public, privateOwners, privateModerators,  privateAdmins, privateExperts, privateMembers");
                            }
                            else {

                                let finalTime = process.hrtime(time);
                                console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                                response.success();

                            }





                        }
                        else {
                            // no role exists don't add experts to channel

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

                                let finalTime = process.hrtime(time);
                                console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                response.success();

                            }
                            else if (channel.get("type") === 'privateMembers') {

                                // get member role for this workspace
                                let queryMemberRole = new Parse.Query(Parse.Role);
                                let memberName = 'member-' + workspace.id;

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

                                        let finalTime = process.hrtime(time);
                                        console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});


                            }
                            else if (channel.get("type") === 'privateExperts') {

                                // get member role for this workspace
                                let queryRole = new Parse.Query(Parse.Role);
                                let Name = 'expert-' + workspace.id;

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

                                        let finalTime = process.hrtime(time);
                                        console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});


                            }
                            else if (channel.get("type") === 'privateAdmins') {

                                // get member role for this workspace
                                let queryRole = new Parse.Query(Parse.Role);
                                let Name = 'admin-' + workspace.id;

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

                                        let finalTime = process.hrtime(time);
                                        console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});


                            }
                            else if (channel.get("type") === 'privateModerators') {

                                // get member role for this workspace
                                let queryRole = new Parse.Query(Parse.Role);
                                let Name = 'moderator-' + workspace.id;

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

                                        let finalTime = process.hrtime(time);
                                        console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});


                            }
                            else if (channel.get("type") === 'privateOwners') {

                                // get member role for this workspace
                                let queryRole = new Parse.Query(Parse.Role);
                                let Name = 'owner-' + workspace.id;

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

                                        let finalTime = process.hrtime(time);
                                        console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                                        response.success();


                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                        response.error(error);
                                    }, {useMasterKey: true});

                            }
                            else if (channel.get("type") === 'public') {

                                //console.log("channel is: " + JSON.stringify(channel.get("type")));
                                //console.log("channelACL: " + JSON.stringify(channelACL));
                                // private workspace, but this is a channel that is accessible to all members of this private workspace
                                channelACL.setPublicReadAccess(true);
                                channelACL.setPublicWriteAccess(true);
                                channelACL.setReadAccess(owner, true);
                                channelACL.setWriteAccess(owner, true);

                                //console.log("channelACL: " + JSON.stringify(channelACL));
                                channel.setACL(channelACL);

                                let finalTime = process.hrtime(time);
                                console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                                response.success();


                            }
                            else if (channel.get("type") !== 'private' || channel.get("type") !== 'public' || channel.get("type") !== 'privateOwners' || channel.get("type") !== 'privateModerators' || channel.get("type") !== 'privateAdmins' || channel.get("type") !== 'privateExperts' || channel.get("type") !== 'privateMembers') {

                                let finalTime = process.hrtime(time);
                                console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                                response.error("Channel type field is needs to be one of the following: private, public, privateOwners, privateModerators,  privateAdmins, privateExperts, privateMembers");
                            }
                            else {

                                let finalTime = process.hrtime(time);
                                console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                                response.success();

                            }


                        }
                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        console.log("userRoleRelationQuery no result");
                        return response.error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    console.log("userRoleRelationQuery no result");
                    return response.error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });




            }


        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {
            useMasterKey: true
            //sessionToken: sessionToken
        });


    }
    else if (!channel.isNew()) {

        channel.set("isNew", false);
        //console.log("Channel is New, and name updated");
        if (channel.get("isNewWorkspace") === true) {channel.set("isNewWorkspace", false);}


        //var owner = new Parse.Object("_User");
        let owner = channel.get("user");

        //var WORKSPACE = new Parse.Object("WORKSPACE");
        let workspace = channel.get("workspace");

        let channelName = channel.get("name");
        channelName = channelName.toLowerCase().trim();

        function archiveChannelFollowers (callback) {

            if (channel.dirty("archive")) {

                if (channel.get("archive") === true) {

                    let CHANNELFOLLOW = Parse.Object.extend("ChannelFollow");

                    let queryChannelFollow= new Parse.Query(CHANNELFOLLOW);
                    queryChannelFollow.equalTo("channel", channel);
                    queryChannelFollow.limit(10000);
                    queryChannelFollow.find({
                        useMasterKey: true

                    }).then((channelFollowers) => {


                        if (channelFollowers) {

                            async.map(channelFollowers, function (object, cb) {

                                let channelFollow = new CHANNELFOLLOW();
                                channelFollow.id = object.id;

                                channelFollow.set("archive", true);
                                //channelFollow.set("user", object.get("user"));

                                object = channelFollow;

                                console.log("channelFollowersObject: " + JSON.stringify(object));

                                return cb (null, object);

                                //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));

                            }, function (err, channelFollowers) {

                                //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                                if (err) {response.error(err);} else {



                                    Parse.Object.saveAll(channelFollowers, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    }).then((savedChannelFollowers) => {

                                        //console.log("savedChannelFollowers: " + JSON.stringify(savedChannelFollowers));


                                        return callback (null, savedChannelFollowers);


                                    });

                                }

                            });


                        } else {

                            channelFollowers = [];
                            // no channelFollowers to delete return
                            return callback(null, channelFollowers);

                        }


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });


                } else {

                    return callback (null, channel);

                }

            } else {

                return callback (null, channel);
            }


        }

        function unarchiveChannelFollowers (callback) {

            if (channel.dirty("archive")) {

                if (channel.get("archive") === false) {

                    let CHANNELFOLLOW = Parse.Object.extend("ChannelFollow");

                    let queryChannelFollow= new Parse.Query(CHANNELFOLLOW);
                    queryChannelFollow.equalTo("channel", channel);
                    queryChannelFollow.limit(10000);
                    queryChannelFollow.find({
                        useMasterKey: true

                    }).then((channelFollowers) => {


                        if (channelFollowers) {

                            async.map(channelFollowers, function (object, cb) {

                                let channelFollow = new CHANNELFOLLOW();
                                channelFollow.id = object.id;

                                channelFollow.set("archive", false);
                                //channelFollow.set("user", object.get("user"));

                                object = channelFollow;

                                console.log("channelFollowersObject: " + JSON.stringify(object));

                                return cb (null, object);

                                //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));

                            }, function (err, channelFollowers) {

                                //console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                                if (err) {response.error(err);} else {



                                    Parse.Object.saveAll(channelFollowers, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    }).then((savedChannelFollowers) => {

                                        //console.log("savedChannelFollowers: " + JSON.stringify(savedChannelFollowers));


                                        return callback (null, savedChannelFollowers);


                                    });

                                }

                            });


                        } else {

                            channelFollowers = [];
                            // no channelFollowers to delete return
                            return callback(null, channelFollowers);

                        }


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });


                } else {

                    return callback (null, channel);

                }

            } else {

                return callback (null, channel);
            }

        }

        function updateChannelName (callback) {

            if (channel.dirty("name")) {

                // channel name is being changed

                let newChannelName = channel.get("name").toLowerCase().trim();

                if (channelName !== newChannelName) {

                    // check to make sure this name isn't already taken

                    let nameWorkspaceID = newChannelName + '-' + channel.get("workspace").id;

                    queryChannel.equalTo("nameWorkspaceID", nameWorkspaceID);
                    queryChannel.equalTo("workspace", workspace);

                    queryChannel.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((matchedChannel) => {
                        // The object was retrieved successfully.

                        if (matchedChannel) {

                            // there is a channel already with that name, return error

                            return response.error("There is already a channel with this name, please enter a unique channel name: " + matchedChannel);


                        } else {

                            // no match which means no channel with this new name, we are good!


                            channel.set("name", newChannelName);
                            channel.set("nameWorkspaceID", nameWorkspaceID);
                            //console.log("nameWorkspaceID: " + nameWorkspaceID);

                            return callback(null, channel);

                        }


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {useMasterKey: true});




                }
                else {

                    // channelName is the same and it's not getting modified

                    return callback (null, channel);
                }


            }
            else {

                // no channel name sent by user

                return callback (null, channel);


            }

        }

        function updateChannelType (callback) {

            if (channel.dirty("type")) {

                //channelACL = new Parse.ACL();

                // If this is a private channel, set ACL for owner to read and write
                if (channel.get("type") === 'private') {
                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(owner, true);
                    channelACL.setWriteAccess(owner, true);
                    channel.setACL(channelACL);

                    //console.log("channel update, type changed, private.");

                    // todo send a notification to members and followers that now this channel is private

                    return callback (null, channel);

                }
                else if (channel.get("type") === 'privateMembers') {

                    // todo send notification to all users who are not members since they won't get access to this channel anymore

                    // get member role for this workspace
                    let queryMemberRole = new Parse.Query(Parse.Role);
                    let memberName = 'member-' + workspace.id;

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

                            return callback (null, channel);


                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            return callback(error);
                        }, {useMasterKey: true});


                }
                else if (channel.get("type") === 'privateExperts') {

                    // todo send notification to all users who are not experts since they won't get access to this channel anymore


                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'expert-' + workspace.id;

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

                            return callback (null, channel);


                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            return callback(error);
                        }, {useMasterKey: true});


                }
                else if (channel.get("type") === 'privateAdmins') {

                    // todo send notification to all users who are not admins since they won't get access to this channel anymore


                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'admin-' + workspace.id;

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

                            return callback (null, channel);


                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            return callback(error);
                        }, {useMasterKey: true});

                }
                else if (channel.get("type") === 'privateModerators') {

                    // todo send notification to all users who are not moderators since they won't get access to this channel anymore

                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'moderator-' + workspace.id;

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

                            return callback (null, channel);


                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            return callback(error);
                        }, {useMasterKey: true});

                }
                else if (channel.get("type") === 'privateOwners') {

                    // todo send notification to all users who are not privateOwners since they won't get access to this channel anymore


                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'owner-' + workspace.id;

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

                            return callback (null, channel);


                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            return callback(error);
                        }, {useMasterKey: true});

                }
                else if (channel.get("type") === 'public') {

                    // private workspace, but this is a channel that is accessible to all members of this private workspace
                    channelACL.setPublicReadAccess(true);
                    channelACL.setPublicWriteAccess(true);
                    channelACL.setReadAccess(owner, true);
                    channelACL.setWriteAccess(owner, true);
                    channel.setACL(channelACL);

                    return callback (null, channel);


                }
                else if (channel.get("type") !== 'private' || channel.get("type") !== 'public' || channel.get("type") !== 'privateOwners' || channel.get("type") !== 'privateModerators' || channel.get("type") !== 'privateAdmins' || channel.get("type") !== 'privateExperts' || channel.get("type") !== 'privateMembers') {

                    return response.error("Channel type field is needs to be one of the following: private, public, privateOwners, privateModerators,  privateAdmins, privateExperts, privateMembers");
                }
                else {

                    return callback (null, channel);

                }


            }
            else {
                //console.log("channel change, type is not updated.");

                return callback (null, channel);
            }

        }

        function allowMemberPostCreate (callback) {

            // By default allowMemberPostCreation is set to false
            if (channel.dirty("allowMemberPostCreation")) {

                // todo add role ACL to members to be able to create posts in this workspace

                return callback (null, channel);

            } else {

                return callback (null, channel);

            }

        }

        async.parallel([
            async.apply(archiveChannelFollowers),
            async.apply(unarchiveChannelFollowers),
            async.apply(updateChannelName),
            async.apply(updateChannelType),
            async.apply(allowMemberPostCreate)

        ], function (err, results) {
            if (err) {
                response.error(err);
            }

            channel.set("isNew", false);
            console.log("Channel is not New: " + JSON.stringify(channel.get("isNew")));


            //console.log("final results beforeSave channel update: " + JSON.stringify(results));

            let beforeSave_Time = process.hrtime(time);
            console.log(`final time took for beforeSave Channel ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

            return response.success();
        });



    }

    else {
        if (!channel.get("isNew")) {
            channel.set("isNew", false);
        }

        let finalTime = process.hrtime(time);
        console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
        return response.success();
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

                        if (nameLevel !== verifyNameLevel) { response.error("Error 1: NameLevel: " + nameLevel + " Should include the same name: " + name + "and level: " + level + "seperated by : just like this: " + name + ':' + level);}

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
        if (nameLevel !== verifyNameLevel) { response.error("NameLevel: " + nameLevel + "Should include the same name: " + name + "and level: " + level + "seperated by : just like this: " + name + ':' + level);}

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


// Run beforeSave functions for Post
Parse.Cloud.beforeSave('Post', function(req, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.beforeSave.Post.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    var post = req.object;
    var text = post.get("text");
    var workspace = post.get("workspace");
    //console.log("workspace_post: " + JSON.stringify(workspace));
    var channel = post.get("channel");
    //console.log("channel_post: " + JSON.stringify(channel));

    var toLowerCase = function(w) { return w.toLowerCase(); };
    //console.log("post: " + JSON.stringify(post));

    function setDefaultValues (callback) {

        if (post.isNew()) {

            post.set("isNew", true);

            if (!post.get("archive")) { post.set("archive", false); }
            if (!post.get("likesCount")) { post.set("likesCount", 0); }
            //if (!post.get("postQuestionCount")) { post.set("postQuestionCount", 0); }
            //if (!post.get("postQuestionMessageCount")) { post.set("postQuestionMessageCount", 0); }
            //if (!post.get("chatMessageCount")) { post.set("chatMessageCount", 0); }
            //if (!post.get("chatMessageUnReadCount")) { post.set("chatMessageUnReadCount", 0); }
            if (!post.get("postSocialCount")) { post.set("postSocialCount", 0); }
            if (!post.get("isIncognito")) { post.set("isIncognito", false); }
            if (!post.get("questionAnswerEnabled") && post.get("questionAnswerEnabled") !== false) { post.set("questionAnswerEnabled", true); }
            if (!post.get("chatEnabled") && post.get("chatEnabled") !== false) { post.set("chatEnabled", true); }
            if (!post.get("postMessageCount")) { post.set("postMessageCount", 0); }
            if (!post.get("postMessageUnReadCount")) { post.set("postMessageUnReadCount", 0); }
            if (!post.get("postMessageQuestionCount")) { post.set("postMessageQuestionCount", 0); }
            if (!post.get("postMessageQuestionUnReadCount")) { post.set("postMessageQuestionUnReadCount", 0); }
            if (!post.get("postMessageAnswerCount")) { post.set("postMessageAnswerCount", 0); }
            if (!post.get("postMessageAnswerUnReadCount")) { post.set("postMessageAnswerUnReadCount", 0); }
            if (!post.get("postMessageCommentCount")) { post.set("postMessageCommentCount", 0); }
            if (!post.get("postMessageCommentUnReadCount")) { post.set("postMessageCommentUnReadCount", 0); }

            return callback (null, post);

        } else {

            if(!post.isNew()) {

                post.set("isNew", false);

            }

            return callback (null, post);
        }


    }

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
            Post.id = post.id;

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

                useMasterKey: true
                //sessionToken: sessionToken

            });


            if (channel) {
                // add counter for posts to channel collection
                var CHANNEL = Parse.Object.extend("Channel");
                var Channel = new CHANNEL();
                Channel.id = channel.id;

                Channel.increment("postCount");
                Channel.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

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

                            useMasterKey: true
                            //sessionToken: sessionToken

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
        async.apply(setDefaultValues)
        //async.apply(createPostSocial)
        //async.apply(getIntents)

    ], function (err, post) {
        if (err) {
            response.error(err);
        }

        //console.log("final post: " + JSON.stringify(post));

        let beforeSave_Time = process.hrtime(time);
        console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

        response.success();
    });


}, {useMasterKey: true});

// Run beforeSave functions for PostQuestionMessage
Parse.Cloud.beforeSave('PostMessage', function(req, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.beforeSave.PostMessage.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let postMessage = req.object;
    let text = postMessage.get("message");
    let workspace = postMessage.get("workspace");
    let post = postMessage.get("post");
    //console.log("workspace_post: " + JSON.stringify(workspace));
    let channel = postMessage.get("channel");
    //console.log("channel_post: " + JSON.stringify(channel));
    let parentPostMessage = postMessage.get("parentPostMessage");

    var toLowerCase = function(w) { return w.toLowerCase(); };
    //console.log("post: " + JSON.stringify(post));

    function setDefaultValues (callback) {

        if (postMessage.isNew()) {

            if (!postMessage.get("archive")) { postMessage.set("archive", false); }
            if (!postMessage.get("numberOfDownVotes")) { postMessage.set("numberOfDownVotes", 0); }
            if (!postMessage.get("numberOfUpVotes")) { postMessage.set("numberOfUpVotes", 0); }
            if (!postMessage.get("voteRank")) { postMessage.set("voteRank", 0); }
            if (!postMessage.get("upVotedByExpert")) { postMessage.set("upVotedByExpert", false); }
            if (!postMessage.get("seenByExpert")) { postMessage.set("seenByExpert", false); }
            if (!postMessage.get("postMessageSocialCount")) { postMessage.set("postMessageSocialCount", 0); }
            if (!postMessage.get("likedCount")) { postMessage.set("likedCount", 0); }
            if (!postMessage.get("postMessageVoteCount")) { postMessage.set("postMessageVoteCount", 0); }
            if (!postMessage.get("postMessageReadStatusCount")) { postMessage.set("postMessageReadStatusCount", 0); }
            if (!postMessage.get("childPostMessageCount")) { postMessage.set("childPostMessageCount", 0); }
            if (!postMessage.get("isIncognito")) { postMessage.set("isIncognito", false); }

            return callback (null, postMessage);

        } else {

            return callback (null, postMessage);
        }


    }

    // Function to count number of postMessage of question type
    function countPostMessageQuestions (callback) {

        let POST = Parse.Object.extend("Post");
        let Post = new POST();
        Post.id = post.id;

        if (postMessage.isNew() && postMessage.get("type") === 'question' && !postMessage.get("parentPostMessage")) {

            Post.increment("postMessageQuestionCount");
            Post.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


            return callback(null, Post);

        }

        else {
            // not counting either this is a new postMessageQuestion child or another type (i.e. not question, but answer or comment)

            return callback(null, Post);

        }



    }

    // Function to count number of postMessage of answer type
    function countPostMessageAnswers (callback) {

        let POST = Parse.Object.extend("Post");
        let Post = new POST();
        Post.id = post.id;

        if (postMessage.isNew() && postMessage.get("type") === 'answer' && !postMessage.get("parentPostMessage")) {

            Post.increment("postMessageAnswerCount");
            Post.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


            return callback(null, Post);

        }

        else {
            // not counting either this is a new postMessageQuestion child or another type (i.e. not question, but answer or comment)

            return callback(null, Post);

        }



    }

    // Function to count number of postMessage of comment type
    function countPostMessageComments (callback) {

        let POST = Parse.Object.extend("Post");
        let Post = new POST();
        Post.id = post.id;

        if (postMessage.isNew() && postMessage.get("type") === 'comment') {

            Post.increment("postMessageCommentCount");
            Post.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


            return callback(null, Post);

        }

        else {
            // not counting either this is a new postMessageQuestion child or another type (i.e. not question, but answer or comment)

            return callback(null, Post);

        }



    }

    // Function to count number of postMessage of all types
    function countPostMessages(callback) {

        let POST = Parse.Object.extend("Post");
        let Post = new POST();
        Post.id = post.id;

        if (postMessage.isNew()) {

            Post.increment("postMessageCount");
            Post.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


            return callback(null, Post);

        }

        else {
            // not counting either this is a new postMessageQuestion child or another type (i.e. not question, but answer or comment)

            return callback(null, Post);

        }



    }

    // Function to capture hashtags from text posts
    function getHashtags (callback) {
        const NS_PER_SEC = 1e9;
        const MS_PER_NS = 1e-6;
        let timeCountPosts = process.hrtime();
        let getHashtags_Time;

        let hashtags;

        // if there is a post that got added and no hashtags from client then add hashtags
        if (postMessage.isNew() && !postMessage.hashtags) {

            hashtags = text.match(/(^|\s)(#[a-z\d-]+)/gi);
            hashtags = _.map(hashtags, toLowerCase);
            hashtags = hashtags.map(function (hashtag) {
                return hashtag.trim();
            });
            postMessage.set("hashtags", hashtags);
            //console.log("getHashtags: " + JSON.stringify(hashtags));

            getHashtags_Time = process.hrtime(timeCountPosts);
            console.log(`getHashtags_Time took ${(getHashtags_Time[0] * NS_PER_SEC + getHashtags_Time[1])  * MS_PER_NS} milliseconds`);


            return callback(null, postMessage);
        }

        // if an updated for text field (only) in a post occured, and there was no hashtags from client then get hashtags
        else if (!postMessage.isNew() && postMessage.dirty("message") && !postMessage.dirty("hashtags")) {

            hashtags = text.match(/(^|\s)(#[a-z\d-]+)/gi);
            hashtags = _.map(hashtags, toLowerCase);
            hashtags = hashtags.map(function (hashtag) {
                return hashtag.trim();
            });
            postMessage.set("hashtags", hashtags);
            //console.log("getHashtags: " + JSON.stringify(hashtags));

            getHashtags_Time = process.hrtime(timeCountPosts);
            console.log(`getHashtags_Time took ${(getHashtags_Time[0] * NS_PER_SEC + getHashtags_Time[1])  * MS_PER_NS} milliseconds`);

            return callback(null, postMessage);

        }
        else {

            getHashtags_Time = process.hrtime(timeCountPosts);
            console.log(`getHashtags_Time took ${(getHashtags_Time[0] * NS_PER_SEC + getHashtags_Time[1])  * MS_PER_NS} milliseconds`);


            return callback(null, postMessage);

        }


    }

    // Function to capture mentions from text posts
    function getMentions (callback) {

        const NS_PER_SEC = 1e9;
        const MS_PER_NS = 1e-6;
        let timeCountPosts = process.hrtime();
        let getMentions_Time;

        let mentions;

        // if there is a post that got added and no mentions from client then add mentions
        if (postMessage.isNew() && !postMessage.mentions) {

            mentions = text.match(/(^|\s)(@[a-z\d-]+)/gi);
            mentions = _.map(mentions, toLowerCase);
            mentions = mentions.map(function (mention) {
                return mention.trim();
            });
            postMessage.set("mentions", mentions);
            //console.log("getMentions: " + JSON.stringify(mentions));

            getMentions_Time = process.hrtime(timeCountPosts);
            console.log(`getMentions_Time took ${(getMentions_Time[0] * NS_PER_SEC + getMentions_Time[1])  * MS_PER_NS} milliseconds`);


            return callback(null, postMessage);
        }

        // if an updated for text field (only) in a post occured, and there was no mentions from client then get hashtags
        else if (!postMessage.isNew() && postMessage.dirty("message") && !postMessage.dirty("mentions")) {

            mentions = text.match(/(^|\s)(@[a-z\d-]+)/gi);
            mentions = _.map(mentions, toLowerCase);
            mentions = mentions.map(function (mention) {
                return mention.trim();
            });
            postMessage.set("mentions", mentions);
            //console.log("getMentions: " + JSON.stringify(mentions));

            getMentions_Time = process.hrtime(timeCountPosts);
            console.log(`getMentions_Time took ${(getMentions_Time[0] * NS_PER_SEC + getMentions_Time[1])  * MS_PER_NS} milliseconds`);

            return callback(null, postMessage);

        }
        else {

            getMentions_Time = process.hrtime(timeCountPosts);
            console.log(`getMentions_Time took ${(getMentions_Time[0] * NS_PER_SEC + getMentions_Time[1])  * MS_PER_NS} milliseconds`);


            return callback(null, postMessage);

        }

    }

    // function to archive/unarchive postMessageSocial relation if a post is archived/unarchived
    function archivePostMessageSocial (callback) {
        const NS_PER_SEC = 1e9;
        const MS_PER_NS = 1e-6;
        let timeArchive = process.hrtime();
        let archive_Time;

        // if post is updated and specifically the archive field is updated then update postSocial archive field.
        if (!postMessage.isNew() && postMessage.dirty("archive")) {

            let postQuestionMessageSocialRelation = postMessage.relation("postMessageSocial");
            let postQuestionMessageSocialRelationQuery = postQuestionMessageSocialRelation.query();
            postQuestionMessageSocialRelationQuery.find({
                success: function(postQuestionMessageSocialResults) {

                    for (var i = 0; i < postQuestionMessageSocialResults.length; i++) {

                        postQuestionMessageSocialResults[i].set("archive", postMessage.get("archive"));
                        postQuestionMessageSocialResults[i].save(null, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                    }

                    archive_Time = process.hrtime(timeArchive);
                    console.log(`archive_Time took ${(archive_Time[0] * NS_PER_SEC + archive_Time[1]) * MS_PER_NS} milliseconds`);

                    return callback(null, postMessage);

                },
                error: function(err) {
                    // if there is no postSocial results, then just ignore
                    return callback(null, postMessage);
                }

            });


        } else { return callback(null, postMessage);}

    }

    // Function to identify if a text post hasURL
    function getURL (callback) {

        const NS_PER_SEC = 1e9;
        const MS_PER_NS = 1e-6;
        let timeCountPosts = process.hrtime();
        let getURL_Time;

        let hasurl;

        // if there is a post that got added and no hasURL from client then add hasURL
        if (postMessage.isNew() && !postMessage.hasURL) {

            hasurl = urlRegex().test(text);
            //console.log("hasURL: " + JSON.stringify(hasurl));

            postMessage.set("hasURL", hasurl);

            getURL_Time = process.hrtime(timeCountPosts);
            console.log(`getURL_Time took ${(getURL_Time[0] * NS_PER_SEC + getURL_Time[1])  * MS_PER_NS} milliseconds`);

            return callback(null, postMessage);
        }

        // if an updated for text field (only) in a post occured, and there was no hasURL from client then get hashtags
        else if (!postMessage.isNew() && postMessage.dirty("message") && !postMessage.dirty("hasURL")) {

            hasurl = urlRegex().test(text);
            //console.log("hasURL: " + JSON.stringify(hasurl));

            postMessage.set("hasURL", hasurl);

            getURL_Time = process.hrtime(timeCountPosts);
            console.log(`getURL_Time took ${(getURL_Time[0] * NS_PER_SEC + getURL_Time[1])  * MS_PER_NS} milliseconds`);

            return callback(null, postMessage);

        }
        else {

            getURL_Time = process.hrtime(timeCountPosts);
            console.log(`getURL_Time took ${(getURL_Time[0] * NS_PER_SEC + getURL_Time[1])  * MS_PER_NS} milliseconds`);

            return callback(null, postMessage);

        }

    }



    async.parallel([
        async.apply(getHashtags),
        async.apply(getMentions),
        async.apply(getURL),
        async.apply(archivePostMessageSocial),
        async.apply(setDefaultValues),
        async.apply(countPostMessageQuestions),
        async.apply(countPostMessageAnswers),
        async.apply(countPostMessageComments),
        async.apply(countPostMessages)

    ], function (err, results_Final) {
        if (err) {
            response.error(err);
        }

        //console.log("final post: " + JSON.stringify(post));

        let beforeSave_Time = process.hrtime(time);
        console.log(`beforeSave_Time PostMessage took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

        response.success();
    });


}, {useMasterKey: true});


// Run beforeSave functions PostChatMessageSocial
Parse.Cloud.beforeSave('PostMessageSocial', function(req, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.beforeSave.PostMessageSocial.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let postMessageSocial = req.object;
    //console.log("req beforeSave PostMessageSocial: " + JSON.stringify(req));
    let originalPostMessageSocial = req.original ? req.original : null;
    let workspace;
    let post;
    let channel;
    let user;
    let postMessage;

    if (!postMessageSocial.get("workspace")) {
        return response.error("Please add a workspace pointer it's a required field.")
    } else {
        workspace = postMessageSocial.get("workspace");

    }
    if (!postMessageSocial.get("post")) {
        response.error("Please add a post pointer it's a required field.")
    } else {

        post = postMessageSocial.get("post");
        //console.log("post: " + JSON.stringify(post));


    }
    if (!postMessageSocial.get("channel")) {
        return response.error("Please add a channel pointer it's a required field.")
    } else {
        channel = postMessageSocial.get("channel");

    }
    if (!postMessageSocial.get("user")) {
        return response.error("Please add a user pointer it's a required field.")
    } else {
        user = postMessageSocial.get("user");

    }
    if (!postMessageSocial.get("postMessage")) {
        return response.error("Please add a postMessage pointer it's a required field.")
    } else {
        postMessage = postMessageSocial.get("postMessage");

    }
    if (postMessageSocial.isNew()) {

        postMessageSocial.set("isNew", true);

    } else {
        postMessageSocial.set("isNew", false);


    }

    let POSTMESSAGE = Parse.Object.extend("PostMessage");


    function setDefaultValues (cb) {

        if (postMessageSocial.isNew()) {

            if (!postMessageSocial.get("archive")) { postMessageSocial.set("archive", false); }
            if (!postMessageSocial.get("isLiked")) { postMessageSocial.set("isLiked", false); }
            if (!postMessageSocial.get("isDelivered")) { postMessageSocial.set("isDelivered", false); }
            if (!postMessageSocial.get("hasRead")) { postMessageSocial.set("hasRead", false); }
            if (!postMessageSocial.get("voteValue")) { postMessageSocial.set("voteValue", 0);}
            if (!postMessageSocial.get("algoliaIndexID")) { postMessageSocial.set("algoliaIndexID", '0');}



            return cb (null, postMessageSocial);

        } else {

            return cb (null, postMessageSocial);
        }


    }

    function countPostMessageSocial (cb) {

        //console.log("starting countPostMessageSocial: ");

        let PostMessageToSave = postMessage;
        //console.log("PostMessageToSave: " + JSON.stringify(PostMessageToSave));

        let PostMessageSocialResult = originalPostMessageSocial;
        //console.log("PostMessageSocialResult: " + JSON.stringify(PostMessageSocialResult));

        let PostToSave = post;
        //console.log("PostToSave: " + JSON.stringify(PostToSave));


        function countPostMessageLikes(callback) {

            //console.log("starting countPostMessageLikes: ");


            if (postMessageSocial.get("isNew") === true) {

                PostMessageToSave.increment("postMessageSocialCount");

                if (postMessageSocial.get("isLiked") === true) {


                    PostMessageToSave.increment("likedCount");
                    //console.log("PostMessageToSave 1 likedCount: " + JSON.stringify(PostMessageToSave.get("likedCount")));

                    return callback(null, PostMessageToSave);



                }

                else {

                    //console.log("PostMessageToSave 2 likedCount: " + JSON.stringify(PostMessageToSave.get("likedCount")));

                    return callback(null, PostMessageToSave);

                }


            } else {

                // postChatMessageSocial already exists

                if ((postMessageSocial.get("isLiked") === false || !postMessageSocial.get("isLiked")) && (PostMessageSocialResult.get("isLiked") === false || !PostMessageSocialResult.get("isLiked"))) {
                    // original isLiked == false and new isLiked also === false don't increment


                    return callback(null, PostMessageToSave);

                }

                else if ((postMessageSocial.get("isLiked") === false) && PostMessageSocialResult.get("isLiked") === true) {

                    // decrement since user unLiked

                    PostMessageToSave.increment("likedCount", -1);
                    //console.log("PostMessageToSave 3 likedCount: " + JSON.stringify(PostMessageToSave.get("likedCount")));


                    return callback(null, PostMessageToSave);

                }

                else if (postMessageSocial.get("isLiked") === true && (PostMessageSocialResult.get("isLiked") === false || !PostMessageSocialResult.get("isLiked"))) {

                    // increment because the user liked

                    PostMessageToSave.increment("likedCount");
                    //console.log("PostMessageToSave 4 likedCount: " + JSON.stringify(PostMessageToSave.get("likedCount")));


                    return callback(null, PostMessageToSave);

                }
                else if (postMessageSocial.get("isLiked") === true && PostMessageSocialResult.get("isLiked") === true) {

                    // No change don't increment


                    return callback(null, PostMessageToSave);

                }


            }


        }

        function countPostMessageUnRead(callback) {

            //console.log("starting countPostMessageUnRead: ");


            if ((postMessageSocial.get("isNew") === true)) {

                if (postMessageSocial.get("hasRead") === false || !postMessageSocial.get("hasRead")) {


                    PostToSave.increment("postMessageUnReadCount");
                    PostToSave.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((PostObject) => {
                        // The object was retrieved successfully.
                        //console.log("PostObject: " + JSON.stringify(PostObject));

                        return callback(null, PostObject);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });



                }

                else {


                    return callback(null, PostToSave);

                }


            } else {

                // postChatMessageReadStatus already exists

                if ((postMessageSocial.get("hasRead") === false || !postMessageSocial.get("hasRead")) && (PostMessageSocialResult.get("hasRead") === false || !PostMessageSocialResult.get("hasRead"))) {
                    // original hasRead == false and new hasRead also === false don't increment


                    return callback(null, PostToSave);

                }

                else if ((postMessageSocial.get("hasRead") === false ) && PostMessageSocialResult.get("hasRead") === true) {

                    // increment user marked previous messages that he read as unRead

                    PostToSave.increment("postMessageUnReadCount");
                    PostToSave.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((PostObject) => {
                        // The object was retrieved successfully.
                        //console.log("PostObject: " + JSON.stringify(PostObject));

                        return callback(null, PostObject);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                }

                else if (postMessageSocial.get("hasRead") === true && (PostMessageSocialResult.get("hasRead") === false || !PostMessageSocialResult.get("hasRead"))) {

                    // decrement user read the message

                    PostToSave.increment("postMessageUnReadCount", -1);
                    PostToSave.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((PostObject) => {
                        // The object was retrieved successfully.
                        //console.log("PostObject: " + JSON.stringify(PostObject));

                        return callback(null, PostObject);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                }
                else if (postMessageSocial.get("hasRead") === true && PostMessageSocialResult.get("hasRead") === true) {

                    // No change don't increment


                    return callback(null, PostToSave);

                }


            }


        }

        function countPostMessageVote(callback) {

            //console.log("starting countPostMessageVote: " + JSON.stringify(PostMessageToSave));

            let postMessageSocialVoteValue = postMessageSocial.get("voteValue");
            //console.log("postMessageSocialVoteValue: " + JSON.stringify(postMessageSocialVoteValue));

            if (postMessageSocialVoteValue === -1 || 0 || 1) {

                if ((postMessageSocial.get("isNew") === true)) {

                    PostMessageToSave.increment("postMessageVoteCount");


                    if (postMessageSocialVoteValue === -1) {


                        PostMessageToSave.increment("numberOfDownVotes");

                        //console.log("PostMessageToSave numberOfDownVotes: " + JSON.stringify(PostMessageToSave.get("numberOfDownVotes")));



                        return callback(null, PostMessageToSave);

                    }
                    else if (postMessageSocialVoteValue === 1) {


                        PostMessageToSave.increment("numberOfUpVotes");
                        //console.log("PostMessageToSave numberOfUpVotes: " + JSON.stringify(PostMessageToSave.get("numberOfUpVotes")));



                        return callback(null, PostMessageToSave);

                    }

                    else {


                        return callback(null, PostMessageToSave);

                    }


                }

                else {

                    // postQuestionMessageVote already exists

                    if (
                        (postMessageSocialVoteValue === -1 ) && (PostMessageSocialResult.get("voteValue") === -1) ||
                        (postMessageSocialVoteValue === 0 ) && (PostMessageSocialResult.get("voteValue") === 0) ||
                        (postMessageSocialVoteValue === 1 ) && (PostMessageSocialResult.get("voteValue") === 1)


                    ) {
                        // same value as before do nothing

                        //console.log("postMessageSocialVoteValue: " + JSON.stringify(postMessageSocialVoteValue) + "PostMessageSocialResult: " + JSON.stringify(PostMessageSocialResult.get("voteValue")));


                        return callback(null, PostMessageToSave);

                    }

                    else if ((postMessageSocialVoteValue === 1) && PostMessageSocialResult.get("voteValue") === -1) {

                        // User previously downVoted this question but now changed their mind and upVoted it.

                        PostMessageToSave.increment("numberOfDownVotes", -1);
                        PostMessageToSave.increment("numberOfUpVotes");

                        //console.log("PostMessageToSave numberOfUpVotes: " + JSON.stringify(PostMessageToSave.get("numberOfUpVotes")));
                        //console.log("PostMessageToSave numberOfDownVotes: " + JSON.stringify(PostMessageToSave.get("numberOfDownVotes")));


                        return callback(null, PostMessageToSave);

                    }

                    else if ((postMessageSocialVoteValue === 1) && PostMessageSocialResult.get("voteValue") === 0) {

                        // User previously no state, but now he upVoted

                        PostMessageToSave.increment("numberOfUpVotes");

                        //console.log("PostMessageToSave numberOfUpVotes: " + JSON.stringify(PostMessageToSave.get("numberOfUpVotes")));

                        return callback(null, PostMessageToSave);

                    }

                    else if (postMessageSocialVoteValue === 0 && PostMessageSocialResult.get("voteValue") === -1) {

                        // User previously downvoted but now removed downvote

                        PostMessageToSave.increment("numberOfDownVotes", -1);

                        //console.log("PostMessageToSave numberOfDownVotes: " + JSON.stringify(PostMessageToSave.get("numberOfDownVotes")));

                        return callback(null, PostMessageToSave);

                    }
                    else if (postMessageSocialVoteValue === 0 && PostMessageSocialResult.get("voteValue") === 1) {

                        // User previously upVoted, but now user removes the upVote

                        PostMessageToSave.increment("numberOfUpVotes", -1);

                        //console.log("PostMessageToSave numberOfUpVotes: " + JSON.stringify(PostMessageToSave.get("numberOfUpVotes")));

                        return callback(null, PostMessageToSave);

                    }

                    else if ((postMessageSocialVoteValue === -1) && PostMessageSocialResult.get("voteValue") === 1) {

                        // User previously upvoted, but now downvoted

                        PostMessageToSave.increment("numberOfDownVotes");
                        PostMessageToSave.increment("numberOfUpVotes", -1);

                        //console.log("PostMessageToSave numberOfUpVotes: " + JSON.stringify(PostMessageToSave.get("numberOfUpVotes")));
                        //console.log("PostMessageToSave numberOfDownVotes: " + JSON.stringify(PostMessageToSave.get("numberOfDownVotes")));

                        return callback(null, PostMessageToSave);

                    }

                    else if ((postMessageSocialVoteValue === -1) && PostMessageSocialResult.get("voteValue") === 0) {

                        // User previously no state, but now he downVoted

                        PostMessageToSave.increment("numberOfDownVotes");

                        //console.log("PostMessageToSave numberOfDownVotes: " + JSON.stringify(PostMessageToSave.get("numberOfDownVotes")));

                        return callback(null, PostMessageToSave);

                    }


                    else {

                        //console.log("Else in postMessageVoteValue");


                        return callback(null, PostMessageToSave);


                    }
                }


            } else {

                //console.log("No postMessageVoteValue: " + JSON.stringify(postMessageSocialVoteValue));


                return callback(null, PostMessageToSave);


            }



        }


        async.series([
            async.apply(countPostMessageLikes),
            async.apply(countPostMessageUnRead),
            async.apply(countPostMessageVote)

        ], function (err, results_Final) {
            if (err) {
                response.error(err);
            }

            //console.log("final countPostMessageSocial: " + JSON.stringify(results_Final.length));
            let PostMessageToSaveFinal = new POSTMESSAGE();
            PostMessageToSaveFinal.id = PostMessageToSave.id;

            if (results_Final.length > 0) {

                let PostMessageCountLikes = results_Final[0];
                let PostMessageCountUnRead = results_Final[1];
                let PostMessageCountVote = results_Final[2];

                if (PostMessageCountLikes) {
                    if (PostMessageCountLikes.get("likedCount")) {
                        PostMessageToSaveFinal.set("likedCount", PostMessageCountLikes.get("likedCount"));

                    }

                }

                //console.log("PostMessageCountVote: " + JSON.stringify(PostMessageCountVote));


                if (PostMessageCountVote) {
                    if (PostMessageCountVote.get("numberOfDownVotes")) {
                        PostMessageToSaveFinal.set("numberOfDownVotes", PostMessageCountVote.get("numberOfDownVotes"));

                    }
                    if (PostMessageCountVote.get("numberOfUpVotes")) {
                        PostMessageToSaveFinal.set("numberOfUpVotes", PostMessageCountVote.get("numberOfUpVotes"));

                    }

                }

                //console.log("PostMessageToSaveFinal: " + JSON.stringify(PostMessageToSaveFinal));


                PostMessageToSaveFinal.save(null, {

                    useMasterKey: true,
                    //sessionToken: sessionToken

                }).then((PostMessageObj) => {
                    // The object was retrieved successfully.
                    //console.log("PostMessageObj: " + JSON.stringify(PostMessageObj.id));

                    //console.log("queryPostMessage: " + JSON.stringify(queryPostMessage));

                    let queryPostMessage = new Parse.Query(POSTMESSAGE);
                    queryPostMessage.include( ["user"] );
                    //queryPost.select(["user", "ACL", "media_duration", "postImage", "post_File", "audioWave", "archive", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url", "channel.name", "channel.type", "channel.archive", "post_title", "questionAnswerEnabled" /*,"transcript"*/]);
                    queryPostMessage.equalTo("objectId", PostMessageObj.id);


                    queryPostMessage.first( {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((PostMessageObject) => {
                        // The object was retrieved successfully.
                        //console.log("Result from get " + JSON.stringify(Workspace));

                        //PostMessage = PostMessageObject;

                        //console.log("PostMessageObject: " + JSON.stringify(PostMessageObject));

                        PostMessageToSaveFinal = PostMessageObject;


                        return cb (null, PostMessageToSaveFinal);



                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return cb(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });


                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return cb(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });


            } else {
                return cb (null, PostMessageToSaveFinal);

            }



        });

    }


    async.series([
        async.apply(setDefaultValues),
        async.apply(countPostMessageSocial)

    ], function (err, results_Final) {
        if (err) {
            response.error(err);
        }

        //console.log("final post: " + JSON.stringify(post));

        let beforeSave_Time = process.hrtime(time);
        console.log(`beforeSave_Time PostMessageSocial took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

        response.success();
    });


});

Parse.Cloud.afterSave('PostMessageSocial', function(req, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    //console.log("Starting afterSave PostMessageSocial: " + JSON.stringify(req));

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.beforeSave.PostMessageSocial.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let postMessageSocial = req.object;
    let originalPostMessageSocial = req.original ? req.original : null;


    //var Post = Parse.Object.extend("Post");
    let POSTMESSAGESOCIAL = Parse.Object.extend("PostMessageSocial");
    let queryPostMessageSocial = new Parse.Query(POSTMESSAGESOCIAL);
    queryPostMessageSocial.include(["postMessage", "post"]);

    queryPostMessageSocial.equalTo("objectId", postMessageSocial.id);
    //queryPostMessageSocial.select(PostMessageArray);


    //console.log("Request: " + JSON.stringify(request));
    //console.log("objectID: " + objectToSave.objectId);
    //console.log("objectID: " + objectToSave.user.objectId);


    queryPostMessageSocial.first({
        useMasterKey: true
        //sessionToken: sessionToken
    }).then((PostMessageSocialResult) => {

        let postMessageSocialACL = PostMessageSocialResult.getACL();
        //console.log("PostMessageSocialResult: " + JSON.stringify(PostMessageSocialResult));

        let USER = Parse.Object.extend("_User");
        let user = new USER();
        user = PostMessageSocialResult.get("user");
        //console.log("user: " + JSON.stringify(user));

        let CHANNEL = Parse.Object.extend("Channel");
        let channel = new CHANNEL();
        channel.id = PostMessageSocialResult.get("channel").id;
        //console.log("channel: " + JSON.stringify(channel));

        let WORKSPACE = Parse.Object.extend("WorkSpace");
        let workspace = new WORKSPACE();
        workspace.id = PostMessageSocialResult.get("workspace").id;
        //console.log("workspace: " + JSON.stringify(workspace));

        let POST = Parse.Object.extend("Post");
        let Post = new POST();
        let PostToSave = new POST();
        Post = PostMessageSocialResult.get("post");
        PostToSave.id = Post.id;
        //console.log("Post: " + JSON.stringify(Post));

        let POSTMESSAGE = Parse.Object.extend("PostMessage");
        let PostMessage = new POSTMESSAGE();
        if (PostMessageSocialResult.get("postMessage")) {
            PostMessage = PostMessageSocialResult.get("postMessage");
        }
        let PostMessageToSave = new POSTMESSAGE();
        if (PostMessageSocialResult.get("postMessage")) {
            PostMessageToSave.id = PostMessageSocialResult.get("postMessage").id;
        }

        let queryPostMessage = new Parse.Query(POSTMESSAGE);
        queryPostMessage.include( ["user"] );
        //queryPost.select(["user", "ACL", "media_duration", "postImage", "post_File", "audioWave", "archive", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url", "channel.name", "channel.type", "channel.archive", "post_title", "questionAnswerEnabled" /*,"transcript"*/]);
        queryPostMessage.equalTo("objectId", PostMessage.id);


        function updateAlgolia (cb) {

            //console.log("starting updateAlgolia: " + JSON.stringify(PostMessage));


            function updatePostMessagesAlgolia (cb2) {

                //console.log("starting updatePostMessagesAlgolia: ");


                    let indexCount = parseInt(PostMessageSocialResult.get("algoliaIndexID"));

                    /*PostMessageToSaveFinal.save(null, {

                        useMasterKey: true,
                        //sessionToken: sessionToken

                    }).then((PostMessageSaved) => {
                        // The object was retrieved successfully.
                        //console.log("Result from get " + JSON.stringify(Workspace));

                        console.log("done PostMessageSaved : " + JSON.stringify(PostMessageSaved));


                        return cb2 (null, PostMessageSaved);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return cb2(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });*/

                    PostMessage.save(null, {

                        useMasterKey: true,
                        sessionToken: sessionToken

                    }).then((PostMessageSaved) => {
                        // The object was retrieved successfully.
                        //console.log("Result from get " + JSON.stringify(Workspace));

                        //console.log("done PostMessageSaved : " + JSON.stringify(PostMessageSaved));


                        return cb2 (null, PostMessageSaved);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return cb2(error);
                    }, {

                        useMasterKey: true,
                        sessionToken: sessionToken

                    });

                    /*splitObjectAndIndex({'user':user, 'object':PostMessage.toJSON(), 'className':'PostMessageSocial', 'indexCount':indexCount, 'loop':false}, {
                        success: function(count) {

                            console.log("done updatePostMessagesAlgolia: " + JSON.stringify(count));


                            return cb2 (null, PostMessage);
                        },
                        error: function(error) {
                            return cb2 (error);
                        }
                    });*/



            }

            function updatePostsAlgolia (cb2) {

                //console.log("starting updatePostsAlgolia: " + JSON.stringify(Post));

                Post.save(null, {

                    useMasterKey: true,
                    sessionToken: sessionToken

                }).then((PostSaved) => {
                    // The object was retrieved successfully.
                    //console.log("Result from get " + JSON.stringify(Workspace));

                    //console.log("done PostSaved : " + JSON.stringify(PostSaved));


                    return cb2 (null, PostSaved);


                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return cb2(error);
                }, {

                    useMasterKey: true,
                    sessionToken: sessionToken

                });

                /*


                let POSTSOCIAL = Parse.Object.extend("PostSocial");
                let queryPostSocial = new Parse.Query(POSTSOCIAL);
                queryPostSocial.include(["workspace", "post", "channel", "user"]);

                queryPostSocial.equalTo("post", Post.id);
                //queryPostMessageSocial.select(PostMessageArray);


                queryPostSocial.first({
                    useMasterKey: true
                    //sessionToken: sessionToken
                }).then((PostSocialResult) => {

                    // let PostFinal = new POST();
                    let PostFinal = PostSocialResult.get("post");


                    let indexCount = parseInt(PostSocialResult.get("algoliaIndexID"));

                    splitObjectAndIndex({'user':user, 'object':PostFinal.toJSON(), 'className':'PostSocial', 'indexCount':indexCount, 'loop':false}, {
                        success: function(count) {

                            console.log("done updatePostsAlgolia: " + JSON.stringify(count));


                            return cb2 (null, PostSocialResult);
                        },
                        error: function(error) {
                            return cb2 (error);
                        }
                    });




                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    console.log(error);
                    return response.error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken
                });*/

            }

            async.parallel([
                async.apply(updatePostMessagesAlgolia),
                async.apply(updatePostsAlgolia)

            ], function (err, results_Final) {
                if (err) {
                    response.error(err);
                }

                //console.log("done updateAlgolia: " + JSON.stringify(results_Final.length));

                return cb (null, PostMessage);

            });


        }

        async.parallel([
            async.apply(updateAlgolia),

        ], function (err, results_Final) {
            if (err) {
                response.error(err);
            }

            //console.log("final waterfall: " + JSON.stringify(results_Final.length));

            let beforeSave_Time = process.hrtime(time);
            console.log(`afterSave PostMessageSocial took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1]) * MS_PER_NS} milliseconds`);

            response.success();
        });





         }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            console.log(error);
            return response.error(error);
        }, {

        useMasterKey: true
        //sessionToken: sessionToken
        });

});



// Run beforeSave functions to count number of workspace followers abd members
Parse.Cloud.beforeSave('workspace_follower', function(req, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let workspace_follower = req.object;
    //console.log("req beforeSave Workspace_follower: " + JSON.stringify(req));

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.005.beforeSave-workspace_follower.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    // test

    let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
    let WorkspaceFollower = new WORKSPACEFOLLOWER();
    WorkspaceFollower.id = workspace_follower.id;
    let queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);
    queryWorkspaceFollower.include(["user", "workspace"]);

    //let USER = Parse.Object.extend("_User");
    let user = new Parse.Object("_User");
    if (workspace_follower.get("user")) {

        user.id = workspace_follower.get("user").id;
        var userRolesRelation = user.relation("roles");
        //console.log("user beforeSave workspace_follower userRoleRelation: " + JSON.stringify(user));

    } else if (!workspace_follower.get("user")) {

        return response.error("please add _User it's required when adding new or updating workspace follower");
    }

    let queryMemberRole = new Parse.Query(Parse.Role);
    let queryfollowerRole = new Parse.Query(Parse.Role);


    // if there is a new workspace_follower object increase counter for number of followers and members on a workspace
    if (workspace_follower.isNew()) {

        let workspace = workspace_follower.get("workspace");

        //let WORKSPACE = Parse.Object.extend("WorkSpace");
        let Workspace = new Parse.Object("WorkSpace");
        Workspace.id = workspace.id;

        //let Channel = Parse.Object.extend("Channel");
        let Channel = new Parse.Object("Channel");

        let CHANNEL = Parse.Object.extend("Channel");
        let defaultChannelQuery = new Parse.Query(CHANNEL);
        defaultChannelQuery.equalTo("default", true);
        defaultChannelQuery.equalTo("workspace", Workspace);

        let memberName = "member-" + Workspace.id;
        let followerName = "Follower-" + Workspace.id;

        let workspaceFollowerName = workspace_follower.get("user").id + "-" + workspace_follower.get("workspace").id;
        //console.log("workspaceFollowerName user: " + JSON.stringify(workspaceFollowerName));

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
        if (!workspace_follower.get("notificationCount")) {
            workspace_follower.set("notificationCount", 0);
        }
        if (!workspace_follower.get("isNewWorkspace")) {
            workspace_follower.set("isNewWorkspace", false);
        }


        queryWorkspaceFollower.equalTo("name", workspaceFollowerName);

        // check to make sure that the workspace_follower for a user - workspace is unique
        queryWorkspaceFollower.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((results) => {

            if (results) {

                //Workspace_follower already exists in DB in Skill table, return an error because it needs to be unique
                let beforeSaveElse_Time = process.hrtime(time);
                console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                return response.error(results);

            } else {

                let previousQueryWorkspaceFollowerJoin = new Parse.Query(WORKSPACEFOLLOWER);
                previousQueryWorkspaceFollowerJoin.include("workspace");
                previousQueryWorkspaceFollowerJoin.equalTo("user", user);
                previousQueryWorkspaceFollowerJoin.equalTo("isSelected", true);

                function createDefaultChannelFollows (callback) {

                    if (!workspace_follower.get("isNewWorkspace") || workspace_follower.get("isNewWorkspace") === false) {

                        defaultChannelQuery.find({

                            useMasterKey: true
                            //sessionToken: sessionToken

                        }).then((defaultChannels) => {
                            // The object was retrieved successfully.

                            if (defaultChannels) {

                                async.map(defaultChannels, function (defaultChannelObject, cb) {

                                    //let ChannelFollower = Parse.Object.extend("ChannelFollow");
                                    let channelFollower = new Parse.Object("ChannelFollow");
                                    let ChannelObject = new Parse.Object("Channel");
                                    ChannelObject.id = defaultChannelObject.id;

                                    console.log("defaultChannelQuery: " + JSON.stringify(defaultChannelObject));

                                    channelFollower.set("archive", false);
                                    channelFollower.set("user", user);
                                    channelFollower.set("workspace", Workspace);
                                    channelFollower.set("channel", ChannelObject);
                                    channelFollower.set("notificationCount", 0);
                                    if (defaultChannelObject.get("name") === 'general') {
                                        channelFollower.set("isSelected", true);
                                    } else {
                                        channelFollower.set("isSelected", false);
                                    }

                                    channelFollower.set("isMember", true);
                                    channelFollower.set("isFollower", true);

                                    console.log("channelFollow final before save: " + JSON.stringify(channelFollower));


                                    channelFollower.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    }).then((result) => {

                                        // save was successful
                                        if(result) {

                                            //console.log("default channelFollow save from createDefaultChannelFollows: " + JSON.stringify(result));

                                            defaultChannelObject = result;

                                            return cb (null, defaultChannelObject);



                                        } else {

                                            defaultChannelObject = channelFollower;

                                            return cb (null, defaultChannelObject);

                                        }



                                    }, (error) => {
                                        // The object was not retrieved successfully.
                                        // error is a Parse.Error with an error code and message.
                                         return cb (error);
                                    }, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    });



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

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                    }
                    else if (workspace_follower.get("isNewWorkspace") === true) {

                        return callback (null, workspace_follower);
                    }

                }

                function addFollowerRole (callback) {

                    // now add follower since a member is by default a follower
                    queryfollowerRole.equalTo('name', followerName);

                    queryfollowerRole.first({

                        useMasterKey: true,
                        //sessionToken: sessionToken

                    }).then((followerRole) => {
                        // The object was retrieved successfully.

                        followerRole.getUsers().add(user);
                        followerRole.save(null, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                        console.log("followerRole: " + JSON.stringify(followerRole));


                        return callback (null, followerRole);

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback (error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                }

                function addMemberRole (callback) {

                    queryMemberRole.equalTo('name', memberName);
                    queryMemberRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((memberRole) => {
                        // The object was retrieved successfully.

                        //console.log("queryMemberRole result from query: "+JSON.stringify(memberRole));

                        memberRole.getUsers().add(user);
                        memberRole.save(null, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                        return callback (null, memberRole);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback (error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });


                }

                function removeAllPreviousSelectedWorkspaceFollowerJoin (callback) {

                    previousQueryWorkspaceFollowerJoin.find( {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((results) => {
                        // The object was retrieved successfully.

                        if (results) {

                            let previousWorkspaceFollowers = results;

                            // There is a previous workspace that was selected, need to return it so we can un-select that previous workspacefollower

                                console.log("removePreviousWorkspaceFollowSelected" );

                                // joining a workspace follower, so mark previous one as false
                                if (previousWorkspaceFollowers.length > 0) {

                                    console.log("marketing previous workspacefollow that isSelected to false: " +previousWorkspaceFollowers.length );

                                    async.map(previousWorkspaceFollowers, function (workspaceFollow, cb) {

                                        let workspace_Follow =  new WORKSPACEFOLLOWER();
                                        workspace_Follow.id = workspaceFollow.id;

                                        workspace_Follow.set("isSelected",false);
                                        workspace_Follow.set("user", workspaceFollow.get("user"));

                                        workspace_Follow.save(null, {

                                            useMasterKey: true
                                            //sessionToken: sessionToken
                                        });

                                        workspaceFollow = workspace_Follow;

                                        return cb (null, workspaceFollow);


                                    }, function (err, previousWorkspaceFollowers) {

                                        //console.log("defaultChannels length: " + JSON.stringify(defaultChannels.length));

                                        if (err) {
                                            return callback (err);
                                        } else {

                                            return callback (null, previousWorkspaceFollowers);


                                        }

                                    });



                                } else {

                                    return callback (null, previousWorkspaceFollowers);
                                }


                        } else {

                            // there was no workspace that was previously selected, return empty

                            return callback (null, results);
                        }



                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                }



                if (workspace_follower.get("isFollower") === true && workspace_follower.get("isMember") === true) {

                    if (workspace_follower.get("isNewWorkspace") === false || !workspace_follower.get("isNewWorkspace")) {

                        Workspace.increment("followerCount");
                        Workspace.increment("memberCount");


                    }
                    else if (workspace_follower.get("isNewWorkspace") === true) {

                        workspace_follower.set("isNewWorkspace", false);
                    }



                    // mark this workspace_follower as isSelected = true, set pointer to new workspace_follower then mark previous selected workspace to false in beforeSave user
                    workspace_follower.set("isSelected", true);

                    // a member is already a follower so only add member role for this user.

                    //console.log("workspace.isNew() user: " + JSON.stringify(user));


                    async.parallel([
                        async.apply(addFollowerRole),
                        async.apply(addMemberRole),
                        async.apply(createDefaultChannelFollows),
                        async.apply(removeAllPreviousSelectedWorkspaceFollowerJoin)

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

                            user.set("isWorkspaceUpdated", true);

                            user.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });

                            Workspace.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });


                            let beforeSaveElse_Time = process.hrtime(time);
                            console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                            response.success();

                        }
                    });


                }
                else if (workspace_follower.get("isFollower") === true && workspace_follower.get("isMember") === false) {
                    Workspace.increment("followerCount");
                    Workspace.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    // mark this workspace_follower as isSelected = true, set pointer to new workspace_follower then mark previous selected workspace to false in beforeSave user
                    workspace_follower.set("isSelected", true);

                    async.parallel([
                        async.apply(addFollowerRole),
                        async.apply(createDefaultChannelFollows),
                        async.apply(removeAllPreviousSelectedWorkspaceFollowerJoin)


                    ], function (err, results) {
                        if (err) {
                            response.error(err);
                        } else {

                            let followerRole = results[0];

                            if (followerRole) {
                                userRolesRelation.add(followerRole);
                            }

                            user.set("isWorkspaceUpdated", true);

                            user.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });

                            let beforeSaveElse_Time = process.hrtime(time);
                            console.log(`beforeSave workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                            response.success();

                        }
                    });


                }
                else if (workspace_follower.get("isFollower") === false && workspace_follower.get("isMember") === true) {
                    Workspace.increment("memberCount");
                    Workspace.increment("followerCount");
                    Workspace.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    // a member is already a follower so only add member role for this user.
                    workspace_follower.set("isFollower", true);

                    // mark this workspace_follower as isSelected = true, set pointer to new workspace_follower then mark previous selected workspace to false in beforeSave user
                    workspace_follower.set("isSelected", true);

                    async.parallel([
                        async.apply(addFollowerRole),
                        async.apply(addMemberRole),
                        async.apply(createDefaultChannelFollows),
                        async.apply(removeAllPreviousSelectedWorkspaceFollowerJoin)


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

                            user.set("isWorkspaceUpdated", true);

                            user.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });

                            let beforeSaveElse_Time = process.hrtime(time);
                            console.log(`beforeSave workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                            response.success();

                        }
                    });


                }
                else {

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSave_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

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

            useMasterKey: true
            //sessionToken: sessionToken

        });


    }
    else if (!workspace_follower.isNew() && (workspace_follower.dirty("isFollower") || workspace_follower.dirty("isMember"))) {

        let previousQueryWorkspaceFollowerJoin = new Parse.Query(WORKSPACEFOLLOWER);
        previousQueryWorkspaceFollowerJoin.include("workspace");
        previousQueryWorkspaceFollowerJoin.equalTo("user", user);
        previousQueryWorkspaceFollowerJoin.equalTo("isSelected", true);

        let previousQueryWorkspaceFollowerLeave = new Parse.Query(WORKSPACEFOLLOWER);
        previousQueryWorkspaceFollowerLeave.include("workspace");
        previousQueryWorkspaceFollowerLeave.equalTo("user", user);
        previousQueryWorkspaceFollowerLeave.equalTo("isSelected", false);
        previousQueryWorkspaceFollowerLeave.equalTo("isFollower", true);
        previousQueryWorkspaceFollowerLeave.descending("updatedAt");

        function getCurrentWorkspaceFollower (callback) {

            queryWorkspaceFollower.get(WorkspaceFollower.id, {

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((result) => {
                // The object was retrieved successfully.

                return callback (null, result);

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

        }

        function getPreviousSelectedWorkspaceFollowerJoin (callback) {

            previousQueryWorkspaceFollowerJoin.find( {

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((results) => {
                // The object was retrieved successfully.

                if (results) {

                    // There is a previous workspace that was selected, need to return it so we can un-select that previous workspacefollower
                    return callback (null, results);

                } else {

                    // there was no workspace that was previously selected, return empty

                    return callback (null, results);
                }



            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

        }

        function getPreviousSelectedWorkspaceFollowerLeave (callback) {

            previousQueryWorkspaceFollowerLeave.first( {

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((result) => {
                // The object was retrieved successfully.

                if (result) {

                    console.log("result from previousQueryWorkspaceFollowerLeave: " + JSON.stringify(result));

                    // There is a previous workspace that was selected, need to return it so we can un-select that previous workspacefollower
                    return callback (null, result);

                } else {

                    console.log("else result from previousQueryWorkspaceFollowerLeave: " + JSON.stringify(result));


                    // there was no workspace that was previously selected, return empty


                    return callback (null, result);
                }



            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

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

                let result = results[0]; // current workspace_follower that is in the DB

                let workspace = result.get("workspace");

                let WORKSPACE = Parse.Object.extend("WorkSpace");
                let Workspace = new WORKSPACE();
                Workspace.id = workspace.id;

                let Channel = new Parse.Object("Channel");

                let CHANNEL = Parse.Object.extend("Channel");
                let defaultChannelQuery = new Parse.Query(CHANNEL);
                defaultChannelQuery.equalTo("default", true);
                defaultChannelQuery.equalTo("workspace", Workspace);

                let memberName = "member-" + Workspace.id;
                let followerName = "Follower-" + Workspace.id;

                let currentWorkspaceFollower = new WORKSPACEFOLLOWER();
                currentWorkspaceFollower.id = results[0].id;
                currentWorkspaceFollower.set("user", results[0].get("user"));


                let previousWorkspaceFollowJoin = new WORKSPACEFOLLOWER();
                let previousWorkspaceFollowers = results[1];

                let previousWorkspaceFollowLeave = new WORKSPACEFOLLOWER();
                console.log("result-2: " + JSON.stringify(results[2]));

                if (results[2]) {
                    previousWorkspaceFollowLeave.id = results[2].id;
                    previousWorkspaceFollowLeave.set("user", results[2].get("user"));

                }

                console.log("workspace_follower result from query: " + JSON.stringify(result.get("name")));
                console.log("previousWorkspaceFollowJoin result from query length of array: " + JSON.stringify(previousWorkspaceFollowers.length));
                console.log("previousWorkspaceFollowLeave result from query: " + JSON.stringify(previousWorkspaceFollowLeave.id));

                let result_workspace = result.get("workspace");
                let workspaceACL = result_workspace.getACL();
                let workspaceFollowACLPrivate = result.getACL();

                //user = result.get("user");

                let expertWorkspaceRelation = Workspace.relation("experts");

                function addFollowerRole (callback) {

                    // now add follower since a member is by default a follower
                    queryfollowerRole.equalTo('name', followerName);

                    queryfollowerRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((followerRole) => {
                        // The object was retrieved successfully.

                        followerRole.getUsers().add(user);
                        followerRole.save(null, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                        console.log("followerRole: " + JSON.stringify(followerRole));


                        return callback (null, followerRole);

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback (error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                }

                function addMemberRole (callback) {

                    queryMemberRole.equalTo('name', memberName);
                    queryMemberRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((memberRole) => {
                        // The object was retrieved successfully.

                        //console.log("queryMemberRole result from query: "+JSON.stringify(memberRole));

                        memberRole.getUsers().add(user);
                        memberRole.save(null, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                        return callback (null, memberRole);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback (error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });


                }

                function removeFollowerRole (callback) {

                    // now add follower since a member is by default a follower
                    queryfollowerRole.equalTo('name', followerName);

                    queryfollowerRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((followerRole) => {
                        // The object was retrieved successfully.

                        followerRole.getUsers().remove(user);
                        followerRole.save(null, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                        console.log("followerRole: " + JSON.stringify(followerRole));


                        return callback (null, followerRole);

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback (error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                }

                function removeMemberRole (callback) {

                    queryMemberRole.equalTo('name', memberName);
                    queryMemberRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((memberRole) => {
                        // The object was retrieved successfully.

                        //console.log("queryMemberRole result from query: "+JSON.stringify(memberRole));

                        memberRole.getUsers().remove(user);
                        memberRole.save(null, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                        return callback (null, memberRole);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback (error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });


                }

                function createDefaultChannelFollows (callback) {

                    defaultChannelQuery.find({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((defaultChannels) => {
                        // The object was retrieved successfully.

                        if (defaultChannels) {

                            async.map(defaultChannels, function (channel, cb) {

                                let CHANNELFOLLOW = Parse.Object.extend("ChannelFollow");
                                let channelFollower = new CHANNELFOLLOW();

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

                                console.log("channelFollow: " + JSON.stringify(channelFollower));

                                channelFollower.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

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

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });
                }

                function removePreviousWorkspaceFollowSelected (callback) {

                    console.log("removePreviousWorkspaceFollowSelected" );


                    // joining a workspace follower, so mark previous one as false
                    if (previousWorkspaceFollowers.length > 0) {

                        console.log("marketing previous workspacefollow that isSelected to false: " +previousWorkspaceFollowers.length );

                        async.map(previousWorkspaceFollowers, function (workspaceFollow, cb) {

                            let workspace_Follow =  new WORKSPACEFOLLOWER();
                            workspace_Follow.id = workspaceFollow.id;

                            workspace_Follow.set("isSelected",false);
                            workspace_Follow.set("user", workspaceFollow.get("user"));

                            workspace_Follow.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken
                            });

                            workspaceFollow = workspace_Follow;

                            return cb (null, workspaceFollow);


                        }, function (err, previousWorkspaceFollowers) {

                            //console.log("defaultChannels length: " + JSON.stringify(defaultChannels.length));

                            if (err) {
                                return callback (err);
                            } else {

                                return callback (null, previousWorkspaceFollowers);


                            }

                        });



                    } else {

                        return callback (null, previousWorkspaceFollowers);
                    }


                }

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

                        if (workspace.get("type") === 'private' && workspaceACL) {

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



                        // if isFollower === false then isMember has to also be false. but we will check anyway
                        if ((result.get("isMember") === false || !result.get("isMember") ) && workspace_follower.get("isMember") === true) {

                            // user isFollow is true  && user isMember also true so make the user both a follower and member
                            Workspace.increment("memberCount");
                            console.log("increment  Member");

                            // create channelFollows for default channel for this new user

                            async.parallel([
                                async.apply(addFollowerRole),
                                async.apply(addMemberRole),
                                async.apply(createDefaultChannelFollows),
                                async.apply(removePreviousWorkspaceFollowSelected)

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

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    });

                                    Workspace.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken
                                    });

                                    let beforeSaveElse_Time = process.hrtime(time);
                                    console.log(`beforeSaveElse_Time workspace_Follower join took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                    response.success();

                                }
                            });


                        }
                        else if ((result.get("isMember") === false || !result.get("isMember") ) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                            // user isFollow is true but user is not a member, make user only follower

                            async.parallel([
                                async.apply(addFollowerRole),
                                async.apply(createDefaultChannelFollows),
                                async.apply(removePreviousWorkspaceFollowSelected)

                            ], function (err, results) {
                                if (err) {
                                    response.error(err);
                                } else {

                                    let followerRole = results[0];

                                    if (followerRole) {
                                        userRolesRelation.add(followerRole);
                                    }

                                    user.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    });

                                    Workspace.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken
                                    });

                                    let beforeSaveElse_Time = process.hrtime(time);
                                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                    response.success();

                                }
                            });




                        }
                        else if ((result.get("isMember") === true) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                            // user can't be a follower and not a member, keep him a member, sand make him a follower
                            workspace_follower.set("isMember", true);

                            async.parallel([
                                async.apply(addFollowerRole),
                                async.apply(createDefaultChannelFollows),
                                async.apply(removePreviousWorkspaceFollowSelected)


                            ], function (err, results) {
                                if (err) {
                                    response.error(err);
                                } else {

                                    let followerRole = results[0];

                                    if (followerRole) {
                                        userRolesRelation.add(followerRole);
                                    }

                                    user.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    });

                                    Workspace.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken
                                    });

                                    let beforeSaveElse_Time = process.hrtime(time);
                                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                    response.success();

                                }
                            });


                        }
                        else if (result.get("isMember") === true && workspace_follower.get("isMember") === true) {

                            // user can't be a member if he wasn't already a follower this really can't happen

                            Workspace.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken
                            });

                            let beforeSaveElse_Time = process.hrtime(time);
                            console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

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

                        if (workspace.get("type") === 'private' && workspaceACL) {

                            // check if this user is a Workspace owner then don't remove the ACL or he won't be able to come back to his Workspace

                            if (workspace.get("user").id === user.id) {

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

                        // joining a workspace follower, so mark previous one as selected true
                        if (previousWorkspaceFollowLeave) {
                            previousWorkspaceFollowLeave.set("isSelected", true);
                            user.set("isSelectedWorkspaceFollower", previousWorkspaceFollowLeave);

                            previousWorkspaceFollowLeave.set("user", user);

                            previousWorkspaceFollowLeave.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken
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

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    });

                                    Workspace.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken
                                    });

                                    let beforeSaveElse_Time = process.hrtime(time);
                                    console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                    response.success();

                                }
                            });

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

                                    user.set("isWorkspaceUpdated", true);



                                    user.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    });

                                    Workspace.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken
                                    });

                                    let beforeSaveElse_Time = process.hrtime(time);
                                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                    response.success();

                                }
                            });


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

                                    user.set("isWorkspaceUpdated", true);


                                    user.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    });

                                    Workspace.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken
                                    });

                                    let beforeSaveElse_Time = process.hrtime(time);
                                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                    response.success();

                                }
                            });

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

                                    user.set("isWorkspaceUpdated", true);


                                    user.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    });

                                    Workspace.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken
                                    });

                                    let beforeSaveElse_Time = process.hrtime(time);
                                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                    response.success();

                                }
                            });

                        }


                    }
                    else if (result.get("isFollower") === true && workspace_follower.get("isFollower") === true) {

                        // User was a follower and wants to stay a follower
                        if ((result.get("isMember") === false || !result.get("isMember") ) && workspace_follower.get("isMember") === true) {

                            // user wants to be a member now
                            Workspace.increment("memberCount");
                            console.log("increment  Member");

                            // now add both member only since user is already a follower
                            async.parallel([
                                async.apply(addMemberRole)

                            ], function (err, results) {
                                if (err) {
                                    response.error(err);
                                } else {

                                    let memberRole = results[0];

                                    if (memberRole) {
                                        userRolesRelation.add(memberRole);

                                    }

                                    user.set("isWorkspaceUpdated", true);


                                    user.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    });

                                    Workspace.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken
                                    });

                                    let beforeSaveElse_Time = process.hrtime(time);
                                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                    response.success();

                                }
                            });


                        }
                        else if ((result.get("isMember") === false || !result.get("isMember") ) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                            // do nothing since isMember and isFollower did not change

                            let beforeSaveElse_Time = process.hrtime(time);
                            console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                            response.success();

                        }
                        else if ((result.get("isMember") === true) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                            // user want's to stay as a follower but removed as member
                            Workspace.increment("memberCount", -1);
                            console.log("decrement Member");

                            async.parallel([
                                async.apply(removeMemberRole)

                            ], function (err, results) {
                                if (err) {
                                    response.error(err);
                                } else {

                                    let memberRole = results[0];

                                    if (memberRole) {
                                        userRolesRelation.remove(memberRole);

                                    }

                                    user.set("isWorkspaceUpdated", true);


                                    user.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    });

                                    Workspace.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken
                                    });

                                    let beforeSaveElse_Time = process.hrtime(time);
                                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                    response.success();

                                }
                            });

                        }
                        else if (result.get("isMember") === true && workspace_follower.get("isMember") === true) {

                            // do nothing since isMember and isFollower did not change

                            let beforeSaveElse_Time = process.hrtime(time);
                            console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

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


                            if (workspace.get("type") === 'private' && workspaceACL) {

                                // if channel is private add user ACL so he/she has access to the private channel or channelfollow

                                workspaceACL.setReadAccess(user, true);
                                workspaceACL.setWriteAccess(user, true);
                                Workspace.setACL(workspaceACL);

                                // set correct ACL for channelFollow

                                workspaceFollowACLPrivate.setReadAccess(user, true);
                                workspaceFollowACLPrivate.setWriteAccess(user, true);

                                workspace_follower.setACL(workspaceFollowACLPrivate);

                            }

                            // joining a workspace follower, so mark previous one as false
                            /*if (previousWorkspaceFollowJoin.length > 0) {

                                for (var i = 0; i < previousWorkspaceFollowers.length; i++) {

                                    previousWorkspaceFollowJoin.id = previousWorkspaceFollowers[i].id;

                                    previousWorkspaceFollowJoin.set("isSelected", false);

                                    previousWorkspaceFollowJoin.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken
                                    });

                                }


                            }*/

                            // set isSelected for this workspace_follower to true
                            workspace_follower.set("isSelected", true);
                            user.set("isSelectedWorkspaceFollower", workspace_follower);

                            // now add both member and follower roles
                            async.parallel([
                                async.apply(addFollowerRole),
                                async.apply(addMemberRole),
                                async.apply(createDefaultChannelFollows),
                                async.apply(removePreviousWorkspaceFollowSelected)


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

                                    user.set("isWorkspaceUpdated", true);


                                    user.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    });

                                    Workspace.save(null, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken
                                    });

                                    let beforeSaveElse_Time = process.hrtime(time);
                                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                                    response.success();

                                }
                            });


                        }
                        else if ((result.get("isMember") === false || !result.get("isMember") ) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                            // do nothing since isMember and isFollower did not change

                            let beforeSaveElse_Time = process.hrtime(time);
                            console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                            response.success();


                        }
                        else if ((result.get("isMember") === true) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                            // user was a member but now is not a member or follower - note this case can't happen because he will always be a follower if he is a member
                            let beforeSaveElse_Time = process.hrtime(time);
                            console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                            response.success();

                        }
                        else if (result.get("isMember") === true && workspace_follower.get("isMember") === true) {

                            // do nothing since isMember and isFollower did not change

                            let beforeSaveElse_Time = process.hrtime(time);
                            console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                            response.success();


                        }

                    }


                }
                else if (workspace_follower.dirty("isFollower") && !workspace_follower.dirty("isMember")) {

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                    response.error("Please enter both isFollower and isMember when updating either member of follower.");

                }
                else if (!workspace_follower.dirty("isFollower") && workspace_follower.dirty("isMember")) {

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                    response.error("Please enter both isFollower and isMember when updating either member of follower.");

                }
                else {

                    // isMember and isFollower not updated, return success.
                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                    response.success();
                }

            }

        });


    }
    else {

        console.log("do nothing at all");

        let beforeSaveElse_Time = process.hrtime(time);
        console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

        response.success();

    }

}, {useMasterKey: true});

// Run beforeSave functions to count number of channel followers and members
Parse.Cloud.beforeSave('ChannelFollow', function(req, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let channelfollow = req.object;

    let CHANNEL = Parse.Object.extend("Channel");
    let channel = new CHANNEL();

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();

    let USER = Parse.Object.extend("_User");
    let user = new USER();

    //console.log("channel: " + JSON.stringify(channel));
    //console.log("req.user: " + JSON.stringify(req.user));

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.001.beforeSave-ChannelFollow.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let queryChannelFollow = new Parse.Query("ChannelFollow");
    let queryChannel = new Parse.Query(CHANNEL);

    //console.log("post: " + JSON.stringify(channelfollow));

    // if there is a post that got added, then increase counter, else ignoremyObject
    if (channelfollow.isNew()) {

        if (!channelfollow.get("channel")) {
            return response.error("Channel is required.");
        }
        if (!channelfollow.get("user")) {
            return response.error("User who is the channel creator is required when creating a new channel");
        }
        if (!channelfollow.get("workspace")) {
            return response.error("Workspace is required when creating a new channel");
        }



        let channelFollowName = channelfollow.get("user").id + "-" + channelfollow.get("workspace").id + "-" + channelfollow.get("channel").id;
        console.log("channelFollowName user: " + JSON.stringify(channelFollowName));

        queryChannelFollow.equalTo("name", channelFollowName);
        queryChannelFollow.include(["user", "workspace", "channel"]);


        // check to make sure that the workspace_follower for a user - workspace is unique
        queryChannelFollow.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((results) => {
            // The object was retrieved successfully.

            if (results) {

                //channelfollow already exists in db, return an error because it needs to be unique
                console.log("channelfollow already exists in db, return an error because it needs to be unique");
                response.error(results);

            } else {


                if (!channelfollow.get("archive")) {
                    channelfollow.set("archive", false);
                }
                if (!channelfollow.get("notificationCount")) {
                    channelfollow.set("notificationCount", 0);
                }

                channel.id = channelfollow.get("channel").id;

                workspace.id = channelfollow.get("workspace").id;

                user.id = channelfollow.get("user").id;

                console.log("channel, workspace and user: " + JSON.stringify(channel) + JSON.stringify(workspace) + JSON.stringify(user));

                queryChannel.get(channel.id, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((channelObject) => {
                    // The object was retrieved successfully.

                    //let user = channelfollow.get("user");

                    //let Channel = channelObject;

                    if(!channelfollow.get("isNewChannel")) {

                        if (channelObject.get("name") === 'general') {

                            channelfollow.set("isNewChannel", true);

                        } else {
                            channelfollow.set("isNewChannel", false);

                        }

                    }

                    let OWNERUSER = Parse.Object.extend("_User");
                    let ownerUser = new OWNERUSER();
                    ownerUser.id = channelObject.get("user").id;

                    //let ownerChannel = Channel.get("user");
                    console.log("channelType: " + JSON.stringify(channelObject.get("type")));

                    function addExpertsArrayToChannel (callback) {

                        if (channelfollow.get("isNewChannel") === true) {


                            return callback (null, channelObject);
                        } else if (channelfollow.get("isNewChannel") === false || !channelfollow.get("isNewChannel")) {

                            //var userRole = user.get("roles");
                            user.fetch(user.id, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            }).then((User) => {
                                // The object was retrieved successfully.

                                console.log("user object: " + JSON.stringify(User));
                                let userRoleRelation = User.relation("roles");
                                //let expertChannelRelation = channelObject.relation("experts");
                                console.log("userRole: " + JSON.stringify(userRoleRelation));
                                //console.log("expertChannelRelation: " + JSON.stringify(expertChannelRelation));


                                let expertRoleName = "expert-" + workspace.id;

                                let userRoleRelationQuery = userRoleRelation.query();
                                userRoleRelationQuery.equalTo("name", expertRoleName);
                                userRoleRelationQuery.first({

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                }).then((results) => {
                                    // The object was retrieved successfully.

                                    if (results) {

                                        // expert role exists, add as channel expert
                                        //console.log("channelExpert: " + JSON.stringify(results));


                                        let expertOwner = simplifyUser(User);


                                        channelObject.addUnique("expertsArray", expertOwner);
                                        //expertChannelRelation.add(user);

                                        /*channelObject.save(null, {

                                         useMasterKey: true
                                         //sessionToken: sessionToken

                                         }
                                         );*/

                                        //expertChannelRelation.add(user);

                                        console.log("addExpertsArrayToChannel channel in beforeSave ChannelFollow: " + JSON.stringify(channelObject));


                                        return callback (null, channelObject);



                                    }
                                    else {
                                        // no role exists don't add experts to channel

                                        console.log("userRoleRelationQuery no result");


                                        return callback (null, channel);
                                    }
                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("userRoleRelationQuery no result");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            }, (error) => {
                                // The object was not retrieved successfully.
                                // error is a Parse.Error with an error code and message.
                                console.log("userRoleRelationQuery no result");
                                return callback (error);
                            }, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });


                        }


                    }

                    function updateFollowersInChannel (callback) {

                        function removeAllPreviousSelectedChannelFollowerJoin (callback) {

                            let queryChannelFollowIsSelected = new Parse.Query("ChannelFollow");
                            queryChannelFollowIsSelected.equalTo("user", user);
                            //queryChannelFollowIsSelected.equalTo("channel", Channel);
                            queryChannelFollowIsSelected.equalTo("workspace", workspace);
                            queryChannelFollowIsSelected.equalTo("isSelected", true);

                            queryChannelFollowIsSelected.find({

                                useMasterKey: true
                                //sessionToken: sessionToken

                            }).then((results) => {
                                // The object was retrieved successfully.

                                if (results) {

                                    let previousChannelFollowers = results;

                                    // There is a previous workspace that was selected, need to return it so we can un-select that previous workspacefollower

                                    console.log("removePreviousWorkspaceFollowSelected" );

                                    // joining a workspace follower, so mark previous one as false
                                    if (previousChannelFollowers.length > 0) {

                                        console.log("marketing previous workspacefollow that isSelected to false: " +previousChannelFollowers.length );

                                        async.map(previousChannelFollowers, function (channelFollow, cb) {

                                            let CHANNELFOLLOW = Parse.Object.extend("ChannelFollow");
                                            let channel_follow =  new CHANNELFOLLOW();
                                            channel_follow.id = channelFollow.id;

                                            channel_follow.set("isSelected",false);
                                            //channel_follow.set("user", workspaceFollow.get("user"));

                                            channel_follow.save(null, {

                                                useMasterKey: true
                                                //sessionToken: sessionToken
                                            });

                                            channelFollow = channel_follow;

                                            return cb (null, channelFollow);


                                        }, function (err, previousChannelFollowers) {

                                            //console.log("previousChannelFollowers length: " + JSON.stringify(previousChannelFollowers.length));

                                            if (err) {
                                                return callback (err);
                                            } else {

                                                return callback (null, previousChannelFollowers);


                                            }

                                        });



                                    } else {

                                        return callback (null, previousChannelFollowers);
                                    }


                                } else {

                                    // there was no workspace that was previously selected, return empty

                                    return callback (null, results);
                                }



                            }, (error) => {
                                // The object was not retrieved successfully.
                                // error is a Parse.Error with an error code and message.
                                return callback(error);
                            }, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });

                        }

                        function updateAlgoliaUserMentionIndex (callback) {

                            user.set("isChannelUpdated", true);

                            user.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });

                            return callback (null, user);


                        }

                        channelfollow.set("name", channelFollowName);
                        //console.log("Channel.getACL(): " + JSON.stringify(Channel.getACL()));

                        let channelACL = channelObject.getACL();
                        let channelFollowACLPrivate = channelACL;
                        let channelFollowACL = new Parse.ACL();

                        // If this is a private channel, set ACL for owner to read and write
                        if (channelObject.get("type") === 'private') {

                            var adminRolePrivate = new Parse.Role();
                            var adminNamePrivate = 'admin-' + workspace.id;
                            adminRolePrivate.set("name", adminNamePrivate);

                            channelACL.setReadAccess(user, true);
                            channelACL.setWriteAccess(user, true);
                            channel.setACL(channelACL);

                            // set correct ACL for channelFollow
                            //channelFollowACL.setPublicReadAccess(false);
                            //channelFollowACL.setPublicWriteAccess(false);
                            channelFollowACLPrivate.setReadAccess(user, true);
                            channelFollowACLPrivate.setWriteAccess(user, true);
                            //channelFollowACL.setReadAccess(ownerChannel, true);
                            //channelFollowACL.setWriteAccess(ownerChannel, true);
                            channelfollow.setACL(channelFollowACLPrivate);

                            if (channelfollow.get("isFollower") === true && channelfollow.get("isMember") === true) {
                                channel.increment("followerCount");
                                channel.increment("memberCount");



                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);


                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)

                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });


                            }
                            else if (channelfollow.get("isFollower") === true && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {
                                channel.increment("followerCount");


                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)

                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });



                            }
                            else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && channelfollow.get("isMember") === true) {
                                // a member is by default always a follower.
                                channel.increment("memberCount");
                                channel.increment("followerCount");

                                channelfollow.set("isFollower", true);
                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            }
                            else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                return response.error("Please set isFollower:true or isMember:true since one if required.");

                            }
                            else {

                                return callback (null, channel);

                            }

                        }
                        else if (channelObject.get("type") === 'privateMembers') {

                            // get member role for this workspace
                            //var queryMemberRole = new Parse.Query(Parse.Role);
                            var memberRole = new Parse.Role();
                            var memberName = 'member-' + workspace.id;
                            memberRole.set("name", memberName);

                            // set correct ACL for channelFollow
                            channelFollowACL.setPublicReadAccess(false);
                            channelFollowACL.setPublicWriteAccess(false);
                            channelFollowACL.setReadAccess(memberRole, true);
                            channelFollowACL.setWriteAccess(memberRole, false);
                            channelFollowACL.setReadAccess(user, true);
                            channelFollowACL.setWriteAccess(user, true);
                            channelFollowACL.setReadAccess(ownerUser, true);
                            channelFollowACL.setWriteAccess(ownerUser, true);
                            channelfollow.setACL(channelFollowACL);

                            if (channelfollow.get("isFollower") === true && channelfollow.get("isMember") === true) {
                                channel.increment("followerCount");
                                channel.increment("memberCount");


                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            }
                            else if (channelfollow.get("isFollower") === true && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {
                                channel.increment("followerCount");


                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            }
                            else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && channelfollow.get("isMember") === true) {
                                // a member is by default always a follower.
                                channel.increment("memberCount");
                                channel.increment("followerCount");
                                channelfollow.set("isFollower", true);

                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            }
                            else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                return response.error("Please set isFollower:true or isMember:true since one if required.");

                            }
                            else {

                                return callback (null, channel);

                            }




                        }
                        else if (channelObject.get("type") === 'privateExperts') {

                            // get expert role for this workspace
                            var expertRole = new Parse.Role();
                            var expertName = 'expert-' + workspace.id;
                            expertRole.set("name", expertName);

                            // set correct ACL for channelFollow
                            channelFollowACL.setPublicReadAccess(false);
                            channelFollowACL.setPublicWriteAccess(false);
                            channelFollowACL.setReadAccess(expertRole, true);
                            channelFollowACL.setWriteAccess(expertRole, false);
                            channelFollowACL.setReadAccess(user, true);
                            channelFollowACL.setWriteAccess(user, true);
                            channelFollowACL.setReadAccess(ownerUser, true);
                            channelFollowACL.setWriteAccess(ownerUser, true);
                            channelfollow.setACL(channelFollowACL);

                            if (channelfollow.get("isFollower") === true && channelfollow.get("isMember") === true) {
                                channel.increment("followerCount");
                                channel.increment("memberCount");

                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            }
                            else if (channelfollow.get("isFollower") === true && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {
                                channel.increment("followerCount");
                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                if (ChannelFollowIsSelected) {

                                    channelFollowIsSelectedSave.set("isSelected", false);
                                    channelFollowIsSelectedSave.save(null, {

                                            useMasterKey: true
                                            //sessionToken: sessionToken
                                        }
                                    );

                                }
                                return callback (null, channel);

                            } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && channelfollow.get("isMember") === true) {
                                // a member is by default always a follower.
                                channel.increment("memberCount");
                                channel.increment("followerCount");
                                channelfollow.set("isFollower", true);
                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                return response.error("Please set isFollower:true or isMember:true since one if required.");

                            } else {

                                return callback (null, channel);
                            }



                        }
                        else if (channelObject.get("type") === 'privateAdmins') {

                            // get admin role for this workspace
                            var adminRole = new Parse.Role();
                            var adminName = 'expert-' + workspace.id;
                            adminRole.set("name", adminName);

                            // set correct ACL for channelFollow
                            channelFollowACL.setPublicReadAccess(false);
                            channelFollowACL.setPublicWriteAccess(false);
                            channelFollowACL.setReadAccess(adminRole, true);
                            channelFollowACL.setWriteAccess(adminRole, false);
                            channelFollowACL.setReadAccess(user, true);
                            channelFollowACL.setWriteAccess(user, true);
                            channelFollowACL.setReadAccess(ownerUser, true);
                            channelFollowACL.setWriteAccess(ownerUser, true);
                            channelfollow.setACL(channelFollowACL);

                            if (channelfollow.get("isFollower") === true && channelfollow.get("isMember") === true) {
                                channel.increment("followerCount");
                                channel.increment("memberCount");
                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });
                            } else if (channelfollow.get("isFollower") === true && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {
                                channel.increment("followerCount");
                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && channelfollow.get("isMember") === true) {
                                // a member is by default always a follower.
                                channel.increment("memberCount");
                                channel.increment("followerCount");
                                channelfollow.set("isFollower", true);
                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                return response.error("Please set isFollower:true or isMember:true since one if required.");

                            } else {

                                return callback (null, channel);

                            }




                        }
                        else if (channelObject.get("type") === 'privateModerators') {

                            // get moderator role for this workspace
                            var moderatorRole = new Parse.Role();
                            var moderatorName = 'expert-' + workspace.id;
                            moderatorRole.set("name", moderatorName);

                            // set correct ACL for channelFollow
                            channelFollowACL.setPublicReadAccess(false);
                            channelFollowACL.setPublicWriteAccess(false);
                            channelFollowACL.setReadAccess(moderatorRole, true);
                            channelFollowACL.setWriteAccess(moderatorRole, false);
                            channelFollowACL.setReadAccess(user, true);
                            channelFollowACL.setWriteAccess(user, true);
                            channelFollowACL.setReadAccess(ownerUser, true);
                            channelFollowACL.setWriteAccess(ownerUser, true);
                            channelfollow.setACL(channelFollowACL);

                            if (channelfollow.get("isFollower") === true && channelfollow.get("isMember") === true) {
                                channel.increment("followerCount");
                                channel.increment("memberCount");
                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if (channelfollow.get("isFollower") === true && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {
                                channel.increment("followerCount");

                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                if (ChannelFollowIsSelected) {

                                    channelFollowIsSelectedSave.set("isSelected", false);
                                    channelFollowIsSelectedSave.save(null, {

                                            useMasterKey: true
                                            //sessionToken: sessionToken
                                        }
                                    );

                                }
                                return callback (null, channel);

                            } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && channelfollow.get("isMember") === true) {
                                // a member is by default always a follower.
                                channel.increment("memberCount");
                                channel.increment("followerCount");
                                channelfollow.set("isFollower", true);
                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                response.error("Please set isFollower:true or isMember:true since one if required.");

                            } else {

                                return callback (null, channel);
                            }



                        }
                        else if (channelObject.get("type") === 'privateOwners') {

                            // get owner role for this workspace
                            var ownerRole = new Parse.Role();
                            var ownerName = 'expert-' + workspace.id;
                            ownerRole.set("name", ownerName);

                            // set correct ACL for channelFollow
                            channelFollowACL.setPublicReadAccess(false);
                            channelFollowACL.setPublicWriteAccess(false);
                            channelFollowACL.setReadAccess(ownerRole, true);
                            channelFollowACL.setWriteAccess(ownerRole, false);
                            channelFollowACL.setReadAccess(user, true);
                            channelFollowACL.setWriteAccess(user, true);
                            channelFollowACL.setReadAccess(ownerUser, true);
                            channelFollowACL.setWriteAccess(ownerUser, true);
                            channelfollow.setACL(channelFollowACL);

                            if (channelfollow.get("isFollower") === true && channelfollow.get("isMember") === true) {
                                channel.increment("followerCount");
                                channel.increment("memberCount");
                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if (channelfollow.get("isFollower") === true && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {
                                channel.increment("followerCount");
                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                ChannelFollowIsSelected("isSelected", false);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && channelfollow.get("isMember") === true) {
                                // a member is by default always a follower.
                                channel.increment("memberCount");
                                channel.increment("followerCount");
                                channelfollow.set("isFollower", true);
                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                return response.error("Please set isFollower:true or isMember:true since one if required.");

                            } else {

                                return callback (null, channel);

                            }




                        }
                        else if (channelObject.get("type") === "public") {

                            // do nothing, since ACL will be public read/write by default
                            channelFollowACL.setPublicReadAccess(true);
                            channelFollowACL.setPublicWriteAccess(false);
                            channelFollowACL.setReadAccess(ownerUser, true);
                            channelFollowACL.setWriteAccess(ownerUser, true);
                            channelFollowACL.setReadAccess(user, true);
                            channelFollowACL.setWriteAccess(user, true);
                            channelfollow.setACL(channelFollowACL);

                            if (channelfollow.get("isFollower") === true && channelfollow.get("isMember") === true) {
                                channel.increment("followerCount");
                                channel.increment("memberCount");


                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            }
                            else if (channelfollow.get("isFollower") === true && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {
                                channel.increment("followerCount");
                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            }
                            else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && channelfollow.get("isMember") === true) {
                                // a member is by default always a follower.
                                channel.increment("memberCount");
                                channel.increment("followerCount");
                                channelfollow.set("isFollower", true);
                                // set isSelected for this channel to true and set previous channel that was selected to false
                                channelfollow.set("isSelected", true);
                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {

                                        return callback (null, channel);

                                    } else {

                                        return callback (null, channel);
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return callback (error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            }
                            else if ((channelfollow.get("isFollower") === false || !channelfollow.get("isFollower")) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                return response.error("Please set isFollower:true or isMember:true since one if required.");

                            }
                            else {

                                return callback (null, channel);

                            }


                        }
                        else if (channelObject.get("type") !== 'private' || channelObject.get("type") !== 'public' || channelObject.get("type") !== 'privateOwners' || channelObject.get("type") !== 'privateModerators' || channelObject.get("type") !== 'privateAdmins' || channelObject.get("type") !== 'privateExperts' || channelObject.get("type") !== 'privateMembers') {

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
                            response.error("Channel type field is needs to be one of the following: private, public, privateOwners, privateModerators,  privateAdmins, privateExperts, privateMembers");
                        }


                    }



                    async.parallel([
                        async.apply(addExpertsArrayToChannel),
                        async.apply(updateFollowersInChannel)

                    ], function (err, results) {
                        if (err) {
                            response.error(err);
                        }

                        if (channelfollow.get("isNewChannel") === true) {

                            if (channelfollow.get("isNewChannel") === true) {

                                channelfollow.set("isNewChannel", false);

                            }

                            let beforeSave_Time = process.hrtime(time);
                            console.log(`beforeSave_Time ChannelFollow took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1]) * MS_PER_NS} milliseconds`);

                            response.success();

                        }
                        else if (channelfollow.get("isNewChannel") === false) {


                            let FinalChannelToSave = Parse.Object.extend("Channel");
                            let finalChannelToSave = new FinalChannelToSave();
                            finalChannelToSave.id = channel.id;

                            let FIRSTCHANNELRESULT = Parse.Object.extend("Channel");
                            let firstChannelResult = new Parse.Object(FIRSTCHANNELRESULT);
                            firstChannelResult = results[0];

                            let SecondChannelResult = Parse.Object.extend("Channel");
                            let secondChannelResult = new SecondChannelResult();
                            secondChannelResult = results[1];

                            console.log("firstChannelResult: " + JSON.stringify(firstChannelResult));
                            console.log("secondChannelResult: " + JSON.stringify(secondChannelResult));

                            if (firstChannelResult) {

                                if (firstChannelResult.get("expertsArray")) {

                                    finalChannelToSave.set("expertsArray", firstChannelResult.toJSON().expertsArray);
                                    console.log("expertsArray: " + JSON.stringify(firstChannelResult.toJSON().expertsArray));

                                }
                            }

                            if (secondChannelResult) {

                                if (secondChannelResult.get("followerCount")) {
                                    finalChannelToSave.set("followerCount", secondChannelResult.toJSON().followerCount);
                                }
                                if (secondChannelResult.get("memberCount")) {

                                    finalChannelToSave.set("memberCount", secondChannelResult.toJSON().memberCount);


                                }

                            }

                            console.log("Channel async.Parallels: " + JSON.stringify(finalChannelToSave));

                            finalChannelToSave.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });

                            let beforeSave_Time = process.hrtime(time);
                            console.log(`beforeSave_Time ChannelFollow took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1]) * MS_PER_NS} milliseconds`);

                            response.success();

                        }



                    });




                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    console.log("channelQuery not found");
                    response.error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });
            }

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            console.log("channelFollowQuery not found");
            response.error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });


    }
    else if (!channelfollow.isNew() && (channelfollow.dirty("isFollower") || channelfollow.dirty("isMember"))) {

        console.log("channelfollow.id: " + JSON.stringify(channelfollow.id));

        queryChannelFollow.include(["user", "workspace", "channel"]);
        queryChannelFollow.get(channelfollow.id, {

            useMasterKey: true
            //sessionToken: sessionToken

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

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((results) => {
                // The object was retrieved successfully.

                if (results) {

                    function removeAllPreviousSelectedChannelFollowerJoin (callback) {

                        let queryChannelFollowIsSelected = new Parse.Query("ChannelFollow");
                        queryChannelFollowIsSelected.equalTo("user", user);
                        //queryChannelFollowIsSelected.equalTo("channel", Channel);
                        queryChannelFollowIsSelected.equalTo("workspace", workspace);
                        queryChannelFollowIsSelected.equalTo("isSelected", true);

                        queryChannelFollowIsSelected.find({

                            useMasterKey: true
                            //sessionToken: sessionToken

                        }).then((channelFollowersResult) => {
                            // The object was retrieved successfully.

                            if (channelFollowersResult) {

                                let previousChannelFollowers = channelFollowersResult;

                                // There is a previous workspace that was selected, need to return it so we can un-select that previous workspacefollower

                                console.log("removePreviousWorkspaceFollowSelected" );

                                // joining a workspace follower, so mark previous one as false
                                if (previousChannelFollowers.length > 0) {

                                    console.log("marketing previous workspacefollow that isSelected to false: " +previousChannelFollowers.length );

                                    async.map(previousChannelFollowers, function (channelFollow, cb) {

                                        let CHANNELFOLLOW = Parse.Object.extend("ChannelFollow");
                                        let channel_follow =  new CHANNELFOLLOW();
                                        channel_follow.id = channelFollow.id;

                                        channel_follow.set("isSelected",false);
                                        //channel_follow.set("user", workspaceFollow.get("user"));

                                        channel_follow.save(null, {

                                            useMasterKey: true
                                            //sessionToken: sessionToken
                                        });

                                        channelFollow = channel_follow;

                                        return cb (null, channelFollow);


                                    }, function (err, previousChannelFollowers) {

                                        //console.log("previousChannelFollowers length: " + JSON.stringify(previousChannelFollowers.length));

                                        if (err) {
                                            return callback (err);
                                        } else {

                                            return callback (null, previousChannelFollowers);


                                        }

                                    });



                                } else {

                                    return callback (null, previousChannelFollowers);
                                }


                            } else {

                                // there was no workspace that was previously selected, return empty

                                return callback (null, channelFollowersResult);
                            }



                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            return callback(error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                    }

                    function updateAlgoliaUserMentionIndex (callback) {

                        user.set("isChannelUpdated", true);

                        user.save(null, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                        return callback (null, user);


                    }

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


                            // if isFollower === false then isMember has to also be false. but we will check anyway
                            if ((result.get("isMember") === false || !result.get("isMember") ) && channelfollow.get("isMember") === true) {

                                // user isFollow is true  && user isMember also true so make the user both a follower and member
                                Channel.increment("memberCount");
                                console.log("increment  Member");

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)

                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });



                            } else if ((result.get("isMember") === false || !result.get("isMember") ) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                // user isFollow is true but user is not a member, make user only follower

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if ((result.get("isMember") === true) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                // user can't be a follower and not a member, keep him a member, sand make him a follower
                                channelfollow.set("isMember", true);

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if (result.get("isMember") === true && channelfollow.get("isMember") === true) {

                                // user can't be a member if he wasn't already a follower this really can't happen

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

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

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    //console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if ((result.get("isMember") === false || !result.get("isMember") ) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                // user is not a member, was a follower and now wants to un-follow

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    //console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if ((result.get("isMember") === true) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                // user was a follower and member and now wants to both un-follow and not be a member anymore
                                Channel.increment("memberCount", -1);
                                console.log("decrement Member");

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    //console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if (result.get("isMember") === true && channelfollow.get("isMember") === true) {

                                // user can't stay a member since he is un-following this workspace so make him not a member
                                channelfollow.set("isMember", false);
                                Channel.increment("memberCount", -1);
                                console.log("decrement Member");

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    //console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            }

                        }
                        else if (result.get("isFollower") === true && channelfollow.get("isFollower") === true) {

                            // User was a follower and wants to stay a follower
                            if ((result.get("isMember") === false || !result.get("isMember") ) && channelfollow.get("isMember") === true) {

                                // user wants to be a member now
                                Channel.increment("memberCount");
                                console.log("increment  Member");

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
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

                                    useMasterKey: true
                                    //sessionToken: sessionToken
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


                                // user wants to be a member now
                                Channel.increment("memberCount");
                                console.log("increment  Member");

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)

                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });


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
                else {
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


                            // if isFollower === false then isMember has to also be false. but we will check anyway
                            if ((result.get("isMember") === false || !result.get("isMember") ) && channelfollow.get("isMember") === true) {

                                // user isFollow is true  && user isMember also true so make the user both a follower and member
                                Channel.increment("memberCount");
                                console.log("increment  Member");

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)

                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if ((result.get("isMember") === false || !result.get("isMember") ) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                // user isFollow is true but user is not a member, make user only follower

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if ((result.get("isMember") === true) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                // user can't be a follower and not a member, keep him a member, sand make him a follower
                                channelfollow.set("isMember", true);

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if (result.get("isMember") === true && channelfollow.get("isMember") === true) {

                                // user can't be a member if he wasn't already a follower this really can't happen

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

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

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if ((result.get("isMember") === false || !result.get("isMember") ) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                // user is not a member, was a follower and now wants to un-follow

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if ((result.get("isMember") === true) && (channelfollow.get("isMember") === false || !channelfollow.get("isMember"))) {

                                // user was a follower and member and now wants to both un-follow and not be a member anymore
                                Channel.increment("memberCount", -1);
                                console.log("decrement Member");

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            } else if (result.get("isMember") === true && channelfollow.get("isMember") === true) {

                                // user can't stay a member since he is un-following this workspace so make him not a member
                                channelfollow.set("isMember", false);
                                Channel.increment("memberCount", -1);
                                console.log("decrement Member");

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(updateAlgoliaUserMentionIndex)


                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            }

                        }  else if (result.get("isFollower") === true && channelfollow.get("isFollower") === true) {

                            // User was a follower and wants to stay a follower
                            if ((result.get("isMember") === false || !result.get("isMember") ) && channelfollow.get("isMember") === true) {

                                // user wants to be a member now
                                Channel.increment("memberCount");
                                console.log("increment  Member");

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
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

                                    useMasterKey: true
                                    //sessionToken: sessionToken
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

                                // user wants to be a member now
                                Channel.increment("memberCount");
                                console.log("increment  Member");

                                Channel.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                });

                                async.parallel([
                                    async.apply(removeAllPreviousSelectedChannelFollowerJoin),
                                    async.apply(updateAlgoliaUserMentionIndex)

                                ], function (err, results) {
                                    if (err) {
                                        response.error(err);
                                    }

                                    if (results) {


                                        response.success();

                                    } else {

                                        response.success();
                                    }

                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("channelQuery not found");
                                    return response.error(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });


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

                useMasterKey: true
                //sessionToken: sessionToken

            });



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });


    }
    else {

        let beforeSaveElse_Time = process.hrtime(time);
        console.log(`beforeSaveElse_Time channelFollow took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

        response.success();

    }


}, {useMasterKey: true});

Parse.Cloud.define('splitObjectAndIndex', function(request, response) {
    splitObjectAndIndex({'user':request.params.user, 'object':request.params.object, 'className':request.params.className, 'count':request.params.count,'indexCount':request.params.indexCount, 'loop':request.params.loop  }, {
        success: function(count) {
            response.success(count);
        },
        error: function(error) {
            response.error(error);
        }
    });
});

function splitObjectAndIndex (request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let user = request['user'];
    console.log("splitObjectAndIndex user: " + JSON.stringify(user));

    let object = request['object'];
    //console.log("object: " + JSON.stringify(object));
    // note object needs to be toJSON()

    let className = request['className'];
    //console.log("className: " + JSON.stringify(className));
    var objectClassName;
    let PARSEOBJECT;
    let parseObject;

    if (className === 'PostSocial') {

        objectClassName = 'post';
        PARSEOBJECT = Parse.Object.extend("Post");
        parseObject = new PARSEOBJECT();
        parseObject.id = object.objectId;

    } else if (className === 'workspace_follower') {

        objectClassName = 'workspace';
        PARSEOBJECT = Parse.Object.extend("WorkSpace");
        parseObject = new PARSEOBJECT();
        parseObject.id = object.objectId;
    }

    else if (className === 'PostMessageSocial') {

        objectClassName = 'postMessage';
        PARSEOBJECT = Parse.Object.extend("PostMessage");
        parseObject = new PARSEOBJECT();
        parseObject.id = object.objectId;

    }  else if (className === 'Role') {

        objectClassName = '_User';
        PARSEOBJECT = Parse.Object.extend("_User");
        parseObject = new PARSEOBJECT();
        parseObject.id = object.objectId;

        var workspaceFollowers = request['workspaceFollowers'];

        //console.log("workspaceFollowers: " + JSON.stringify(workspaceFollowers));
        var workspaceFollowerIndex = (workspaceFollowers[0].index)? workspaceFollowers[0].index : 0;
        //console.log("workspaceFollowerIndex: " + JSON.stringify(workspaceFollowerIndex));

        var countIndexUser = workspaceFollowerIndex;

        var workspaceFollowerObject = workspaceFollowers[0];

        var userObject = workspaceFollowers[countIndexUser].get("user");

        let userRoles= userObject.get("roles");

        workspaceFollowerObject = workspaceFollowerObject.toJSON();

        workspaceFollowerObject.index = countIndexUser + 1;
        //console.log("workspaceFollowerObject: " + JSON.stringify(workspaceFollowerObject));
        //console.log("workspace loop: " + JSON.stringify(workspaceFollowers[countIndexUser].get("workspace")));


    }

    let count = (request['count'])? request['count'] : 0;
    //console.log("count: " + JSON.stringify(count));

    let indexCount = (request['indexCount'])? request['indexCount'] : 0;
    //console.log("indexCount: " + JSON.stringify(indexCount));

    let loop = request['loop'];

    let index;

    let globalQuery = new Parse.Query(className);


    if (className === 'Role') {
        globalQuery.equalTo('workspace', workspaceFollowers[countIndexUser].get("workspace"));

        //var userObject = Parse.Object.fromJSON(object);

        let userRoles= userObject.get("roles");

        //console.log("userRoles: " + JSON.stringify(userRoles));

        globalQuery = userRoles.query();

    } else {

        globalQuery.equalTo(objectClassName, parseObject);
        //console.log("objectClassName: " + JSON.stringify(objectClassName));
        //console.log("parseObject: " + JSON.stringify(parseObject));

    }

    if (loop === false) {
        globalQuery.equalTo('algoliaIndexID', indexCount.toString());

    }

    if (className === 'PostSocial') {
        globalQuery.limit(1);

    } else {

        globalQuery.limit(10);


    }

    globalQuery.skip(count);

    globalQuery.find({
        useMasterKey: true
        //sessionToken: sessionToken
    }).then((results) => {

        if (results.length > 0) {

            count = count + results.length;
            let finalIndexCount;
            let tags = ['*'];

            indexCount = indexCount + 1;
            //console.log("indexCount: " + JSON.stringify(indexCount));

            async.map(results, function (result, cb) {

                //console.log("className: " + JSON.stringify(className));

                let RESULTOBJECT = Parse.Object.extend(className);
                let ResultObject = new RESULTOBJECT();
                ResultObject.id = result.id;

                if (className === 'Role') {

                    //console.log("className userObject: " + JSON.stringify(userObject.id));

                    tags.push(userObject.id);

                } else {

                    tags.push(result.get("user").id);

                }



                if (!result.get("algoliaIndexID")) {


                    finalIndexCount = indexCount.toString();
                    ResultObject.set("algoliaIndexID", finalIndexCount);

                    //console.log("result.get.algoliaIndexID: " + JSON.stringify(ResultObject.get("algoliaIndexID")));

                    ResultObject.save(null, {

                        useMasterKey: true,
                        //sessionToken: sessionToken

                    });

                } else {

                    // algoliaIndexID already exists let's use it
                    finalIndexCount = result.get("algoliaIndexID");

                }


                if (className === 'PostSocial') {

                    ResultObject = simplifyPostSocial(result);
                    //console.log("simplifyPostSocial: " + JSON.stringify(ResultObject));

                }
                else if (className === 'workspace_follower' || className === 'PostMessageSocial'  || className === 'Role' ) {

                    ResultObject = result;
                    //console.log("ResultObject " + JSON.stringify(className) + ": " + JSON.stringify(ResultObject));

                }

                result = ResultObject;

                return cb (null, result);


            }, function (err, resultsFinal) {

                console.log("resultsFinal: " + JSON.stringify(resultsFinal));

                if (err) {
                    return response.error(err);
                } else if (resultsFinal.length > 0) {

                    object.objectID = object.objectId + '-' + finalIndexCount;
                    object._tags = tags;

                    //console.log("final tags: " + JSON.stringify(tags));

                    if (finalIndexCount === 1) {

                        // let's make sure we also save the index =0 algolia object with * _tags

                        object.objectID = object.objectId + '-' + '0';
                    }

                    if (className === 'PostSocial') {

                        //object = results[0].get("post");
                        //console.log("post object: " + JSON.stringify(object));

                        object.PostSocial = resultsFinal;

                        //console.log("post splitObjectAndIndex object: " + JSON.stringify(object));



                        if (object.type === 'post') {

                            //console.log("Starting post section in PostSocial in SplitObjectAndIndex");


                            //let postQuestionMessages1 = object.postQuestions;
                            //console.log("postQuestionMessages1: " + JSON.stringify(postQuestionMessages1));

                            let postQuestionMessages = object['postQuestions'];
                            //console.log("postQuestionMessages2: " + JSON.stringify(postQuestionMessages));

                            //let postQuestionMessages = JSON.parse(object).get("postQuestions");
                            //console.log("postQuestionMessages: " + JSON.stringify(postQuestionMessages));

                            if (postQuestionMessages.length > 0 ) {

                                async.map(postQuestionMessages, function (postQuestionMessage, cb1) {

                                    //console.log("starting async.map postQuestionMessages ");

                                    //console.log("postQuestionMessage: " + JSON.stringify(postQuestionMessage));

                                    let POSTMESSAGE = Parse.Object.extend("PostMessage");
                                    let postMessage = new POSTMESSAGE();
                                    postMessage.id = postQuestionMessage.objectId;
                                    //console.log("postMessage n: " + JSON.stringify(postMessage));

                                    //console.log("indexOf async.map: " + JSON.stringify(postQuestionMessages.indexOf(postQuestionMessage)));

                                    let async_map_index = postQuestionMessages.indexOf(postQuestionMessage);

                                    let USEROBJECT = Parse.Object.extend("_User");
                                    let userObject = new USEROBJECT();
                                    userObject.id = object.PostSocial.user.objectId;
                                    console.log("userObject: " + JSON.stringify(userObject));

                                    function getPostMessageSocial (callback) {

                                        let POSTMESSAGESOCIAL = Parse.Object.extend("PostMessageSocial");
                                        let queryPostMessageSocial = new Parse.Query(POSTMESSAGESOCIAL);

                                        console.log("PostMessage: " + JSON.stringify(postMessage.id));
                                        console.log("user: " + JSON.stringify(userObject.id));


                                        queryPostMessageSocial.equalTo("postMessage", postMessage);
                                        queryPostMessageSocial.equalTo("user", userObject);

                                        queryPostMessageSocial.first({

                                            useMasterKey: true
                                            //sessionToken: sessionToken

                                        }).then((postMessageSocial) => {
                                            // The object was retrieved successfully.

                                            //let finalChannelFollowers = [];
                                            console.log("postMessageSocial: " + JSON.stringify(postMessageSocial));


                                            if (postMessageSocial) {

                                                postMessageSocial = simplifyPostMessageSocialQuestion(postMessageSocial);
                                                console.log("postMessageSocial: " + JSON.stringify(postMessageSocial));

                                                return callback (null, postMessageSocial);



                                            } else {

                                                let postMessageSocial = null;

                                                return callback (null, postMessageSocial);

                                            }


                                        }, (error) => {
                                            // The object was not retrieved successfully.
                                            // error is a Parse.Error with an error code and message.
                                            return callback (error);
                                        }, {

                                            useMasterKey: true
                                            //sessionToken: sessionToken

                                        });
                                    }


                                    async.parallel([
                                        async.apply(getPostMessageSocial)


                                    ], function (err, results) {
                                        if (err) {
                                            return cb1(err);
                                        }


                                        if (results.length > 0) {

                                            let PostMessageSocial = results[0];
                                            console.log("done postMessageSocial results: " + JSON.stringify(results));


                                            if (PostMessageSocial) {

                                                postQuestionMessage.PostMessageSocial = PostMessageSocial;
                                                console.log("done postMessageSocial: " + JSON.stringify(PostMessageSocial));

                                                console.log("done postQuestionMessage: " + JSON.stringify(postQuestionMessage));



                                                return cb1(null, postQuestionMessage);


                                            }
                                            else {

                                                // postMessageSocial doesn't exist, user doesn't have any reactions on postMessage.
                                                console.log("postMessageSocial doesn't exist, user doesn't have any reactions on postMessage");

                                                console.log("postMessageSocial doesn't exist, postQuestionMessage: " + JSON.stringify(postQuestionMessage));

                                                postQuestionMessage.PostMessageSocial = null;

                                                return cb1(null, postQuestionMessage);


                                            }


                                        }
                                        else {

                                            return cb1(null, postQuestionMessage);

                                        }

                                    });


                                }, function (err, postQuestionMessagesSocialResult) {

                                    console.log("postQuestionMessagesSocialResult length: " + JSON.stringify(postQuestionMessagesSocialResult.length));

                                    if (err) {
                                        return response.error(err);
                                    } else {

                                        object.postQuestions = postQuestionMessagesSocialResult;
                                        delete object.postSocial;

                                        index = indexPosts;

                                        index.partialUpdateObject(object, true, function(err, content) {
                                            if (err) return response.error(err);

                                            console.log("Parse<>Algolia object saved from splitObjectAndIndex function ");

                                            if (loop === true ) {

                                                splitObjectAndIndex({'count':count, 'user':user, 'indexCount':indexCount, 'object':object, 'className':className, 'loop': true, 'workspaceFollowers': workspaceFollowers}, response);

                                            } else if (loop === false) {

                                                return response.success(count);
                                            }


                                        });



                                    }

                                });


                            } else {

                                index = indexPosts;

                                index.partialUpdateObject(object, true, function (err, content) {
                                    if (err) return response.error(err);

                                    console.log("Parse<>Algolia object saved from splitObjectAndIndex function ");

                                    if (loop === true) {

                                        splitObjectAndIndex({
                                            'count': count,
                                            'user': user,
                                            'indexCount': indexCount,
                                            'object': object,
                                            'className': className,
                                            'loop': true,
                                            'workspaceFollowers': workspaceFollowers
                                        }, response);

                                    } else if (loop === false) {

                                        return response.success(count);
                                    }


                                });


                            }





                        }
                        else if (object.type === 'question') {

                            index = indexPosts;

                            index.partialUpdateObject(object, true, function (err, content) {
                                if (err) return response.error(err);

                                console.log("Parse<>Algolia object saved from splitObjectAndIndex function ");

                                if (loop === true) {

                                    splitObjectAndIndex({
                                        'count': count,
                                        'user': user,
                                        'indexCount': indexCount,
                                        'object': object,
                                        'className': className,
                                        'loop': true,
                                        'workspaceFollowers': workspaceFollowers
                                    }, response);

                                } else if (loop === false) {

                                    return response.success(count);
                                }


                            });


                        }
                        else {

                            response.error("invalid post.type, please include a question or post type only.");
                        }


                    }
                    else if (className === 'workspace_follower') {

                        //object = results[0].get("workspace");
                        //console.log("workspace object: " + JSON.stringify(object));

                        object.followers = resultsFinal;
                        index = indexWorkspaces;

                    }
                    else if (className === 'PostMessageSocial') {

                        //object = results[0].get("workspace");
                        //console.log("PostQuestionMessageVote object: " + JSON.stringify(object));

                        object.PostMessageSocial = resultsFinal;
                        index = indexPostMessage;

                    }

                    else if (className === 'Role') {

                        //object = results[0].get("workspace");
                        //console.log("Role object: " + JSON.stringify(object));

                        object.roles = resultsFinal;
                        index = indexUsers;

                    }

                    else {

                        return response.error("this className is not supported, please use a supported className");
                    }

                    if (className !== 'PostSocial') {

                        index.partialUpdateObject(object, true, function (err, content) {
                            if (err) return response.error(err);

                            console.log("Parse<>Algolia object saved from splitObjectAndIndex function ");

                            if (loop === true) {

                                splitObjectAndIndex({
                                    'count': count,
                                    'user': user,
                                    'indexCount': indexCount,
                                    'object': object,
                                    'className': className,
                                    'loop': true,
                                    'workspaceFollowers': workspaceFollowers
                                }, response);

                            } else if (loop === false) {

                                return response.success(count);
                            }


                        });
                    }


                }


            });


        }
        else {

            if (indexCount === 0) {

                // this means there are no postSocials for this post or no workspace_followers for this workspace return empty arrays


                let resultsNone = [];
                // no results for postSocial or workspace_follower

                object.objectID = object.objectId + '-' + '0';
                console.log("final object before saving to algolia: " + JSON.stringify(object));

                if (className === 'PostSocial') {

                    //object = results[0].get("post");
                    //console.log("no results - post object: " + JSON.stringify(object));

                    object.PostSocial = resultsNone;
                    index = indexPosts;

                    let postQuestionMessages = object['postQuestions'];


                    async.map(postQuestionMessages, function (postQuestionMessage, cb1) {

                        //console.log("starting async.map postQuestionMessages ");

                        //console.log("postQuestionMessage: " + JSON.stringify(postQuestionMessage));

                        let POSTMESSAGE = Parse.Object.extend("PostMessage");
                        let postMessage = new POSTMESSAGE();
                        postMessage.id = postQuestionMessage.objectId;
                        //console.log("postMessage n: " + JSON.stringify(postMessage));

                        //console.log("indexOf async.map: " + JSON.stringify(postQuestionMessages.indexOf(postQuestionMessage)));

                        let async_map_index = postQuestionMessages.indexOf(postQuestionMessage);

                        let USEROBJECT = Parse.Object.extend("_User");
                        let userObject = new USEROBJECT();
                        userObject.id = user.objectId;
                        console.log("userObject: " + JSON.stringify(userObject));

                        function getPostMessageSocial (callback) {

                            let POSTMESSAGESOCIAL = Parse.Object.extend("PostMessageSocial");
                            let queryPostMessageSocial = new Parse.Query(POSTMESSAGESOCIAL);

                            console.log("PostMessage: " + JSON.stringify(postMessage.id));
                            console.log("user: " + JSON.stringify(userObject.id));


                            queryPostMessageSocial.equalTo("postMessage", postMessage);
                            queryPostMessageSocial.equalTo("user", userObject);

                            queryPostMessageSocial.first({

                                useMasterKey: true
                                //sessionToken: sessionToken

                            }).then((postMessageSocial) => {
                                // The object was retrieved successfully.

                                //let finalChannelFollowers = [];
                                console.log("postMessageSocial: " + JSON.stringify(postMessageSocial));


                                if (postMessageSocial) {

                                    postMessageSocial = simplifyPostMessageSocialQuestion(postMessageSocial);
                                    console.log("postMessageSocial: " + JSON.stringify(postMessageSocial));

                                    return callback (null, postMessageSocial);



                                } else {

                                    let postMessageSocial = null;

                                    return callback (null, postMessageSocial);

                                }


                            }, (error) => {
                                // The object was not retrieved successfully.
                                // error is a Parse.Error with an error code and message.
                                return callback (error);
                            }, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });
                        }


                        async.parallel([
                            async.apply(getPostMessageSocial)


                        ], function (err, results) {
                            if (err) {
                                return cb1(err);
                            }


                            if (results.length > 0) {

                                let PostMessageSocial = results[0];
                                console.log("done postMessageSocial results: " + JSON.stringify(results));


                                if (PostMessageSocial) {

                                    postQuestionMessage.PostMessageSocial = PostMessageSocial;
                                    console.log("done postMessageSocial: " + JSON.stringify(PostMessageSocial));

                                    console.log("done postQuestionMessage: " + JSON.stringify(postQuestionMessage));



                                    return cb1(null, postQuestionMessage);


                                }
                                else {

                                    // postMessageSocial doesn't exist, user doesn't have any reactions on postMessage.
                                    console.log("postMessageSocial doesn't exist, user doesn't have any reactions on postMessage");

                                    console.log("postMessageSocial doesn't exist, postQuestionMessage: " + JSON.stringify(postQuestionMessage));

                                    postQuestionMessage.PostMessageSocial = null;

                                    return cb1(null, postQuestionMessage);


                                }


                            }
                            else {

                                return cb1(null, postQuestionMessage);

                            }

                        });


                    }, function (err, postQuestionMessagesSocialResult) {

                        console.log("postQuestionMessagesSocialResult length: " + JSON.stringify(postQuestionMessagesSocialResult.length));

                        if (err) {
                            return response.error(err);
                        } else {

                            object.postQuestions = postQuestionMessagesSocialResult;
                            delete object.postSocial;

                            index = indexPosts;

                            index.partialUpdateObject(object, true, function(err, content) {
                                if (err) return response.error(err);

                                console.log("Parse<>Algolia object saved from splitObjectAndIndex function ");

                                if (loop === true ) {

                                    splitObjectAndIndex({'count':count, 'user':user, 'indexCount':indexCount, 'object':object, 'className':className, 'loop': true, 'workspaceFollowers': workspaceFollowers}, response);

                                } else if (loop === false) {

                                    return response.success(count);
                                }


                            });



                        }

                    });

                }
                else if (className === 'workspace_follower') {

                    //object = results[0].get("workspace");
                    //console.log("no results - workspace object: " + JSON.stringify(object));

                    object.followers = resultsNone;
                    index = indexWorkspaces;

                }

                else if (className === 'PostMessageSocial') {

                    //object = results[0].get("workspace");
                    //console.log("PostMessageSocial object: " + JSON.stringify(object));

                    object.PostMessageSocial = resultsNone;
                    index = indexPostMessage;

                }


                else if (className === 'Role') {

                    //object = results[0].get("workspace");
                    //console.log("Role object: " + JSON.stringify(object));

                    object.roles = resultsNone;
                    index = indexUsers;

                }


                if (className !== 'PostSocial') {


                    index.partialUpdateObject(object, true, function (err, content) {
                        if (err) return response.error(err);

                        console.log("Parse<>Algolia object saved from splitObjectAndIndex function ");

                        let Final_Time = process.hrtime(time);
                        console.log(`splitObjectToIndex took ${(Final_Time[0] * NS_PER_SEC + Final_Time[1]) * MS_PER_NS} milliseconds`);

                        return response.success(count);


                    });
                }




            }

            else {

                let Final_Time = process.hrtime(time);
                console.log(`splitObjectToIndex took ${(Final_Time[0] * NS_PER_SEC + Final_Time[1]) * MS_PER_NS} milliseconds`);

                return response.success(count);

            }

        }



    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        //console.log(error);
        return response.error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });

}

function splitUserAndIndex (request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let user = request['user'];
    //console.log("user: " + JSON.stringify(user));

    let object = request['object'];
    //console.log("object: " + JSON.stringify(object));
    // note object needs to be toJSON()

    let className = request['className'];
    //console.log("className: " + JSON.stringify(className));

    var workspaceFollowers = request['workspaceFollowers'];
    //console.log("workspaceFollowers length: " + JSON.stringify(workspaceFollowers.length));

    let objectToSave = object;

    async.forEachSeries(workspaceFollowers, function (workspaceFollower, cb1) {

        let WORKSPACE = Parse.Object.extend("WorkSpace");
        let workspace = new WORKSPACE();
        workspace.id = workspaceFollower.get("workspace").id;
        //console.log("workspace: " + JSON.stringify(workspace));

        //console.log("indexOf async.map: " + JSON.stringify(workspaceFollowers.indexOf(workspaceFollower)));

        let async_map_index = workspaceFollowers.indexOf(workspaceFollower);

        var userObject = workspaceFollowers[async_map_index].get("user");
        //console.log("userObject: " + JSON.stringify(userObject));

        let queryRole = new Parse.Query(Parse.Role);

        let rolesArray;

        function getChannelFollow (callback) {

            let CHANNELFOLLOW = Parse.Object.extend("ChannelFollow");
            let queryChannelFollow = new Parse.Query(CHANNELFOLLOW);

            queryChannelFollow.equalTo("workspace", workspace);
            queryChannelFollow.equalTo("isFollower", true);

            queryChannelFollow.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((channelFollow) => {
                // The object was retrieved successfully.

                //let finalChannelFollowers = [];

                if (channelFollow.length > 0) {


                    return callback (null, channelFollow);



                } else {

                    return callback (null, channelFollow);

                }


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                return callback (error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });
        }


        async.parallel([
            async.apply(getChannelFollow)


        ], function (err, results) {
            if (err) {
                return cb1 (err);
            }


            if (results.length > 0) {

                let ChannelFollows = results[0];

                if (ChannelFollows) {

                    async.forEachSeries(ChannelFollows, function (channelFollowObject, cb) {

                        //let newObjectToSave = objectToSave;

                        let channelFollowWorkspaceId = channelFollowObject.get("workspace").id;
                        let channelFollowChannelId = channelFollowObject.get("channel").id;
                        let channelFollowWorkspace = channelFollowObject.get("workspace");
                        let channelFollowClassName = channelFollowObject.get("className");
                        let channelFollowObjectId = channelFollowObject.id;

                        channelFollowObject = objectToSave

                        channelFollowObject.objectID = object.objectId + '-' + channelFollowWorkspaceId + '-' + channelFollowChannelId;

                        //console.log("channelFollowObject.objectID: " + JSON.stringify(channelFollowObject.objectID));

                        channelFollowObject.channel = channelFollowChannelId;
                        channelFollowObject.workspace = channelFollowWorkspaceId;

                        let tags = ["*"];
                        tags.push(userObject.id);

                        channelFollowObject._tags = tags;

                        let userRoles= userObject.get("roles");

                        //console.log('userRoles: ' + JSON.stringify(userRoles));

                        queryRole = userRoles.query();

                        queryRole.equalTo('workspace', channelFollowWorkspace);

                        queryRole.limit(10);
                        queryRole.find({
                            useMasterKey: true
                            //sessionToken: sessionToken
                        }).then((roles) => {

                            //console.log("roles.length: " + JSON.stringify(roles.length));

                            rolesArray = roles;

                            if (roles.length > 0) {

                                channelFollowObject.roles = rolesArray;
                                //console.log("userObject.id: " + JSON.stringify(userObject.id));




                                indexUsers.partialUpdateObject(channelFollowObject, true, function(err, content) {
                                    if (err) {

                                        return response.error(err);
                                    }

                                    console.log("Parse<>Algolia User saved from splitUserAndIndex function ");


                                    return cb (null, channelFollowObject);

                                });





                            } else {

                                console.error("User doesn't have any roles, function splitUserAndIndex function.");

                                // this case is when a user is following a workspace but for some reason there is no roles assigned to this user so return empty roles.
                                let tags = ["*"];

                                channelFollowObject.roles = [];
                                //console.log("userObject.id: " + JSON.stringify(userObject.id));

                                tags.push(userObject.id);
                                // todo need to push unique items now we are doing duplicate item pushes.

                                channelFollowObject._tags = tags;

                                //console.log("channelFollowObject.objectId: " + JSON.stringify(channelFollowObject.objectId));

                                indexUsers.partialUpdateObject(channelFollowObject, true, function(err, content) {
                                    if (err) {

                                        return response.error(err);
                                    }

                                    console.log("Parse<>Algolia User saved from splitUserAndIndex function role.length === 0");

                                    return cb (null, channelFollowObject);
                                });


                            }


                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            //console.log(error);
                            return response.error(error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });


                    }, function (err) {

                        //console.log("previousChannelFollowers length: " + JSON.stringify(previousChannelFollowers.length));

                        if (err) {
                            return response.error(err);
                        } else {


                            return cb1 (null, workspaceFollower);



                        }

                    });


                }
                else {

                    // ChannelFollow doesn't exist, user doesn't have any channels followed.

                    let newObjectToSave = objectToSave;


                    newObjectToSave.objectID = object.objectId + '-' + '0';

                    let tags = ["*"];
                    tags.push(userObject.id);

                    newObjectToSave._tags = tags;

                    let userRoles= userObject.get("roles");

                    //console.log('userRoles: ' + JSON.stringify(userRoles));

                    queryRole = userRoles.query();

                    queryRole.equalTo('workspace', workspace);

                    queryRole.limit(10);
                    queryRole.find({
                        useMasterKey: true
                        //sessionToken: sessionToken
                    }).then((roles) => {

                        //console.log("roles.length: " + JSON.stringify(roles.length));

                        rolesArray = roles;

                        if (roles.length > 0) {

                            newObjectToSave.roles = rolesArray;
                            //console.log("userObject.id: " + JSON.stringify(userObject.id));


                            //console.log("newObjectToSave.objectId: " + JSON.stringify(newObjectToSave.objectId));

                            indexUsers.partialUpdateObject(newObjectToSave, true, function(err, content) {
                                if (err) {

                                    return response.error(err);
                                }

                                console.log("Parse<>Algolia User saved from splitUserAndIndex function ");

                                return cb1 (null, workspaceFollower);


                            });



                        } else {

                            console.error("User doesn't have any roles, function splitUserAndIndex function.");


                            newObjectToSave.roles = [];
                            //console.log("userObject.id: " + JSON.stringify(userObject.id));

                            //console.log("newObjectToSave.objectId: " + JSON.stringify(newObjectToSave.objectId));

                            indexUsers.partialUpdateObject(newObjectToSave, true, function(err, content) {
                                if (err) {

                                    return response.error(err);
                                }

                                console.log("Parse<>Algolia User saved from splitUserAndIndex function ");


                                return cb1 (null, workspaceFollower);


                            });
                        }


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        //console.log(error);
                        return response.error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });


                }


            }  else {

                console.error("User doesn't have any roles assigned or no channel follows.");

                let newObjectToSave = objectToSave;


                newObjectToSave.objectID = object.objectId + '-' + '0';

                let tags = ["*"];
                tags.push(userObject.id);

                newObjectToSave._tags = tags;

                indexUsers.partialUpdateObject(newObjectToSave, true, function(err, content) {
                    if (err) {

                        return response.error(err);
                    }

                    console.log("Parse<>Algolia User saved from splitUserAndIndex function ");


                    return cb1 (null, workspaceFollower);


                });

            }



        });




    }, function (err) {

        //console.log("previousChannelFollowers length: " + JSON.stringify(previousChannelFollowers.length));

        if (err) {
            return response.error(err);
        } else {


            let Final_Time = process.hrtime(time);
            console.log(`splitUserAndIndex took ${(Final_Time[0] * NS_PER_SEC + Final_Time[1]) * MS_PER_NS} milliseconds`);

            return response.success();


        }

    });




}

// auto-add type when isBookmarked, isLiked or Comment is added
Parse.Cloud.beforeSave('PostSocial', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.beforeSave.PostSocial.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    // Convert Parse.Object to JSON
    let postSocial = request.object;


    if (postSocial.isNew()) {

        //console.log("isLiked: "+postSocial.get("isLiked"));
        //console.log("isBookmarked: "+postSocial.get("isBookmarked"));

        if (!postSocial.get("isLiked")) {postSocial.set("isLiked", false); }
        if (!postSocial.get("isBookmarked")) {postSocial.set("isBookmarked", false);}
        if (!postSocial.get("archive")) {postSocial.set("archive", false);}
        if (!postSocial.get("isDelivered")) { postSocial.set("isDelivered", false); }
        if (!postSocial.get("hasRead")) { postSocial.set("hasRead", false); }


        postSocial.set("isNew", true);

    } else {

        postSocial.set("isNew", false);
    }


    let diff = process.hrtime(time);
    console.log(`beforeSave PostSocial took ${(diff[0] * NS_PER_SEC + diff[1])  * MS_PER_NS} milliseconds`);
    response.success();


});

// Create relationship from post to PostSocial after a PostSocial is saved
Parse.Cloud.afterSave('PostSocial', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.afterSave.PostSocial.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    //console.log("request afterSave PostSocial: " + JSON.stringify(request));

    // Get post object
    let POSTSOCIAL = Parse.Object.extend("PostSocial");
    let postSocial = request.object;
    let originalPostSocial = request.original;

    let CHANNEL = Parse.Object.extend("Channel");
    let channel = new CHANNEL();
    channel.id = postSocial.get("channel").id;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = postSocial.get("workspace").id;

    let POST = Parse.Object.extend("Post");
    let post = new POST();
    post = postSocial.get("post");

    //console.log("request afterDelete Post: " + JSON.stringify(request));

    let USER = Parse.Object.extend("_User");
    let owner = new USER();
    owner.id = postSocial.get("user").id;

    let queryPost = new Parse.Query(POST);
    queryPost.include( ["user", "workspace", "channel"] );
    //queryPost.select(["user", "ACL", "media_duration", "postImage", "post_File", "audioWave", "archive", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url", "channel.name", "channel.type", "channel.archive", "post_title", "questionAnswerEnabled" /*,"transcript"*/]);
    queryPost.equalTo("objectId", post.id);

    function incrementPostSocialCount(cb) {

        if (postSocial.get("isNew") === true) {

            post.increment("postSocialCount");
            let relation = post.relation("postSocial");
            //console.log("beforeAdd: " + JSON.stringify(relation));

            relation.add(postSocial);
            //console.log("afterAdd: " + JSON.stringify(relation));

            if (postSocial.get("isLiked") === true) {

                post.increment("likesCount");
            }

            post.save(null, {

                useMasterKey: true,
                //sessionToken: sessionToken

            }).then((Post) => {
                // The object was retrieved successfully.
                //console.log("Result from get " + JSON.stringify(Workspace));

                queryPost.first( {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((PostObject) => {
                    // The object was retrieved successfully.
                    //console.log("Result from get " + JSON.stringify(Workspace));

                    return cb(null, PostObject);


                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    response.error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


        } else {

            if (originalPostSocial.get("isLiked") === true && postSocial.get("isLiked") === true) {

                // do nothing, LikesCount is already incremented.

                queryPost.first(  {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((PostObject) => {
                    // The object was retrieved successfully.
                    //console.log("Result from get " + JSON.stringify(Workspace));

                    return cb(null, PostObject);

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    response.error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

            } else if (originalPostSocial.get("isLiked") === true && postSocial.get("isLiked") === false) {

                // decrement likesCount for post
                post.increment("likesCount", -1);

                post.save(null, {

                    useMasterKey: true,
                    //sessionToken: sessionToken

                }).then((Post) => {
                    // The object was retrieved successfully.
                    //console.log("Result from get " + JSON.stringify(Workspace));

                    queryPost.first(  {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((PostObject) => {
                        // The object was retrieved successfully.
                        //console.log("Result from get " + JSON.stringify(Workspace));

                        return cb(null, PostObject);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    response.error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

            } else if (originalPostSocial.get("isLiked") === false && postSocial.get("isLiked") === false) {

                // do nothing, user didn't like this post

                queryPost.first( {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((PostObject) => {
                    // The object was retrieved successfully.
                    //console.log("Result from get " + JSON.stringify(Workspace));

                    return cb(null, PostObject);

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    response.error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });


            } else if (originalPostSocial.get("isLiked") === false && postSocial.get("isLiked") === true) {

                // increment likesCount for post
                post.increment("likesCount");

                post.save(null, {

                    useMasterKey: true,
                    //sessionToken: sessionToken

                }).then((Post) => {
                    // The object was retrieved successfully.
                    //console.log("Result from get " + JSON.stringify(Workspace));

                    queryPost.first(  {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((PostObject) => {
                        // The object was retrieved successfully.
                        //console.log("Result from get " + JSON.stringify(Workspace));

                        return cb(null, PostObject);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        response.error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    response.error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });
            } else {

                queryPost.first( {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((PostObject) => {
                    // The object was retrieved successfully.
                    //console.log("Result from get " + JSON.stringify(Workspace));

                    return cb(null, PostObject);

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    response.error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

            }


        }


    }

    function updatePostsAlgolia(PostObject, cb) {

        let Post = PostObject;
        let user = PostObject.get("user");

        let postACL = Post.getACL();
        console.log("post: " + JSON.stringify(Post));

        let CHANNEL = Parse.Object.extend("Channel");
        let channel = new CHANNEL();
        channel.id = Post.get("channel").id;

        let WORKSPACE = Parse.Object.extend("WorkSpace");
        let workspace = new WORKSPACE();
        workspace.id = Post.get("workspace").id;


        function prepIndex(callback) {

            // Successfully retrieved the object.
            //console.log("ObjectToSave: " + JSON.stringify(post));

            // Convert Parse.Object to JSON
            Post = simplifyPost(Post);

            // Specify Algolia's objectID with the Parse.Object unique ID
            //Post.objectID = Post.objectId;

            // set _tags depending on the post ACL

            if (postACL) {

                if (postACL.getPublicReadAccess()) {

                    // this means it's public read access is true
                    Post._tags = ['*'];

                }

                /*
                 else if (!postACL.getPublicReadAccess() && postACL.getReadAccess(user)) {


                 // this means this user has read access
                 Post._tags = [user.id];

                 } else if (!postACL.getPublicReadAccess() && post.ACL.getReadAccess(roleChannel)) {

                 // this means any user with this channel is private and channel-role will have access i.e. they are a member of this channel
                 Post._tags = [roleChannel];

                 }



                 */


            } else if (!postACL || postACL === null) {

                // this means it's public read write
                console.log("no postACL for this post.");
                Post._tags = ['*'];
            }


            return callback(null, Post);

        }

        function getTopAnswerForQuestionPost(callback) {

            console.log("starting getTopAnswerForQuestionPost function: " + JSON.stringify(PostObject));

            if (Post.type === 'question') {

                let POSTMESSAGEQUESTION = Parse.Object.extend("PostMessage");
                let queryPostMessageQuestion = new Parse.Query(POSTMESSAGEQUESTION);
                //queryPostQuestionMessage.equalTo("workspace", workspace);
                //queryPostQuestionMessage.equalTo("channel", channel);
                queryPostMessageQuestion.equalTo("post", PostObject);
                //queryPostQuestionMessage.equalTo("archive", false);
                queryPostMessageQuestion.equalTo("type", "answer");
                queryPostMessageQuestion.descending("voteRank");
                queryPostMessageQuestion.include(["user"]);
                queryPostMessageQuestion.select(PostMessageAnswerArray);
                queryPostMessageQuestion.doesNotExist("parentPostMessage");
                queryPostMessageQuestion.first({
                    useMasterKey: true
                    //sessionToken: sessionToken
                }).then((postQuestionMessage) => {

                    //console.log("starting getTopAnswerForQuestionPost: " + JSON.stringify(postQuestionMessage));


                    if (postQuestionMessage) {

                        postQuestionMessage = simplifyPostQuestionMessage(postQuestionMessage);
                        return callback(null, postQuestionMessage);


                    } else {

                        let postQuestionMessage = null;
                        // no workspaceFollowers to delete return
                        return callback(null, postQuestionMessage);

                    }


                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    console.log(error);
                    let postQuestionMessage = null;
                    // no workspaceFollowers to delete return
                    return callback(null, postQuestionMessage);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });


            } else {

                // this post is not a question post but a normal post so no answer

                let postQuestionMessage = null;
                // no workspaceFollowers to delete return
                return callback(null, postQuestionMessage);
            }


        }

        function getPostMessageComments(callback) {

            console.log("starting getPostMessageComments function.");

            let POSTMESSAGECOMMENT = Parse.Object.extend("PostMessage");
            let queryPostMessageComment = new Parse.Query(POSTMESSAGECOMMENT);
            //queryPostChatMessage.equalTo("workspace", workspace);
            //queryPostChatMessage.equalTo("channel", channel);
            queryPostMessageComment.equalTo("post", PostObject);
            //queryPostMessageComment.select(PostMessageReplyArray_1);
            //queryPostMessageComment.equalTo("type", "comment");
            if (Post.type === 'question') {
                //queryPostMessageComment.equalTo("type", "question");
                //queryPostMessageComment.equalTo("type", "answer");

                queryPostMessageComment.select(PostMessageReplyArray_1);


            } else if (Post.type === 'post') {

                queryPostMessageComment.notEqualTo("type", "question");
                queryPostMessageComment.select(PostMessageReplyArray_2);

            }
            queryPostMessageComment.include(["user"]);
            queryPostMessageComment.limit(2);
            queryPostMessageComment.descending("createdAt");

            //queryPostMessageComment.doesNotExist("parentPostMessage");
            queryPostMessageComment.find({
                useMasterKey: true
                //sessionToken: sessionToken
            }).then((PostChatMessages) => {

                //console.log("PostChatMessages: " + JSON.stringify(PostChatMessages));


                if (PostChatMessages.length !== 0) {

                    let simplifiedPostChatMessages = [];

                    if (PostChatMessages.length === 2) {

                        simplifiedPostChatMessages.push(simplifyPostChatMessage(PostChatMessages[1]));
                        simplifiedPostChatMessages.push(simplifyPostChatMessage(PostChatMessages[0]));


                    } else if (PostChatMessages.length === 1) {

                        simplifiedPostChatMessages.push(simplifyPostChatMessage(PostChatMessages[0]));

                    }

                    //console.log("simplifyPostChatMessage: " + JSON.stringify(PostChatMessages));


                    return callback(null, simplifiedPostChatMessages);


                } else {

                    let PostChatMessages = [];
                    // no workspaceFollowers to delete return
                    return callback(null, PostChatMessages);

                }


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                console.log(error);
                let PostChatMessages = [];
                // no workspaceFollowers to delete return
                return callback(null, PostChatMessages);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


        }

        function getPostMessageQuestions(callback) {

            console.log("starting getPostMessageQuestions function.");

            let POSTMESSAGEQUESTION = Parse.Object.extend("PostMessage");
            let queryPostMessageQuestion = new Parse.Query(POSTMESSAGEQUESTION);
            //queryPostChatMessage.equalTo("workspace", workspace);
            //queryPostChatMessage.equalTo("channel", channel);
            queryPostMessageQuestion.equalTo("post", PostObject);
            queryPostMessageQuestion.equalTo("type", "question");
            queryPostMessageQuestion.include(["user"]);
            queryPostMessageQuestion.select(PostMessageQuestionArray);
            queryPostMessageQuestion.limit(10);
            queryPostMessageQuestion.doesNotExist("parentPostMessage");
            queryPostMessageQuestion.descending("likedCount");

            queryPostMessageQuestion.find({
                useMasterKey: true
                //sessionToken: sessionToken
            }).then((PostChatMessages) => {

                //console.log("PostChatMessages: " + JSON.stringify(PostChatMessages));


                if (PostChatMessages.length !== 0) {

                    let simplifiedPostChatMessages = [];

                    for (var i = 0; i < PostChatMessages.length; i++) {

                        simplifiedPostChatMessages.push(simplifyPostChatMessage(PostChatMessages[i]));
                        console.log("simplifyPostChatMessage: " + JSON.stringify(PostChatMessages[i]));

                        if (i === (PostChatMessages.length - 1)) {

                            // finished iterating through all items

                            return callback(null, simplifiedPostChatMessages);

                        }

                    }


                } else {

                    let PostChatMessages = [];
                    // no workspaceFollowers to delete return
                    return callback(null, PostChatMessages);

                }


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                console.log(error);
                let PostChatMessages = [];
                // no workspaceFollowers to delete return
                return callback(null, PostChatMessages);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


        }


        async.parallel([
            async.apply(prepIndex),
            async.apply(getPostMessageQuestions),
            async.apply(getPostMessageComments),
            async.apply(getTopAnswerForQuestionPost)
            //async.apply(getPostSocial)


        ], function (err, results) {
            if (err) {
                response.error(err);
            }

            // console.log("starting show results " + JSON.stringify(results.length));

            if (results.length > 0) {

                //console.log("afterSave PostSocial Post algolia index results length: " + JSON.stringify(results.length));

                let postToSave = results[0];
                let postMessageQuestions = results[1];
                let postMessageComments = results[2];
                //let postSocial = results[4];
                let topAnswerForQuestionPost = results[3];

                //postToSave = postToSave.toJSON();
                postToSave.postQuestions = postMessageQuestions;
                postToSave.chatMessages = postMessageComments;
                //postToSave.PostSocial = postSocial;
                postToSave.topAnswer = topAnswerForQuestionPost;
                postToSave.user = simplifyUser(user);


                //console.log("postQuestions: " + JSON.stringify(postMessageQuestions));
                //console.log("chatMessages: " + JSON.stringify(postMessageComments));
                //console.log("PostSocial: " + JSON.stringify(postSocial));
                //console.log("topAnswer: " + JSON.stringify(postToSave.topAnswer));

                //console.log("postToSave afterSave Post: " + JSON.stringify(postToSave));

                let indexCount = parseInt(postSocial.get("algoliaIndexID"));


                splitObjectAndIndex({'user': owner, 'object': postToSave, 'className': 'PostSocial', 'indexCount': indexCount, 'loop': false}, {
                    success: function (count) {

                        return cb(null, PostObject);

                    },
                    error: function (error) {
                        return cb (error);
                    }
                });


            } else {

                response.error("error in afterSave Post");
            }


        });


    }



    async.waterfall([
        async.apply(incrementPostSocialCount),
        async.apply(updatePostsAlgolia)


    ], function (err, results) {
        if (err) {
            return response.error(err);
        }

        if (results) {


            let finalTime = process.hrtime(time);
            console.log(`finalTime took afterSave PostSocial ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

            response.success();


        }

    });



});


// Add and Update AlgoliaSearch post object if it's deleted from Parse
Parse.Cloud.afterSave('Post', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;

    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.afterSave.Post.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let USER = Parse.Object.extend("_User");
    let user = new USER();

    // Convert Parse.Object to JSON
    let post = request.object;
    //let postToSave = post.toJSON();

    //var Post = Parse.Object.extend("Post");
    let POST = Parse.Object.extend("Post");
    let queryPost = new Parse.Query(POST);
    queryPost.include( ["user", "workspace", "channel"] );
    //queryPost.select(["user", "ACL", "media_duration", "postImage", "post_File", "audioWave", "archive", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url", "channel.name", "channel.type", "channel.archive", "post_title", "questionAnswerEnabled" /*,"transcript"*/]);
    queryPost.equalTo("objectId", post.id);

    console.log("currentUser afterSave Post: " + JSON.stringify(currentUser));
    //console.log("objectID: " + objectToSave.objectId);
    //console.log("objectID: " + objectToSave.user.objectId);


    queryPost.first({
        useMasterKey: true
        //sessionToken: sessionToken
    }).then((Post) => {


        let postACL = Post.getACL();
        //console.log("post: " + JSON.stringify(Post));

        user = Post.get("user");

        currentUser = currentUser ? currentUser : user;

        let CHANNEL = Parse.Object.extend("Channel");
        let channel = new CHANNEL();
        channel.id = Post.get("channel").id;

        let WORKSPACE = Parse.Object.extend("WorkSpace");
        let workspace = new WORKSPACE();
        workspace.id = Post.get("workspace").id;

        // todo need to remove this if statement since there is no child/parent post now we are using post and postMessage
        if (post.get("post")) {
            // this is a child post, so save it in relation array in it's parent post

            let parentPost = post.get("post");

            let postQuestionRelation = parentPost.relation("postQuestions");
            postQuestionRelation.add(post);

            parentPost.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((result) => {

                // save was successful
                if(result) {

                    //console.log("parent post saved: " + JSON.stringify(result));

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime  afterSave Post parentPost took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                    return response.success();


                } else {

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime  afterSave Post parentPost  took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                    return response.error();

                }


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });



        }

        else {
            // this post is not a child post of a parent post (not threaded post) so save this parent post to algolia

            function prepIndex(callback) {

                // Successfully retrieved the object.
                //console.log("ObjectToSave: " + JSON.stringify(post));

                // Convert Parse.Object to JSON
                Post = simplifyPost(Post);

                // Specify Algolia's objectID with the Parse.Object unique ID
                //Post.objectID = Post.objectId;

                // set _tags depending on the post ACL

                if (postACL) {

                    if (postACL.getPublicReadAccess()) {

                        // this means it's public read access is true
                        Post._tags = ['*'];

                    }

                    /*
                     else if (!postACL.getPublicReadAccess() && postACL.getReadAccess(user)) {


                     // this means this user has read access
                     Post._tags = [user.id];

                     } else if (!postACL.getPublicReadAccess() && post.ACL.getReadAccess(roleChannel)) {

                     // this means any user with this channel is private and channel-role will have access i.e. they are a member of this channel
                     Post._tags = [roleChannel];

                     }



                     */


                } else if (!postACL || postACL === null) {

                    // this means it's public read write
                    //console.log("no postACL for this post.");
                    Post._tags = ['*'];
                }


                return callback(null, Post);

            }

            function getTopAnswerForQuestionPost(callback) {

                console.log("starting getTopAnswerForQuestionPost function.");

                if (Post.type === 'question') {

                    let POSTMESSAGEQUESTION = Parse.Object.extend("PostMessage");
                    let queryPostMessageQuestion = new Parse.Query(POSTMESSAGEQUESTION);
                    //queryPostQuestionMessage.equalTo("workspace", workspace);
                    //queryPostQuestionMessage.equalTo("channel", channel);
                    queryPostMessageQuestion.equalTo("post", post);
                    //queryPostQuestionMessage.equalTo("archive", false);
                    queryPostMessageQuestion.equalTo("type", "answer");
                    queryPostMessageQuestion.descending("voteRank");
                    queryPostMessageQuestion.include( ["user"] );
                    queryPostMessageQuestion.select(PostMessageAnswerArray);
                    queryPostMessageQuestion.doesNotExist("parentPostMessage");
                    queryPostMessageQuestion.first({
                        useMasterKey: true
                        //sessionToken: sessionToken
                    }).then((postQuestionMessage) => {

                        console.log("starting getTopAnswerForQuestionPost: " + JSON.stringify(postQuestionMessage));


                        if (postQuestionMessage) {

                            postQuestionMessage = simplifyPostQuestionMessage(postQuestionMessage);
                            return callback(null, postQuestionMessage);


                        } else {

                            let postQuestionMessage = null;
                            // no workspaceFollowers to delete return
                            return callback(null, postQuestionMessage);

                        }


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        console.log(error);
                        let postQuestionMessage = null;
                        // no workspaceFollowers to delete return
                        return callback(null, postQuestionMessage);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });


                } else {

                    // this post is not a question post but a normal post so no answer

                    let postQuestionMessage = null;
                    // no workspaceFollowers to delete return
                    return callback(null, postQuestionMessage);
                }



            }

            function getPostMessageComments(callback) {

                    console.log("starting getPostMessageComments function.");

                    let POSTMESSAGECOMMENT = Parse.Object.extend("PostMessage");
                    let queryPostMessageComment = new Parse.Query(POSTMESSAGECOMMENT);
                    //queryPostChatMessage.equalTo("workspace", workspace);
                    //queryPostChatMessage.equalTo("channel", channel);
                    queryPostMessageComment.equalTo("post", post);
                    //queryPostMessageComment.select(PostMessageReplyArray_1);
                    //queryPostMessageComment.equalTo("type", "comment");
                    if (Post.type === 'question') {
                        //queryPostMessageComment.equalTo("type", "question");
                        //queryPostMessageComment.equalTo("type", "answer");

                        queryPostMessageComment.select(PostMessageReplyArray_1);


                    } else if (Post.type === 'post') {

                        queryPostMessageComment.notEqualTo("type", "question");
                        queryPostMessageComment.select(PostMessageReplyArray_2);

                    }
                    queryPostMessageComment.include( ["user"] );
                    queryPostMessageComment.limit(2);
                    queryPostMessageComment.descending("createdAt");

                    //queryPostMessageComment.doesNotExist("parentPostMessage");
                    queryPostMessageComment.find({
                        useMasterKey: true
                        //sessionToken: sessionToken
                    }).then((PostChatMessages) => {

                        console.log("getPostMessageComments: " + JSON.stringify(PostChatMessages));


                        if (PostChatMessages.length !== 0) {

                            let simplifiedPostChatMessages = [];

                            if (PostChatMessages.length === 2) {

                                simplifiedPostChatMessages.push(simplifyPostChatMessage(PostChatMessages[1]));
                                simplifiedPostChatMessages.push(simplifyPostChatMessage(PostChatMessages[0]));


                            } else if (PostChatMessages.length === 1) {

                                simplifiedPostChatMessages.push(simplifyPostChatMessage(PostChatMessages[0]));

                            }

                            console.log("simplifyPostChatMessage: " + JSON.stringify(PostChatMessages));


                            return callback(null, simplifiedPostChatMessages);


                        } else {

                            let PostChatMessages = [];
                            // no workspaceFollowers to delete return
                            return callback(null, PostChatMessages);

                        }


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        console.log(error);
                        let PostChatMessages = [];
                        // no workspaceFollowers to delete return
                        return callback(null, PostChatMessages);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });





            }

            function getPostMessageQuestions(callback) {

                    console.log("starting getPostMessageQuestions function.");

                    let POSTMESSAGEQUESTION = Parse.Object.extend("PostMessage");
                    let queryPostMessageQuestion = new Parse.Query(POSTMESSAGEQUESTION);
                    //queryPostChatMessage.equalTo("workspace", workspace);
                    //queryPostChatMessage.equalTo("channel", channel);
                    queryPostMessageQuestion.equalTo("post", post);
                    queryPostMessageQuestion.equalTo("type", "question");
                    queryPostMessageQuestion.include( ["user"] );
                    queryPostMessageQuestion.select(PostMessageQuestionArray);
                    queryPostMessageQuestion.limit(10);
                    queryPostMessageQuestion.doesNotExist("parentPostMessage");
                    queryPostMessageQuestion.descending("likedCount");

                    queryPostMessageQuestion.find({
                        useMasterKey: true
                        //sessionToken: sessionToken
                    }).then((PostChatMessages) => {

                        console.log("getPostMessageQuestions: " + JSON.stringify(PostChatMessages));


                        if (PostChatMessages.length !== 0) {

                            let simplifiedPostChatMessages = [];

                            for (var i = 0; i < PostChatMessages.length; i++) {

                                simplifiedPostChatMessages.push(simplifyPostChatMessage(PostChatMessages[i]));
                                //console.log("simplifyPostChatMessage: " + JSON.stringify(PostChatMessages[i]));

                                if (i === (PostChatMessages.length-1)) {

                                    // finished iterating through all items

                                    return callback(null, simplifiedPostChatMessages);

                                }

                            }


                        } else {

                            let PostChatMessages = [];
                            // no workspaceFollowers to delete return
                            return callback(null, PostChatMessages);

                        }


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        console.log(error);
                        let PostChatMessages = [];
                        // no workspaceFollowers to delete return
                        return callback(null, PostChatMessages);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });




            }

            function createPostSocial (callback) {

                console.log("starting createPostSocial function: " + JSON.stringify(Post.get("isNew")));


                if (Post.get("isNew")) {

                    let POSTSOCIAL = Parse.Object.extend("PostSocial");
                    let postSocial = new POSTSOCIAL();

                    postSocial.set("isLiked", false);
                    postSocial.set("isBookmarked", false);
                    postSocial.set("archive", false);
                    postSocial.set("isDelivered", false);
                    postSocial.set("hasRead", false);
                    postSocial.set("user", user);
                    postSocial.set("workspace", workspace);
                    postSocial.set("channel", channel);
                    postSocial.set("post", Post);

                    console.log("postSocial: " + JSON.stringify(postSocial));


                    postSocial.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((PostSocial) => {
                        // The object was retrieved successfully.
                        //console.log("Result from get " + JSON.stringify(Workspace));

                        console.log("done PostSocial : " + JSON.stringify(PostSocial));


                        return callback (null, PostSocial);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback(error); 
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });



                } else {

                    return callback (null, Post);


                }


            }


            async.parallel([
                async.apply(prepIndex),
                async.apply(getPostMessageQuestions),
                async.apply(getPostMessageComments),
                async.apply(getTopAnswerForQuestionPost),
                async.apply(createPostSocial)

            ], function (err, results) {
                if (err) {
                    response.error(err);
                }

                // console.log("starting show results " + JSON.stringify(results.length));


                if (results.length > 0) {

                    //console.log("afterSave Post results length: " + JSON.stringify(results.length));

                    let postToSave = results[0];
                    let postMessageQuestions = results[1];
                    let postMessageComments = results[2];
                    //let postSocial = results[4];
                    let topAnswerForQuestionPost = results[3];

                    postToSave.postQuestions = postMessageQuestions;
                    postToSave.chatMessages = postMessageComments;
                    //postToSave.PostSocial = postSocial;
                    postToSave.topAnswer = topAnswerForQuestionPost;
                    postToSave.user = simplifyUser(user);


                    //console.log("postQuestions: " + JSON.stringify(postMessageQuestions));
                    //console.log("chatMessages: " + JSON.stringify(postMessageComments));
                    //console.log("PostSocial: " + JSON.stringify(postSocial));
                    //console.log("topAnswer: " + JSON.stringify(postToSave.topAnswer));
                    let PostSocial_txt = 'PostSocial';

                    console.log("postToSave afterSave Post: " + JSON.stringify(postToSave));

                    splitObjectAndIndex({'user':currentUser, 'object':postToSave, 'className':'PostSocial', 'loop':true}, {
                        success: function (count) {

                            let Final_Time = process.hrtime(time);
                            console.log(`splitObjectToIndex took ${(Final_Time[0] * NS_PER_SEC + Final_Time[1]) * MS_PER_NS} milliseconds`);

                            response.success();
                        },
                        error: function (error) {
                            response.error(error);
                        }
                    });


                } else {

                    response.error("error in afterSave Post");
                }


            });
        }


        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            console.log(error);

            return response.error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });



}, {useMasterKey: true});

// Add and Update AlgoliaSearch post object if it's deleted from Parse
Parse.Cloud.afterSave('PostMessage', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.afterSave.PostMessage.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let USER = Parse.Object.extend("_User");
    let user = new USER();

    // Convert Parse.Object to JSON
    let postMessage = request.object;
    let postMessageToSave = postMessage.toJSON();

    //var Post = Parse.Object.extend("Post");
    let POSTMESSAGE = Parse.Object.extend("PostMessage");
    let queryPostMessage = new Parse.Query(POSTMESSAGE);
    queryPostMessage.include( ["user", "parentPostMessage"] );
    queryPostMessage.equalTo("objectId", postMessage.id);
    queryPostMessage.select(PostMessageArray);



    //console.log("Request: " + JSON.stringify(request));
    //console.log("objectID: " + objectToSave.objectId);
    //console.log("objectID: " + objectToSave.user.objectId);

    queryPostMessage.first({
        useMasterKey: true
        //sessionToken: sessionToken
    }).then((PostMessage) => {


        let postMessageACL = PostMessage.getACL();
        //console.log("postMessageACL: " + JSON.stringify(postMessageACL));

        user = PostMessage.get("user");
        //console.log("user: " + JSON.stringify(user));

        currentUser = currentUser ? currentUser : user;


        let CHANNEL = Parse.Object.extend("Channel");
        let channel = new CHANNEL();
        channel.id = PostMessage.get("channel").id;
        //console.log("channel: " + JSON.stringify(channel));

        let WORKSPACE = Parse.Object.extend("WorkSpace");
        let workspace = new WORKSPACE();
        workspace.id = PostMessage.get("workspace").id;
        //console.log("workspace: " + JSON.stringify(workspace));

        let POST = Parse.Object.extend("Post");
        let Post = new POST();
        Post.id = PostMessage.get("post").id;
        //console.log("Post: " + JSON.stringify(Post));

        let PARENTPOSTMESSAGE = Parse.Object.extend("PostMessage");
        let ParentPostMessage = new PARENTPOSTMESSAGE();
        if (PostMessage.get("parentPostMessage")) {
            ParentPostMessage.id = PostMessage.get("parentPostMessage").id;
        }

        function prepIndex (callback) {

            // Successfully retrieved the object.
            //console.log("ObjectToSave: " + JSON.stringify(post));

            // Convert Parse.Object to JSON
            let PostMessageUser = simplifyUser(PostMessage.get("user"));

            PostMessage = PostMessage.toJSON();
            PostMessage.user = PostMessageUser;



            // Specify Algolia's objectID with the Parse.Object unique ID
            //Post.objectID = Post.objectId;

            // set _tags depending on the post ACL

            if (postMessageACL) {

                if (postMessageACL.getPublicReadAccess()) {

                    // this means it's public read access is true
                    PostMessage._tags = ['*'];

                }

                /*
                 else if (!postACL.getPublicReadAccess() && postACL.getReadAccess(user)) {


                 // this means this user has read access
                 Post._tags = [user.id];

                 } else if (!postACL.getPublicReadAccess() && post.ACL.getReadAccess(roleChannel)) {

                 // this means any user with this channel is private and channel-role will have access i.e. they are a member of this channel
                 Post._tags = [roleChannel];

                 }



                 */


            } else if (!postMessageACL || postMessageACL === null) {

                // this means it's public read write
                PostMessage._tags = ['*'];
            }




            return callback(null, PostMessage);

        }

        function getTopAnswerForQuestionMessage (callback) {

            if (PostMessage.type === 'question') {

                let POSTMESSAGE = Parse.Object.extend("PostMessage");
                let queryPostQuestionMessage= new Parse.Query(POSTMESSAGE);
                //queryPostQuestionMessage.equalTo("workspace", workspace);
                //queryPostQuestionMessage.equalTo("channel", channel);
                queryPostQuestionMessage.equalTo("parentPostMessage", PostMessage.id);
                //queryPostQuestionMessage.equalTo("archive", false);
                queryPostQuestionMessage.equalTo("type", "answer");
                queryPostQuestionMessage.descending("voteRank");
                queryPostQuestionMessage.first({
                    useMasterKey: true
                    //sessionToken: sessionToken
                }).then((postMessage) => {


                    if (postMessage) {

                        //postMessage = simplifyPostQuestionMessage(postMessage);
                        return callback (null, postMessage);


                    } else {

                        let postMessage = [];
                        // no workspaceFollowers to delete return
                        return callback(null, postMessage);

                    }



                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    console.log(error);
                    console.log("getTopAnswerForQuestionMessage" );
                    let postMessage = [];
                    // no workspaceFollowers to delete return
                    return callback(null, postMessage);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });


            } else {

                let postMessage = [];
                return callback(null, postMessage);


            }



        }

        function saveParentPost (callback) {

            Post.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            return callback(null, Post);
        }

        async.parallel([
            async.apply(prepIndex),
            async.apply(getTopAnswerForQuestionMessage),
            async.apply(saveParentPost)


        ], function (err, results) {
            if (err) {
                response.error(err);
            }

            if (results.length > 0) {

               // console.log("afterSave postMessage results length: " + JSON.stringify(results.length));

                postMessageToSave = results[0];
                //let chatMessages = results[2];
                //let postSocial = results[3];
                //let topAnswerForQuestionPost = results[3];

                //postToSave.postQuestions = postQuestions;
                //postToSave.chatMessages = chatMessages;
                //postToSave.PostSocial = postSocial;
                //postToSave.topAnswer = topAnswerForQuestionPost;


                //console.log("postQuestions: " + JSON.stringify(postQuestions));
                //console.log("chatMessages: " + JSON.stringify(chatMessages));
                //console.log("PostSocial: " + JSON.stringify(postSocial));
                //console.log("topAnswer: " + JSON.stringify(postToSave.topAnswer));

                splitObjectAndIndex({'user':currentUser, 'object':postMessageToSave, 'className':'PostMessageSocial', 'loop':true}, {
                    success: function(count) {

                        let Final_Time = process.hrtime(time);
                        console.log(`splitObjectToIndex postMessage took ${(Final_Time[0] * NS_PER_SEC + Final_Time[1]) * MS_PER_NS} milliseconds`);

                        response.success();
                    },
                    error: function(error) {
                        response.error(error);
                    }
                });



            } else {

                response.error("error in afterSave postMessage");
            }


        });



    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        console.log(error);
        return response.error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });



}, {useMasterKey: true});



// Create QnA's from meetingsSnippet
Parse.Cloud.afterSave('MeetingSnippet', function(req, response) {

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.009.afterSave-User.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

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

                useMasterKey: true
                //sessionToken: sessionToken

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

            useMasterKey: true
            //sessionToken: sessionToken

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

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.009.afterSave-User.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

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
                Workspace = meetingObject.get("workspace");
                //console.log("workspace ID: "  + JSON.stringify(Workspace.id));

                var Channel = new Parse.Object("Channel");
                Channel = meetingObject.get("channel");
                //console.log("Channel ID: "  + JSON.stringify(Channel.id));

                var User = new Parse.Object("_User");
                User = meetingObject.get("user");
                //console.log("User ID: "  + JSON.stringify(User.id));

                //console.log("meetingPost: " + JSON.stringify(meetingPost));

                if (meetingObject.get("workspace")) {meetingPost.set("workspace", Workspace);}
                if (meetingObject.get("channel")) {meetingPost.set("channel", Channel);}
                if (meetingObject.get("user")) { meetingPost.set("user", User);}
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
                    //meetingPost.set("CommentCount", 0);
                    meetingPost.set("likesCount", 0);
                    meetingPost.set("media_duration", meetingObject.get("MeetingDuration"));

                }

                //console.log("meetingPost2: " + JSON.stringify(meetingPost));


                meetingPost.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((meetingPost) => {
                    // Execute any logic that should take place after the object is saved.
                    //alert('New object created with objectId: ' + meetingPost.id);
                    //console.log("meetingPost3: " + JSON.stringify(meetingPost.id));

                    if (!meetingObject.get("post")) {
                        meetingObject.set("post", meetingPost);
                        meetingObject.save(null, {

                            useMasterKey: true
                            //sessionToken: sessionToken

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

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.009.afterSave-User.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let User = request.object;
    let userToSave = request.object.toJSON();

    let queryUser = new Parse.Query("_User");
    queryUser.include( ["currentCompany"] );

    //console.log("request User: " + JSON.stringify(User));

        //queryUser.equalTo("objectId", userToSave.objectId);

    queryUser.get(userToSave.objectId , {

        useMasterKey: true
        //sessionToken: sessionToken

    }).then((user) => {
        // The object was retrieved successfully.
        //console.log("Result from get " + JSON.stringify(Workspace));


        let USER = Parse.Object.extend("_User");
        let userObject = new USER();
        userObject.id = user.objectId;

        let userToSave = simplifyUserMentions(user);

        let userACL = user.getACL();

        //console.log("isNew: " + JSON.stringify(user.get("isNew")));
        //console.log("isDirtyProfileimage: " + JSON.stringify(user.get("isDirtyProfileimage")));

        function updateAlgoliaWorkspaceExpertProfileImage (callback) {

            console.log("displayName: " + JSON.stringify(user.toJSON().displayName));

            if (user.get("isDirtyProfileimage") !== true && user.get("isDirtyIsOnline") !== true && user.get("isDirtyTyping") !== true && user.get("isDirtyShowAvailability") !== true) {

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


            userQuery.equalTo("objectId", userToSave.objectId);
            console.log("username: " + JSON.stringify(userToSave.username));
            workspaceQuery.matchesQuery("experts", userQuery);
            workspaceQuery.select(["user.fullname", "user.displayName", "user.isOnline", "user.showAvailability", "user.profileimage", "user.createdAt", "user.updatedAt", "user.objectId", "type", "archive","workspace_url", "workspace_name", "experts", "ACL", "objectId", "mission", "description","createdAt", "updatedAt", "followerCount", "memberCount", "isNew", "image"]);

            workspaceQuery.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((objectsToIndex) => {
                // The object was retrieved successfully.
                console.log("Result from get " + JSON.stringify(objectsToIndex.length));

                var workspaces = objectsToIndex;
                console.log("workspaces length: " + JSON.stringify(workspaces.length));

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

                        return callback (null, objectsToIndex);

                    });

                });

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                return callback (error);

            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });



        }

        function prepIndex(callback) {

            // set _tags depending on the post ACL

            if (userACL) {

                if (userACL.getPublicReadAccess()) {

                    // this means it's public read access is true
                    userToSave._tags = ['*'];

                }

                /*
                 else if (!postACL.getPublicReadAccess() && postACL.getReadAccess(user)) {


                 // this means this user has read access
                 Post._tags = [user.id];

                 } else if (!postACL.getPublicReadAccess() && post.ACL.getReadAccess(roleChannel)) {

                 // this means any user with this channel is private and channel-role will have access i.e. they are a member of this channel
                 Post._tags = [roleChannel];

                 }



                 */


            } else if (!userACL || userACL === null) {

                // this means it's public read write
                console.log("no userACL for this post.");
                userToSave._tags = ['*'];
            }

            //console.log("userToSave: " + JSON.stringify(userToSave));


            return callback(null, userToSave);

        }

        function getSkills(callback) {

            //console.log("workspace.get_isDirtySkills: " + JSON.stringify(workspace.get("isDirtySkills")));
            //console.log("Skill Length:" + skillObject);

            //let skillObject = Parse.Object.extend("Skill");
            //var skillsRelation = new skillObject.relation("skills");
            let skillRelation= user.get("mySkills");

            //console.log("user in getSkills: " + JSON.stringify(user));


            let skillRelationQuery = skillRelation.query();

            skillRelationQuery.ascending("level");

            //console.log("skillObject Exists: " + JSON.stringify(skillRelation));

            skillRelationQuery.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((skill) => {

                //console.log("skill: " + JSON.stringify(skill));

                let skillObject = [];

                if (skill) {

                    // skills exist return then then
                    skillObject = skill;
                } else {

                    // do nothing and return empty skill object no skills;

                }

                return callback(null, skillObject);


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                console.log("error: " + JSON.stringify(error));
                return callback(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });



        }

        function getSkillsToLearn (callback) {

            //console.log("workspace.get_isDirtySkills: " + JSON.stringify(workspace.get("isDirtySkills")));
            //console.log("Skill Length:" + skillObject);

            let skillObject = Parse.Object.extend("Skill");
            //var skillsRelation = new skillObject.relation("skills");
            skillObject = user.get("skillsToLearn");

            let skillObjectQuery = skillObject.query();
            skillObjectQuery.ascending("level");

            skillObjectQuery.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((skill) => {

                let skillObject = [];

                if (skill) {

                    // skills exist return then then
                    skillObject = skill;

                    //console.log("skillsToLearn: " + JSON.stringify(skillObject));

                } else {

                    // do nothing and return empty skill object no skills;
                    //console.log("skillsToLearn: " + JSON.stringify(skillObject));

                }

                return callback (null, skillObject);


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                return callback (error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


        }

        function getWorkspaceFollowers (callback) {


            let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
            let queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);

            queryWorkspaceFollower.equalTo("user", user);

            queryWorkspaceFollower.limit(10000);
            queryWorkspaceFollower.include( ["user"] );
            queryWorkspaceFollower.equalTo("isFollower", true);

            queryWorkspaceFollower.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((followers) => {

                //console.log("user workspace followers: " + JSON.stringify(followers));


                return callback (null, followers);


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                return callback (error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });



        }

        async.parallel([
            async.apply(updateAlgoliaWorkspaceExpertProfileImage),
            async.apply(prepIndex),
            async.apply(getSkills),
            async.apply(getSkillsToLearn),
            async.apply(getWorkspaceFollowers)


        ], function (err, results) {
            if (err) {
                response.error(err);
            }

            console.log("starting show results " + JSON.stringify(results.length));


            if (results.length > 0) {

                //console.log("afterSave _User results length: " + JSON.stringify(results.length));

                let userToSaveFinal = results[1];
                let mySkills = results[2];
                let skillsToLearn = results[3];
                let workspaceFollowers = results[4];

                //console.log("userToSaveFinal: " + JSON.stringify(userToSaveFinal));

                //workspaceFollowers = simplifyWorkspaceFollowersUserIndex(workspaceFollowers[0]);
                //console.log("workspaceFollowers simplified for _User index: " + JSON.stringify(workspaceFollowers));

                //userToSaveFinal.mySkills = mySkills;
                //userToSaveFinal.skillsToLearn = skillsToLearn;

                //console.log("mySkills: " + JSON.stringify(mySkills));
                //console.log("skillsToLearn: " + JSON.stringify(skillsToLearn));

                if (!workspaceFollowers || workspaceFollowers.length === 0) {

                    userToSaveFinal.workspaceFollowers = [];
                    userToSaveFinal.roles = [];

                    userToSaveFinal.objectID = userToSaveFinal.objectId + '-' + '0';

                    //console.log("userToSaveFinal: " + JSON.stringify(userToSaveFinal));

                    indexUsers.partialUpdateObject(userToSaveFinal, true, function(err, content) {
                        if (err) return response.error(err);

                        console.log("Parse<>Algolia object saved from _User afterSave function ");

                        return response.success();


                    });
                } else {


                    if (user.get("isUpdateAlgoliaIndex") === true) {

                        console.log("isUpdateAlgoliaIndex: " + JSON.stringify(user.get("isUpdateAlgoliaIndex")));

                        splitUserAndIndex({'user': user, 'object': userToSaveFinal, 'className': 'Role', 'loop': true, 'workspaceFollowers': workspaceFollowers}, {
                            success: function (count) {

                                let Final_Time = process.hrtime(time);
                                console.log(`splitUserAndIndex took ${(Final_Time[0] * NS_PER_SEC + Final_Time[1]) * MS_PER_NS} milliseconds`);

                                return response.success();
                            },
                            error: function (error) {
                                return response.error(error);
                            }
                        });


                    } else {

                        response.success();
                    }




                }



            } else {

                return response.error("error in afterSave Post");
            }



        });

    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        response.error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });


}, {useMasterKey: true});


Parse.Cloud.afterSave('ChannelFollow', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    // Convert Parse.Object to JSON
    let channelfollow = request.object;

    let USER = Parse.Object.extend("_User");
    let user = new USER();
    user.id = channelfollow.get("user").id;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = channelfollow.get("workspace").id;

    console.log("afterSave ChannelFollow: " + JSON.stringify(channelfollow));

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.002.afterSave-ChannelFollow.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }


    function addIsSelectedChannelFollowPointerWorkspaceFollow (callback) {

        console.log("channelfollow.isSelected: " + channelfollow.toJSON().isSelected);

        if (channelfollow.toJSON().isSelected === true) {

            // add selected ChannelFollow as pointer to workspace_follower
            let queryWorkspaceFollow = new Parse.Query("workspace_follower");
            queryWorkspaceFollow.equalTo("user", user);
            queryWorkspaceFollow.equalTo("workspace", workspace);

            queryWorkspaceFollow.first({

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((workspaceFollow) => {
                // The object was retrieved successfully.



                workspaceFollow.set("isSelectedChannelFollow", channelfollow);
                workspaceFollow.set("user", user);
                workspaceFollow.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }

                );

                return callback (null, channelfollow);


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                //console.log("channelfollowisSelected not found");
                response.error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

        }
        else if (channelfollow.toJSON().isSelected === false) {

            // add selected ChannelFollow as pointer to workspace_follower
            let queryWorkspaceFollow = new Parse.Query("workspace_follower");
            queryWorkspaceFollow.equalTo("user", user);
            queryWorkspaceFollow.equalTo("workspace", workspace);

            queryWorkspaceFollow.first({

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((workspaceFollow) => {
                // The object was retrieved successfully.

                workspaceFollow.set("isSelectedChannelFollow", null);
                workspaceFollow.set("user", user);

                workspaceFollow.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }

                );

                return callback (null, channelfollow);


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                //console.log("channelfollowisSelected not found");
                response.error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

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

            let finalTime = process.hrtime(time);
            console.log(`finalTime took afterSave ChannelFollow ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
            response.error(err);
        }

        //console.log("results length: " + JSON.stringify(results));

        let finalTime = process.hrtime(time);
        console.log(`finalTime took afterSave ChannelFollow${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
        response.success(results);


    });


}, {useMasterKey: true});


Parse.Cloud.afterSave('workspace_follower', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    // Convert Parse.Object to JSON
    let workspace_follow = request.object;

    let USER = Parse.Object.extend("_User");
    let user = new USER();
    user.id = workspace_follow.get("user").id;

    let WORKSPACEFOLLOW = Parse.Object.extend("workspace_follower");
    let workspace_follower = new WORKSPACEFOLLOW();
    workspace_follower.id = workspace_follow.id;


    //console.log("afterSave workspace_follower: " + JSON.stringify(workspace_follow));

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.006.afterSave-workspace_follower.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }


    function addIsSelectedWorkspaceFollowPointerToUser (callback) {

        //console.log("workspace_follow.isSelected: " + workspace_follow.toJSON().isSelected);

        if (workspace_follow.toJSON().isSelected === true) {

            //console.log("workspaceFollow aftersave user: " + JSON.stringify(user));

            user.set("isSelectedWorkspaceFollower", workspace_follower);
            user.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }

            );

            return callback (null, workspace_follow);

        }
        else {

            return callback (null, workspace_follow);

        }


    }

    async.parallel([
        async.apply(addIsSelectedWorkspaceFollowPointerToUser)
        // async.apply(addChannelsToAlgolia)

    ], function (err, results) {
        if (err) {

            let finalTime = process.hrtime(time);
            console.log(`finalTime took afterSave workspace_follower ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
            response.error(err);
        }

        //console.log("results length: " + JSON.stringify(results));

        let finalTime = process.hrtime(time);
        console.log(`finalTime took afterSave workspace_follower ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
        return response.success();


    });


}, {useMasterKey: true});


Parse.Cloud.afterSave('Channel', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    // Convert Parse.Object to JSON
    let Channel = request.object;

    //console.log("afterSaveChannel req.user: " + JSON.stringify(request.user));

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.004.afterSave-Channel.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }


    let CHANNEL = Parse.Object.extend("Channel");
    let queryChannel = new Parse.Query(CHANNEL);
    //queryChannel.equalTo("objectId", request.object.id);
    queryChannel.include( ["user", "workspace", "category"] );
    //queryChannel.select(["user", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url", "channel.name", "channel.type", "channel.archive"]);

    //console.log("Request: " + JSON.stringify(request));
    //console.log("objectID: " + objectToSave.objectId);
    //console.log("Channel.id: " + JSON.stringify(Channel.id));

    queryChannel.get(Channel.id, {

        useMasterKey: true
        //sessionToken: sessionToken

    }).then((channel) => {
        // The object was retrieved successfully.
        //console.log("Result from get channel" + JSON.stringify(channel));

        let WORKSPACE = Parse.Object.extend("WorkSpace");
        let workspace = new WORKSPACE();
        workspace.id = channel.get("workspace").id;

        let USER = Parse.Object.extend("_User");
        let User = new USER();
        User.id = channel.get("user").id;

        let channelToSave = channel.toJSON();

        function createOwnerChannelFollow (callback) {

            console.log("channel isNew: " + channel.get("isNew"));
            //console.log("ACL Channel: " + JSON.stringify(channel.getACL()));

            if (channel.get("isNew") === true) {

                // channel is new so let's add a channelfollow row for the channel creator so he can see the channel
                let CHANNELFOLLOW = Parse.Object.extend("ChannelFollow");
                let channelFollow = new CHANNELFOLLOW();

                let Channel = new CHANNEL();
                Channel.id = channel.id;

                //let expertChannelRelation = channel.relation("experts");
                //console.log("expertChannelRelation: " + JSON.stringify(expertChannelRelation));

                //console.log("ObjectToSave: " + JSON.stringify(channel.getACL()));

                channelFollow.set("archive", false);
                channelFollow.set("user", User);
                channelFollow.set("workspace", workspace);
                channelFollow.set("channel", Channel);
                channelFollow.set("notificationCount", 0);
                channelFollow.set("isSelected", false);
                channelFollow.set("isNewChannel", true);


                // set correct ACL for channelFollow
                let channelFollowACL = new Parse.ACL();
                channelFollowACL.setPublicReadAccess(false);
                channelFollowACL.setPublicWriteAccess(false);
                channelFollowACL.setReadAccess(User, true);
                channelFollowACL.setWriteAccess(User, true);
                channelFollow.setACL(channelFollowACL);

                // since workspace followers can't create a channel, for now we are setting each channel creator as isMember = true
                channelFollow.set("isMember", true);
                channelFollow.set("isFollower", true);

                //console.log("channelFollow: " + JSON.stringify(channelFollow));

                channelFollow.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                return callback(null, channelFollow);



            }
            else {return callback (null, channel);}


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

        function incrementChannelCounttoWorkspace (callback) {

            if (channel.get("isNew") === true && channel.get("isNewWorkspace") === false) {

                workspace.increment("channelCount");
                workspace.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                return callback (null, workspace);

            }
            else {

                return callback (null, workspace);

            }

        }

        function saveGeneralChannelPointer (callback) {

            if (channel.get("isNewWorkspace") === true && channel.get("name") === 'general') {

                // this is the general channel let's save the pointer to the workspace
                workspace.set("generalChannel", channel);
                workspace.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                return callback (null, workspace);
            }
            else {

                return callback (null, workspace);

            }
        }


        async.parallel([
            async.apply(createOwnerChannelFollow),
            async.apply(addChannelsToAlgolia),
            async.apply(incrementChannelCounttoWorkspace),
            async.apply(saveGeneralChannelPointer)

        ], function (err, results) {
            if (err) {

                let finalTime = process.hrtime(time);
                console.log(`finalTime took  afterSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
                response.error(err);
            }

            //console.log("results length: " + JSON.stringify(results));

            let finalTime = process.hrtime(time);
            console.log(`finalTime took afterSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
            response.success(results);


        });

    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        console.log(`finalTime took  afterSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
        response.error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });



}, {useMasterKey: true});


// Add and Update AlgoliaSearch user object if it's deleted from Parse
Parse.Cloud.afterSave('Skill', function(request) {

    // Convert Parse.Object to JSON
    let objectToSave = request.object.toJSON();

    // Specify Algolia's objectID with the Parse.Object unique ID
    objectToSave.objectID = objectToSave.objectId;
    objectToSave._tags = ['*'];

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

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.008.afterSave-WorkSpace.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    // Convert Parse.Object to JSON
    let workspace = request.object;

    let workspaceToSave = request.object.toJSON();

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let queryWorkspace = new Parse.Query(WORKSPACE);

    queryWorkspace.equalTo("objectId", workspaceToSave.objectId);
    queryWorkspace.include( ["user"] );
    queryWorkspace.select(["isDirtySkills", "isDirtyExperts", "expertsArray", "user.fullname", "user.displayName", "user.isOnline", "user.showAvailability", "user.profileimage", "user.createdAt", "user.updatedAt", "user.objectId", "type", "archive","workspace_url", "workspace_name", "experts", "ACL", "objectId", "mission", "description","createdAt", "updatedAt", "followerCount", "memberCount", "isNew", "skills", "image"]);

    console.log("Workspace Object: " + JSON.stringify(workspace));
    //console.log("objectID: " + objectToSave.objectId);
    //console.log("objectID: " + objectToSave.user.objectId);

    //var Workspace = new Parse.Object("WorkSpace");

    queryWorkspace.get(workspace.id , {

        useMasterKey: true
        //sessionToken: sessionToken

    }).then((Workspace) => {
        // The object was retrieved successfully.
        //console.log("Result from get " + JSON.stringify(Workspace));

        //var workspace = Parse.Object.extend("WorkSpace");

        //let WORKSPACE_FOLLOW = Parse.Object.extend("workspace_follower");
        let owner = new Parse.Object("_User");
        owner = workspace.get("user");

        let User = new Parse.Object("_User");
        User.id = workspace.get("user").id;

        let WorkSpace = new Parse.Object("WorkSpace");
        WorkSpace.id =  Workspace.id;

        workspace = Workspace;
        workspaceToSave = Workspace.toJSON();
        //console.log("Workspace from afterSave Query: " + JSON.stringify(WorkSpace));

        let skillObject = Parse.Object.extend("Skill");
        //var skillsRelation = new skillObject.relation("skills");
        skillObject = workspace.get("skills");

        function createWorkspaceRoles (callback) {

            //console.log("isNew: " + workspace.get("isNew"));

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
                //console.log("ownerRole 1: " + JSON.stringify(ownerRole));
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

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((savedRoles) => {

                    //console.log("savedRoles: " + JSON.stringify(savedRoles));

                    var memberrole = savedRoles[4];
                    //memberrole.getUsers().add(usersToAddToRole);
                    memberrole.getRoles().add(followerRole);
                    memberrole.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    var moderatorrole = savedRoles[3];
                    //memberrole.getUsers().add(usersToAddToRole);
                    moderatorrole.getRoles().add(memberRole);
                    moderatorrole.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    var adminrole = savedRoles[2];
                    //memberrole.getUsers().add(usersToAddToRole);
                    adminrole.getRoles().add(moderatorRole);
                    adminrole.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    var expertrole = savedRoles[1];
                    expertrole.getUsers().add(owner);
                    //expertrole.getUsers().add(usersToAddToRole);
                    expertrole.getRoles().add(moderatorRole);
                    expertrole.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    var ownerrole = savedRoles[0];
                    ownerrole.getUsers().add(owner);
                    ownerrole.getRoles().add(expertRole);
                    ownerrole.getRoles().add(adminRole);
                    ownerrole.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    var userRolesRelation = owner.relation("roles");
                    userRolesRelation.add(ownerRole); // add owner role to the user roles field.
                    userRolesRelation.add(expertrole); // add owner role to the user roles field.
                    owner.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });


                    return callback (null, savedRoles);


                });


            }
            else {return callback (null, workspace);}

        }

        function getSkills (callback) {

            //console.log("workspace.get_isDirtySkills: " + JSON.stringify(workspace.get("isDirtySkills")));
            //console.log("Skill Length:" + skillObject);

            let skillObjectQuery = skillObject.query();
            skillObjectQuery.ascending("level");

            skillObjectQuery.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((skill) => {

                let skillObject = [];

                if (skill) {

                    // skills exist return then then
                    skillObject = skill;
                } else {

                    // do nothing and return empty skill object no skills;

                }

                return callback (null, skillObject);


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                return callback (error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });




        }

        function getExperts (callback) {

            let expertObject = Parse.Object.extend("_User");
            expertObject = workspace.get("experts");
            let expertsArray = [];

            if (workspace.get("isNew")) {

                expertsArray = workspace.get("expertsArray");

                //console.log("isNew Workspace expertsArray: " + JSON.stringify(expertsArray));

                return callback (null, expertsArray);

            } else {

                console.log("workspace.dirty_experts: " + JSON.stringify(workspace.dirty("experts")));

                if (workspace.get("isDirtyExperts")) {

                    // expert being added or removed, update algolia, else return callback.

                    expertObject.query().select(["fullname", "displayName", "isOnline", "showAvailability", "profileimage", "createdAt", "updatedAt", "objectId"]).find({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((experts) => {

                        // Convert Parse.Object to JSON
                        //workspace = workspace.toJSON();
                        let User = new Parse.Object("_User");
                        let queryRole = new Parse.Query(Parse.Role);

                        //console.log("\n Experts: " + JSON.stringify(experts));

                        queryRole.equalTo('name', 'expert-' + workspace.id);

                        queryRole.first({

                            useMasterKey: true
                            //sessionToken: sessionToken

                        }).then((role) => {

                            let expertrole = role;

                            console.log("Role: " + JSON.stringify(role));

                            expertrole.getUsers().add(experts);
                            expertrole.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });
                            //var userRolesRelation;

                            for (let i = 0; i < experts.length; i++) {

                                let expertObject = experts[i];

                                let userRolesRelation = expertObject.relation("roles");
                                console.log("userRolesRelation afterSave Workspace: " + JSON.stringify(userRolesRelation));
                                userRolesRelation.add(expertrole); // add owner role to the user roles field.
                                expertObject.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                            }

                            return callback (null, experts);


                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            return callback (error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback (error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

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

            let followersArray = [];

            if (workspace.get("isNew")) {

                //console.log("isNew Workspace no followers yet except workspace owner: " + JSON.stringify(followersArray));

                return callback (null, followersArray);

            } else {

                let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
                let queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);

                let viewableBy = [];

                queryWorkspaceFollower.equalTo("workspace", workspace);

                // todo if there is more than 10k people following workspace need to split algolia index into two objects and implement pagination here.
                queryWorkspaceFollower.limit(10000);
                // queryWorkspaceFollower.include( ["workspace"] );

                queryWorkspaceFollower.find({

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((followers) => {

                    console.log("workspace.type: " + JSON.stringify(workspaceToSave.type));

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
                    return callback (error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

            }

        }

        function createOwnerWorkspaceFollower (callback) {

            //console.log("workspace createOwnerWorkspaceFollower  isNew: " + workspace.get("isNew"));
            //console.log("ACL Channel: " + JSON.stringify(channel.getACL()));

            if (workspace.get("isNew") === true) {

                let viewableBy = [];
                let followersArray = [];

                let workspaceFollower = new Parse.Object("workspace_follower");

                //console.log("createOwnerWorkspaceFollower ACL: " + JSON.stringify(workspace));

                workspaceFollower.set("archive", false);
                workspaceFollower.set("user", User);
                workspaceFollower.set("workspace", WorkSpace);
                workspaceFollower.set("notificationCount", 0);
                workspaceFollower.set("isSelected", false);
                workspaceFollower.set("isNewWorkspace", true);

                // set correct ACL for channelFollow
                /*let workspaceFollowACL = new Parse.ACL();
                 workspaceFollowACL.setPublicReadAccess(true);
                 workspaceFollowACL.setPublicWriteAccess(true);
                 workspaceFollowACL.setReadAccess(User, true);
                 workspaceFollowACL.setWriteAccess(User, true);
                 workspaceFollower.setACL(workspaceFollowACL);*/

                // since workspace followers can't create a channel, for now we are setting each channel creator as isMember = true
                workspaceFollower.set("isMember", true);
                workspaceFollower.set("isFollower", true);
                workspaceFollower.set("isMemberRequestedByWorkspaceAdmin", false);
                workspaceFollower.set("isMemberRequestedByUser", false);

                //console.log("workspaceFollower: " + JSON.stringify(workspaceFollower));

                workspaceFollower.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((result) => {

                    // save was successful

                    //console.log("workspace new workspace: " + JSON.stringify(result));

                    workspaceFollower = result;

                    //console.log("workspace new workspace to save: " + JSON.stringify(workspaceFollower));

                    delete workspaceToSave.skills;
                    delete workspaceToSave.experts;

                    workspaceToSave.objectID = workspaceToSave.objectId;
                    followersArray.push(workspaceFollower);
                    workspaceToSave['followers'] = followersArray;

                    //console.log("workspaceToSave with followers: " + JSON.stringify(workspaceToSave));


                    // add _tags for this workspacefollower so it's visible in algolia

                    if (workspace.get("type") === 'private' ) {
                        viewableBy.push(workspaceFollower.toJSON().user.objectId);
                        //console.log("user id viewableBy: " + followers[i].toJSON().user.objectId) ;
                    }


                    if (workspace.get("type") === 'private') {

                        workspaceToSave._tags= viewableBy;
                        //console.log("workspace 2: " + JSON.stringify(workspaceToSave));

                    } else if (workspace.get("type")=== 'public') {

                        workspaceToSave._tags = ['*'];

                    }

                    return callback(null, workspaceToSave);

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    response.error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });


            } else {

                return callback (null, workspace);
            }

        }

        function createGeneralChannel (callback) {

            if (workspace.get("isNew") === true) {

                let CHANNEL = Parse.Object.extend("Channel");
                let Channel = new CHANNEL();

                Channel.set("name", "general");
                Channel.set("default", true);
                Channel.set("type", "public");
                Channel.set("purpose", "Community wide announcements and general questions");
                Channel.set("allowMemberPostCreation", false);
                Channel.set("workspace", workspace);
                Channel.set("user", owner);

                console.log("Channel save in afterSave Workspace cloud function");

                Channel.save(null, {

                        useMasterKey: true,
                        //sessionToken: sessionToken

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
            //async.apply(createGeneralChannel),
            async.apply(createOwnerWorkspaceFollower)

        ], function (err, results) {
            if (err) {
                response.error(err);
            }

            //console.log("results length: " + JSON.stringify(results.length));

            if(workspace.get("isNew")) {
                workspaceToSave = results[4];
                workspace.set("isDirtyExperts", true);

            } else {
                workspaceToSave = results[3];

            }
            let skillsToSave = results[1];
            let expertsToSave = results[2];


            workspaceToSave["skills"] = skillsToSave;


            if (workspace.get("isDirtyExperts")) {
                workspaceToSave["experts"] = expertsToSave;
                delete workspaceToSave.expertsArray;
            } else {

                delete workspaceToSave.experts;
                delete workspaceToSave.expertsArray;

            }

            delete workspaceToSave.isDirtySkills;
            delete workspaceToSave.isDirtyExperts;
            delete workspaceToSave.isNew;
            //delete workspaceToSave.expertsArray;

            if (workspace.get("isNew") === true) {

                let Channel = new Parse.Object("Channel");
                //let Channel = new CHANNEL();

                Channel.set("name", "general");
                Channel.set("default", true);
                Channel.set("type", "public");
                Channel.set("purpose", "Community wide announcements and general questions");
                Channel.set("allowMemberPostCreation", false);
                Channel.set("workspace", workspace);
                Channel.set("user", owner);
                Channel.set("isNewWorkspace", true);

                console.log("Channel save in afterSave Workspace cloud function: " + JSON.stringify(Channel));

                Channel.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }
                );
            }


            //console.log("skillsToSave: " + JSON.stringify(skillsToSave));
            //console.log("expertsToSave: " + JSON.stringify(expertsToSave));
            //console.log("workspaceToSave: " + JSON.stringify(workspaceToSave));

            indexWorkspaces.partialUpdateObject(workspaceToSave, true, function(err, content) {
                if (err) return response.error(err);

                console.log("Parse<>Algolia workspace saved from AfterSave Workspace function ");

                let finalTime = process.hrtime(time);
                console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
                return response.success();

            });


        });

    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        response.error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });


}, {useMasterKey: true});


// Delete AlgoliaSearch post object if it's deleted from Parse
Parse.Cloud.afterDelete('Post', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.afterDelete-Post.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    // Get post object
    let POST = Parse.Object.extend("Post");
    let post = request.object;

    let CHANNEL = Parse.Object.extend("Channel");
    let channel = new CHANNEL();
    channel.id = post.get("channel").id;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = post.get("workspace").id;

    //console.log("request afterDelete Post: " + JSON.stringify(request));

    let USER = Parse.Object.extend("_User");
    let owner = new USER();
    owner.id = post.get("user").id;

    function deletePostSocial (callback) {

        let POSTSOCIAL = Parse.Object.extend("PostSocial");
        let queryPostSocial = new Parse.Query(POSTSOCIAL);
        //queryPostSocial.equalTo("workspace", workspace);
        //queryPostSocial.equalTo("channel", channel);
        queryPostSocial.equalTo("post", post);
        queryPostSocial.limit(10000);
        queryPostSocial.find({
            useMasterKey: true
            //sessionToken: sessionToken
        }).then((postSocials) => {


            if (postSocials) {

                /*Parse.Object.destroyAll(Channel_Followers, {sessionToken: sessionToken}).catch(function(error, result) {

                 if (error) {

                 console.error("Error deleteChannelFollowers " + error.code + ": " + error.message);
                 return callback(error);


                 }

                 if (result) {

                 return callback(null, result);
                 }
                 });*/

                Parse.Object.destroyAll(postSocials, {
                    success: function(result) {
                        console.log('Did successfully delete postSocials in afterDelete Post Cloud Function');
                        return callback(null, result);
                    },
                    error: function(error) {
                        console.error("Error  delete postSocials " + error.code + ": " + error.message);
                        return callback(error);
                    },
                    useMasterKey: true
                    //sessionToken: sessionToken

                });



            } else {

                postSocials = [];
                // no workspaceFollowers to delete return
                return callback(null, postSocials);

            }



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            return callback(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    }

    function deletePostMessage (callback) {

        let POSTQUESTIONMESSAGE = Parse.Object.extend("PostMessage");
        let queryPostQuestionMessage = new Parse.Query(POSTQUESTIONMESSAGE);
        //queryPostQuestion.equalTo("workspace", workspace);
        //queryPostQuestion.equalTo("channel", channel);
        queryPostQuestionMessage.equalTo("post", post);
        queryPostQuestionMessage.limit(10000);
        queryPostQuestionMessage.find({
            useMasterKey: true
            //sessionToken: sessionToken
        }).then((postQuestionMessages) => {


            if (postQuestionMessages) {

                /*Parse.Object.destroyAll(Channel_Followers, {sessionToken: sessionToken}).catch(function(error, result) {

                 if (error) {

                 console.error("Error deleteChannelFollowers " + error.code + ": " + error.message);
                 return callback(error);


                 }

                 if (result) {

                 return callback(null, result);
                 }
                 });*/

                Parse.Object.destroyAll(postQuestionMessages, {
                    success: function(result) {
                        console.log('Did successfully delete postMessages in afterDelete Post Cloud Function');
                        return callback(null, result);
                    },
                    error: function(error) {
                        console.error("Error delete postMessages " + error.code + ": " + error.message);
                        return callback(error);
                    },
                    useMasterKey: true
                    //sessionToken: sessionToken

                });



            } else {

                postQuestionMessages = [];
                // no workspaceFollowers to delete return
                return callback(null, postQuestionMessages);

            }



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            return callback(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });


    }

    function generateAlgoliaObjectIDs (callback) {

        let algoliaObjectIds = [];

        let objectID_Zero = post.id + '-' + '0';

        let POSTSOCIAL = Parse.Object.extend("PostSocial");
        let queryPostSocial = new Parse.Query(POSTSOCIAL);
        //queryPostQuestion.equalTo("workspace", workspace);
        //queryPostQuestion.equalTo("channel", channel);
        queryPostSocial.descending("algoliaIndexID");
        queryPostSocial.equalTo("post", post);
        queryPostSocial.first({
            useMasterKey: true
            //sessionToken: sessionToken
        }).then((postSocial) => {


            if (postSocial) {

                if (postSocial.get("algoliaIndexID")) {

                    //console.log("algoliaIndexID: " + parseInt(postSocial.get("algoliaIndexID")));


                    for (var i = 0; i < parseInt(postSocial.get("algoliaIndexID")); i++) {

                        let objectID = post.id + '-' + i.toString();
                        algoliaObjectIds.push(objectID);
                        //console.log("algoliaObjectIds: " + JSON.stringify(algoliaObjectIds));

                        if (i === (parseInt(postSocial.get("algoliaIndexID"))-1)) {

                            // finished iterating through all items

                            return callback (null, algoliaObjectIds);

                        }


                    }


                } else {

                    algoliaObjectIds.push(objectID_Zero);

                    //console.log("algoliaObjectIds: " + JSON.stringify(algoliaObjectIds));

                    return callback (null, algoliaObjectIds);


                }



            } else {

                algoliaObjectIds.push(objectID_Zero);

                //console.log("algoliaObjectIds: " + JSON.stringify(algoliaObjectIds));

                return callback (null, algoliaObjectIds);


            }



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            return callback(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });



    }


    async.parallel([
        async.apply(deletePostSocial),
        //async.apply(deletePostQuestion),
        async.apply(deletePostMessage),
        async.apply(generateAlgoliaObjectIDs)

    ], function (err, results) {
        if (err) {
            return response.error(err);
        }

        if (results) {

            let postIdArray = results[2];
            //console.log("postIDArray: " + JSON.stringify(postIdArray));

            // Remove the object from Algolia
            indexPosts.deleteObjects(postIdArray, function(err, content) {
                if (err) {
                    response.error(err);
                }
                console.log('Parse<>Algolia post deleted');

                let finalTime = process.hrtime(time);
                console.log(`finalTime took afterDelete Post ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                response.success(content);
            });



        }

    });

}, {useMasterKey: true});

// cloud API and unit test case for afterDeletePost
Parse.Cloud.define("unitTestAfterDeletePost", function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.cloudFunction.unitAfterDeletePost.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    //get request params for post to be deleted and tested.
    let postId = request.params.post;
    let userId = request.params.user;

    let URL = "https://parseserverwest-development.azurewebsites.net/parse/classes/Post/" + postId;

    let POSTSOCIAL = Parse.Object.extend("PostSocial");
    let queryPostSocial = new Parse.Query(POSTSOCIAL);
    //queryPostSocial.equalTo("", workspace);
    queryPostSocial.equalTo("user", userId);
    queryPostSocial.equalTo("post", postId);
    queryPostSocial.first({
        useMasterKey: true
        //sessionToken: sessionToken
    }).then((postSocial) => {


        if (postSocial) {

            let post = postSocial.get("post");

            console.log("URL: " + JSON.stringify(URL));

            requestURL.delete({
                "headers": {
                    "content-type": "application/json",
                    "X-Parse-Application-Id": "671e705a-f735-4ec0-8474-15899a475440",
                    "X-Parse-Master-Key": "f24d6630-a35a-4db8-9fc7-6a851042bfd6"
                },
                "url": URL
            }, (error, res, body) => {
                if(error) {
                    return response.error(error);
                }
                console.dir(JSON.parse(body));

                let deletedPostId = body.objectIDs[0];
                let originalPostId = post.id + '-' + postSocial.get("algoliaIndexID");

                console.log("deletedPostId: " + JSON.stringify(deletedPostId));

                if (originalPostId === deletedPostId) {

                    response.success(true);

                } else {

                    response.success(false);
                }


            });



        } else {

            requestURL.delete({
                "headers": {
                    "content-type": "application/json",
                    "X-Parse-Application-Id": "671e705a-f735-4ec0-8474-15899a475440",
                    "X-Parse-Master-Key": "f24d6630-a35a-4db8-9fc7-6a851042bfd6"
                },
                "url": URL
            }, (error, res, body) => {
                if(error) {
                    return response.error(error);
                }
                console.dir(JSON.parse(body));

                let deletedPostId = body.objectIDs[0];
                let originalPostId = postId + '-0';

                console.log("deletedPostId: " + JSON.stringify(deletedPostId));

                if (originalPostId === deletedPostId) {

                    response.success(true);

                } else {

                    response.success(false);
                }


            });


        }



    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        response.error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });




}, {useMasterKey: true});

// Delete AlgoliaSearch PostMessage object if it's deleted from Parse
Parse.Cloud.afterDelete('PostMessage', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.PostMessage.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    // Get post object
    let POSTMESSAGE = Parse.Object.extend("PostMessage");
    let postMessage = request.object;

    let POST = Parse.Object.extend("Post");
    let post = new POST();
    post.id = postMessage.get("post").id;

    let CHANNEL = Parse.Object.extend("Channel");
    let channel = new CHANNEL();
    channel.id = postMessage.get("channel").id;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = postMessage.get("workspace").id;

    console.log("request afterDelete PostMessage: " + JSON.stringify(request));

    let USER = Parse.Object.extend("_User");
    let owner = new USER();
    owner.id = postMessage.get("user").id;

    function deletePostMessageSocial (callback) {

        let POSTMESSAGESOCIAL = Parse.Object.extend("PostMessageSocial");
        let queryPostMessageSocial = new Parse.Query(POSTMESSAGESOCIAL);
        //queryPostSocial.equalTo("workspace", workspace);
        //queryPostSocial.equalTo("channel", channel);
        queryPostMessageSocial.equalTo("post", post);
        queryPostMessageSocial.limit(10000);
        queryPostMessageSocial.find({
            useMasterKey: true
            //sessionToken: sessionToken
        }).then((postMessageSocial) => {


            if (postMessageSocial) {

                /*Parse.Object.destroyAll(Channel_Followers, {sessionToken: sessionToken}).catch(function(error, result) {

                 if (error) {

                 console.error("Error deleteChannelFollowers " + error.code + ": " + error.message);
                 return callback(error);


                 }

                 if (result) {

                 return callback(null, result);
                 }
                 });*/

                Parse.Object.destroyAll(postMessageSocial, {
                    success: function(result) {
                        console.log('Did successfully delete postSocials in afterDelete postMessageSocial Cloud Function');
                        return callback(null, result);
                    },
                    error: function(error) {
                        console.error("Error  delete postMessageSocial " + error.code + ": " + error.message);
                        return callback(error);
                    },
                    useMasterKey: true
                    //sessionToken: sessionToken

                });



            } else {

                postMessageSocial = [];
                // no workspaceFollowers to delete return
                return callback(null, postMessageSocial);

            }



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            return callback(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    }

    function deletePostMessageThreads (callback) {

        let POSTMESSAGE = Parse.Object.extend("PostMessage");
        let queryPostMessage = new Parse.Query(POSTMESSAGE);
        //queryPostSocial.equalTo("workspace", workspace);
        //queryPostSocial.equalTo("channel", channel);
        queryPostMessage.equalTo("post", post);
        queryPostMessage.limit(10000);
        queryPostMessage.find({
            useMasterKey: true
            //sessionToken: sessionToken
        }).then((postMessage) => {


            if (postMessage) {

                /*Parse.Object.destroyAll(Channel_Followers, {sessionToken: sessionToken}).catch(function(error, result) {

                 if (error) {

                 console.error("Error deleteChannelFollowers " + error.code + ": " + error.message);
                 return callback(error);


                 }

                 if (result) {

                 return callback(null, result);
                 }
                 });*/

                Parse.Object.destroyAll(postMessage, {
                    success: function(result) {
                        console.log('Did successfully delete postSocials in afterDelete postMessageSocial Cloud Function');
                        return callback(null, result);
                    },
                    error: function(error) {
                        console.error("Error  delete postMessageSocial " + error.code + ": " + error.message);
                        return callback(error);
                    },
                    useMasterKey: true
                    //sessionToken: sessionToken

                });



            } else {

                postMessage = [];
                // no workspaceFollowers to delete return
                return callback(null, postMessage);

            }



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            return callback(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    }

    function generateAlgoliaObjectIDs (callback) {

        let algoliaObjectIds = [];

        let objectID_Zero = postMessage.id + '-' + '0';

        let POSTMESSAGESOCIAL = Parse.Object.extend("PostMessageSocial");
        let queryPostMessageSocial = new Parse.Query(POSTMESSAGESOCIAL);
        //queryPostQuestion.equalTo("workspace", workspace);
        //queryPostQuestion.equalTo("channel", channel);
        queryPostMessageSocial.descending("algoliaIndexID");
        queryPostMessageSocial.equalTo("postMessage", postMessage);
        queryPostMessageSocial.first({
            useMasterKey: true
            //sessionToken: sessionToken
        }).then((postMessageSocial) => {


            if (postMessageSocial) {

                if (postMessageSocial.get("algoliaIndexID")) {

                    console.log("algoliaIndexID: " + parseInt(postMessageSocial.get("algoliaIndexID")));


                    for (var i = 0; i < parseInt(postMessageSocial.get("algoliaIndexID")); i++) {

                        let objectID = postMessage.id + '-' + i.toString();
                        algoliaObjectIds.push(objectID);
                        console.log("algoliaObjectIds: " + JSON.stringify(algoliaObjectIds));

                        if (i === (parseInt(postMessageSocial.get("algoliaIndexID"))-1)) {

                            // finished iterating through all items

                            return callback (null, algoliaObjectIds);

                        }


                    }


                } else {

                    algoliaObjectIds.push(objectID_Zero);

                    //console.log("algoliaObjectIds: " + JSON.stringify(algoliaObjectIds));

                    return callback (null, algoliaObjectIds);


                }



            } else {

                algoliaObjectIds.push(objectID_Zero);

                //console.log("algoliaObjectIds: " + JSON.stringify(algoliaObjectIds));

                return callback (null, algoliaObjectIds);


            }



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            return callback(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });



    }


    async.parallel([
        async.apply(deletePostMessageSocial),
        async.apply(deletePostMessageThreads),
        async.apply(generateAlgoliaObjectIDs)

    ], function (err, results) {
        if (err) {
            return response.error(err);
        }

        if (results) {

            let postIdArray = results[2];
            console.log("postIDArray: " + JSON.stringify(postIdArray));

            // Remove the object from Algolia
            indexPosts.deleteObjects(postIdArray, function(err, content) {
                if (err) {
                    response.error(err);
                }
                console.log('Parse<>Algolia PostMessage deleted');

                let finalTime = process.hrtime(time);
                console.log(`finalTime took afterDelete PostMessage ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                response.success();
            });



        }

    });

}, {useMasterKey: true});

// Delete AlgoliaSearch post object if it's deleted from Parse
Parse.Cloud.afterDelete('PostSocial', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.afterDelete-Post.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    // Get post object
    let POSTSOCIAL = Parse.Object.extend("PostSocial");
    let postSocial = request.object;

    let CHANNEL = Parse.Object.extend("Channel");
    let channel = new CHANNEL();
    channel.id = postSocial.get("channel").id;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = postSocial.get("workspace").id;

    let POST = Parse.Object.extend("Post");
    let post = new POST();
    post.id = postSocial.get("post").id;

    console.log("request afterDelete Post: " + JSON.stringify(request));

    let USER = Parse.Object.extend("_User");
    let owner = new USER();
    owner.id = postSocial.get("user").id;

    function decrementPostSocialCount (callback) {

        post.increment("postSocialCount", -1);
        if (postSocial.get("isLiked") === true) { post.increment("likesCount", -1); }
        let relation = post.relation("postSocial");
        //console.log("beforeAdd: " + JSON.stringify(relation));

        relation.remove(postSocial);
        //console.log("afterAdd: " + JSON.stringify(relation));

        post.save(null, {

            useMasterKey: true,
            //sessionToken: sessionToken

        });

        return callback (null, post);

    }


    async.parallel([
        async.apply(decrementPostSocialCount)


    ], function (err, results) {
        if (err) {
            return response.error(err);
        }

        if (results) {


            let finalTime = process.hrtime(time);
            console.log(`finalTime took afterDelete PostSocial ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

            response.success();


        }

    });

});

// Delete AlgoliaSearch channel object if it's deleted from Parse
Parse.Cloud.afterDelete('Channel', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.009.afterDelete-Channel.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let CHANNEL = Parse.Object.extend("Channel");
    let channel = new CHANNEL();
    channel.id = request.object.id;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = request.object.id;

    console.log("request afterDelete WorkSpace: " + JSON.stringify(request));

    let USER = Parse.Object.extend("_User");
    let owner = new USER();
    owner.id = workspace.get("user");

    /*var sessionToken;

    if (!request.user) {

        if (request.master === true) {

            sessionToken = owner.getSessionToken();
            console.log("sessionToken: " + JSON.stringify(sessionToken));
        } else {

            response.error("afterDelete WorkSpace masterKey or Session token is required");

        }
    } else if (request.user) {

        if (request.user.getSessionToken()) {

            sessionToken = request.user.getSessionToken();


        } else {

            response.error("afterDelete WorkSpace user does not have a valid sessionToken");


        }
    }*/


    function deleteChannelFollowers (callback) {

        let CHANNELFOLLOWER = Parse.Object.extend("ChannelFollow");

        let queryChannelFollower = new Parse.Query(CHANNELFOLLOWER);
        queryChannelFollower.equalTo("channel", channel);
        queryChannelFollower.limit(10000);
        queryChannelFollower.find({
            useMasterKey: true
            //sessionToken: sessionToken
        }).then((Channel_Followers) => {


            if (Channel_Followers) {

                /*Parse.Object.destroyAll(Channel_Followers, {sessionToken: sessionToken}).catch(function(error, result) {

                 if (error) {

                 console.error("Error deleteChannelFollowers " + error.code + ": " + error.message);
                 return callback(error);


                 }

                 if (result) {

                 return callback(null, result);
                 }
                 });*/

                Parse.Object.destroyAll(Channel_Followers, {
                    success: function(result) {
                        console.log('Did successfully delete channelFollowers in afterDeleteChannel Cloud Function');
                        return callback(null, result);
                    },
                    error: function(error) {
                        console.error("Error  deleteChannelFollowers " + error.code + ": " + error.message);
                        return callback(error);
                    },
                    useMasterKey: true
                    //sessionToken: sessionToken

                });



            } else {

                Channel_Followers = [];
                // no workspaceFollowers to delete return
                return callback(null, Channel_Followers);

            }



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    }

    function deletePosts (callback) {

        let POST = Parse.Object.extend("Post");

        let queryPost = new Parse.Query(POST);
        queryPost.equalTo("channel", channel);
        queryPost.limit(1000);
        queryPost.find({
            useMasterKey: true
            //sessionToken: sessionToken
        }).then((posts) => {


            if (posts) {

                /*Parse.Object.destroyAll(posts, {sessionToken: sessionToken}).catch(function(error, result) {

                    if (error) {

                        console.error("Error deletePosts " + error.code + ": " + error.message);
                        return callback(error);


                    }

                    if (result) {

                        return callback(null, result);
                    }
                });*/

                Parse.Object.destroyAll(posts, {
                    success: function(result) {
                        console.log('Did successfully delete posts in afterDeleteChannel Cloud Function');
                        return callback(null, result);
                    },
                    error: function(error) {
                        console.error("Error delete posts in afterDeleteChannel Cloud Function " + error.code + ": " + error.message);
                        return callback(error);
                    },
                    useMasterKey: true
                });


            } else {

                posts = [];
                // no workspaceFollowers to delete return
                return callback(null, posts);

            }

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });



    }

    function deleteChannelAlgolia (callback) {

        // Remove the object from Algolia
        indexChannel.deleteObject(channel.id, function(err, content) {
            if (err) {
                response.error(err);
            }

            if (content) {

                console.log('Parse<>Algolia WorkSpace object deleted');

                return callback (null, content);

            }


        });


    }


    async.parallel([
        async.apply(deleteChannelAlgolia),
        async.apply(deletePosts),
        async.apply(deleteChannelFollowers)

    ], function (err, results) {
        if (err) {
            return response.error(err);
        }

        if (results) {


            let finalTime = process.hrtime(time);
            console.log(`finalTime took afterDelete Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

            response.success();


        }

    });


}, {useMasterKey: true});

// Delete AlgoliaSearch channel object if it's deleted from Parse
Parse.Cloud.beforeDelete('Channel', function(request, response) {

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.010.beforeDelete-Channel.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    // get objects
    let channel = request.object;
    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = channel.get("workspace").id;

    /*workspace.increment("channelCount", -1);
    workspace.save(null, {

        useMasterKey: true
        //sessionToken: sessionToken

    });*/

    response.success();

}, {useMasterKey: true});



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

/*Parse.Cloud.beforeDelete('WorkSpace', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.011.afterDelete-WorkSpace.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = request.object.id;

    let workspaceObject = request.object;
    //console.log("workspace: " + JSON.stringify(workspace));

    //console.log("request afterDelete WorkSpace: " + JSON.stringify(request));

    let USER = Parse.Object.extend("_User");
    let owner = new USER();
    owner.id = workspaceObject.get("user").id;

    //console.log("owner: " + JSON.stringify(owner));



    let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
    let previousQueryWorkspaceFollowerLeave = new Parse.Query(WORKSPACEFOLLOWER);
    previousQueryWorkspaceFollowerLeave.include("workspace");
    previousQueryWorkspaceFollowerLeave.equalTo("user", owner);
    previousQueryWorkspaceFollowerLeave.equalTo("isSelected", false);
    previousQueryWorkspaceFollowerLeave.equalTo("isFollower", true);
    previousQueryWorkspaceFollowerLeave.descending("updatedAt");

    function selectPreviouslySelectedWorkspace (callback) {

        previousQueryWorkspaceFollowerLeave.first( {

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((WorkspaceToSelect) => {
            // The object was retrieved successfully.

            if (WorkspaceToSelect) {

                let WORKSPACE = Parse.Object.extend("WorkSpace");
                let WorkspaceToSelectSave = new WORKSPACE();
                WorkspaceToSelectSave.id = WorkspaceToSelect.id;

                WorkspaceToSelectSave.set("isSelected", true);

                WorkspaceToSelectSave.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((result) => {

                    // save was successful
                    if(result) {

                        console.log("result from afterDelete workspace save: " + JSON.stringify(result));

                        // There is a previous workspace that was selected, need to return it so we can un-select that previous workspacefollower
                        return callback (null, result);

                    } else {

                        return callback (null, result);

                    }


                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return callback (error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

            } else {

                // there was no workspace that was previously selected, return empty

                return callback (null, WorkspaceToSelect);
            }


        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    }


    async.parallel([

        async.apply(selectPreviouslySelectedWorkspace)

    ], function (err, results) {
        if (err) {
            return response.error(err);
        }

        if (results) {


            let finalTime = process.hrtime(time);
            console.log(`finalTime took afterDelete WorkSpace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

            return response.success();


        }

    });


}, {useMasterKey: true});*/


// Delete AlgoliaSearch workspace object if it's deleted from Parse
Parse.Cloud.afterDelete('WorkSpace', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.011.afterDelete-WorkSpace.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = request.object.id;

    let workspaceObject = request.object;
    //console.log("workspace: " + JSON.stringify(workspace));

    //console.log("request afterDelete WorkSpace: " + JSON.stringify(request));

    let USER = Parse.Object.extend("_User");
    let owner = new USER();
    owner.id = workspaceObject.get("user").id;

    console.log("owner: " + JSON.stringify(owner));

    let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");


    function deleteWorkspaceFollowers (callback) {

        let queryWorksapceFollower = new Parse.Query(WORKSPACEFOLLOWER);
        queryWorksapceFollower.equalTo("workspace", workspace);
        queryWorksapceFollower.limit(10000);
        queryWorksapceFollower.find({
                useMasterKey: true
        }).then((workspacefollowers) => {


            if (workspacefollowers) {

                /*Parse.Object.destroyAll(workspacefollowers, {useMasterKey: true}).catch(function(error, result) {

                    if (error) {

                        console.error("Error deleteWorkspaceFollowers " + error.code + ": " + error.message);
                        return callback(error);


                    }

                    if (result) {
                        console.log('Did successfully delete posts in afterDeleteChannel Cloud Function');

                        return callback(null, result);
                    }
                });*/

                Parse.Object.destroyAll(workspacefollowers, {
                    success: function(result) {
                        console.log('Did successfully delete posts in afterDeleteChannel Cloud Function');
                        return callback(null, result);
                    },
                    error: function(error) {
                        console.error("Error delete posts in afterDeleteChannel Cloud Function " + error.code + ": " + error.message);
                        return callback(error);
                    },
                    useMasterKey: true
                });


            } else {

                workspacefollowers = [];
                // no workspaceFollowers to delete return
                return callback(null, workspacefollowers);

            }



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {
            useMasterKey: true
            //sessionToken: sessionToken
        });

    }

    function deleteChannels (callback) {

        let CHANNEL = Parse.Object.extend("Channel");

        let queryChannel = new Parse.Query(CHANNEL);
        queryChannel.equalTo("workspace", workspace);
        queryChannel.limit(1000);
        queryChannel.find({
            useMasterKey: true
            //sessionToken: sessionToken
        }).then((channels) => {


            if (channels) {

                /*Parse.Object.destroyAll(channels, {sessionToken: sessionToken}).catch(function(error, result) {

                    if (error) {

                        console.error("Error deleteChannels " + error.code + ": " + error.message);
                        return callback(error);


                    }

                    if (result) {

                        return callback(null, result);
                    }
                });*/

                Parse.Object.destroyAll(channels, {
                    success: function(result) {
                        console.log('Did successfully delete channels in afterDelete Workspace Cloud Function');
                        return callback(null, result);
                    },
                    error: function(error) {
                        console.error("Error delete channels in afterDelete Workspace Cloud Function" + error.code + ": " + error.message);
                        return callback(error);
                    },
                    useMasterKey: true
                });


            } else {

                channels = [];
                // no workspaceFollowers to delete return
                return callback(null, channels);

            }

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                response.error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

        });



    }

    function deleteWorkspaceAlgolia (callback) {

        // Remove the object from Algolia
        indexWorkspaces.deleteObject(workspace.id, function(err, content) {
            if (err) {
                response.error(err);
            }

            if (content) {

                console.log('Parse<>Algolia WorkSpace object deleted');

                return callback (null, content);

            }


        });


    }

    function selectPreviouslySelectedWorkspace (callback) {

        let previousQueryWorkspaceFollowerLeave = new Parse.Query(WORKSPACEFOLLOWER);
        //previousQueryWorkspaceFollowerLeave.include("workspace");
        previousQueryWorkspaceFollowerLeave.equalTo("user", owner);
        previousQueryWorkspaceFollowerLeave.equalTo("isSelected", false);
        previousQueryWorkspaceFollowerLeave.equalTo("isFollower", true);
        previousQueryWorkspaceFollowerLeave.descending("updatedAt");

        previousQueryWorkspaceFollowerLeave.first( {

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((WorkspaceFollowerToSelect) => {
            // The object was retrieved successfully.

            if (WorkspaceFollowerToSelect) {

                let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
                let WorkspaceFollowerToSelectSave = new WORKSPACEFOLLOWER();
                WorkspaceFollowerToSelectSave.id = WorkspaceFollowerToSelect.id;

                WorkspaceFollowerToSelectSave.set("user", owner);
                WorkspaceFollowerToSelectSave.set("isSelected", true);

                WorkspaceFollowerToSelectSave.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((result) => {

                    // save was successful
                    if(result) {

                        console.log("result from afterDelete workspace save: " + JSON.stringify(result));

                        // There is a previous workspace that was selected, need to return it so we can un-select that previous workspacefollower
                        return callback (null, result);

                    } else {

                        return callback (null, result);

                    }


                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return callback (error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

            } else {

                // there was no workspace that was previously selected, return empty

                return callback (null, WorkspaceFollowerToSelectSave);
            }


        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    }

    function deleteRoles (callback) {

        let queryWorkspaceRole = new Parse.Query(Parse.Role);
        queryWorkspaceRole.equalTo("workspace", workspace);
        //queryWorkspaceRole.limit(10000);
        queryWorkspaceRole.find({
            useMasterKey: true
        }).then((workspaceRoles) => {


            if (workspaceRoles) {

                /*Parse.Object.destroyAll(workspacefollowers, {useMasterKey: true}).catch(function(error, result) {

                 if (error) {

                 console.error("Error deleteWorkspaceFollowers " + error.code + ": " + error.message);
                 return callback(error);


                 }

                 if (result) {
                 console.log('Did successfully delete posts in afterDeleteChannel Cloud Function');

                 return callback(null, result);
                 }
                 });*/

                Parse.Object.destroyAll(workspaceRoles, {
                    success: function(result) {
                        console.log('Did successfully deleteRoles afterDelete-WorkSpace Cloud Function');
                        return callback(null, result);
                    },
                    error: function(error) {
                        console.error("Error deleteRoles afterDelete-WorkSpace Cloud Function " + error.code + ": " + error.message);
                        return callback(error);
                    },
                    useMasterKey: true
                });


            } else {

                workspaceRoles = [];
                // no workspaceFollowers to delete return
                return callback(null, workspaceRoles);

            }



        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            response.error(error);
        }, {
            useMasterKey: true
            //sessionToken: sessionToken
        });

    }

    async.parallel([
        async.apply(deleteWorkspaceAlgolia),
        async.apply(deleteChannels),
        async.apply(deleteWorkspaceFollowers),
        //async.apply(selectPreviouslySelectedWorkspace)
        async.apply(deleteRoles)

    ], function (err, results) {
        if (err) {

            console.log("error in afterDelete Workspace: " + err);
            return response.error(err);
        }

        if (results) {


            let finalTime = process.hrtime(time);
            console.log(`finalTime took afterDelete WorkSpace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

            response.success();


        }

    });


}, {useMasterKey: true});

// Update followers list in Workspace after deleting workspace_follower row
Parse.Cloud.afterDelete('workspace_follower', function(request, response) {

    // todo remove ACL for users who unfollow or are not members anymore

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.012.afterDelete-workspace_follower.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let workspaceFollower = request.object;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();

    let USER = Parse.Object.extend("_User");
    let user = new USER();
    user.id = workspaceFollower.get("user").id;


    // Get workspace
    workspace.id = workspaceFollower.get("workspace").id;
    console.log("workspace in workspace_follower afterDelete: " + JSON.stringify(workspace));

    workspace.fetch(workspace.id, {

        useMasterKey: true
        //sessionToken: sessionToken

    }).then((Workspace) => {
        // The object was retrieved successfully.

        console.log("Workspace fetch: " + JSON.stringify(Workspace));

        if (Workspace) {

            // get isFollower and isMember
            let isFollower = request.object.get("isFollower");
            let isMember = request.object.get("isMember");

            // remove this user as a follower or member of that workspace
            if(isFollower === true && isMember === true) {

                workspace.increment("followerCount", -1);
                workspace.increment("memberCount", -1);
                workspace.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });
                response.success();

            }
            else if (isFollower === true && (isMember === false || !isMember)) {

                workspace.increment("followerCount", -1);
                workspace.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });
                response.success();


            }
            else if ((isFollower === false || !isFollower) &&(isMember === false || !isMember)) {

                // do nothing since this user should not be a follower or member for that workspace
                response.success();


            }
            else if (isMember === true && (isFollower === false || !isFollower)) {

                // this case should never exist since a member is always also a follower
                workspace.increment("memberCount", -1);
                workspace.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });
                response.success();
            }
            else {

                // do nothing
                response.success();
            }


        } else {

            response.success();
        }



    }, (error) => {
        // this can happen if the user is deleting the workspace so returning success here.
        console.log("no workspace mybe we are deleting a workspace");
        response.success();
    }, {
        useMasterKey: true
        //sessionToken: sessionToken

    });


}, {useMasterKey: true});

// Update followers list in Channel after deleting workspace_follower row
Parse.Cloud.afterDelete('ChannelFollow', function(request, response) {

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.013.afterDelete-ChannelFollow.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let channelfollow = request.object;
    let CHANNEL = request.object.get("channel");
    console.log("channel afterDelete: " + JSON.stringify(CHANNEL));


    CHANNEL.fetch(CHANNEL.toJSON().objectId, {

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((channel) => {
            // The object was retrieved successfully.

            if (channel) {

                // get isFollower and isMember
                let isFollower = channelfollow.get("isFollower");
                let isMember = channelfollow.get("isMember");
                let user = channelfollow.get("user");
                let Channel = new CHANNEL();
                Channel.id = channel.id;
                let channelACL = channel.getACL();


                let userRoleRelation = user.relation("roles");

                let expertRoleName = "expert-" + channel.get("workspace").id;

                let userRoleRelationQuery = userRoleRelation.query();
                userRoleRelationQuery.equalTo("name", expertRoleName);
                userRoleRelationQuery.first({

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((results) => {
                    // The object was retrieved successfully.

                    if (results) {

                        // expert role exists, add as channel expert
                        //console.log("channelExpert: " + JSON.stringify(results));

                        // remove this user as a follower or member of that workspace
                        if(isFollower === true && isMember === true) {

                            Channel.increment("followerCount", -1);
                            Channel.increment("memberCount", -1);

                            // remove this user as channel expert since he/she is a workspace expert and now either un-followed or un-joined this channel


                            let expertOwner = simplifyUser(user);

                            Channel.remove("expertsArray", expertOwner);

                            if (channel.get("type") === 'private') {


                                // check if this user is a channel owner then don't remove the ACL or he won't be able to come back to his channel

                                if (channel.get("user").toJSON().objectId === expertOwner.objectId) {

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
                            Channel.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });
                            response.success();

                        }
                        else if (isFollower === true && (isMember === false || !isMember)) {

                            Channel.increment("followerCount", -1);

                            // remove this user as channel expert since he/she is a workspace expert and now either un-followed or un-joined this channel

                            let expertOwner = simplifyUser(user);

                            Channel.remove("expertsArray", expertOwner);

                            if (channel.get("type") === 'private') {


                                // check if this user is a channel owner then don't remove the ACL or he won't be able to come back to his channel

                                if (channel.get("user").toJSON().objectId === expertOwner.objectId) {

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
                            Channel.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });
                            response.success();


                        } else if ((isFollower === false || !isFollower) &&(isMember === false || !isMember)) {

                            // do nothing since this user should not be a follower or member for that workspace
                            response.success();


                        }
                        else if (isMember === true && (isFollower === false || !isFollower)) {

                            // this case should never exist since a member is always also a follower
                            Channel.increment("memberCount", -1);

                            // remove this user as channel expert since he/she is a workspace expert and now either un-followed or un-joined this channel

                            let expertOwner = simplifyUser(user);


                            Channel.remove("expertsArray", expertOwner);

                            if (channel.get("type") === 'private') {

                                // check if this user is a channel owner then don't remove the ACL or he won't be able to come back to his channel

                                if (channel.get("user").toJSON().objectId === user.toJSON().objectId) {

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
                            Channel.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });
                            response.success();
                        }
                        else {

                            // do nothing
                            response.success();
                        }

                    } else {
                        // no role exists don't add or remove experts from channel

                        // remove this user as a follower or member of that workspace
                        if(isFollower === true && isMember === true) {

                            Channel.increment("followerCount", -1);
                            Channel.increment("memberCount", -1);

                            if (channel.get("type") === 'private') {

                                // check if this user is a channel owner then don't remove the ACL or he won't be able to come back to his channel

                                if (channel.get("user").toJSON().objectId === user.toJSON().objectId) {

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

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });
                            response.success();

                        }
                        else if (isFollower === true && (isMember === false || !isMember)) {

                            channel.increment("followerCount", -1);


                            if (channel.get("type") === 'private') {

                                // check if this user is a channel owner then don't remove the ACL or he won't be able to come back to his channel

                                if (channel.get("user").toJSON().objectId === user.toJSON().objectId) {

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
                            Channel.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });
                            response.success();


                        }
                        else if ((isFollower === false || !isFollower) &&(isMember === false || !isMember)) {

                            // do nothing since this user should not be a follower or member for that workspace
                            response.success();


                        }
                        else if (isMember === true && (isFollower === false || !isFollower)) {

                            // this case should never exist since a member is always also a follower
                            Channel.increment("memberCount", -1);


                            if (channel.get("type") === 'private') {

                                // check if this user is a channel owner then don't remove the ACL or he won't be able to come back to his channel

                                if (channel.get("user").toJSON().objectId === user.toJSON().objectId) {

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
                            Channel.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });
                            response.success();
                        }
                        else {

                            // do nothing
                            response.success();
                        }
                    }
                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    console.log("no roles found in afterDelete channelFollow maybe we are deleting a channel & workspace");

                    response.success();
                }, {
                    useMasterKey: true
                    //sessionToken: sessionToken

                });

            } else {

                response.success();
            }



        }, (error) => {
            // No Channel, maybe was delete so ignore removing the channel experts and updating follower/member count for channel
            console.log("no channel found in afterDelete channelFollow maybe we are deleting a channel or workspace");

            response.success();

        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });



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
    let allMail = request.params.emails;
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
        fileForPushNotification = 'apns-prod-cert.pem';
        keyFileForPushNotification = 'Key-Distribution.pem';
    } else {
        fileForPushNotification = 'apns-dev-cert.pem';
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

