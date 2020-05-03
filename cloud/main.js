
var algoliasearch = require('algoliasearch');
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
var client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_KEY);


const isProduction = true;
var fileForPushNotification;
var keyFileForPushNotification;
// Initialize the Algolia Search Indexes for posts, users, hashtags and meetings
var indexPosts;
var indexUsers;
var indexMeetings;
var indexChannel ;
var indexWorkspaces;
var indexSkills ;
var indexPostMessage;
var indexConversations;

if( isProduction === false ){
    fileForPushNotification = 'apns-prod-cert.pem';
    keyFileForPushNotification = 'Key-Distribution.pem';
    indexPosts = client.initIndex('prod_posts');
    indexUsers = client.initIndex('prod_users');
    indexMeetings = client.initIndex('prod_meetings');
    indexChannel = client.initIndex('prod_channels');
    indexWorkspaces = client.initIndex('prod_workspaces');
    indexSkills = client.initIndex('prod_skills');
    indexPostMessage = client.initIndex('prod_postMessages');
    indexConversations = client.initIndex('prod_conversations');
} else {
    fileForPushNotification = 'apns-dev-cert.pem';
    keyFileForPushNotification = 'Key-Development.pem';
    indexPosts = client.initIndex('dev_posts');
    indexUsers = client.initIndex('dev_users');
    indexMeetings = client.initIndex('dev_meetings');
    indexChannel = client.initIndex('dev_channels');
    indexWorkspaces = client.initIndex('dev_workspaces');
    indexSkills = client.initIndex('dev_skills');
    indexPostMessage = client.initIndex('dev_postMessages');
    indexConversations = client.initIndex('dev_conversations');

}



const requestPromise = require('request-promise');
var fs = require('fs');
Parse.initialize(process.env.APP_ID, '', process.env.MASTER_KEY);
Parse.serverURL = process.env.SERVER_URL + '/parse';

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
let simplifyPostMessageSocialAnswer = require('./simplifyClass/Post/simplifyPostMessageSocialAnswer');


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
// Push Notification
var apn = require('apn');
const path = require('path');

// Set cron job
var cron = require('node-cron');

// Set production mode and add certification and key file accordingly

var options = {
    cert: path.resolve(fileForPushNotification),
    key: path.resolve(keyFileForPushNotification),
    teamId: "W73RAM957L",
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
Parse.Cloud.define("setAsExpert", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {

        throw new Error('define-setAsExpert.UNAUTHENTICATED_USER');
    }

    //get request params
    let UserIdArray = request.params.userIdArray;
    let WorkspaceId = request.params.workspaceId;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = WorkspaceId;

    const userResult = await async.map(UserIdArray, async function (userId) {

        userId = userId.objectId;

        console.log("userId: " + JSON.stringify(userId));

        let USER = Parse.Object.extend("_User");
        let user = new USER();
        user.id = userId;

        return user;


    });

    let expertRelation = workspace.relation("experts");
    expertRelation.add(userResult);

    return workspace.save(null, {

        useMasterKey: true
        //sessionToken: sessionToken

    });


}, {useMasterKey: true});

// cloud API and function to get position of postMessages in Algolia
Parse.Cloud.define('getPostMessagePosition', async request => {
    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
       throw new Error('define-getPostMessagePosition.UNAUTHENTICATED_USER');

    }

    //get request params
    let objectId = request.params.objectId;
    let HitsPerPage = request.params.hitsPerPage;
    HitsPerPage = HitsPerPage? HitsPerPage : 20;

    let POSTMESSAGE = Parse.Object.extend("PostMessage");

    //let WorkspaceId = request.params.workspaceId;

    //console.log("currentUser: " + JSON.stringify(currentUser));

    var clientUser = algoliasearch('K3ET7YKLTI', currentUser.get("algoliaSecureAPIKey"));

    let indexPostMessageUser = clientUser.initIndex('prod_postMessages');

    return await indexPostMessageUser.findObject(hit => hit.objectId === objectId, {
        query: "",
        hitsPerPage: HitsPerPage

    }).then(obj => {
        //console.log(obj);

        let PostMessage = new POSTMESSAGE();
        PostMessage.id = obj.object.objectId;
        PostMessage = PostMessage.toJSON();
        PostMessage.page = obj.page;
        PostMessage.position = obj.position;
        PostMessage.hitsPerPage = HitsPerPage;

        console.log("PostMessage Position: " + JSON.stringify(PostMessage));

        return PostMessage;

        //return response.success(obj);
    }).catch((error) => {
        console.log(error);
        throw error;
    });
});

Parse.Cloud.define('getPostPosition', async request => {
    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-getPostPosition.UNAUTHENTICATED_USER');
    }

    //get request params
    let objectId = request.params.objectId;
    let HitsPerPage = request.params.hitsPerPage;
    HitsPerPage = HitsPerPage? HitsPerPage : 20;

    //let WorkspaceId = request.params.workspaceId;
    let POST = Parse.Object.extend("Post");

    //console.log("currentUser: " + JSON.stringify(currentUser));

    var clientUser = algoliasearch('K3ET7YKLTI', currentUser.get("algoliaSecureAPIKey"));

    let indexPostUser = clientUser.initIndex('prod_posts');

    return await indexPostUser.findObject(hit => hit.objectId === objectId, {
        query: "",
        hitsPerPage: HitsPerPage
    }).then(obj => {
        //console.log(obj);

        let Post = new POST();
        Post.id = obj.object.objectId;
        Post = Post.toJSON();
        Post.page = obj.page;
        Post.position = obj.position;
        Post.hitsPerPage = HitsPerPage;

        console.log("Post Position: " + JSON.stringify(Post));

        return Post;

        //return response.success(obj);
    }).catch((error) => {
        console.log(error);
        throw error;
    });
});

Parse.Cloud.define('getWorkspacePosition', async request => {
    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-getWorkspacePosition.UNAUTHENTICATED_USER');
    }

    //get request params
    let objectId = request.params.objectId;
    //let WorkspaceId = request.params.workspaceId;
    let HitsPerPage = request.params.hitsPerPage;
    HitsPerPage = HitsPerPage? HitsPerPage : 20;

    let WORKSPACE = Parse.Object.extend("WorkSpace");


    //console.log("currentUser: " + JSON.stringify(currentUser));

    var clientUser = algoliasearch('K3ET7YKLTI', currentUser.get("algoliaSecureAPIKey"));

    let indexWorkspaceUser = clientUser.initIndex('prod_workspaces');

    return await indexWorkspaceUser.findObject(hit => hit.objectId === objectId, {
        query: "",
        hitsPerPage: HitsPerPage
    }).then(obj => {

        let Workspace = new WORKSPACE();
        Workspace.id = obj.object.objectId;
        Workspace = Workspace.toJSON();
        Workspace.page = obj.page;
        Workspace.position = obj.position;

        console.log("Workspace Position: " + JSON.stringify(Workspace));

        return Workspace;

        //return response.success(obj);
    }).catch((error) => {
        console.log(error);
        throw error;
    });
});

// cloud API and function to removeExpert to a workspace
Parse.Cloud.define("removeExpert", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-removeExpert.UNAUTHENTICATED_USER');

    }

    //get request params
    let UserIdArray = request.params.userIdArray;
    let WorkspaceId = request.params.workspaceId;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = WorkspaceId;

    const result = await async.map(UserIdArray, async function (userId) {

        userId = userId.objectId;

        console.log("userId: " + JSON.stringify(userId));

        let USER = Parse.Object.extend("_User");
        let user = new USER();
        user.id = userId;

        return user;

    });

    let expertRelation = workspace.relation("experts");
    expertRelation.remove(result);

    return workspace.save(null, {

        useMasterKey: true
        //sessionToken: sessionToken

    });

}, {useMasterKey: true});

// cloud API and function to setAsOwner to a workspace
Parse.Cloud.define("setAsFounder", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-setAsFounder.UNAUTHENTICATED_USER');
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

    const ownerRole = await queryOwnerRole.first({

        useMasterKey: true
        //sessionToken: sessionToken

    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        throw new Error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });

    const userResult = await async.map(UserIdArray, async function (userId) {

        userId = userId.objectId;

        console.log("userId: " + JSON.stringify(userId));

        let USER = Parse.Object.extend("_User");
        let user = new USER();
        user.id = userId;

        // set user role now then save
        let roleRelation = user.relation("roles");
        roleRelation.add(ownerRole);
        return user.save(null, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    });

    // add user to this role and save it
    await ownerRole.getUsers().add(userResult);

    return ownerRole.save(null, {

        useMasterKey: true
        //sessionToken: sessionToken

    });

}, {useMasterKey: true});

// cloud API and function to setAsOwner to a workspace
Parse.Cloud.define("removeFounder", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-removeFounder.UNAUTHENTICATED_USER');
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

    const ownerRole = await queryOwnerRole.first({

        useMasterKey: true
        //sessionToken: sessionToken

    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        throw new Error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });

    const userResult = await async.map(UserIdArray, async function (userId) {

        userId = userId.objectId;

        console.log("userId: " + JSON.stringify(userId));

        let USER = Parse.Object.extend("_User");
        let user = new USER();
        user.id = userId;

        // set user role now then save
        let roleRelation = user.relation("roles");
        roleRelation.remove(ownerRole);
        return user.save(null, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    });

    // add user to this role and save it
    await ownerRole.getUsers().remove(userResult);

    return ownerRole.save(null, {

        useMasterKey: true
        //sessionToken: sessionToken

    });


}, {useMasterKey: true});

// cloud API and function to setAsAdmin to a workspace
Parse.Cloud.define("setAsAdmin", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-setAsAdmin.UNAUTHENTICATED_USER');
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

    const adminRole = await queryAdminRole.first({

        useMasterKey: true
        //sessionToken: sessionToken

    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        throw new Error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });

    const userResult = await async.map(UserIdArray, async function (userId) {

        userId = userId.objectId;

        console.log("userId: " + JSON.stringify(userId));

        let USER = Parse.Object.extend("_User");
        let user = new USER();
        user.id = userId;

        // set user role now then save
        let roleRelation = user.relation("roles");
        roleRelation.add(adminRole);
        return user.save(null, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    });

    // add user to this role and save it
    await adminRole.getUsers().add(userResult);

    return adminRole.save(null, {

        useMasterKey: true
        //sessionToken: sessionToken

    });



}, {useMasterKey: true});

// cloud API and function to setAsAdmin to a workspace
Parse.Cloud.define("removeAdmin", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-removeAdmin.UNAUTHENTICATED_USER');
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
    const adminRole = await queryAdminRole.first({

        useMasterKey: true
        //sessionToken: sessionToken

    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        throw new Error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });

    const userResult = await async.map(UserIdArray, async function (userId) {

        userId = userId.objectId;

        console.log("userId: " + JSON.stringify(userId));

        let USER = Parse.Object.extend("_User");
        let user = new USER();
        user.id = userId;

        // set user role now then save
        let roleRelation = user.relation("roles");
        roleRelation.remove(adminRole);
        return user.save(null, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    });

    // add user to this role and save it
    await adminRole.getUsers().add(userResult);

    return adminRole.save(null, {

        useMasterKey: true
        //sessionToken: sessionToken

    });


}, {useMasterKey: true});

// cloud API and function to setAsModerator to a workspace
Parse.Cloud.define("setAsModerator", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-setAsModerator.UNAUTHENTICATED_USER');
    }

    let UserIdArray = request.params.userIdArray;
    let WorkspaceId = request.params.workspaceId;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = WorkspaceId;

    let queryModeratorRole = new Parse.Query(Parse.Role);
    let moderatorName = 'moderator-' + workspace.id;

    console.log("running queryModeratorRole");

    // console.log("UserIdArray" + JSON.stringify(UserIdArray));

    queryModeratorRole.equalTo('name', moderatorName);
    const ModeratorRole = await queryModeratorRole.first({

        useMasterKey: true
        //sessionToken: sessionToken

    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        throw new Error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });

    const userResult = await async.map(UserIdArray, async function (userId) {

        userId = userId.objectId;

        // console.log("userId: " + JSON.stringify(userId));

        let USER = Parse.Object.extend("_User");
        let user = new USER();
        user.id = userId;

        // set user role now then save
        let roleRelation = user.relation("roles");
        roleRelation.add(ModeratorRole);
        return user.save(null, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    });

    // add user to this role and save it
    await ModeratorRole.getUsers().add(userResult);

    return ModeratorRole.save(null, {

        useMasterKey: true
        //sessionToken: sessionToken

    });


}, {useMasterKey: true});

// cloud API and function to setAsModerator to a workspace
Parse.Cloud.define("removeModerator", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-removeModerator.UNAUTHENTICATED_USER');
    }

    let UserIdArray = request.params.userIdArray;
    let WorkspaceId = request.params.workspaceId;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = WorkspaceId;

    let queryModeratorRole = new Parse.Query(Parse.Role);
    let moderatorName = 'moderator-' + workspace.id;

    queryModeratorRole.equalTo('name', moderatorName);
    const ModeratorRole = await queryModeratorRole.first({

        useMasterKey: true
        //sessionToken: sessionToken

    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        throw new Error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });

    const userResult = await async.map(UserIdArray, async function (userId) {

        userId = userId.objectId;

        // console.log("userId: " + JSON.stringify(userId));

        let USER = Parse.Object.extend("_User");
        let user = new USER();
        user.id = userId;

        // set user role now then save
        let roleRelation = user.relation("roles");
        roleRelation.add(ModeratorRole);
        return user.save(null, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    });

    // add user to this role and save it
    await ModeratorRole.getUsers().remove(userResult);

    return ModeratorRole.save(null, {

        useMasterKey: true
        //sessionToken: sessionToken

    });
}, {useMasterKey: true});

// cloud API and function to leave a workspace
Parse.Cloud.define("leaveWorkspace", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-leaveWorkspace.UNAUTHENTICATED_USER');

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
    let workspaceFollowerResult = await workspaceFollower.save(null, {

        useMasterKey: true
        //sessionToken: sessionToken

    });

    console.log("result leaveWorkspace query: " + JSON.stringify(workspaceFollowerResult));

    let queryWorkspaceFollowerSelected = new Parse.Query(WORKSPACEFOLLOWER);
    queryWorkspaceFollowerSelected.equalTo("isSelected", true);
    queryWorkspaceFollowerSelected.equalTo("user", user);
    queryWorkspaceFollowerSelected.equalTo("isFollower", true);
    queryWorkspaceFollowerSelected.descending("updatedAt");
    queryWorkspaceFollowerSelected.include("workspace");

    return await queryWorkspaceFollowerSelected.first({

        useMasterKey: true
        //sessionToken: sessionToken

    });


}, {useMasterKey: true});

// cloud API and function to leave a channel
Parse.Cloud.define("leaveChannel", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-leaveChannel.UNAUTHENTICATED_USER');
    }

    //get request params
    let User = request.params.user;
    let ChannelFollowId = request.params.ChannelFollow;

    let CHANNELFOLLOW = Parse.Object.extend("ChannelFollow");
    let channelFollow = new CHANNELFOLLOW();
    channelFollow.id = ChannelFollowId;

    let USER = Parse.Object.extend("_User");
    let user = new USER();
    user.id = User;

    // update user's channel follower
    channelFollow.set("isFollower", false);
    channelFollow.set("isMember", false);
    channelFollow.set("user", user);
    await channelFollow.save(null, {

        useMasterKey: true
        //sessionToken: sessionToken

    });

    let queryChannelFollowerSelected = new Parse.Query(CHANNELFOLLOW);
    queryChannelFollowerSelected.equalTo("isSelected", true);
    queryChannelFollowerSelected.equalTo("user", user);
    queryChannelFollowerSelected.equalTo("isFollower", true);
    queryChannelFollowerSelected.descending("updatedAt");
    queryChannelFollowerSelected.include("channel");

    return await queryChannelFollowerSelected.first({

        //useMasterKey: true
        sessionToken: sessionToken

    });


}, {useMasterKey: true});

// cloud API and function to addPeopleToChannel
Parse.Cloud.define("addPeopleToChannel", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-addPeopleToChannel.UNAUTHENTICATED_USER');
    }

    //get request params
    let workspaceId = request.params.workspace;
    let channelId = request.params.channel;
    let userArrayID = request.params.usersToAdd;

    let CHANNELFOLLOW = Parse.Object.extend("ChannelFollow");
    let channelFollow = new CHANNELFOLLOW();

    let CHANNEL = Parse.Object.extend("Channel");
    let Channel = new CHANNEL();
    Channel.id = channelId;
    //console.log("addPeopleToChannel Channel: " + JSON.stringify(Channel));

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let Workspace = new WORKSPACE();
    Workspace.id = workspaceId;

    let USER = Parse.Object.extend("_User");


    //console.log("before updateAllChannelFollows: " + JSON.stringify(userArrayID));

    let userArray = [];

    //console.log("userArray Set: " + JSON.stringify(userArray));

    //console.log("userArray Set: " + JSON.stringify(userArray.length));

    for (var j = 0; j < userArrayID.length; j++) {

        let User = new USER();
        User.id = userArrayID[j].objectId;
        //console.log("User: " + JSON.stringify(User));

        userArray.push(User);
        //console.log("userArray: " + JSON.stringify(userArray));

    }

    //console.log("userArray: " + JSON.stringify(userArray));


    async function updateAllChannelFollows(skip) {

        let queryChannelFollower = new Parse.Query(CHANNELFOLLOW);
        queryChannelFollower.containedIn("user", userArray);
        queryChannelFollower.equalTo("channel", Channel);
        queryChannelFollower.include("channel");
        queryChannelFollower.limit(500);
        queryChannelFollower.skip(skip);

        let ChannelFollowers = await queryChannelFollower.find({

            //useMasterKey: true
            sessionToken: sessionToken

        });

        if (ChannelFollowers.length > 0) {

            let userArrayChannelFollowersSet = new Set();
            let ChannelFollowersSet = new Set();

            let ChannelObject = ChannelFollowers[0].get("channel");


            //console.log("ChannelFollowers.length: " + JSON.stringify(ChannelFollowers.length));


            for (var i = 0; i < ChannelFollowers.length; i++) {
                let ChannelFollow = ChannelFollowers[i];
                ChannelFollow.set("isFollower", true);
                ChannelFollow.set("isMember", true);

                //console.log("ChannelFollow: " + JSON.stringify(ChannelFollow));

                userArrayChannelFollowersSet.add(ChannelFollow.get("user").id);
                ChannelFollowersSet.add(ChannelFollow);

            }


            //console.log("userArrayChannelFollowers: " + JSON.stringify(userArrayChannelFollowersSet.size));

            let userArrayChannelFollowers = Array.from(userArrayChannelFollowersSet);
            let arrayChannelFollowersSet = Array.from(ChannelFollowersSet);

            //console.log("::userArrayChannelFollowers:: " + JSON.stringify(userArrayChannelFollowers.length));

            await Parse.Object.saveAll(arrayChannelFollowersSet, {

                //useMasterKey: true
                sessionToken: sessionToken

            });

            if (ChannelFollowers.length >= 500) {

                await updateAllChannelFollows(skip + 500); // make a recursion call with different skip value

            }
            else {

                //console.log("ChannelFollowers less than 500");

                let ChannelFollowSet = new Set();


                for (var i = 0; i < userArray.length; i++) {

                    let user = userArray[i];
                    //console.log("user: " + JSON.stringify(user.id));
                    //console.log("userArrayChannelFollowers: " + JSON.stringify(userArrayChannelFollowers));


                    let includesMatch = userArrayChannelFollowers.includes(user.id);

                    console.log("includesMatch: " + JSON.stringify(includesMatch));

                    if(includesMatch === false) {
                        // this user doesn't have a channelFollow, create one!

                        let newChannelFollow = new CHANNELFOLLOW();
                        newChannelFollow.set("user", userArray[i]);
                        newChannelFollow.set("workspace", Workspace);
                        newChannelFollow.set("channel", Channel);
                        newChannelFollow.set("isFollower", true);
                        newChannelFollow.set("isMember", true);

                        ChannelFollowSet.add(newChannelFollow);

                        if ( i === (userArray.length - 1)) {

                            console.log("ChannelFollowArray 1: " + JSON.stringify(ChannelFollowSet));
                            console.log("ChannelFollowSet Size: " + JSON.stringify(ChannelFollowSet.size));


                            //let dupeArray = [3,2,3,3,5,2];
                            let ChannelFollowArray = Array.from(new Set(ChannelFollowSet));

                            console.log("ChannelFollowArray length: " + JSON.stringify(ChannelFollowArray.length));

                            if (ChannelFollowArray.length > 0) {

                                await Parse.Object.saveAll(ChannelFollowArray, {

                                    //useMasterKey: true
                                    sessionToken: sessionToken

                                });

                                async function SendNotifications () {

                                    console.log("starting SendNotifications function: " + JSON.stringify(ChannelFollowArray.length) );


                                    if (ChannelFollowArray.length > 0) {

                                        let notifications = new Set();

                                        for (let i = 0; i < ChannelFollowArray.length; i++) {

                                            let userId = ChannelFollowArray[i].get("user").id;

                                            let userTo = new USER();
                                            userTo.id = userId;

                                            let NOTIFICATION = Parse.Object.extend("Notification");
                                            let notification = new NOTIFICATION();

                                            notification.set("isDelivered", false);
                                            notification.set("hasSent", false);
                                            notification.set("isRead", false);
                                            notification.set("status", '0');
                                            notification.set("userFrom", currentUser);
                                            notification.set("userTo", userTo);
                                            notification.set("workspace", Workspace);
                                            notification.set("channel", Channel);
                                            notification.set("type", 'addToChannel'); // mentions in post or postMessage
                                            notification.set("userFromDisplayName", currentUser.get("displayName"));
                                            notification.set("messageTitle", '[@' + currentUser.get("displayName") + ':' + currentUser.id + '] ' + 'added you to this channel: ');
                                            notification.set("messageDescription", ChannelObject.get("name"));
                                            notification.set("message", '[@'+currentUser.get("displayName")+ ':' + currentUser.id + '] ' + 'added you to this channel: ' + ChannelObject.get("name"));

                                            notifications.add(notification);

                                            console.log("notification: " + JSON.stringify(notification));

                                            if (i === ChannelFollowArray.length - 1) {


                                                //let dupeArray = [3,2,3,3,5,2];
                                                let notificationArray = Array.from(new Set(notifications));

                                                console.log("notificationArray length: " + JSON.stringify(notificationArray.length));

                                                if (notificationArray.length > 0) {

                                                    Parse.Object.saveAll(notificationArray, {

                                                        useMasterKey: true
                                                        //sessionToken: sessionToken

                                                    }).then(function(result) {
                                                        // if we got 500 or more results then we know
                                                        // that we have more results
                                                        // otherwise we finish

                                                        return result;


                                                    }, function(err) {
                                                        // error
                                                        console.error(err);

                                                        return err;

                                                    });


                                                }






                                            }

                                        }




                                    }
                                    else {

                                        // no need to send notifications



                                        return ChannelFollowArray;


                                    }


                                }

                                await SendNotifications ();

                                let finalTime = process.hrtime(time);
                                console.log(`finalTime took addPeopleToChannel CloudFunction ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);



                            }


                        }

                    }





                }







            }



        }

        else {

            let ChannelFollowSet = new Set();

            for (var i = 0; i < userArray.length; i++) {

                let newChannelFollow = new CHANNELFOLLOW();
                newChannelFollow.set("user", userArray[i]);
                newChannelFollow.set("workspace", Workspace);
                newChannelFollow.set("channel", Channel);
                newChannelFollow.set("isFollower", true);
                newChannelFollow.set("isMember", true);

                ChannelFollowSet.add(newChannelFollow);

                //console.log("ChannelFollowArray: " + JSON.stringify(ChannelFollowSet));


            }

            let channelFollowArray= Array.from(new Set(ChannelFollowSet));

            console.log("uniqueArray: " + JSON.stringify(channelFollowArray.length));



            if (channelFollowArray.length > 0) {

                await Parse.Object.saveAll(channelFollowArray, {

                    //useMasterKey: true
                    sessionToken: sessionToken

                });

                console.log("afterSave Channel: " + JSON.stringify(Channel));

                let CHANNEL = Parse.Object.extend("Channel");
                let queryChannel = new Parse.Query(CHANNEL);

                let channelObject = await queryChannel.get(Channel.id, {

                    //useMasterKey: true
                    sessionToken: sessionToken

                });

                async function SendNotifications () {

                    console.log("starting SendNotifications function: " + JSON.stringify(channelFollowArray.length) );

                    console.log("afterSave channelObject: " + JSON.stringify(channelObject));



                    if (channelFollowArray.length > 0) {

                        let notifications = new Set();

                        for (let i = 0; i < channelFollowArray.length; i++) {

                            let userId = channelFollowArray[i].get("user").id;
                            console.log("userId: " + JSON.stringify(userId));

                            let userTo = new USER();
                            userTo.id = userId;

                            let NOTIFICATION = Parse.Object.extend("Notification");
                            let notification = new NOTIFICATION();

                            notification.set("isDelivered", false);
                            notification.set("hasSent", false);
                            notification.set("isRead", false);
                            notification.set("status", '0');
                            notification.set("userFrom", currentUser);
                            notification.set("userTo", userTo);
                            notification.set("workspace", Workspace);
                            notification.set("channel", Channel);
                            notification.set("type", 'addToChannel'); // mentions in post or postMessage
                            notification.set("userFromDisplayName", currentUser.get("displayName"));
                            notification.set("messageTitle", '[@' + currentUser.get("displayName") + ':' + currentUser.id + '] ' + 'added you to this channel: ');
                            notification.set("messageDescription", channelObject.get("name"));
                            notification.set("message", '[@'+currentUser.get("displayName")+ ':' + currentUser.id + '] ' + 'added you to this channel: ' + channelObject.get("name"));

                            notifications.add(notification);

                            console.log("notification: " + JSON.stringify(notification));

                            if (i === channelFollowArray.length - 1) {


                                //let dupeArray = [3,2,3,3,5,2];
                                let notificationArray = Array.from(new Set(notifications));

                                console.log("notificationArray length: " + JSON.stringify(notificationArray.length));

                                if (notificationArray.length > 0) {

                                    await Parse.Object.saveAll(notificationArray, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    });


                                }






                            }

                        }




                    }
                    else {

                        // no need to send notifications



                        return channelFollowArray;


                    }


                }

                await SendNotifications ();

                let finalTime = process.hrtime(time);
                console.log(`finalTime took addPeopleToChannel CloudFunction ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);






            }



        }


    }

    await updateAllChannelFollows(0);


}, {useMasterKey: true});

// cloud API and function to addPeopleToWorkspace
Parse.Cloud.define("addPeopleToWorkspace", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-addPeopleToWorkspace.UNAUTHENTICATED_USER');

    }

    //get request params
    let workspaceId = request.params.workspace;
    let userArrayID = request.params.usersToAdd;

    let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
    let workspaceFollower = new WORKSPACEFOLLOWER();

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let Workspace = new WORKSPACE();
    Workspace.id = workspaceId;

    let USER = Parse.Object.extend("_User");


    console.log("before addPeopleToWorkspace: " + JSON.stringify(userArrayID));

    let userArray = [];

    console.log("userArray Set: " + JSON.stringify(userArray));

    console.log("userArray Set: " + JSON.stringify(userArray.length));

    for (var j = 0; j < userArrayID.length; j++) {

        let User = new USER();
        User.id = userArrayID[j].objectId;
        console.log("User: " + JSON.stringify(User));

        userArray.push(User);
        console.log("userArray: " + JSON.stringify(userArray));

    }

    console.log("userArray: " + JSON.stringify(userArray));


    async function updateAllWorkspaceFollowers(skip) {

        let queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);
        queryWorkspaceFollower.containedIn("user", userArray);
        queryWorkspaceFollower.equalTo("workspace", Workspace);
        queryWorkspaceFollower.include("workspace");
        queryWorkspaceFollower.limit(500);
        queryWorkspaceFollower.skip(skip);

        const WorkspaceFollowers = await queryWorkspaceFollower.find({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

        if (WorkspaceFollowers.length > 0) {

            let userArrayWorkspaceFollowersSet = new Set();
            let workspaceFollowersSet = new Set();

            let WorkspaceObject = WorkspaceFollowers[0].get("workspace");


            console.log("WorkspaceFollowers.length: " + JSON.stringify(WorkspaceFollowers.length));


            for (var i = 0; i < WorkspaceFollowers.length; i++) {
                let WorkspaceFollow = WorkspaceFollowers[i];
                WorkspaceFollow.set("isFollower", true);
                WorkspaceFollow.set("isMember", true);

                //console.log("ChannelFollow: " + JSON.stringify(ChannelFollow));

                userArrayWorkspaceFollowersSet.add(WorkspaceFollow.get("user").id);
                workspaceFollowersSet.add(WorkspaceFollow);

            }


            console.log("userArrayWorkspaceFollowersSet: " + JSON.stringify(userArrayWorkspaceFollowersSet.size));

            let userArrayWorkspaceFollowers = Array.from(userArrayWorkspaceFollowersSet);
            let arrayWorkspaceFollowers = Array.from(workspaceFollowersSet);

            console.log("::userArrayWorkspaceFollowers:: " + JSON.stringify(userArrayWorkspaceFollowers.length));

            await Parse.Object.saveAll(arrayWorkspaceFollowers, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            // console.log("saveAll results WorkspaceFollowers: " + JSON.stringify(results));

            if (WorkspaceFollowers.length >= 500) {

                // create notificationSettings for 500 users before creating new workspaces for additional users.

                await updateAllWorkspaceFollowers(skip + 500); // make a recursion call with different skip value

            } else {

                console.log("updateAllWorkspaceFollowers less than 500");

                let WorkspaceFollowSet = new Set();

                for (var i = 0; i < userArray.length; i++) {

                    let user = userArray[i];
                    console.log("user: " + JSON.stringify(user.id));
                    console.log("userArrayWorkspaceFollowers: " + JSON.stringify(userArrayWorkspaceFollowers));


                    let includesMatch = userArrayWorkspaceFollowers.includes(user.id);

                    console.log("includesMatch: " + JSON.stringify(includesMatch));

                    let WorkspaceFollowArray;

                    if(includesMatch === false) {
                        // this user doesn't have a workspaceFollower, create one!

                        let newWorkspaceFollow = new WORKSPACEFOLLOWER();
                        newWorkspaceFollow.set("user", userArray[i]);
                        newWorkspaceFollow.set("workspace", Workspace);
                        newWorkspaceFollow.set("isFollower", true);
                        newWorkspaceFollow.set("isMember", true);

                        WorkspaceFollowSet.add(newWorkspaceFollow);


                    }

                    if ( i === (userArray.length - 1)) {

                        console.log("WorkspaceFollowSet 1: " + JSON.stringify(WorkspaceFollowSet));
                        console.log("WorkspaceFollowSet Size: " + JSON.stringify(WorkspaceFollowSet.size));


                        //let dupeArray = [3,2,3,3,5,2];
                        WorkspaceFollowArray = Array.from(new Set(WorkspaceFollowSet));

                        console.log("WorkspaceFollowArray length: " + JSON.stringify(WorkspaceFollowArray.length));

                        if (WorkspaceFollowArray.length > 0) {

                            await Parse.Object.saveAll(WorkspaceFollowArray, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            });

                            async function SendNotifications () {

                                console.log("starting SendNotifications function: " + JSON.stringify(WorkspaceFollowArray.length) );


                                if (WorkspaceFollowArray.length > 0) {

                                    let notifications = new Set();

                                    for (let i = 0; i < WorkspaceFollowArray.length; i++) {

                                        let userId = WorkspaceFollowArray[i].get("user").id;

                                        let userTo = new USER();
                                        userTo.id = userId;

                                        let NOTIFICATION = Parse.Object.extend("Notification");
                                        let notification = new NOTIFICATION();

                                        notification.set("isDelivered", false);
                                        notification.set("hasSent", false);
                                        notification.set("isRead", false);
                                        notification.set("status", '0');
                                        notification.set("userFrom", currentUser);
                                        notification.set("userTo", userTo);
                                        notification.set("workspace", Workspace);
                                        notification.set("type", 'addToWorkspace'); // mentions in post or postMessage
                                        notification.set("userFromDisplayName", currentUser.get("displayName"));
                                        notification.set("messageTitle", '[@' + currentUser.get("displayName") + ':' + currentUser.id + '] ' + 'added you to this workspace: ');
                                        notification.set("messageDescription", WorkspaceObject.get("workspace_name"));
                                        notification.set("message", '[@'+currentUser.get("displayName")+ ':' + currentUser.id + '] ' + 'added you to this workspace: ' + WorkspaceObject.get("workspace_name"));

                                        notifications.add(notification);

                                        console.log("notification: " + JSON.stringify(notification));

                                        if (i === WorkspaceFollowArray.length - 1) {


                                            //let dupeArray = [3,2,3,3,5,2];
                                            let notificationArray = Array.from(new Set(notifications));

                                            console.log("notificationArray length: " + JSON.stringify(notificationArray.length));

                                            if (notificationArray.length > 0) {

                                                return await Parse.Object.saveAll(notificationArray, {

                                                    useMasterKey: true
                                                    //sessionToken: sessionToken

                                                });


                                            }






                                        }

                                    }




                                }
                                else {

                                    // no need to send notifications



                                    return WorkspaceFollowArray;


                                }


                            }

                            await SendNotifications ();


                        }


                        console.log("WorkspaceFollowArray length: " + JSON.stringify(arrayWorkspaceFollowers.length));

                        async function SendNotifications () {

                            console.log("starting SendNotifications function: " + JSON.stringify(arrayWorkspaceFollowers.length) );


                            if (arrayWorkspaceFollowers.length > 0) {

                                let notifications = new Set();

                                for (let i = 0; i < arrayWorkspaceFollowers.length; i++) {

                                    let userId = arrayWorkspaceFollowers[i].get("user").id;

                                    let userTo = new USER();
                                    userTo.id = userId;

                                    let NOTIFICATION = Parse.Object.extend("Notification");
                                    let notification = new NOTIFICATION();

                                    notification.set("isDelivered", false);
                                    notification.set("hasSent", false);
                                    notification.set("isRead", false);
                                    notification.set("status", '0');
                                    notification.set("userFrom", currentUser);
                                    notification.set("userTo", userTo);
                                    notification.set("workspace", Workspace);
                                    notification.set("type", 'addToWorkspace'); // mentions in post or postMessage
                                    notification.set("userFromDisplayName", currentUser.get("displayName"));
                                    notification.set("messageTitle", '[@' + currentUser.get("displayName") + ':' + currentUser.id + '] ' + 'added you to this workspace: ');
                                    notification.set("messageDescription", WorkspaceObject.get("workspace_name"));
                                    notification.set("message", '[@'+currentUser.get("displayName")+ ':' + currentUser.id + '] ' + 'added you to this workspace: ' + WorkspaceObject.get("workspace_name"));

                                    notifications.add(notification);

                                    console.log("notification: " + JSON.stringify(notification));

                                    if (i === WorkspaceFollowArray.length - 1) {


                                        //let dupeArray = [3,2,3,3,5,2];
                                        let notificationArray = Array.from(new Set(notifications));

                                        console.log("notificationArray length: " + JSON.stringify(notificationArray.length));

                                        if (notificationArray.length > 0) {

                                            return await Parse.Object.saveAll(notificationArray, {

                                                useMasterKey: true
                                                //sessionToken: sessionToken

                                            });


                                        }






                                    }

                                }




                            }
                            else {

                                // no need to send notifications



                                return arrayWorkspaceFollowers;


                            }


                        }

                        await SendNotifications ();




                        arrayWorkspaceFollowers = arrayWorkspaceFollowers.concat(WorkspaceFollowArray);

                        let finalTime = process.hrtime(time);
                        console.log(`finalTime took addPeopleToWorkspace CloudFunction ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                        return arrayWorkspaceFollowers;



                    }





                }


            }



        }

        else {


            let WorkspaceFollowSet = new Set();

            for (var i = 0; i < userArray.length; i++) {

                let newWorkspaceFollow = new WORKSPACEFOLLOWER();
                newWorkspaceFollow.set("user", userArray[i]);
                newWorkspaceFollow.set("workspace", Workspace);
                newWorkspaceFollow.set("isFollower", true);
                newWorkspaceFollow.set("isMember", true);

                WorkspaceFollowSet.add(newWorkspaceFollow);

                console.log("WorkspaceFollowSet: " + JSON.stringify(WorkspaceFollowSet));


            }

            let workspaceFollowArray= Array.from(new Set(WorkspaceFollowSet));

            console.log("uniqueArray: " + JSON.stringify(workspaceFollowArray.length));



            if (workspaceFollowArray.length > 0) {

                await Parse.Object.saveAll(workspaceFollowArray, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                console.log("afterSave Workspace: " + JSON.stringify(Workspace));

                const workspaceObject = await Workspace.fetch(Workspace.id, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                async function SendNotifications (workspaceObject) {

                    console.log("starting SendNotifications function: " + JSON.stringify(workspaceFollowArray.length) );

                    console.log("afterSave workspaceObject: " + JSON.stringify(workspaceObject));



                    if (workspaceFollowArray.length > 0) {

                        let notifications = new Set();

                        for (let i = 0; i < workspaceFollowArray.length; i++) {

                            let userId = workspaceFollowArray[i].get("user").id;
                            console.log("userId: " + JSON.stringify(userId));

                            let userTo = new USER();
                            userTo.id = userId;

                            let NOTIFICATION = Parse.Object.extend("Notification");
                            let notification = new NOTIFICATION();

                            notification.set("isDelivered", false);
                            notification.set("hasSent", false);
                            notification.set("isRead", false);
                            notification.set("status", '0');
                            notification.set("userFrom", currentUser);
                            notification.set("userTo", userTo);
                            notification.set("workspace", Workspace);
                            notification.set("type", 'addToWorkspace'); // mentions in post or postMessage
                            notification.set("userFromDisplayName", currentUser.get("displayName"));
                            notification.set("messageTitle", '[@' + currentUser.get("displayName") + ':' + currentUser.id + '] ' + 'added you to this workspace: ');
                            notification.set("messageDescription", Workspace.get("workspace_name"));
                            notification.set("message", '[@'+currentUser.get("displayName")+ ':' + currentUser.id + '] ' + 'added you to this workspace: ' + Workspace.get("workspace_name"));

                            notifications.add(notification);

                            console.log("notification: " + JSON.stringify(notification));

                            if (i === workspaceFollowArray.length - 1) {


                                //let dupeArray = [3,2,3,3,5,2];
                                let notificationArray = Array.from(new Set(notifications));

                                console.log("notificationArray length: " + JSON.stringify(notificationArray.length));

                                if (notificationArray.length > 0) {

                                    return await Parse.Object.saveAll(notificationArray, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    });


                                }






                            }

                        }




                    }
                    else {

                        // no need to send notifications



                        return workspaceFollowArray;


                    }


                }

                await SendNotifications (workspaceObject);

                let finalTime = process.hrtime(time);
                console.log(`finalTime took addPeopleToWorkspace CloudFunction ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                return workspaceFollowArray;


            }

            else {

                let finalTime = process.hrtime(time);
                console.log(`finalTime took addPeopleToWorkspace CloudFunction ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                return workspaceFollowArray;
            }



        }
    }

    await updateAllWorkspaceFollowers(0);


}, {useMasterKey: true});

// cloud API and function to invitePeopleToWorkspace
Parse.Cloud.define("invitePeopleToWorkspace", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let username = currentUser.get("username");
    let fullname = currentUser.get("fullname");
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-invitePeopleToWorkspace.UNAUTHENTICATED_USER');

    }

    //get request params
    let workspaceId = request.params.workspace;
    let userEmails = request.params.emailsToAdd;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let Workspace = new WORKSPACE();
    Workspace.id = workspaceId;

    let USERINVITES = Parse.Object.extend("UserInvites");


    let USER = Parse.Object.extend("_User");


    console.log("before userEmails: " + JSON.stringify(userEmails));

    let userEmailArray = [];

    console.log("userEmailArray Set: " + JSON.stringify(userEmailArray));

    console.log("userEmailArray Set: " + JSON.stringify(userEmailArray.length));

    for (var j = 0; j < userEmails.length; j++) {

        userEmailArray.push(userEmails[j].email.toLowerCase());
        console.log("userEmailArray: " + JSON.stringify(userEmailArray));

    }

    console.log("userEmailArray: " + JSON.stringify(userEmailArray));



    async function getUserIdsFromEmails (skip) {

        let queryUser = new Parse.Query(USER);
        queryUser.containedIn("email", userEmailArray);
        queryUser.limit(500);
        queryUser.skip(skip);

        const Users = await queryUser.find({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });


        if (Users.length > 0) {

            let userEmailsSet = new Set();
            let userObjectIdSet = new Set ();

            for (var i = 0; i < Users.length; i++) {
                let userObject = Users[i];

                userEmailsSet.add(userObject.get("email"));
                userObjectIdSet.add({"objectId": userObject.id});

            }


            console.log("userEmailsSet: " + JSON.stringify(userEmailsSet.size));

            let userArrayEmails = Array.from(userEmailsSet);
            let userArrayObjectIds = Array.from(userObjectIdSet);

            console.log("::userArrayEmails:: " + JSON.stringify(userArrayEmails.length));

            console.log("::workspaceId:: " + JSON.stringify(workspaceId));
            console.log("::useIDs:: " + JSON.stringify(userArrayObjectIds));

            await Parse.Cloud.run("addPeopleToWorkspace", {
                //user: currentUser,
                workspace: workspaceId,
                usersToAdd: userArrayObjectIds

            },{sessionToken: sessionToken});

            if (Users.length >= 500) {

                await getUserIdsFromEmails(skip + 500); // make a recursion call with different skip value

            }
            else {

                console.log("getUserIdsFromEmails less than 500");

                let UserInvitesSet = new Set();

                for (var i = 0; i < userEmailArray.length; i++) {

                    let userEmail = userEmailArray[i];
                    //console.log("userEmail: " + JSON.stringify(userEmail));
                    //console.log("userArrayEmails: " + JSON.stringify(userArrayEmails));


                    let includesMatch = userArrayEmails.includes(userEmail);

                    //console.log("includesMatch: " + JSON.stringify(includesMatch));

                    if(includesMatch === false) {
                        // this user doesn't have a workspaceFollow, create one!

                        let userInvites = new USERINVITES();
                        userInvites.set("email", userEmail);
                        userInvites.set("workspace", Workspace);
                        userInvites.set("userWhoInvited", currentUser);

                        UserInvitesSet.add(userInvites);

                        if ( i === (userEmailArray.length - 1)) {

                            //console.log("UserInvitesSet 1: " + JSON.stringify(UserInvitesSet));
                            //console.log("UserInvitesSet Size: " + JSON.stringify(UserInvitesSet.size));


                            //let dupeArray = [3,2,3,3,5,2];
                            let UserInvitesArray = Array.from(new Set(UserInvitesSet));

                            //console.log("UserInvitesArray length: " + JSON.stringify(UserInvitesArray.length));

                            if (UserInvitesArray.length > 0) {

                                await Parse.Object.saveAll(UserInvitesArray, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });

                                await Parse.Cloud.run("sendEmail", {
                                    //user: currentUser,
                                    workspaceName: Workspace.get("workspace_name"),
                                    username: fullname,
                                    workspaceID: workspaceId,
                                    emails: userEmails

                                },{sessionToken: sessionToken});


                            }




                        }

                    }





                }


            }

            let finalTime = process.hrtime(time);
            console.log(`finalTime took invitePeopleToWorkspace CloudFunction ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);



        }

        else {

            // create new UserInvites for these emails (people who are not yet on Papr, no user ID)

            let UserInvitesSet = new Set();

            for (var i = 0; i < userEmailArray.length; i++) {

                let newUserInvites = new USERINVITES();
                newUserInvites.set("email", userEmailArray[i]);
                newUserInvites.set("workspace", Workspace);
                newUserInvites.set("userWhoInvited", currentUser);


                UserInvitesSet.add(newUserInvites);

                console.log("UserInvitesSet: " + JSON.stringify(UserInvitesSet));


            }

            let userInvitesArray= Array.from(new Set(UserInvitesSet));

            console.log("userInvitesArray: " + JSON.stringify(userInvitesArray.length));



            if (userInvitesArray.length > 0) {

                await Parse.Object.saveAll(userInvitesArray, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                const workspaceObject = await Workspace.fetch(Workspace.id, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    throw new Error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                await Parse.Cloud.run("sendEmail", {
                    //user: currentUser,
                    workspaceName: workspaceObject.get("workspace_name"),
                    username: fullname,
                    workspaceID: workspaceId,
                    emails: userEmails

                },{sessionToken: sessionToken});



                let finalTime = process.hrtime(time);
                console.log(`finalTime took invitePeopleToWorkspace CloudFunction ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);



            }



        }
    }

    await getUserIdsFromEmails(0);



}, {useMasterKey: true});

// cloud API and function to add one or multiple skills to skills table.
Parse.Cloud.define("addSkills", async request => {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();
    var skills;
    var skillObjects = [];

    //get request params
    skills = request.params.skills;

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

    }

    var finalTime = process.hrtime(time);
    console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

    return await Parse.Object.saveAll(skills ,  {

        useMasterKey: true
        //sessionToken: sessionToken

    });

});

// cloud API and function to add one or multiple skills to skills table.
Parse.Cloud.define("createWorkspace", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('define-createWorkspace.UNAUTHENTICATED_USER');

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

        throw new Error ("Please attach a picture for your workspace its required.");

    }
    if (!workspaceToSave.toJSON().name) {

        throw new Error ("Please enter a workspace name it's a required field.");

    }
    if (!workspaceToSave.toJSON().url) {

        throw new Error ("Please enter a workspace url it's a required field.");

    }


    async function createWorkspace () {

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


        return workspaceToSave.save(null, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    }

    async function createOwnerWorkspaceFollower (workspaceResult) {

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

                let WorkspaceFollower = workspaceFollower.save(null, {

                    useMasterKey: true,
                    //sessionToken: sessionToken

                });

                console.log("createOwnerWorkspaceFollower workspace new workspace to save: " + JSON.stringify(workspaceFollower));


                workspaceToSave.objectID = workspaceToSave.objectId;
                followersArray.push(WorkspaceFollower);
                workspaceToSave['followers'] = followersArray;

                console.log("createOwnerWorkspaceFollower workspaceToSave with followers: " + JSON.stringify(workspaceToSave));


                // add _tags for this workspacefollower so it's visible in algolia

                if (workspaceToSave.get("type") === 'private') {
                    viewableBy.push(WorkspaceFollower.toJSON().user.objectId);
                    //console.log("user id viewableBy: " + followers[i].toJSON().user.objectId) ;
                }


                if (workspaceToSave.get("type") === 'private') {

                    workspaceToSave._tags= viewableBy;
                    //console.log("workspace 2: " + JSON.stringify(workspaceToSave));

                } else if (workspaceToSave.get("type")=== 'public') {

                    workspaceToSave._tags = ['*'];

                }



                return workspaceToSave;


            }
            else {

                return null;
            }


        } else {


            return null;
        }



    }



    const results = await async.waterfall([
        async.apply(createWorkspace),
        async.apply(createOwnerWorkspaceFollower)

    ]);

    if (results) {

        workspaceToSave = results[1];

        return await indexWorkspaces.partialUpdateObject(workspaceToSave, {
            createIfNotExists: true
        }).then(({ objectID }) => {

            console.log("Parse<>Algolia object saved from _User afterSave function: " + JSON.stringify(objectID));
            let finalTime = process.hrtime(time);
            console.log(`finalTime took createWorkspace Cloud Function ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

            return results;


        });


    }



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
Parse.Cloud.define("indexAlgolia", async request => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let collection = request.params.collection;
    let index;

    let query = new Parse.Query(collection);
    query.limit(100); // todo limit to at most 1000 results need to change and iterate until done todo

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
        case "PostMessage":

            break;
        case "PostMessageSocial":

            break;

        default:
            throw new Error ("The collection entered does not exist. Please enter one of the following collections: _User, Post, WorkSpace, Channel, Meeting, PostChatMessage or PostQuestionMessage");
    }

    let objects = await query.find({

        useMasterKey: true
        //sessionToken: sessionToken

    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        throw new Error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });

    async function indexAlgoliaObjects (objects) {

        await Promise.all( {

            objects:forEach(async function (object) {

                let PARSEOBJECT = Parse.Object.extend(collection);
                let parseObject = new PARSEOBJECT();
                parseObject.id = object.id;

                await parseObject.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                return object;

            })

        })

    }

    return await indexAlgoliaObjects();


}, {useMasterKey: true});

// Parse version 4.2.0
Parse.Cloud.beforeSave('_User', async (req) => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {

        throw new Error('beforeSave-User.UNAUTHENTICATED_USER');
    }

    let user = req.object;
    let userOriginal = req.original;
    //console.log("req: " + JSON.stringify(req));

    let socialProfilePicURL = user.get("socialProfilePicURL");
    let profileImage = user.get("profileimage");

    //console.log("_User req: " + JSON.stringify(req));

    //let expiresAt = session.get("expiresAt");
    let _tagPublic = '*';
    let _tagUserId = user.id;
    //console.log("_tagUserId: " + JSON.stringify(_tagUserId));

    let defaultTagFilters = new Set();
    if (_tagUserId) {

        defaultTagFilters.add(_tagUserId);

    }

    defaultTagFilters.add(_tagPublic);
    let defaultTagFiltersArray = Array.from(new Set(defaultTagFilters));

    //console.log("defaultTagFilters: " + JSON.stringify((defaultTagFilters)) );

    let userOriginalTagFilters = userOriginal? userOriginal.get("tagFilters") : defaultTagFiltersArray;
    //console.log("userOriginalTagFilters: " + JSON.stringify(userOriginalTagFilters));
    //console.log("userOriginalTagFilters.length: " + JSON.stringify(userOriginalTagFilters.length));

    if (!user.get("displayName")) {

        let fullNameUser = user.get("fullname");

        user.set("displayName", fullNameUser);
    }


    if (user.dirty("profileimage") === true || user.get("isWorkspaceUpdated") === true || user.get("isChannelUpdated") === true || user.dirty("title") || user.dirty("displayName") === true || user.dirty("fullname") === true || user.dirty("roles") === true || user.dirty("isOnline") === true || user.dirty("showAvailability") === true) {

        user.set("isUpdateAlgoliaIndex", true);


    } else {

        user.set("isUpdateAlgoliaIndex", false);

    }

    if ( !user.get("isWorkspaceUpdated")  || !user.get("isChannelUpdated") ) {

        user.set("isWorkspaceUpdated", false);
        user.set("isChannelUpdated", false);


    }



    if (user.dirty("profileimage") === true && profileImage) {

        user.set("isDirtyProfileimage", true);

        // console.log("Profileimage url: " + JSON.stringify(profileImage.toJSON().url));


    }
    else if (user.dirty("profileimage") === false) {user.set("isDirtyProfileimage", false);}

    if (user.dirty("isOnline") === true) {
        user.set("isDirtyIsOnline", true);

    }
    else if (user.dirty("isOnline") === false) {user.set("isDirtyIsOnline", false);}

    if (user.dirty("showAvailability") === true) {
        user.set("isDirtyShowAvailability", true);

    }
    else if (user.dirty("showAvailability") === false) {user.set("isDirtyShowAvailability", false);}

    if (user.dirty("isTyping") === true) {
        user.set("isDirtyTyping", true);

    }
    else if (user.dirty("isTyping") === false) {user.set("isDirtyTyping", false);}

    if (user.isNew()) {
        user.set("isNew", true);
        user.set("showAvailability", true);

        if (user.get("isLogin") === true) {

            user.set("isLogin", false);

            // new session, create a new algoliaAPIKey for this user

            // generate a public API key for user 42. Here, records are tagged with:
            //  - 'user_XXXX' if they are visible by user XXXX
            const user_public_key = await client.generateSecuredApiKey(
                '4cbf716235b59cc21f2fa38eb29c4e39',
                {
                    //validUntil: expiresAt,
                    tagFilters: [ defaultTagFiltersArray ],
                    userToken: user.id
                }
            );

            console.log("new algoliaPublic key generated for " + JSON.stringify(user.id));


            user.set("algoliaSecureAPIKey", user_public_key);
            user.set("tagFilters", defaultTagFiltersArray);


        }

        if (socialProfilePicURL!== null)  {

            var displayName = user.get("displayName");
            var fileName = user.id + displayName + '_profilePicture';

            const contents = await Parse.Cloud.httpRequest({
                url: socialProfilePicURL
            });

            //const data = Array.from(Buffer.from(response.body, 'binary'));
            //const contentType = response.headers['content-type'];

            const file = new Parse.File(fileName, { base64: contents.buffer.toString('base64') });
            user.set("profileimage", file);
            await file.save();

            let finalTime = process.hrtime(time);
            console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);



            /* const options = {

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

                    // response.success();
                })
                .catch(

                    throw new Error('beforeSave-User.ImageDownloadError')
                );
                */


        }
        else {
            let finalTime = process.hrtime(time);
            console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

            // response.success();
        }

    }

    else if (!user.isNew()) {

        user.set("isNew", false);

        if (user.get("isLogin") === true) {

            user.set("isLogin", false);

            if (userOriginalTagFilters.length === 1) {
                //console.log("userOriginalTagFilters 1: " + JSON.stringify(userOriginalTagFilters.length));
                userOriginalTagFilters.push(_tagUserId);
                user.set("tagFilters", userOriginalTagFilters);

            }

            // new session, create a new algoliaAPIKey for this user

            // generate a public API key for user 42. Here, records are tagged with:
            //  - 'user_XXXX' if they are visible by user XXXX
            const user_public_key = await client.generateSecuredApiKey(
                '4cbf716235b59cc21f2fa38eb29c4e39',
                {
                    //validUntil: expiresAt,
                    tagFilters: [ userOriginalTagFilters ],
                    userToken: user.id
                }
            );

            console.log("new algoliaPublic key generated for " + JSON.stringify(user.id));


            user.set("algoliaSecureAPIKey", user_public_key);

            // response.success();


        }

        else {

            if (userOriginalTagFilters.length === 1) {
                //console.log("userOriginalTagFilters 1: " + JSON.stringify(userOriginalTagFilters.length));
                userOriginalTagFilters.push(_tagUserId);
                user.set("tagFilters", userOriginalTagFilters);

            }

            // new session, create a new algoliaAPIKey for this user

            // generate a public API key for user 42. Here, records are tagged with:
            //  - 'user_XXXX' if they are visible by user XXXX
            const user_public_key = await client.generateSecuredApiKey(
                '4cbf716235b59cc21f2fa38eb29c4e39',
                {
                    //validUntil: expiresAt,
                    tagFilters: [ userOriginalTagFilters ],
                    userToken: user.id
                }
            );

            console.log("new algoliaPublic key generated for " + JSON.stringify(user.id));


            user.set("algoliaSecureAPIKey", user_public_key);

            //response.success();


        }

        //response.success();


    }




}, {useMasterKey: true});


// Run beforeSave functions workspace parse server version >= 3.0.0
Parse.Cloud.beforeSave('WorkSpace', async (req) => {

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

        throw new Error('beforeSave-WorkSpace.UNAUTHENTICATED_USER');
    }
    //var WORKSPACE = Parse.Object.extend("WorkSpace");
    let WORKspace = new Parse.Object("WorkSpace");

    let queryWorkspace = new Parse.Query(WORKspace);

    if (workspace.dirty("skills") === true) {
        workspace.set("isDirtySkills", true);
    } else if (!workspace.dirty("skills") || workspace.dirty("skills") === false) {
        workspace.set("isDirtySkills", false);

    }

    async function archiveWorkspaceFollowers () {

        let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");

        let queryWorksapceFollower = new Parse.Query(WORKSPACEFOLLOWER);
        queryWorksapceFollower.equalTo("workspace", workspace);
        queryWorksapceFollower.limit(10000);

        const workspacefollowers = await queryWorksapceFollower.find({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

        if (workspacefollowers) {

            const finalWorkspaceFollowers = await async.map(workspacefollowers, async function (object) {

                let workspaceFollower = new WORKSPACEFOLLOWER();
                workspaceFollower.id = object.id;

                workspaceFollower.set("archive", true);
                workspaceFollower.set("user", object.get("user"));

                object = workspaceFollower;

                console.log("archive workspacefollowerobject: " + JSON.stringify(object));

                return object;

                //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));



            });

            return await Parse.Object.saveAll(finalWorkspaceFollowers, {

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


        }

        else {

            // no workspaceFollowers to delete return
            return [];

        }


    }

    async function unarchiveWorkspaceFollowers () {

        let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");

        let queryWorksapceFollower = new Parse.Query(WORKSPACEFOLLOWER);
        queryWorksapceFollower.equalTo("workspace", workspace);
        queryWorksapceFollower.limit(10000);

        const workspacefollowers = await queryWorksapceFollower.find({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

        if (workspacefollowers) {

            const finalWorkspaceFollowers = await async.map(workspacefollowers, async function (object) {

                let workspaceFollower = new WORKSPACEFOLLOWER();
                workspaceFollower.id = object.id;

                workspaceFollower.set("archive", false);
                workspaceFollower.set("user", object.set("user"));
                if (object.get("user").id === req.user.toJSON().objectId) {

                    workspaceFollower.set("isSelected", true);

                }

                object = workspaceFollower;

                // console.log("unarchive workspacefollowerobject: " + JSON.stringify(object));

                return object;

            });

            return await Parse.Object.saveAll(finalWorkspaceFollowers, {

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


        }
        else {

            // no workspaceFollowers to delete return
            return [];

        }

    }

    console.log("workspace isNew: " + JSON.stringify(workspace.isNew()));

    if (workspace.isNew() === true) {


        queryWorkspace.equalTo("workspace_url", workspace.get("workspace_url"));

        const resultWorkspaceFollower = await queryWorkspace.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

        if (resultWorkspaceFollower) {

            // workspace url is not unique return error

            let finalTime = process.hrtime(time);
            console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

            throw new Error ("workspace URL already exists, please try a different URL: " + resultWorkspaceFollower);

        }
        else {

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

            const expert = await owner.fetch(owner.id, {

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            let expertOwner = simplifyUser(expert);

            //expertArray.push(expertOwner);
            workspace.addUnique("expertsArray", expertOwner);

            let finalTime = process.hrtime(time);
            console.log(`finalTime took beforeSave Workspace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

        }


    }
    else if (workspace.isNew() === false && workspace.dirty("workspace_url") === true) {

        workspace.set("isNew", false);
        console.log("set workspace isNew to false");

        queryWorkspace.equalTo("workspace_url", workspace.get("workspace_url"));

        const resultWorkspaceFollower = await queryWorkspace.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

        if (resultWorkspaceFollower) {

            // workspace url is not unique return error

            throw new Error ("workspace URL already exists, please try a different URL: " + resultWorkspaceFollower);

        }

        else {

            if (workspace.dirty("experts") || workspace.get("isDirtyExperts") === true) {

                let workspaceExpertObjects = req.object.toJSON().experts.objects;
                let exp__op = req.object.toJSON().experts.__op;

                workspace.set("isDirtyExperts", true);

                if (exp__op === "AddRelation") {

                    // add expert to expertsArray

                    return await async.map(workspaceExpertObjects, async function (object) {

                        let workspaceExpertObject = new Parse.Object("_User");
                        workspaceExpertObject.set("objectId", object.objectId);

                        //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));

                        const expert = await workspaceExpertObject.fetch(workspaceExpertObject.id, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            throw new Error(error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

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

                        return object;

                    });



                }
                else if (exp__op === "RemoveRelation") {

                    // remove expert from expertsArray

                    return await async.map(workspaceExpertObjects, async function (object) {

                        let workspaceExpertObject = new Parse.Object("_User");
                        workspaceExpertObject.set("objectId", object.objectId);

                        //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));

                        const expert = await workspaceExpertObject.fetch(workspaceExpertObject.id, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            throw new Error(error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                        let expertOwner = simplifyUser(expert);

                        //console.log("expertOwner 2: " + JSON.stringify(expertOwner));

                        //o[key] = expertOwner;

                        workspace.remove("expertsArray", expertOwner);

                        object = expertOwner;
                        //expertArray.push(expertOwner);

                        return object;

                    });



                }
                else {

                    if (workspace.get("isDirtyExperts") === true) {

                        let expertRelationQuery = expertRelation.query();

                        const experts = await expertRelationQuery.find({
                            useMasterKey: true
                            //sessionToken: sessionToken

                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            throw new Error(error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });


                        if (experts.length > 0) {

                            let emptyArray = [];

                            workspace.set("expertsArray", emptyArray);

                            return await async.map(experts, async function (expert) {

                                let expertUser = simplifyUser(expert);

                                //console.log("expertOwner 2: " + JSON.stringify(expertOwner));

                                expert = expertUser;

                                workspace.addUnique("expertsArray", expertUser);
                                //expertArray.push(expertOwner);

                                return expert;

                            });


                        }
                        else {

                            let finalTime = process.hrtime(time);
                            console.log(`finalTime took beforeSave WorkSpace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                        }


                    }

                    else {

                        let finalTime = process.hrtime(time);
                        console.log(`finalTime took beforeSave WorkSpace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                    }

                }


            }
            else {

                workspace.set("isDirtyExperts", false);

                if (workspace.dirty("archive")) {

                    const Workspace = await queryWorkspace.get(workspace.id, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    if (Workspace) {

                        if (Workspace.get("archive") === false && workspace.get("archive") === true) {

                            // user wants to archive a workspace then archive it
                            let beforeSave_Time = process.hrtime(time);
                            console.log(`beforeSave_Time beforeSave Workspace took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                            return await archiveWorkspaceFollowers();

                        }
                        else if (Workspace.get("archive") === true && workspace.get("archive") === false) {

                            // user wants to un-archive a workspace then un-archive it
                            let beforeSave_Time = process.hrtime(time);
                            console.log(`beforeSave_Time beforeSave Workspace took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                            return await unarchiveWorkspaceFollowers();

                        }


                    }

                    else {
                        let beforeSave_Time = process.hrtime(time);
                        console.log(`beforeSave_Time beforeSave Workspace Follower took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                        throw new Error ("No Workspace Found when user was trying to archive it.")

                    }




                }

                else {

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Workspace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                }
            }

        }


    }
    else if (workspace.isNew() === false  && workspace.dirty("workspace_url") === false) {


        workspace.set("isNew", false);
        // console.log("set workspace isNew to false 2");


        //console.log("workspace Experts.dirty: " + workspace.dirty("experts"));

        if (workspace.dirty("experts") || workspace.get("isDirtyExperts") === true) {

            workspace.set("isDirtyExperts", true);

            let workspaceExpertObjects = req.object.toJSON().experts.objects;
            let exp__op = req.object.toJSON().experts.__op;
            console.log("exp__op: " + JSON.stringify(exp__op));


            if (exp__op === "AddRelation") {

                // add expert to expertsArray
                return await async.map(workspaceExpertObjects, async function (object) {

                    let workspaceExpertObject = new Parse.Object("_User");
                    workspaceExpertObject.set("objectId", object.objectId);

                    //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));

                    const expert = await workspaceExpertObject.fetch(workspaceExpertObject.id, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

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

                    return object;

                });

            }
            else if (exp__op === "RemoveRelation") {

                return await async.map(workspaceExpertObjects, async function (object) {

                    let workspaceExpertObject = new Parse.Object("_User");
                    workspaceExpertObject.set("objectId", object.objectId);

                    //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));

                    const expert = await workspaceExpertObject.fetch(workspaceExpertObject.id, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    let expertOwner = simplifyUser(expert);

                    //console.log("expertOwner 2: " + JSON.stringify(expertOwner));

                    //o[key] = expertOwner;

                    workspace.remove("expertsArray", expertOwner);

                    object = expertOwner;
                    //expertArray.push(expertOwner);

                    return object;

                });



            }
            else {

                if (workspace.get("isDirtyExperts") === true) {

                    let expertRelationQuery = expertRelation.query();

                    const experts = await expertRelationQuery.find({
                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    if (experts.length > 0) {

                        let emptyArray = [];

                        workspace.set("expertsArray", emptyArray);

                        return await async.map(experts, async function (expert) {

                            let expertUser = simplifyUser(expert);

                            //console.log("expertOwner 2: " + JSON.stringify(expertOwner));

                            expert = expertUser;

                            workspace.addUnique("expertsArray", expertUser);
                            //expertArray.push(expertOwner);

                            return expert;


                        });


                    }
                    else {

                        let finalTime = process.hrtime(time);
                        console.log(`finalTime took beforeSave WorkSpace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


                    }


                }

                else {

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave WorkSpace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                }

            }



        }
        else {

            workspace.set("isDirtyExperts", false);

            if (workspace.dirty("archive")) {

                const Workspace = await queryWorkspace.get(workspace.id, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    throw new Error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                if (Workspace) {

                    if (Workspace.get("archive") === false && workspace.get("archive") === true) {

                        // user wants to archive a workspace then archive it

                        let beforeSave_Time = process.hrtime(time);
                        console.log(`beforeSave_Time beforeSave Workspace took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                        return await archiveWorkspaceFollowers();

                    }
                    else if (Workspace.get("archive") === true && workspace.get("archive") === false) {

                        // user wants to un-archive a workspace then un-archive it

                        let beforeSave_Time = process.hrtime(time);
                        console.log(`beforeSave_Time beforeSave Workspace took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                        return await unarchiveWorkspaceFollowers();

                    }


                }

                else {

                    let beforeSave_Time = process.hrtime(time);
                    console.log(`beforeSave_Time beforeSave Workspace took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                    throw new Error ("No Workspace Found when user was trying to archive it.")


                }


            }

            else {

                let finalTime = process.hrtime(time);
                console.log(`finalTime took beforeSave Workspace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

            }

        }


    }
    else {
        workspace.set("isNew", false);

        let finalTime = process.hrtime(time);
        console.log(`finalTime took beforeSave Workspace ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

    }

}, {useMasterKey: true});

// Run beforeSave functions channel
Parse.Cloud.beforeSave('Channel', async (req) => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();
    let channel = req.object;

    let channelACL = new Parse.ACL();

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {
        throw new Error('beforeSave-Channel.UNAUTHENTICATED_USER');
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
            throw new Error ("Channel name is required.");
        }
        if (!channel.get("user")) {
            throw new Error ("User who is the channel creator is required when creating a new channel");
        }
        if (!channel.get("workspace")) {
            throw new Error ("Workspace is required when creating a new channel");
        }
        if (!channel.get("type")) {
            throw new Error ("Channel type field is required.");
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

        const channelResults = await queryChannel.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

        if (channelResults) {

            let finalTime = process.hrtime(time);
            console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);
            throw new Error ("There is already a channel with this name: " + channel.get("name") + ' ' + "please use a channel name that isn't already taken.");

        }

        else {

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

            const User = await owner.fetch(owner.id, {

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            //console.log("user object: " + JSON.stringify(User));
            let userRoleRelation = User.relation("roles");
            //let expertChannelRelation = channelObject.relation("experts");
            //console.log("userRole: " + JSON.stringify(userRoleRelation));
            //console.log("expertChannelRelation: " + JSON.stringify(expertChannelRelation));

            let expertRoleName = "expert-" + workspace.id;

            let userRoleRelationQuery = userRoleRelation.query();
            userRoleRelationQuery.equalTo("name", expertRoleName);

            const userRoleRealtionResult = await userRoleRelationQuery.first({

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            if (userRoleRealtionResult) {

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


                }
                else if (channel.get("type") === 'privateMembers') {

                    // get member role for this workspace
                    let queryMemberRole = new Parse.Query(Parse.Role);
                    let memberName = 'member-' + workspace.id;

                    queryMemberRole.equalTo('name', memberName);

                    const memberRole = await queryMemberRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(memberRole, true);
                    channelACL.setWriteAccess(memberRole, true);
                    channel.setACL(channelACL);

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                }
                else if (channel.get("type") === 'privateExperts') {

                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'expert-' + workspace.id;

                    queryRole.equalTo('name', Name);

                    const Role = await queryRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(Role, true);
                    channelACL.setWriteAccess(Role, true);
                    channel.setACL(channelACL);

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);


                }
                else if (channel.get("type") === 'privateAdmins') {

                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'admin-' + workspace.id;

                    queryRole.equalTo('name', Name);

                    const Role = await queryRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(Role, true);
                    channelACL.setWriteAccess(Role, true);
                    channel.setACL(channelACL);

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);


                }
                else if (channel.get("type") === 'privateModerators') {

                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'moderator-' + workspace.id;

                    queryRole.equalTo('name', Name);

                    const Role = await queryRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(Role, true);
                    channelACL.setWriteAccess(Role, true);
                    channel.setACL(channelACL);

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);


                }
                else if (channel.get("type") === 'privateOwners') {

                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'owner-' + workspace.id;

                    queryRole.equalTo('name', Name);

                    const Role = await queryRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(Role, true);
                    channelACL.setWriteAccess(Role, true);
                    channel.setACL(channelACL);

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

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


                }
                else if (channel.get("type") !== 'private' || channel.get("type") !== 'public' || channel.get("type") !== 'privateOwners' || channel.get("type") !== 'privateModerators' || channel.get("type") !== 'privateAdmins' || channel.get("type") !== 'privateExperts' || channel.get("type") !== 'privateMembers') {

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                    throw new Error ("Channel type field is needs to be one of the following: private, public, privateOwners, privateModerators,  privateAdmins, privateExperts, privateMembers");
                }
                else {

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

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

                }
                else if (channel.get("type") === 'privateMembers') {

                    // get member role for this workspace
                    let queryMemberRole = new Parse.Query(Parse.Role);
                    let memberName = 'member-' + workspace.id;

                    queryMemberRole.equalTo('name', memberName);

                    const memberRole = await queryRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });
                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(memberRole, true);
                    channelACL.setWriteAccess(memberRole, true);
                    channel.setACL(channelACL);

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);


                }
                else if (channel.get("type") === 'privateExperts') {

                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'expert-' + workspace.id;

                    queryRole.equalTo('name', Name);

                    const Role = await queryRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(Role, true);
                    channelACL.setWriteAccess(Role, true);
                    channel.setACL(channelACL);

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);


                }
                else if (channel.get("type") === 'privateAdmins') {

                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'admin-' + workspace.id;

                    queryRole.equalTo('name', Name);

                    const Role = await queryRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(Role, true);
                    channelACL.setWriteAccess(Role, true);
                    channel.setACL(channelACL);

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);


                }
                else if (channel.get("type") === 'privateModerators') {

                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'moderator-' + workspace.id;

                    queryRole.equalTo('name', Name);

                    const Role = await queryRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(Role, true);
                    channelACL.setWriteAccess(Role, true);
                    channel.setACL(channelACL);

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);


                }
                else if (channel.get("type") === 'privateOwners') {

                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'owner-' + workspace.id;

                    queryRole.equalTo('name', Name);

                    const Role = await queryRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(Role, true);
                    channelACL.setWriteAccess(Role, true);
                    channel.setACL(channelACL);

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);



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


                }
                else if (channel.get("type") !== 'private' || channel.get("type") !== 'public' || channel.get("type") !== 'privateOwners' || channel.get("type") !== 'privateModerators' || channel.get("type") !== 'privateAdmins' || channel.get("type") !== 'privateExperts' || channel.get("type") !== 'privateMembers') {

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                    throw new Error ("Channel type field is needs to be one of the following: private, public, privateOwners, privateModerators,  privateAdmins, privateExperts, privateMembers");
                }
                else {

                    let finalTime = process.hrtime(time);
                    console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

                }


            }

        }




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

        let expertRelation = workspace.relation("experts");

        async function archiveChannelFollowers () {

            if (channel.dirty("archive")) {

                if (channel.get("archive") === true) {

                    let CHANNELFOLLOW = Parse.Object.extend("ChannelFollow");

                    let queryChannelFollow= new Parse.Query(CHANNELFOLLOW);
                    queryChannelFollow.equalTo("channel", channel);
                    queryChannelFollow.limit(10000);

                    const channelFollowers = await queryChannelFollow.find({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    if (channelFollowers) {

                        let mapChannelFollowers = lodash.map(channelFollowers, function (object) {

                            let channelFollow = new CHANNELFOLLOW();
                            channelFollow.id = object.id;

                            channelFollow.set("archive", true);
                            //channelFollow.set("user", object.get("user"));

                            object = channelFollow;

                            //console.log("channelFollowersObject: " + JSON.stringify(object));

                            return object;


                        });

                        return await Parse.Object.saveAll(mapChannelFollowers, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });


                    }

                    else {

                        return [];

                    }


                } else {

                    return channel;

                }

            } else {

                return channel;
            }


        }

        async function unarchiveChannelFollowers () {

            if (channel.dirty("archive")) {

                if (channel.get("archive") === false) {

                    let CHANNELFOLLOW = Parse.Object.extend("ChannelFollow");

                    let queryChannelFollow= new Parse.Query(CHANNELFOLLOW);
                    queryChannelFollow.equalTo("channel", channel);
                    queryChannelFollow.limit(10000);

                    const channelFollowers = await queryChannelFollow.find({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    if (channelFollowers) {

                        let mapChannelFollowers = lodash.map(channelFollowers, function (object) {

                            let channelFollow = new CHANNELFOLLOW();
                            channelFollow.id = object.id;

                            channelFollow.set("archive", false);
                            //channelFollow.set("user", object.get("user"));

                            object = channelFollow;

                            //console.log("channelFollowersObject: " + JSON.stringify(object));

                            return object;


                        });

                        return await Parse.Object.saveAll(mapChannelFollowers, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });


                    }

                    else {

                        return [];

                    }




                } else {

                    return channel;

                }

            } else {

                return channel;
            }

        }

        async function updateChannelName () {

            if (channel.dirty("name")) {

                // channel name is being changed

                let newChannelName = channel.get("name").toLowerCase().trim();

                if (channelName !== newChannelName) {

                    // check to make sure this name isn't already taken

                    let nameWorkspaceID = newChannelName + '-' + channel.get("workspace").id;

                    queryChannel.equalTo("nameWorkspaceID", nameWorkspaceID);
                    queryChannel.equalTo("workspace", workspace);

                    const matchedChannel = await queryChannel.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    if (matchedChannel) {

                        // there is a channel already with that name, return error

                        throw new Error ("There is already a channel with this name, please enter a unique channel name: " + matchedChannel);


                    } else {

                        // no match which means no channel with this new name, we are good!


                        channel.set("name", newChannelName);
                        channel.set("nameWorkspaceID", nameWorkspaceID);
                        //console.log("nameWorkspaceID: " + nameWorkspaceID);

                        return channel;

                    }




                }
                else {

                    // channelName is the same and it's not getting modified

                    return channel;
                }


            }
            else {

                // no channel name sent by user

                return channel;


            }

        }

        async function updateChannelType () {

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

                    return channel;

                }
                else if (channel.get("type") === 'privateMembers') {

                    // todo send notification to all users who are not members since they won't get access to this channel anymore

                    // get member role for this workspace
                    let queryMemberRole = new Parse.Query(Parse.Role);
                    let memberName = 'member-' + workspace.id;

                    queryMemberRole.equalTo('name', memberName);

                    const memberRole = await queryMemberRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    //console.log("memberRole" + JSON.stringify(memberRole));

                    // private workspace, but this is a channel that is accessible to all members of this private workspace
                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(memberRole, true);
                    channelACL.setWriteAccess(memberRole, true);
                    channelACL.setReadAccess(owner, true);
                    channelACL.setWriteAccess(owner, true);
                    channel.setACL(channelACL);

                    return channel;


                }
                else if (channel.get("type") === 'privateExperts') {

                    // todo send notification to all users who are not experts since they won't get access to this channel anymore


                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'expert-' + workspace.id;

                    queryRole.equalTo('name', Name);

                    const Role = await queryRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    //console.log("Role" + JSON.stringify(Role));

                    // private workspace, but this is a channel that is accessible to all members of this private workspace
                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(Role, true);
                    channelACL.setWriteAccess(Role, true);
                    channelACL.setReadAccess(owner, true);
                    channelACL.setWriteAccess(owner, true);
                    channel.setACL(channelACL);

                    return channel;


                }
                else if (channel.get("type") === 'privateAdmins') {

                    // todo send notification to all users who are not admins since they won't get access to this channel anymore


                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'admin-' + workspace.id;

                    queryRole.equalTo('name', Name);

                    const Role = await queryRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    //console.log("memberRole" + JSON.stringify(Role));

                    // private workspace, but this is a channel that is accessible to all members of this private workspace
                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(Role, true);
                    channelACL.setWriteAccess(Role, true);
                    channel.setACL(channelACL);

                    return channel;

                }
                else if (channel.get("type") === 'privateModerators') {

                    // todo send notification to all users who are not moderators since they won't get access to this channel anymore

                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'moderator-' + workspace.id;

                    queryRole.equalTo('name', Name);

                    const Role = await queryRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    //console.log("memberRole" + JSON.stringify(Role));

                    // private workspace, but this is a channel that is accessible to all members of this private workspace
                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(Role, true);
                    channelACL.setWriteAccess(Role, true);
                    channel.setACL(channelACL);

                    return channel;



                }
                else if (channel.get("type") === 'privateOwners') {

                    // todo send notification to all users who are not privateOwners since they won't get access to this channel anymore


                    // get member role for this workspace
                    let queryRole = new Parse.Query(Parse.Role);
                    let Name = 'owner-' + workspace.id;

                    queryRole.equalTo('name', Name);

                    const Role = await queryRole.first({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    //console.log("memberRole" + JSON.stringify(Role));

                    // private workspace, but this is a channel that is accessible to all members of this private workspace
                    channelACL.setPublicReadAccess(false);
                    channelACL.setPublicWriteAccess(false);
                    channelACL.setReadAccess(Role, true);
                    channelACL.setWriteAccess(Role, true);
                    channel.setACL(channelACL);

                    return channel;

                }
                else if (channel.get("type") === 'public') {

                    // private workspace, but this is a channel that is accessible to all members of this private workspace
                    channelACL.setPublicReadAccess(true);
                    channelACL.setPublicWriteAccess(true);
                    channelACL.setReadAccess(owner, true);
                    channelACL.setWriteAccess(owner, true);
                    channel.setACL(channelACL);

                    return channel;


                }
                else if (channel.get("type") !== 'private' || channel.get("type") !== 'public' || channel.get("type") !== 'privateOwners' || channel.get("type") !== 'privateModerators' || channel.get("type") !== 'privateAdmins' || channel.get("type") !== 'privateExperts' || channel.get("type") !== 'privateMembers') {

                    throw new Error ("Channel type field is needs to be one of the following: private, public, privateOwners, privateModerators,  privateAdmins, privateExperts, privateMembers");
                }
                else {

                    return channel;

                }


            }
            else {
                //console.log("channel change, type is not updated.");

                return channel;
            }

        }

        async function allowMemberPostCreate () {

            // By default allowMemberPostCreation is set to false
            if (channel.dirty("allowMemberPostCreation")) {

                // todo add role ACL to members to be able to create posts in this workspace

                return channel;

            } else {

                return channel;

            }

        }

        async function updateExpertsArray () {


            if (channel.dirty("experts") || channel.get("isDirtyExperts") === true) {

                if (channel.dirty("experts")) { channel.set("isDirtyExperts", true);}

                let channelExpertObjects = req.object.toJSON().experts.objects;
                let exp__op = req.object.toJSON().experts.__op;
                //console.log("exp__op: " + JSON.stringify(exp__op));


                if (exp__op === "AddRelation") {

                    // add expert to expertsArray

                    let channelExpertObjects = await lodash.map(channelExpertObjects, async function (object) {


                        let channelExpertObject = new Parse.Object("_User");
                        channelExpertObject.set("objectId", object.objectId);

                        //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));

                        const expert = await channelExpertObject.fetch(channelExpertObject.id, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            throw new Error(error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                        let expertOwner = simplifyUser(expert);

                        //console.log("expertOwner 2: " + JSON.stringify(expertOwner));

                        //o[key] = expertOwner;

                        channel.addUnique("expertsArray", expertOwner);


                        object = expertOwner;
                        //expertArray.push(expertOwner);

                        return object;

                    });

                    channel.set("isDirtyExperts", false);

                    return channelExpertObjects;

                }
                else if (exp__op === "RemoveRelation") {

                    let channelExpertObjects = await lodash.map(channelExpertObjects, async function (object) {

                        let channelExpertObject = new Parse.Object("_User");
                        channelExpertObject.set("objectId", object.objectId);

                        //console.log("workspaceExpertObject: " + JSON.stringify(workspaceExpertObject));

                        const expert = await channelExpertObject.fetch(channelExpertObject.id, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            throw new Error(error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                        let expertOwner = simplifyUser(expert);

                        //console.log("expertOwner 2: " + JSON.stringify(expertOwner));

                        object = expertOwner;
                        channel.remove("expertsArray", expertOwner);
                        //expertArray.push(expertOwner);

                        return object;

                    });

                    channel.set("isDirtyExperts", false);

                    return channelExpertObjects;


                }
                else {

                    if (channel.get("isDirtyExperts") === true) {

                        let expertRelationQuery = expertRelation.query();

                        const experts = await expertRelationQuery.find({

                            useMasterKey: true
                            //sessionToken: sessionToken

                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            throw new Error(error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });


                        if (experts.length > 0) {

                            let emptyArray = [];

                            channel.set("expertsArray", emptyArray);

                            let expertsResults = await lodash.map(experts, async function (expert) {

                                let expertUser = simplifyUser(expert);

                                //console.log("expertOwner 2: " + JSON.stringify(expertOwner));

                                expert = expertUser;

                                channel.addUnique("expertsArray", expertUser);
                                //expertArray.push(expertOwner);

                                return expert;

                            });

                            channel.set("isDirtyExperts", false);

                            return expertsResults;



                        }
                        else {

                            return [];


                        }



                    }

                    else {

                        return channel.get("expertsArray");

                    }

                }

            }
            else {

                channel.set("isDirtyExperts", false);

                let expertsArrayInChannel = channel.get("expertsArray");

                return expertsArrayInChannel;

            }


        }

        const results = await Promise.all([
            archiveChannelFollowers(),
            unarchiveChannelFollowers(),
            updateChannelName(),
            updateChannelType(),
            allowMemberPostCreate(),
            updateExpertsArray()
        ]);

        channel.set("isNew", false);

        let beforeSave_Time = process.hrtime(time);
        console.log(`final time took for beforeSave Channel ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

    }

    else {
        if (!channel.get("isNew")) {
            channel.set("isNew", false);
        }

        let finalTime = process.hrtime(time);
        console.log(`finalTime took beforeSave Channel ${(finalTime[0] * NS_PER_SEC + finalTime[1]) * MS_PER_NS} milliseconds`);

    }


}, {useMasterKey: true});

// Run beforeSave functions for Skills to validate data and prevent duplicate entries.
Parse.Cloud.beforeSave('Skill', async (req) => {

    /*var NS_PER_SEC = 1e9;
     const MS_PER_NS = 1e-6;
     var time = process.hrtime();*/

    var skill = req.object;
    console.log("Levels: " + skill.get('level'));
    var level = skill.get("level");
    var name = skill.get("name");
    if (level) {level = level.trim();}
    if (name) {name = name.trim();}
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

        const skillResults = await querySKILL.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

        if (skillResults) {

            //Skill already exists in DB in Skill table, return an error because it needs to be unique

            throw new Error (skillResults);

        }

        else {

            //Skill doesn't exist, let's add it but before check if level is valid

            if (nameLevel && name && level) {

                //console.log("skill.dirty level: " + skill.dirty("level"));

                if (nameLevel !== verifyNameLevel) { throw new Error ("Error 1: NameLevel: " + nameLevel + " Should include the same name: " + name + "and level: " + level + "seperated by : just like this: " + name + ':' + level);}

                level = level.toLowerCase();
                //console.log("skill: " + JSON.stringify(skill));

                switch (level) {
                    case "starter":
                        skill.set('level', level);
                        //skill.set('nameLevel', name + ':' + level);

                        break;
                    case "ninja":
                        skill.set('level', level);
                        //skill.set('nameLevel', name + ':' + level);

                        break;
                    case "master":
                        skill.set('level', level);
                        //skill.set('nameLevel', name + ':' + level);

                        break;
                    default:
                        throw new Error ("Please enter one of the following valid levels: starter, ninja or master");
                }

            } else { throw new Error ("nameLevel, name and level fields are all required to add a skill."); }


        }


    } else if (!skill.isNew() && skill.dirty("level")) {

        // can't allow updates to nameLevel, name or level to make sure data is consistent, we can allow delete then add instead
        throw new Error ("We currently don't allow modifications of level.");

    } else if (!skill.isNew() && skill.dirty("name") && skill.dirty("nameLevel")) {

        // verify first that nameLevel is correct with name and level.
        if (nameLevel !== verifyNameLevel) { throw new Error ("NameLevel: " + nameLevel + "Should include the same name: " + name + "and level: " + level + "seperated by : just like this: " + name + ':' + level);}

        // now let's check to make sure this nameLevel doesn't already exist
        const skillResults = await querySKILL.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

        if (skillResults) {
            throw new Error (skillResults);
        }

        //response.success();

    } else { throw new Error ("Please update both name and nameLevel fields."); }


});


// Run beforeSave functions for Post
Parse.Cloud.beforeSave('Post', async (req) => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {
        throw new Error('beforeSave-Post.UNAUTHENTICATED_USER');
    }

    var post = req.object;
    var text = post.get("text");
    var workspace = post.get("workspace");
    //console.log("workspace_post: " + JSON.stringify(workspace));
    var channel = post.get("channel");
    //console.log("channel_post: " + JSON.stringify(channel));

    var toLowerCase = function(w) { return w.toLowerCase(); };
    //console.log("post: " + JSON.stringify(post));

    async function setDefaultValues () {

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

            return post;

        } else {

            if(!post.isNew()) {

                post.set("isNew", false);


            }

            return post;
        }


    }

    // Function to count number of posts
    async function countPosts () {

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

                return post;



            } else {

                //post = Post;
                countPosts_Time = process.hrtime(timeCountPosts);
                //console.log(`countPosts_Time took ${(countPosts_Time[0] * NS_PER_SEC + countPosts_Time[1])  * MS_PER_NS} milliseconds`);

                return post;

            }



        }

        else {

            countPosts_Time = process.hrtime(timeCountPosts);
            //console.log(`countPosts_Time took ${(countPosts_Time[0] * NS_PER_SEC + countPosts_Time[1])  * MS_PER_NS} milliseconds`);

            return post;

        }



    }

    // Function to capture hashtags from text posts
    async function getHashtags () {
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
            //console.log(`getHashtags_Time took ${(getHashtags_Time[0] * NS_PER_SEC + getHashtags_Time[1])  * MS_PER_NS} milliseconds`);


            return post;
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
            //console.log(`getHashtags_Time took ${(getHashtags_Time[0] * NS_PER_SEC + getHashtags_Time[1])  * MS_PER_NS} milliseconds`);

            return post;

        }
        else {

            getHashtags_Time = process.hrtime(timeCountPosts);
            //console.log(`getHashtags_Time took ${(getHashtags_Time[0] * NS_PER_SEC + getHashtags_Time[1])  * MS_PER_NS} milliseconds`);


            return post;

        }


    }

    // Function to capture mentions from text posts
    async function getMentions () {

        var NS_PER_SEC = 1e9;
        const MS_PER_NS = 1e-6;
        var timeCountPosts = process.hrtime();
        var getMentions_Time;

        var mentions;

        // if there is a post that got added and no mentions from client then add mentions
        if (post.isNew() && !post.mentions) {

            mentions = text.match(/(^|\s)(\[@[a-zA-Z\d]+:[a-zA-Z\d]+\]|\[@[a-zA-Z\d]+( |-|_|.)[a-zA-Z\d]+:[a-zA-Z\d]+\])/gi);
            //console.log("mentions: " + JSON.stringify(mentions));
            //mentions = _.map(mentions, toLowerCase);
            if (mentions) {

                mentions = mentions.map(function (mention) {

                    //console.log("mention: " + JSON.stringify(mention));

                    mention = mention.toString().match(/([a-zA-Z\d]+\])/gi);
                    mention = mention.toString().match(/([a-zA-Z\d]+[^\]])/gi, '');

                    //console.log("mention 1: " + JSON.stringify(mention));
                    return mention[0];
                });
                //console.log("mentions final: " + JSON.stringify(mentions));
                req.object.set("mentions", mentions);
                //console.log("getMentions: " + JSON.stringify(mentions));


            } else {

                mentions = [];
                req.object.set("mentions", mentions);
            }

            getMentions_Time = process.hrtime(timeCountPosts);
            //console.log(`getMentions_Time took ${(getMentions_Time[0] * NS_PER_SEC + getMentions_Time[1])  * MS_PER_NS} milliseconds`);


            return post;
        }

        // if an updated for text field (only) in a post occured, and there was no mentions from client then get hashtags
        else if (!post.isNew() && post.dirty("text") && !post.dirty("mentions")) {

            mentions = text.match(/(^|\s)(\[@[a-zA-Z\d]+:[a-zA-Z\d]+\]|\[@[a-zA-Z\d]+( |-|_|.)[a-zA-Z\d]+:[a-zA-Z\d]+\])/gi);
            //console.log("mentions: " + JSON.stringify(mentions));
            //mentions = _.map(mentions, toLowerCase);
            if (mentions) {

                mentions = mentions.map(function (mention) {

                    //console.log("mention: " + JSON.stringify(mention));

                    mention = mention.toString().match(/([a-zA-Z\d]+\])/gi);
                    mention = mention.toString().match(/([a-zA-Z\d]+[^\]])/gi, '');

                    //console.log("mention 1: " + JSON.stringify(mention));
                    return mention[0];
                });
                //console.log("mentions final: " + JSON.stringify(mentions));
                req.object.set("mentions", mentions);
                //console.log("getMentions: " + JSON.stringify(mentions));


            } else {

                mentions = [];
                req.object.set("mentions", mentions);
            }

            getMentions_Time = process.hrtime(timeCountPosts);
            //console.log(`getMentions_Time took ${(getMentions_Time[0] * NS_PER_SEC + getMentions_Time[1])  * MS_PER_NS} milliseconds`);

            return post;

        }
        else {

            getMentions_Time = process.hrtime(timeCountPosts);
            //console.log(`getMentions_Time took ${(getMentions_Time[0] * NS_PER_SEC + getMentions_Time[1])  * MS_PER_NS} milliseconds`);


            return post;

        }

    }

    // function to archive/unarchive postSocial relatio if a post is archived/unarchived
    async function archivePostSocial () {
        var NS_PER_SEC = 1e9;
        const MS_PER_NS = 1e-6;
        var timeArchive = process.hrtime();
        var archive_Time;

        // if post is updated and specifically the archive field is updated then update postSocial archive field.
        if (!post.isNew() && post.dirty("archive")) {

            var postSocialRelation = post.relation("postSocial");
            var postSocialRelationQuery = postSocialRelation.query();

            const postSocialResults = await  postSocialRelationQuery.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            for (var i = 0; i < postSocialResults.length; i++) {

                postSocialResults[i].set("archive", post.get("archive"));
                postSocialResults[i].save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

            }

            archive_Time = process.hrtime(timeArchive);
            //console.log(`archive_Time took ${(archive_Time[0] * NS_PER_SEC + archive_Time[1]) * MS_PER_NS} milliseconds`);

            return post;


        } else { return post;}

    }

    // Function to identify if a text post hasURL
    async function getURL () {

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
            //console.log(`getURL_Time took ${(getURL_Time[0] * NS_PER_SEC + getURL_Time[1])  * MS_PER_NS} milliseconds`);

            return post;
        }

        // if an updated for text field (only) in a post occured, and there was no hasURL from client then get hashtags
        else if (!post.isNew() && post.dirty("text") && !post.dirty("hasURL")) {

            hasurl = urlRegex().test(text);
            //console.log("hasURL: " + JSON.stringify(hasurl));

            req.object.set("hasURL", hasurl);

            getURL_Time = process.hrtime(timeCountPosts);
            //console.log(`getURL_Time took ${(getURL_Time[0] * NS_PER_SEC + getURL_Time[1])  * MS_PER_NS} milliseconds`);

            return post;

        }
        else {

            getURL_Time = process.hrtime(timeCountPosts);
            //console.log(`getURL_Time took ${(getURL_Time[0] * NS_PER_SEC + getURL_Time[1])  * MS_PER_NS} milliseconds`);

            return post;

        }

    }

    // Function to get luis.ai topIntent from text post
    async function getIntents () {

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

                        return post;

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

            return post;

        }


    }

    async function getChannelACL () {

        // get channel ACL and assign it to Post ACL
        console.log('entering getChannelACL...');
        if (post.isNew()) {

            console.log('entering getChannelACL post.isNew...' + JSON.stringify(post.isNew()));


            let CHANNEL = Parse.Object.extend("Channel");
            let Channel =  new CHANNEL();
            Channel.id = channel.id;
            console.log("Channel.id: " + JSON.stringify(Channel.id) );

            let queryChannel = new Parse.Query(CHANNEL);

            const channelObject = await  queryChannel.get(Channel.id, {

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            if (channelObject) {

                let channelACL = channelObject.getACL();
                //console.log("beforeSave Post channelACL: " + JSON.stringify(channelACL));

                post.setACL(channelACL);
                //console.log("beforeSave Post post ACL: " + JSON.stringify(post.getACL()));

                return post;


            } else {

                return post;
            }


        }

        else {


            return post;

        }

    }

    const promiseDone =  await Promise.all([
        countPosts(),
        getHashtags(),
        getMentions(),
        getURL(),
        archivePostSocial(),
        setDefaultValues(),
        getChannelACL()
        //getIntents()
    ]);

    if (promiseDone) {

        let beforeSave_Time = process.hrtime(time);
        console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);
    }

}, {useMasterKey: true});

// Run beforeSave functions for PostQuestionMessage
Parse.Cloud.beforeSave('PostMessage', async (req) => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {
        throw new Error('beforeSave-PostMessage.UNAUTHENTICATED_USER');

    }

    let postMessage = req.object;
    let postOriginalMessage = req.original;
    let text = postMessage.get("message");
    let workspace = postMessage.get("workspace");
    let post = postMessage.get("post");
    let channel = postMessage.get("channel");
    //console.log("channel_post: " + JSON.stringify(channel));
    let parentPostMessage = postMessage.get("parentPostMessage");

    var toLowerCase = function(w) { return w.toLowerCase(); };
    //console.log("post: " + JSON.stringify(post));

    async function setDefaultValues () {

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

            return postMessage;

        } else {

            return postMessage;
        }


    }

    // Function to count number of postMessage of question type
    async function countPostMessageQuestions () {

        let POST = Parse.Object.extend("Post");
        let Post = new POST();
        Post.id = post.id;

        if (postMessage.isNew() && postMessage.get("type") === 'question' && !postMessage.get("parentPostMessage")) {

            Post.increment("postMessageQuestionCount");
            Post.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


            return Post;

        }

        else {
            // not counting either this is a new postMessageQuestion child or another type (i.e. not question, but answer or comment)

            return Post;

        }



    }

    // Function to count number of postMessage of answer type
    async function countPostMessageAnswers () {

        let POST = Parse.Object.extend("Post");
        let Post = new POST();
        Post.id = post.id;

        if (postMessage.isNew() && postMessage.get("type") === 'answer' && !postMessage.get("parentPostMessage")) {

            Post.increment("postMessageAnswerCount");
            Post.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


            return Post;

        }

        else {
            // not counting either this is a new postMessageQuestion child or another type (i.e. not question, but answer or comment)

            return Post;

        }



    }

    // Function to count number of postMessage of comment type
    async function countPostMessageComments () {

        let POST = Parse.Object.extend("Post");
        let Post = new POST();
        Post.id = post.id;

        if (postMessage.isNew() && postMessage.get("type") === 'comment') {

            Post.increment("postMessageCommentCount");
            Post.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


            return Post;

        }

        else {
            // not counting either this is a new postMessageQuestion child or another type (i.e. not question, but answer or comment)

            return Post;

        }



    }

    // Function to count number of postMessage of all types
    async function countPostMessages() {

        let POST = Parse.Object.extend("Post");
        let Post = new POST();
        Post.id = post.id;

        if (postMessage.isNew()) {

            Post.increment("postMessageCount");
            Post.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


            return Post;

        }

        else {
            // not counting either this is a new postMessageQuestion child or another type (i.e. not question, but answer or comment)

            return Post;

        }



    }

    // Function to capture hashtags from text posts
    async function getHashtags () {
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


            return postMessage;
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

            return postMessage;

        }
        else {

            getHashtags_Time = process.hrtime(timeCountPosts);
            console.log(`getHashtags_Time took ${(getHashtags_Time[0] * NS_PER_SEC + getHashtags_Time[1])  * MS_PER_NS} milliseconds`);


            return postMessage;

        }


    }

    // Function to capture mentions from text posts
    async function getMentions () {

        const NS_PER_SEC = 1e9;
        const MS_PER_NS = 1e-6;
        let timeCountPosts = process.hrtime();
        let getMentions_Time;

        let mentions;

        // if there is a post that got added and no mentions from client then add mentions
        if (postMessage.isNew() && !postMessage.mentions) {

            mentions = text.match(/(^|\s)(\[@[a-zA-Z\d]+:[a-zA-Z\d]+\]|\[@[a-zA-Z\d]+( |-|_|.)[a-zA-Z\d]+:[a-zA-Z\d]+\])/gi);
            //console.log("mentions: " + JSON.stringify(mentions));
            //mentions = _.map(mentions, toLowerCase);
            if (mentions) {

                mentions = mentions.map(function (mention) {

                    //console.log("mention: " + JSON.stringify(mention));

                    mention = mention.toString().match(/([a-zA-Z\d]+\])/gi);
                    mention = mention.toString().match(/([a-zA-Z\d]+[^\]])/gi, '');

                    //console.log("mention 1: " + JSON.stringify(mention));
                    return mention[0];
                });
                //console.log("mentions final: " + JSON.stringify(mentions));
                req.object.set("mentions", mentions);
                //console.log("getMentions: " + JSON.stringify(mentions));


            } else {

                mentions = [];
                req.object.set("mentions", mentions);
            }

            getMentions_Time = process.hrtime(timeCountPosts);
            console.log(`getMentions_Time took ${(getMentions_Time[0] * NS_PER_SEC + getMentions_Time[1])  * MS_PER_NS} milliseconds`);


            return postMessage;
        }

        // if an updated for text field (only) in a post occured, and there was no mentions from client then get hashtags
        else if (!postMessage.isNew() && postMessage.dirty("message") && !postMessage.dirty("mentions")) {

            mentions = text.match(/(^|\s)(\[@[a-zA-Z\d]+:[a-zA-Z\d]+\]|\[@[a-zA-Z\d]+( |-|_|.)[a-zA-Z\d]+:[a-zA-Z\d]+\])/gi);
            //console.log("mentions: " + JSON.stringify(mentions));
            //mentions = _.map(mentions, toLowerCase);
            if (mentions) {

                mentions = mentions.map(function (mention) {

                    //console.log("mention: " + JSON.stringify(mention));

                    mention = mention.toString().match(/([a-zA-Z\d]+\])/gi);
                    mention = mention.toString().match(/([a-zA-Z\d]+[^\]])/gi, '');

                    //console.log("mention 1: " + JSON.stringify(mention));
                    return mention[0];
                });
                //console.log("mentions final: " + JSON.stringify(mentions));
                req.object.set("mentions", mentions);
                //console.log("getMentions: " + JSON.stringify(mentions));


            } else {

                mentions = [];
                req.object.set("mentions", mentions);
            }

            getMentions_Time = process.hrtime(timeCountPosts);
            console.log(`getMentions_Time took ${(getMentions_Time[0] * NS_PER_SEC + getMentions_Time[1])  * MS_PER_NS} milliseconds`);

            return postMessage;

        }
        else {

            getMentions_Time = process.hrtime(timeCountPosts);
            console.log(`getMentions_Time took ${(getMentions_Time[0] * NS_PER_SEC + getMentions_Time[1])  * MS_PER_NS} milliseconds`);


            return postMessage;

        }

    }

    // function to archive/unarchive postMessageSocial relation if a post is archived/unarchived
    async function archivePostMessageSocial () {
        const NS_PER_SEC = 1e9;
        const MS_PER_NS = 1e-6;
        let timeArchive = process.hrtime();
        let archive_Time;

        // if post is updated and specifically the archive field is updated then update postSocial archive field.
        if (!postMessage.isNew() && postMessage.dirty("archive")) {

            let postQuestionMessageSocialRelation = postMessage.relation("postMessageSocial");
            let postQuestionMessageSocialRelationQuery = postQuestionMessageSocialRelation.query();

            const postQuestionMessageSocialResults = await postQuestionMessageSocialRelationQuery.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            for (var i = 0; i < postQuestionMessageSocialResults.length; i++) {

                postQuestionMessageSocialResults[i].set("archive", postMessage.get("archive"));
                postQuestionMessageSocialResults[i].save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

            }

            archive_Time = process.hrtime(timeArchive);
            console.log(`archive_Time took ${(archive_Time[0] * NS_PER_SEC + archive_Time[1]) * MS_PER_NS} milliseconds`);

            return postMessage;


        } else { return postMessage;}

    }

    // Function to identify if a text post hasURL
    async function getURL () {

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

            return postMessage;
        }

        // if an updated for text field (only) in a post occured, and there was no hasURL from client then get hashtags
        else if (!postMessage.isNew() && postMessage.dirty("message") && !postMessage.dirty("hasURL")) {

            hasurl = urlRegex().test(text);
            //console.log("hasURL: " + JSON.stringify(hasurl));

            postMessage.set("hasURL", hasurl);

            getURL_Time = process.hrtime(timeCountPosts);
            console.log(`getURL_Time took ${(getURL_Time[0] * NS_PER_SEC + getURL_Time[1])  * MS_PER_NS} milliseconds`);

            return postMessage;

        }
        else {

            getURL_Time = process.hrtime(timeCountPosts);
            console.log(`getURL_Time took ${(getURL_Time[0] * NS_PER_SEC + getURL_Time[1])  * MS_PER_NS} milliseconds`);

            return postMessage;

        }

    }

    async function markUpVotedByExpertTrue () {

        // check if creator of this postMesage is already an expert in this Workspace, then mark this as true




    }

    const promiseDone =  await Promise.all([
        getHashtags(),
        getMentions(),
        getMentions(),
        getURL(),
        archivePostMessageSocial(),
        setDefaultValues(),
        countPostMessageQuestions(),
        countPostMessageAnswers(),
        countPostMessageComments(),
        countPostMessages(),
        //getPostMessageTypeIntents()
    ]);

    if (promiseDone) {

        let beforeSave_Time = process.hrtime(time);
        console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);
    }


}, {useMasterKey: true});


// Run beforeSave functions PostChatMessageSocial
Parse.Cloud.beforeSave('PostMessageSocial', async (req) => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {
        throw new Error('beforeSave-PostMessageSocial.UNAUTHENTICATED_USER');
    }

    let postMessageSocial = req.object;
    //console.log("req beforeSave PostMessageSocial: " + JSON.stringify(req));
    let originalPostMessageSocial = req.original ? req.original : null;
    let workspace;
    let post;
    let channel;
    let user;
    let postMessage;
    let POST;
    let PostO;


    if (postMessageSocial.isNew()) {

        //console.log("isLiked: "+postSocial.get("isLiked"));
        //console.log("isBookmarked: "+postSocial.get("isBookmarked"));
        postMessageSocial.set("isNew", true);

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
            POST = Parse.Object.extend("Post");
            PostO = new POST();
            PostO.id = post.id;

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

        let POSTMESSAGE = Parse.Object.extend("PostMessage");
        let PostMessage = new POSTMESSAGE();
        PostMessage.id = postMessageSocial.get("postMessage").id;

        let USER = Parse.Object.extend("_User");
        let User = new USER();
        User.id = postMessageSocial.get("user").id;

        let postMessageSocialQuery = new Parse.Query("PostMessageSocial");

        postMessageSocialQuery.equalTo("user", User);
        postMessageSocialQuery.equalTo("postMessage", PostMessage);
        //postSocialQuery.include(["user", "workspace", "channel"]);

        // check to make sure that the postSocial is unique
        postMessageSocialQuery.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((postMessageSocialResult) => {
            // The object was retrieved successfully.

            if (postMessageSocialResult) {

                //postMessageSocialResult already exists in db, return an error because it needs to be unique
                console.log("postMessageSocialResult already exists in db, return an error because it needs to be unique");
                return response.error(postMessageSocialResult);

            } else {

                console.log("it's new postMessageSocial, no existing postMessageSocial");


                function setDefaultValues (cb) {

                    if (!postMessageSocial.get("archive")) { postMessageSocial.set("archive", false); }
                    if (!postMessageSocial.get("isLiked")) { postMessageSocial.set("isLiked", false); }
                    if (!postMessageSocial.get("isDelivered")) { postMessageSocial.set("isDelivered", false); }
                    if (!postMessageSocial.get("hasRead")) { postMessageSocial.set("hasRead", false); }
                    if (!postMessageSocial.get("voteValue")) { postMessageSocial.set("voteValue", 0);}
                    if (!postMessageSocial.get("algoliaIndexID")) { postMessageSocial.set("algoliaIndexID", '0');}


                    return cb (null, postMessageSocial);


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

                    function markIsUpVotedByExpertTrue (callback) {

                        let isExpert;

                        if (postMessageSocial.get("voteValue") === 1) {

                            // check if the user is an expert, if yes then mark true

                            User.fetch(User.id, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            }).then((UserObject) => {
                                // The object was retrieved successfully.

                                let userRoles= UserObject.get("roles");

                                //console.log('userRoles: ' + JSON.stringify(userRoles));

                                let queryRole = userRoles.query();

                                let roleName = 'expert-' + workspace.id;

                                queryRole.equalTo('workspace', workspace);
                                queryRole.equalTo('name', roleName);

                                queryRole.first({
                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                }).then((expertRole) => {


                                    if (expertRole) {

                                        // user is not an expert return
                                        isExpert = true;

                                        return callback (null, isExpert);


                                    }

                                    else {

                                        // user is not an expert return
                                        isExpert = false;

                                        return callback (null, isExpert);
                                    }


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    //console.log(error);
                                    return callback(error);
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





                        } else {

                            isExpert = false;

                            return callback (null, isExpert);


                        }




                    }


                    async.series([
                        async.apply(countPostMessageLikes),
                        async.apply(countPostMessageUnRead),
                        async.apply(countPostMessageVote),
                        async.apply(markIsUpVotedByExpertTrue)

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
                            let isUpVotedByExpert = results_Final[3];

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

                            if (isUpVotedByExpert === true) {

                                PostMessageToSaveFinal.set("upVotedByExpert", true);
                            } else {

                                PostMessageToSaveFinal.set("upVotedByExpert", false);
                            }

                            PostMessageToSaveFinal.save(null, {


                                useMasterKey: true,
                                //sessionToken: sessionToken

                            });

                            return cb (null, PostMessageToSaveFinal);


                            /*
                            PostMessageToSaveFinal.save(null, {


                                useMasterKey: true,
                                //sessionToken: sessionToken

                            }).then((PostMessageObj) => {


                                let queryPostMessage = new Parse.Query(POSTMESSAGE);
                                queryPostMessage.include( ["user"] );
                                queryPostMessage.equalTo("objectId", PostMessageObj.id);


                                queryPostMessage.first( {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                }).then((PostMessageObject) => {


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

                            */


                        } else {
                            return cb (null, PostMessageToSaveFinal);

                        }



                    });

                }

                function createPostSocialIfNotExists (cb) {

                    let postSocial = postMessageSocial.get("postSocial");

                    if (!postSocial) {
                        // check and see if parent post has postSocial

                        let POSTSOCIAL = Parse.Object.extend("PostSocial");
                        let queryPostSocial = new Parse.Query(POSTSOCIAL);
                        //queryPostSocial.include(["workspace", "post", "channel", "user"]);

                        queryPostSocial.equalTo("post", PostO);
                        queryPostSocial.equalTo("user", User);
                        //queryPostMessageSocial.select(PostMessageArray);


                        queryPostSocial.first({
                            useMasterKey: true
                            //sessionToken: sessionToken
                        }).then((PostSocialResult) => {

                            if (PostSocialResult) {
                                // postSocial exists create pointer to it from postMessageSocial

                                postMessageSocial.set("postSocial", PostSocialResult);

                                return cb (null, postMessageSocial);

                            }

                            else {
                                // create postSocial for parent post since it doesn't exist already

                                let postSocial = new POSTSOCIAL();

                                let timeDelivered = process.hrtime();
                                let timeRead = process.hrtime();

                                postSocial.set("isLiked", false);
                                postSocial.set("isBookmarked", false);
                                postSocial.set("archive", false);
                                postSocial.set("isDelivered", true);
                                //postSocial.set("deliveredDate", timeDelivered);
                                postSocial.set("hasRead", true);
                                //postSocial.set("readDate", timeRead);
                                postSocial.set("user", user);
                                postSocial.set("workspace", workspace);
                                postSocial.set("channel", channel);
                                postSocial.set("post", PostO);

                                console.log("postSocial: " + JSON.stringify(postSocial));


                                postSocial.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                }).then((PostSocial) => {
                                    // The object was retrieved successfully.
                                    //console.log("Result from get " + JSON.stringify(Workspace));

                                    console.log("done PostSocial in beforeSave PostMessageSocial: " + JSON.stringify(PostSocial));

                                    postMessageSocial.set("postSocial", PostSocial);

                                    return cb (null, postMessageSocial);


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    return cb(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });



                            }



                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            console.log(error);
                            return cb(error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken
                        });


                    } else {
                        return cb (null, postMessageSocial);

                    }

                }


                async.series([
                    async.apply(setDefaultValues),
                    async.apply(countPostMessageSocial),
                    async.apply(createPostSocialIfNotExists)

                ], function (err, results_Final) {
                    if (err) {
                        return response.error(err);
                    }

                    //console.log("final post: " + JSON.stringify(post));

                    let beforeSave_Time = process.hrtime(time);
                    console.log(`beforeSave_Time PostMessageSocial took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                    return response.success();
                });


            }


        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            //console.log("channelFollowQuery not found");
            return response.error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });


    }

    else {

        postMessageSocial.set("isNew", false);

        let USER = Parse.Object.extend("_User");
        let User = new USER();
        User.id = originalPostMessageSocial.get("user").id;
        //console.log("User originalPostMessageSocial: " + JSON.stringify(User));

        let POST = Parse.Object.extend("Post");
        let Post = new POST();
        Post.id = originalPostMessageSocial.get("post").id;
        //console.log("Post originalPostMessageSocial: " + JSON.stringify(Post));

        let CHANNEL = Parse.Object.extend("Channel");
        let Channel = new CHANNEL();
        Channel.id = originalPostMessageSocial.get("channel").id;
        //console.log("Channel originalPostMessageSocial: " + JSON.stringify(Channel));

        let WORKSPACE = Parse.Object.extend("WorkSpace");
        let Workspace = new WORKSPACE();
        Workspace.id = originalPostMessageSocial.get("workspace").id;
        //console.log("Workspace originalPostMessageSocial: " + JSON.stringify(Workspace));

        let POSTMESSAGE = Parse.Object.extend("PostMessage");
        let PostMessage = new POSTMESSAGE();
        PostMessage.id = originalPostMessageSocial.get("postMessage").id;

        function createPostSocialIfNotExists (cb) {

            let postSocial = postMessageSocial.get("postSocial");

            if (!postSocial) {
                // check and see if parent post has postSocial

                let POSTSOCIAL = Parse.Object.extend("PostSocial");
                let queryPostSocial = new Parse.Query(POSTSOCIAL);
                //queryPostSocial.include(["workspace", "post", "channel", "user"]);

                queryPostSocial.equalTo("post", Post);
                queryPostSocial.equalTo("user", User);
                //queryPostMessageSocial.select(PostMessageArray);


                queryPostSocial.first({
                    useMasterKey: true
                    //sessionToken: sessionToken
                }).then((PostSocialResult) => {

                    if (PostSocialResult) {
                        // postSocial exists create pointer to it from postMessageSocial

                        postMessageSocial.set("postSocial", PostSocialResult);

                        return cb (null, postMessageSocial);

                    }

                    else {
                        // create postSocial for parent post since it doesn't exist already

                        let postSocial = new POSTSOCIAL();

                        let timeDelivered = process.hrtime();
                        let timeRead = process.hrtime();

                        postSocial.set("isLiked", false);
                        postSocial.set("isBookmarked", false);
                        postSocial.set("archive", false);
                        postSocial.set("isDelivered", true);
                        //postSocial.set("deliveredDate", timeDelivered);
                        postSocial.set("hasRead", true);
                        //postSocial.set("readDate", timeRead);
                        postSocial.set("user", User);
                        postSocial.set("workspace", Workspace);
                        postSocial.set("channel", Channel);
                        postSocial.set("post", Post);

                        console.log("postSocial: " + JSON.stringify(postSocial));


                        postSocial.save(null, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        }).then((PostSocial) => {
                            // The object was retrieved successfully.
                            //console.log("Result from get " + JSON.stringify(Workspace));

                            console.log("done PostSocial in beforeSave PostMessageSocial: " + JSON.stringify(PostSocial));

                            postMessageSocial.set("postSocial", PostSocial);

                            return cb (null, postMessageSocial);


                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            return cb(error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });



                    }



                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    console.log(error);
                    return cb(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken
                });


            } else {
                return cb (null, postMessageSocial);

            }

        }

        function countPostMessageSocial (cb) {

            //console.log("starting countPostMessageSocial: ");

            let PostMessageToSave = PostMessage;
            //console.log("PostMessageToSave: " + JSON.stringify(PostMessageToSave));

            let PostMessageSocialResult = originalPostMessageSocial;
            //console.log("PostMessageSocialResult: " + JSON.stringify(PostMessageSocialResult));

            let PostToSave = Post;
            //console.log("PostToSave: " + JSON.stringify(PostToSave));

            function countPostMessageLikes(callback) {

                //console.log("starting countPostMessageLikes: ");

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

            function countPostMessageUnRead(callback) {

                //console.log("starting countPostMessageUnRead: ");

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

            function countPostMessageVote(callback) {

                //console.log("starting countPostMessageVote: " + JSON.stringify(PostMessageToSave));

                let postMessageSocialVoteValue = postMessageSocial.get("voteValue");
                //console.log("postMessageSocialVoteValue: " + JSON.stringify(postMessageSocialVoteValue));

                if (postMessageSocialVoteValue === -1 || 0 || 1) {

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

                            User.fetch(User.id, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            }).then((UserObject) => {
                                // The object was retrieved successfully.

                                let userRoles= UserObject.get("roles");

                                //console.log('userRoles: ' + JSON.stringify(userRoles));

                                let queryRole = userRoles.query();

                                let roleName = 'expert-' + workspace.id;

                                queryRole.equalTo('workspace', workspace);
                                queryRole.equalTo('name', roleName);

                                queryRole.first({
                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                }).then((expertRole) => {


                                    if (expertRole) {

                                        // user is not an expert return
                                        PostMessageToSave.set("upVotedByExpert", true);

                                        return callback (null, PostMessageToSave);


                                    }

                                    else {

                                        // user is not an expert return
                                        PostMessageToSave.set("upVotedByExpert", false);

                                        return callback (null, PostMessageToSave);
                                    }


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    //console.log(error);
                                    return callback(error);
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

                        else if ((postMessageSocialVoteValue === 1) && PostMessageSocialResult.get("voteValue") === 0) {

                            // User previously no state, but now he upVoted

                            PostMessageToSave.increment("numberOfUpVotes");

                            //console.log("PostMessageToSave numberOfUpVotes: " + JSON.stringify(PostMessageToSave.get("numberOfUpVotes")));

                            User.fetch(User.id, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            }).then((UserObject) => {
                                // The object was retrieved successfully.

                                let userRoles= UserObject.get("roles");

                                //console.log('userRoles: ' + JSON.stringify(userRoles));

                                let queryRole = userRoles.query();

                                let roleName = 'expert-' + workspace.id;

                                queryRole.equalTo('workspace', workspace);
                                queryRole.equalTo('name', roleName);

                                queryRole.first({
                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                }).then((expertRole) => {


                                    if (expertRole) {

                                        // user is not an expert return
                                        PostMessageToSave.set("upVotedByExpert", true);

                                        return callback (null, PostMessageToSave);


                                    }

                                    else {

                                        // user is not an expert return
                                        PostMessageToSave.set("upVotedByExpert", false);

                                        return callback (null, PostMessageToSave);
                                    }


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    //console.log(error);
                                    return callback(error);
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

                            User.fetch(User.id, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            }).then((UserObject) => {
                                // The object was retrieved successfully.

                                let userRoles= UserObject.get("roles");

                                //console.log('userRoles: ' + JSON.stringify(userRoles));

                                let queryRole = userRoles.query();

                                let roleName = 'expert-' + workspace.id;

                                queryRole.equalTo('workspace', workspace);
                                queryRole.equalTo('name', roleName);

                                queryRole.first({
                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                }).then((expertRole) => {


                                    if (expertRole) {

                                        // user is not an expert return
                                        PostMessageToSave.set("upVotedByExpert", false);

                                        return callback (null, PostMessageToSave);


                                    }

                                    else {

                                        // user is not an expert return
                                        PostMessageToSave.set("upVotedByExpert", false);

                                        return callback (null, PostMessageToSave);
                                    }


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    //console.log(error);
                                    return callback(error);
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

                        else if ((postMessageSocialVoteValue === -1) && PostMessageSocialResult.get("voteValue") === 1) {

                            // User previously upvoted, but now downvoted

                            PostMessageToSave.increment("numberOfDownVotes");
                            PostMessageToSave.increment("numberOfUpVotes", -1);

                            //console.log("PostMessageToSave numberOfUpVotes: " + JSON.stringify(PostMessageToSave.get("numberOfUpVotes")));
                            //console.log("PostMessageToSave numberOfDownVotes: " + JSON.stringify(PostMessageToSave.get("numberOfDownVotes")));

                            User.fetch(User.id, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            }).then((UserObject) => {
                                // The object was retrieved successfully.

                                let userRoles= UserObject.get("roles");

                                //console.log('userRoles: ' + JSON.stringify(userRoles));

                                let queryRole = userRoles.query();

                                let roleName = 'expert-' + workspace.id;

                                queryRole.equalTo('workspace', workspace);
                                queryRole.equalTo('name', roleName);

                                queryRole.first({
                                    useMasterKey: true
                                    //sessionToken: sessionToken
                                }).then((expertRole) => {


                                    if (expertRole) {

                                        // user is not an expert return
                                        PostMessageToSave.set("upVotedByExpert", false);

                                        return callback (null, PostMessageToSave);


                                    }

                                    else {

                                        // user is not an expert return
                                        PostMessageToSave.set("upVotedByExpert", false);

                                        return callback (null, PostMessageToSave);
                                    }


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    //console.log(error);
                                    return callback(error);
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
                        if (PostMessageCountVote.get("upVotedByExpert")){
                            PostMessageToSaveFinal.set("upVotedByExpert", PostMessageCountVote.get("upVotedByExpert"));

                        }

                    }

                    PostMessageToSaveFinal.save(null, {

                        useMasterKey: true,
                        //sessionToken: sessionToken

                    });

                    return cb (null, PostMessageToSaveFinal);


                } else {
                    return cb (null, PostMessageToSaveFinal);

                }



            });

        }


        async.series([

            async.apply(createPostSocialIfNotExists),
            async.apply(countPostMessageSocial)

        ], function (err, results_Final) {
            if (err) {
                return response.error(err);
            }

            //console.log("final post: " + JSON.stringify(post));

            let beforeSave_Time = process.hrtime(time);
            console.log(`beforeSave_Time PostMessageSocial took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

            return response.success();
        });
    }



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

        function updatePostMessagesAlgolia (cb2) {

            //console.log("starting updatePostMessagesAlgolia: ");


            // let indexCount = parseInt(PostMessageSocialResult.get("algoliaIndexID"));
            PostMessage.save(null, {

                //useMasterKey: true
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

                //useMasterKey: true
                sessionToken: sessionToken

            });




        }

        function updatePostsAlgolia (cb2) {

            //console.log("starting updatePostsAlgolia: " + JSON.stringify(Post));

            Post.save(null, {

                //useMasterKey: true
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

                //useMasterKey: true
                sessionToken: sessionToken

            });



        }

        async.parallel([
            async.apply(updatePostMessagesAlgolia),
            async.apply(updatePostsAlgolia)

        ], function (err, results_Final) {
            if (err) {
                response.error(err);
            }

            //console.log("done updateAlgolia: " + JSON.stringify(results_Final.length));

            let beforeSave_Time = process.hrtime(time);
            console.log(`afterSave PostMessageSocial took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1]) * MS_PER_NS} milliseconds`);

            return response.success();

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
Parse.Cloud.beforeSave('workspace_follower', async (req) => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let workspace_follower = req.object;
    //console.log("req beforeSave Workspace_follower: " + JSON.stringify(req));

    let currentUser = req.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!req.master && (!currentUser || !sessionToken)) {
        throw new Error('beforeSave-workspace_follower.UNAUTHENTICATED_USER');
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

        throw new Error ("please add _User it's required when adding new or updating workspace follower");
    }

    let queryMemberRole = new Parse.Query(Parse.Role);
    let queryfollowerRole = new Parse.Query(Parse.Role);

    if (workspace_follower.get("notificationCount") > 0) {
        workspace_follower.set("isNotified", true);
    } else  {
        workspace_follower.set("isNotified", false);

    }

    let CHANNEL = Parse.Object.extend("Channel");
    let defaultChannelQuery = new Parse.Query(CHANNEL);
    defaultChannelQuery.equalTo("default", true);

    async function createDefaultChannelFollows (workspaceObject) {

        if (!workspace_follower.get("isNewWorkspace") || workspace_follower.get("isNewWorkspace") === false) {

            defaultChannelQuery.equalTo("workspace", workspaceObject);

            const defaultChannels = await defaultChannelQuery.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            if (defaultChannels.length > 0 ) {

                const finalDefaultChannels = await async.map(defaultChannels, async function (defaultChannelObject) {

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

                    await channelFollower.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    return channelFollower;



                });

                return finalDefaultChannels;



            }
            else {

                return defaultChannels;
            }

        }
        else if (workspace_follower.get("isNewWorkspace") === true) {

            return workspace_follower;
        }

    }

    async function addFollowerRole (followerName) {

        // now add follower since a member is by default a follower
        queryfollowerRole.equalTo('name', followerName);

        const followerRole = await queryfollowerRole.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

        await followerRole.getUsers().add(user);
        await followerRole.save(null, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

        //console.log("followerRole: " + JSON.stringify(followerRole));


        return followerRole;

    }

    async function addMemberRole (memberName) {

        queryMemberRole.equalTo('name', memberName);

        const memberRole = await queryMemberRole.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

        await memberRole.getUsers().add(user);
        await memberRole.save(null, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

        return memberRole;


    }


    // if there is a new workspace_follower object increase counter for number of followers and members on a workspace
    if (workspace_follower.isNew()) {

        workspace_follower.set("isNew", true);

        let workspace = workspace_follower.get("workspace");

        //let WORKSPACE = Parse.Object.extend("WorkSpace");
        let Workspace = new Parse.Object("WorkSpace");
        Workspace.id = workspace.id;

        //let Channel = Parse.Object.extend("Channel");
        let Channel = new Parse.Object("Channel");

        // defaultChannelQuery.equalTo("workspace", Workspace);

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
        const resultWorkspaceFollower = await queryWorkspaceFollower.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });


        if (resultWorkspaceFollower) {

            //Workspace_follower already exists in DB in Skill table, return an error because it needs to be unique
            let beforeSaveElse_Time = process.hrtime(time);
            console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

            throw new Error("workspaceFollower already exists: " + resultWorkspaceFollower);

        }
        else {

            let previousQueryWorkspaceFollowerJoin = new Parse.Query(WORKSPACEFOLLOWER);
            previousQueryWorkspaceFollowerJoin.include("workspace");
            previousQueryWorkspaceFollowerJoin.equalTo("user", user);
            previousQueryWorkspaceFollowerJoin.equalTo("isSelected", true);


            async function removeAllPreviousSelectedWorkspaceFollowerJoin () {

                const resultsPreviousWorkspaceFollowerJoin = await previousQueryWorkspaceFollowerJoin.find( {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    throw new Error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                if (resultsPreviousWorkspaceFollowerJoin) {

                    // There is a previous workspace that was selected, need to return it so we can un-select that previous workspacefollower

                    // console.log("removePreviousWorkspaceFollowSelected" );

                    // joining a workspace follower, so mark previous one as false
                    if (resultsPreviousWorkspaceFollowerJoin.length > 0) {

                        //console.log("marketing previous workspacefollow that isSelected to false: " +resultsPreviousWorkspaceFollowerJoin.length );

                        return await async.map(resultsPreviousWorkspaceFollowerJoin, async function (workspaceFollow) {

                            let workspace_Follow =  new WORKSPACEFOLLOWER();
                            workspace_Follow.id = workspaceFollow.id;

                            workspace_Follow.set("isSelected",false);
                            workspace_Follow.set("user", workspaceFollow.get("user"));

                            await workspace_Follow.save(null, {

                                useMasterKey: true
                                //sessionToken: sessionToken
                            });

                            workspaceFollow = workspace_Follow;

                            return workspaceFollow;


                        });



                    } else {

                        return [];
                    }


                }

                else {

                    // there was no workspace that was previously selected, return empty

                    return [];
                }

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

                let results = await Promise.all([
                    addFollowerRole(followerName),
                    addMemberRole(memberName),
                    createDefaultChannelFollows(Workspace),
                    removeAllPreviousSelectedWorkspaceFollowerJoin()

                ]);

                let followerRole = results[0];
                let memberRole = results[1];

                if (followerRole) {
                    userRolesRelation.add(followerRole);
                }

                if (memberRole) {
                    userRolesRelation.add(memberRole);

                }

                user.set("isWorkspaceUpdated", true);

                await user.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                await Workspace.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });


                let beforeSaveElse_Time = process.hrtime(time);
                console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);


            }
            else if (workspace_follower.get("isFollower") === true && workspace_follower.get("isMember") === false) {
                Workspace.increment("followerCount");
                await Workspace.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                // mark this workspace_follower as isSelected = true, set pointer to new workspace_follower then mark previous selected workspace to false in beforeSave user
                workspace_follower.set("isSelected", true);

                let results = await Promise.all([
                    addFollowerRole(followerName),
                    createDefaultChannelFollows(Workspace),
                    removeAllPreviousSelectedWorkspaceFollowerJoin()
                ]);

                let followerRole = results[0];

                if (followerRole) {
                    userRolesRelation.add(followerRole);
                }

                user.set("isWorkspaceUpdated", true);

                await user.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                let beforeSaveElse_Time = process.hrtime(time);
                console.log(`beforeSave workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

            }
            else if (workspace_follower.get("isFollower") === false && workspace_follower.get("isMember") === true) {
                Workspace.increment("memberCount");
                Workspace.increment("followerCount");
                await Workspace.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                // a member is already a follower so only add member role for this user.
                workspace_follower.set("isFollower", true);

                // mark this workspace_follower as isSelected = true, set pointer to new workspace_follower then mark previous selected workspace to false in beforeSave user
                workspace_follower.set("isSelected", true);

                let results = await Promise.all([
                    addFollowerRole(followerName),
                    addMemberRole(memberName),
                    createDefaultChannelFollows(Workspace),
                    removeAllPreviousSelectedWorkspaceFollowerJoin()

                ]);

                let followerRole = results[0];
                let memberRole = results[1];

                if (followerRole) {
                    userRolesRelation.add(followerRole);
                }

                if (memberRole) {
                    userRolesRelation.add(memberRole);

                }

                user.set("isWorkspaceUpdated", true);

                await user.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                let beforeSaveElse_Time = process.hrtime(time);
                console.log(`beforeSave workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

            }
            else {

                let beforeSaveElse_Time = process.hrtime(time);
                console.log(`beforeSave_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                throw new Error ("isFollower and isMember are both required fields and one has to be set to true");

            }


        }


    }
    else if (!workspace_follower.isNew() && (workspace_follower.dirty("isFollower") || workspace_follower.dirty("isMember"))) {

        workspace_follower.set("isNew", false);

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

        async function getCurrentWorkspaceFollower () {

            return await queryWorkspaceFollower.get(WorkspaceFollower.id, {

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


        }

        async function getPreviousSelectedWorkspaceFollowerJoin () {

            return await previousQueryWorkspaceFollowerJoin.find( {

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


        }

        async function getPreviousSelectedWorkspaceFollowerLeave () {

            return await previousQueryWorkspaceFollowerLeave.first( {

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

        }

        let results = await Promise.all([
            getCurrentWorkspaceFollower(),
            getPreviousSelectedWorkspaceFollowerJoin(),
            getPreviousSelectedWorkspaceFollowerLeave()

        ]);

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
        // console.log("result-2: " + JSON.stringify(results[2]));

        if (results[2]) {
            previousWorkspaceFollowLeave.id = results[2].id;
            previousWorkspaceFollowLeave.set("user", results[2].get("user"));

        }

        // console.log("workspace_follower result from query: " + JSON.stringify(result.get("name")));
        // console.log("previousWorkspaceFollowJoin result from query length of array: " + JSON.stringify(previousWorkspaceFollowers.length));
        // console.log("previousWorkspaceFollowLeave result from query: " + JSON.stringify(previousWorkspaceFollowLeave.id));

        let result_workspace = result.get("workspace");
        let workspaceACL = result_workspace.getACL();
        let workspaceFollowACLPrivate = result.getACL();

        //user = result.get("user");

        let expertWorkspaceRelation = Workspace.relation("experts");


        async function removeFollowerRole () {

            // now add follower since a member is by default a follower
            queryfollowerRole.equalTo('name', followerName);

            const followerRole = await queryfollowerRole.first({

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            await followerRole.getUsers().remove(user);
            await followerRole.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            // console.log("followerRole: " + JSON.stringify(followerRole));

            return followerRole;


        }

        async function removeMemberRole () {

            queryMemberRole.equalTo('name', memberName);

            const memberRole = await queryMemberRole.first({

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            await memberRole.getUsers().remove(user);
            await memberRole.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            return memberRole;

        }

        async function removePreviousWorkspaceFollowSelected () {

            // console.log("removePreviousWorkspaceFollowSelected" );


            // joining a workspace follower, so mark previous one as false
            if (previousWorkspaceFollowers.length > 0) {

                // console.log("marketing previous workspacefollow that isSelected to false: " +previousWorkspaceFollowers.length );

                return await async.map(previousWorkspaceFollowers, async function (workspaceFollow) {

                    let workspace_Follow =  new WORKSPACEFOLLOWER();
                    workspace_Follow.id = workspaceFollow.id;

                    workspace_Follow.set("isSelected",false);
                    workspace_Follow.set("user", workspaceFollow.get("user"));

                    await workspace_Follow.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });

                    workspaceFollow = workspace_Follow;

                    return workspaceFollow;

                });


            }
            else {

                return [];
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

                    const secondResults = await Promise.all([
                        addFollowerRole(followerName),
                        addMemberRole(memberName),
                        createDefaultChannelFollows(Workspace),
                        removePreviousWorkspaceFollowSelected()
                    ]);


                    let followerRole = secondResults[0];
                    let memberRole = secondResults[1];

                    if (followerRole) {
                        userRolesRelation.add(followerRole);
                    }

                    if (memberRole) {
                        userRolesRelation.add(memberRole);

                    }

                    await user.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    await Workspace.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_Follower join took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);


                }
                else if ((result.get("isMember") === false || !result.get("isMember") ) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                    // user isFollow is true but user is not a member, make user only follower


                    const secondResults = await Promise.all([
                        addFollowerRole(followerName),
                        createDefaultChannelFollows(Workspace),
                        removePreviousWorkspaceFollowSelected()
                    ]);

                    let followerRole = secondResults[0];

                    if (followerRole) {
                        userRolesRelation.add(followerRole);
                    }

                    await user.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    await Workspace.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);


                }
                else if ((result.get("isMember") === true) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                    // user can't be a follower and not a member, keep him a member, sand make him a follower
                    workspace_follower.set("isMember", true);


                    const secondResults = await Promise.all([
                        addFollowerRole(followerName),
                        createDefaultChannelFollows(Workspace),
                        removePreviousWorkspaceFollowSelected()
                    ]);

                    let followerRole = secondResults[0];

                    if (followerRole) {
                        userRolesRelation.add(followerRole);
                    }

                    await user.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    await Workspace.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);



                }
                else if (result.get("isMember") === true && workspace_follower.get("isMember") === true) {

                    // user can't be a member if he wasn't already a follower this really can't happen

                    await Workspace.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);


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

                    await previousWorkspaceFollowLeave.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });

                }


                if ((result.get("isMember") === false || !result.get("isMember") ) && workspace_follower.get("isMember") === true) {

                    // user want's to be member but remove as follower, can't happen. remove him as member and follower
                    workspace_follower.set("isMember", false);

                    const thirdResults = await Promise.all([
                        removeFollowerRole(),
                        removeMemberRole()
                    ]);

                    let followerRole = thirdResults[0];
                    let memberRole = thirdResults[1];

                    if (followerRole) {
                        userRolesRelation.remove(followerRole);
                    }

                    if (memberRole) {
                        userRolesRelation.remove(memberRole);

                    }

                    await user.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    await Workspace.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                }
                else if ((result.get("isMember") === false || !result.get("isMember") ) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                    // user is not a member, was a follower and now wants to un-follow

                    const thirdResults = async.parallel([
                        async.apply(removeFollowerRole)
                    ]);

                    let followerRole = thirdResults[0];

                    if (followerRole) {
                        userRolesRelation.remove(followerRole);
                    }

                    user.set("isWorkspaceUpdated", true);



                    await user.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    await Workspace.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                }
                else if ((result.get("isMember") === true) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                    // user was a follower and member and now wants to both un-follow and not be a member anymore
                    Workspace.increment("memberCount", -1);
                    console.log("decrement Member");

                    // now remove both member and follower roles since the user is leaving the workspace and un-following it.

                    const thirdResults = await Promise.all([
                        removeFollowerRole(),
                        removeMemberRole()
                    ]);

                    let followerRole = thirdResults[0];
                    let memberRole = thirdResults[1];

                    if (followerRole) {
                        userRolesRelation.remove(followerRole);
                    }

                    if (memberRole) {
                        userRolesRelation.remove(memberRole);

                    }

                    user.set("isWorkspaceUpdated", true);


                    await user.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    await Workspace.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                }
                else if (result.get("isMember") === true && workspace_follower.get("isMember") === true) {

                    // user can't stay a member since he is un-following this workspace so make him not a member
                    workspace_follower.set("isMember", false);
                    Workspace.increment("memberCount", -1);
                    console.log("decrement Member");

                    // now remove both member and follower roles since the user is leaving the workspace and un-following it.

                    const thirdResults = await Promise.all([
                        removeFollowerRole(),
                        removeMemberRole()
                    ]);

                    let followerRole = thirdRestuls[0];
                    let memberRole = thirdRestuls[1];

                    if (followerRole) {
                        userRolesRelation.remove(followerRole);
                    }

                    if (memberRole) {
                        userRolesRelation.remove(memberRole);

                    }

                    user.set("isWorkspaceUpdated", true);


                    await user.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    await Workspace.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                }


            }
            else if (result.get("isFollower") === true && workspace_follower.get("isFollower") === true) {

                // User was a follower and wants to stay a follower
                if ((result.get("isMember") === false || !result.get("isMember") ) && workspace_follower.get("isMember") === true) {

                    // user wants to be a member now
                    Workspace.increment("memberCount");
                    console.log("increment  Member");

                    // now add both member only since user is already a follower
                    const thirdResult = await async.parallel([
                        async.apply(addMemberRole, memberName)

                    ]);

                    let memberRole = thirdResult[0];

                    if (memberRole) {
                        userRolesRelation.add(memberRole);

                    }

                    user.set("isWorkspaceUpdated", true);


                    await user.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    await Workspace.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);


                }
                else if ((result.get("isMember") === false || !result.get("isMember") ) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                    // do nothing since isMember and isFollower did not change

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                }
                else if ((result.get("isMember") === true) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                    // user want's to stay as a follower but removed as member
                    Workspace.increment("memberCount", -1);
                    console.log("decrement Member");

                    const thirdResults = await Promise.all([
                        removeMemberRole()
                    ]);

                    let memberRole = thirdResults[0];

                    if (memberRole) {
                        userRolesRelation.remove(memberRole);

                    }

                    user.set("isWorkspaceUpdated", true);


                    await user.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    await Workspace.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                }
                else if (result.get("isMember") === true && workspace_follower.get("isMember") === true) {

                    // do nothing since isMember and isFollower did not change

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

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


                    // set isSelected for this workspace_follower to true
                    workspace_follower.set("isSelected", true);
                    user.set("isSelectedWorkspaceFollower", workspace_follower);

                    // now add both member and follower roles

                    const results = await Promise.all([
                        addFollowerRole(followerName),
                        addMemberRole(memberName),
                        createDefaultChannelFollows(Workspace),
                        removePreviousWorkspaceFollowSelected
                    ]);

                    let followerRole = results[0];
                    let memberRole = results[1];

                    if (followerRole) {
                        userRolesRelation.add(followerRole);
                    }

                    if (memberRole) {
                        userRolesRelation.add(memberRole);

                    }

                    user.set("isWorkspaceUpdated", true);


                    await user.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    await Workspace.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken
                    });

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);


                }
                else if ((result.get("isMember") === false || !result.get("isMember") ) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                    // do nothing since isMember and isFollower did not change

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);


                }
                else if ((result.get("isMember") === true) && (workspace_follower.get("isMember") === false || !workspace_follower.get("isMember"))) {

                    // user was a member but now is not a member or follower - note this case can't happen because he will always be a follower if he is a member
                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                }
                else if (result.get("isMember") === true && workspace_follower.get("isMember") === true) {

                    // do nothing since isMember and isFollower did not change

                    let beforeSaveElse_Time = process.hrtime(time);
                    console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);


                }

            }


        }
        else if (workspace_follower.dirty("isFollower") && !workspace_follower.dirty("isMember")) {

            let beforeSaveElse_Time = process.hrtime(time);
            console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

            throw new Error ("Please enter both isFollower and isMember when updating either member of follower.");

        }
        else if (!workspace_follower.dirty("isFollower") && workspace_follower.dirty("isMember")) {

            let beforeSaveElse_Time = process.hrtime(time);
            console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

            throw new Error ("Please enter both isFollower and isMember when updating either member of follower.");

        }
        else {

            // isMember and isFollower not updated, return success.
            let beforeSaveElse_Time = process.hrtime(time);
            console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

        }


    }
    else {

        workspace_follower.set("isNew", false);

        console.log("do nothing at all");

        let beforeSaveElse_Time = process.hrtime(time);
        console.log(`beforeSaveElse_Time workspace_follower took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

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

        channelfollow.set('isNew', true);

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
        //console.log("channelFollowName user: " + JSON.stringify(channelFollowName));

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

                    if (channelObject) {

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
                                        return callback (error);
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

                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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
                                        return callback (error);
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

                                    let firstChannelResultACL = firstChannelResult.getACL();

                                    if (firstChannelResult.get("expertsArray")) {

                                        finalChannelToSave.set("expertsArray", firstChannelResult.toJSON().expertsArray);
                                        console.log("expertsArray: " + JSON.stringify(firstChannelResult.toJSON().expertsArray));

                                    }

                                    if(firstChannelResultACL) {

                                        finalChannelToSave.setACL(firstChannelResultACL);
                                        console.log("first finalChannelToSave ACL: " + JSON.stringify(finalChannelToSave.getACL()));

                                    }
                                }

                                if (secondChannelResult) {

                                    let secondChannelResultACL = secondChannelResult.getACL();

                                    if (secondChannelResult.get("followerCount")) {
                                        finalChannelToSave.set("followerCount", secondChannelResult.toJSON().followerCount);
                                    }
                                    if (secondChannelResult.get("memberCount")) {

                                        finalChannelToSave.set("memberCount", secondChannelResult.toJSON().memberCount);


                                    }

                                    if(secondChannelResultACL) {

                                        finalChannelToSave.setACL(secondChannelResultACL);
                                        console.log("second finalChannelToSave ACL: " + JSON.stringify(finalChannelToSave.getACL()));

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



                    } else {

                        console.error("beforeSave ChannelFollow no channelObject returned");
                        return response.error("beforeSave ChannelFollow no channelObject returned");
                    }




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

        //console.log("channelfollow.id: " + JSON.stringify(channelfollow.id));

        channelfollow.set('isNew', false);

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

                    console.log("results: " + JSON.stringify(results));

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
                                    return response.error(error);
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
                                    return response.error(error);
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
                                    return response.error(error);
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
                                    return response.error(error);
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
                                    return response.error(error);
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
                                    return response.error(error);
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
                                    return response.error(error);
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
                                    return response.error(error);
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
                                    return response.error(error);
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
                                    return response.error(error);
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
                                    return response.error(error);
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
                                    return response.error(error);
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
                                    return response.error(error);
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
                                    return response.error(error);
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

        channelfollow.set('isNew', false);

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

    let user = request.user;
    console.log("splitObjectAndIndex user: " + JSON.stringify(user));
    console.log("::Starting splitObjectAndIndex:: " + JSON.stringify(request));

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
    console.log("indexCount: " + JSON.stringify(indexCount));

    var loop = request['loop'];
    console.log("loop: " + JSON.stringify(loop));


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

    if (className === 'PostSocial' || 'PostMessageSocial') {
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

            let newIndexCount = indexCount + 1;
            console.log("indexCount after result: " + JSON.stringify(indexCount));

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

                    console.log("result.get.algoliaIndexID finalIndexCount: " + JSON.stringify(finalIndexCount));

                    ResultObject.save(null, {

                        useMasterKey: true,
                        //sessionToken: sessionToken

                    });

                } else {

                    // algoliaIndexID already exists let's use it
                    if (loop === false) {
                        finalIndexCount = result.get("algoliaIndexID");
                        console.log("loop false finalIndexCount: " + JSON.stringify(finalIndexCount));


                    } else {

                        finalIndexCount = indexCount.toString();
                        console.log("loop true finalIndexCount: " + JSON.stringify(finalIndexCount));


                    }

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

                    if (finalIndexCount === '1') {

                        // let's make sure we also save the index =0 algolia object with * _tags

                        object.objectID = object.objectId + '-' + '0';
                        console.log("post splitObjectAndIndex finalIndexCount: " + JSON.stringify(finalIndexCount));

                    }

                    if (className === 'PostSocial') {

                        //object = results[0].get("post");
                        //console.log("post object: " + JSON.stringify(object));

                        let postSocial = resultsFinal[0];
                        console.log("splitObjectAndIndex postSocial: " + JSON.stringify(postSocial));


                        object.PostSocial = postSocial;

                        console.log("post splitObjectAndIndex object: " + JSON.stringify(object));



                        if (object.type === 'post') {

                            console.log("Starting post section in PostSocial in SplitObjectAndIndex");


                            let postQuestionMessages = object.postQuestions;
                            console.log("postQuestionMessages: " + JSON.stringify(postQuestionMessages));

                            let postQuestionMessages1 = object['postQuestions'];
                            console.log("postQuestionMessages1: " + JSON.stringify(postQuestionMessages1));

                            //let postQuestionMessages = JSON.parse(object).get("postQuestions");
                            //console.log("postQuestionMessages: " + JSON.stringify(postQuestionMessages));

                            if (postQuestionMessages.length > 0 ) {

                                async.map(postQuestionMessages, function (postQuestionMessage, cb1) {

                                    console.log("starting async.map postQuestionMessages ");

                                    console.log("postQuestionMessage: " + JSON.stringify(postQuestionMessage));

                                    let POSTMESSAGE = Parse.Object.extend("PostMessage");
                                    let postMessage = new POSTMESSAGE();
                                    postMessage.id = postQuestionMessage.objectId;
                                    console.log("postMessage n: " + JSON.stringify(postMessage));

                                    console.log("indexOf async.map: " + JSON.stringify(postQuestionMessages.indexOf(postQuestionMessage)));

                                    let async_map_index = postQuestionMessages.indexOf(postQuestionMessage);

                                    let USEROBJECT = Parse.Object.extend("_User");
                                    let userObject = new USEROBJECT();

                                    if (object.PostSocial) {
                                        userObject.id = object.PostSocial.user.objectId;

                                    } else {

                                        userObject.id = user.objectId;
                                    }


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

                                                //console.log("postMessageSocial doesn't exist, postQuestionMessage: " + JSON.stringify(postQuestionMessage));

                                                postQuestionMessage.PostMessageSocial = null;

                                                return cb1(null, postQuestionMessage);


                                            }


                                        }
                                        else {

                                            postQuestionMessage.PostMessageSocial = null;


                                            return cb1(null, postQuestionMessage);

                                        }

                                    });


                                }, function (err, postQuestionMessagesSocialResult) {

                                    console.log("postQuestionMessagesSocialResult length: " + JSON.stringify(postQuestionMessagesSocialResult.length));

                                    if (err) {
                                        return response.error(err);
                                    } else {

                                        console.log("object.postQuestions: " + JSON.stringify(object.postQuestions));


                                        object.postQuestions = postQuestionMessagesSocialResult;
                                        if(object.postSocial) {delete object.postSocial; }

                                        index = indexPosts;

                                        index.saveObject(object, true, function(err, content) {
                                            if (err) return response.error(err);

                                            console.log("Parse<>Algolia object saved from splitObjectAndIndex function ");

                                            if (loop === true ) {

                                                console.log("Calling splitObjectAndIndex again loop true 1");
                                                indexCount = indexCount + 1;


                                                splitObjectAndIndex({'count':count, 'user':user, 'indexCount':indexCount, 'object':object, 'className':className, 'loop': true, 'workspaceFollowers': workspaceFollowers}, response);

                                            } else if (loop === false) {

                                                console.log(" splitObjectAndIndex done ");

                                                return response.success(count);
                                            }


                                        });



                                    }

                                });


                            } else {

                                index = indexPosts;

                                index.saveObject(object, true, function (err, content) {
                                    if (err) return response.error(err);

                                    console.log("Parse<>Algolia object saved from splitObjectAndIndex function ");

                                    if (loop === true) {

                                        console.log("Calling splitObjectAndIndex again loop true 2");
                                        indexCount = indexCount + 1;



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

                            index.saveObject(object, true, function (err, content) {
                                if (err) return response.error(err);

                                console.log("Parse<>Algolia object saved from splitObjectAndIndex function ");

                                if (loop === true) {

                                    console.log("Calling splitObjectAndIndex again loop true 3");
                                    indexCount = indexCount + 1;



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

                        object.PostMessageSocial = resultsFinal[0];
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

                        index.saveObject(object, true, function (err, content) {
                            if (err) return response.error(err);

                            console.log("Parse<>Algolia object saved from splitObjectAndIndex function ");

                            if (loop === true) {

                                console.log("Calling splitObjectAndIndex again loop true 4");
                                indexCount = indexCount + 1;



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
                var resultsNone;

                if (className === 'PostSocial' || 'PostMessageSocial') {

                    resultsNone = null;

                } else {

                    resultsNone = [];
                    // no results for postSocial or workspace_follower

                }

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
                                console.log("done postMessageSocial results: " + JSON.stringify(PostMessageSocial));


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

                                postQuestionMessage.PostMessageSocial = null;


                                return cb1(null, postQuestionMessage);

                            }

                        });


                    }, function (err, postQuestionMessagesSocialResult) {

                        console.log("postQuestionMessagesSocialResult length: " + JSON.stringify(postQuestionMessagesSocialResult.length));

                        if (err) {
                            return response.error(err);
                        } else {

                            object.postQuestions = postQuestionMessagesSocialResult;
                            if(object.postSocial) {delete object.postSocial};

                            index = indexPosts;

                            index.saveObject(object, true, function(err, content) {
                                if (err) return response.error(err);

                                console.log("Parse<>Algolia object saved from splitObjectAndIndex function ");

                                if (loop === true ) {

                                    console.log("Calling splitObjectAndIndex again loop true 5");
                                    indexCount = indexCount + 1;



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


                    index.saveObject(object, true, function (err, content) {
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

function splitPostAndIndexFasterPrime (request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    var loop = request['loop'];
    //console.log("loop: " + JSON.stringify(loop));

    let user = request['user'];
    //console.log("splitPostAndIndexFasterPrime user: " + JSON.stringify(user));
    //console.log("::Starting splitPostAndIndex:: " + JSON.stringify(request));

    let post = request['postJSON'];
    //console.log("splitPostAndIndexFasterPrime post: " + JSON.stringify(post));

    let postACL = request['postACL'];
    //console.log("splitPostAndIndexFasterPrime postACL: " + JSON.stringify(postACL));

    let postSocials = request['postSocials'];
    //console.log("splitPostAndIndexFasterPrime postSocials: " + JSON.stringify(postSocials));

    let postMessageQuestionSocials = request['postMessageQuestionSocials'];
    //console.log("splitPostAndIndexFasterPrime postMessageQuestionSocials: " + JSON.stringify(postMessageQuestionSocials));

    let postMessageAnswerSocials = request['postMessageAnswerSocials'];
    //console.log("splitPostAndIndexFasterPrime postMessageAnswerSocials: " + JSON.stringify(postMessageAnswerSocials));

    let postMessageQuestions = request['postMessageQuestions'];
    //console.log("splitPostAndIndexFasterPrime postMessageQuestions: " + JSON.stringify(postMessageQuestions));

    let topAnswerForQuestionPost = request['topAnswerForQuestionPost'];
    //console.log("splitPostAndIndexFasterPrime topAnswerForQuestionPost: " + JSON.stringify(topAnswerForQuestionPost));



    let POST = Parse.Object.extend("Post");
    let Post = new POST();
    Post.id = post.objectId;
    // note object needs to be toJSON()
    //console.log("Post: " + JSON.stringify(Post));

    let skip = (request['skip'])? request['skip'] : 0;
    //console.log("skip: " + JSON.stringify(skip));

    let count = (request['count'])? request['count'] : 0;
    //console.log("count: " + JSON.stringify(count));

    let POSTMESSAGE = Parse.Object.extend("PostMessage");

    function indexPostSocial (callback2) {


        //console.log("splitPostAndIndexFaster postSocials.length: " + JSON.stringify(postSocials.length));

        if (postSocials.length > 0) {

            let tags = ['*'];

            //console.log("starting indexPostSocial");

            let post_zero = post;

            if (count === 0 ) {

                // let's create a post in algolia with tags = * for any user who doesn't already have postSocial to view it

                //console.log("className: " + JSON.stringify(className));
                let POSTSTAR = Parse.Object.extend("Post");
                var PostStar = new POSTSTAR();
                PostStar.id = post.objectId;

                PostStar = PostStar.toJSON();

                if (post.workspace && post.channel) {

                    var unique_channelId = post.workspace.objectId + '-' + post.channel.objectId;
                    console.log("unique_channelId: " + JSON.stringify(unique_channelId));
                }

                if (post.workspace) {
                    PostStar.workspace = post.workspace;
                    //console.log("setting workspace PostStar: " + JSON.stringify(PostStar.workspace));

                }

                if (post.isExpanded) {
                    PostStar.isExpanded = post.isExpanded;
                    //console.log("setting workspace PostUser: " + JSON.stringify(PostUser.workspace));

                }

                if (post.channel) {
                    PostStar.channel = post.channel;
                    //console.log("setting channel PostStar: " + JSON.stringify(PostStar.channel));

                }

                if (post.user) {
                    PostStar.user = post.user;
                    //console.log("setting user PostStar: " + JSON.stringify(PostStar.user));

                }

                if (post.archive === true || post.archive === false) {
                    PostStar.archive = post.archive;
                    //console.log("setting archive PostStar: " + JSON.stringify(PostStar.archive));

                }

                if (post.hashtags) {
                    PostStar.hashtags = post.hashtags;
                    //console.log("setting hashtags PostStar: " + JSON.stringify(PostStar.hashtags));

                }

                if (post.mentions) {
                    PostStar.mentions = post.mentions;
                    //console.log("setting mentions PostStar: " + JSON.stringify(PostStar.mentions));

                }


                if (post.type) {
                    PostStar.type = post.type;
                    //console.log("setting type PostStar: " + JSON.stringify(PostStar.type));

                }

                if (post.mediaType) {
                    PostStar.mediaType = post.mediaType;
                    //console.log("setting mediaType PostStar: " + JSON.stringify(PostStar.mediaType));

                }

                if (post.ACL) {
                    PostStar.ACL = post.ACL;
                    console.log("setting ACL PostStar: " + JSON.stringify(PostStar.ACL));

                }


                if (postACL) {

                    if (postACL.getPublicReadAccess()) {

                        // this means it's public read access is true
                        PostStar._tags = ['*'];

                    }


                    else if (!postACL.getPublicReadAccess() && postACL.getReadAccess(user)) {


                        // this means this user has read access
                        PostStar._tags = [unique_channelId];
                        console.log("PostStar private Access: " + JSON.stringify(PostStar._tags));

                    }

                    /*else if (!postACL.getPublicReadAccess() && postACL.getReadAccess(roleChannel)) {

                        // this means any user with this channel is private and channel-role will have access i.e. they are a member of this channel
                        PostStar._tags = [unique_channelId];
                        console.log("PostStar private roleChannel: " + JSON.stringify(PostStar._tags));

                    } */

                    else {

                        // this means any user with this channel is private and channel-role will have access i.e. they are a member of this channel
                        PostStar._tags = [unique_channelId];
                        console.log("PostStar private roleChannel: " + JSON.stringify(PostStar._tags));


                    }



                } else if (!postACL || postACL === null) {

                    // this means it's public read write
                    //console.log("no postACL for this post.");
                    PostStar._tags = ['*'];
                    console.log("PostStar * Access: " + JSON.stringify(PostStar._tags));

                }


                if (post.hasURL === true || post.hasURL === false) {

                    PostStar.hasURL = post.hasURL;
                    //console.log("setting hasURL PostStar: " + JSON.stringify(PostStar.hasURL));

                }

                if (post.isIncognito === true || post.isIncognito === false) {
                    PostStar.isIncognito = post.isIncognito;
                    //console.log("setting isIncognito PostStar: " + JSON.stringify(PostStar.isIncognito));

                }
                if (post.chatEnabled === true || post.chatEnabled === false) {

                    PostStar.chatEnabled = post.chatEnabled;
                    //console.log("setting chatEnabled PostStar: " + JSON.stringify(PostStar.chatEnabled));

                }

                if (post.text) {
                    PostStar.text = post.text;
                    //console.log("setting text PostStar: " + JSON.stringify(PostStar.text));

                }
                if (post.updatedAt) {
                    PostStar.updatedAt = post.updatedAt;
                    //console.log("setting updatedAt PostStar: " + JSON.stringify(PostStar.updatedAt));
                }
                if (post.createdAt) {

                    PostStar.createdAt = post.createdAt;
                    //console.log("setting createdAt PostStar: " + JSON.stringify(PostStar.createdAt));
                }


                if (post.transcript) {
                    PostStar.transcript = post.transcript;
                    //console.log("setting transcript PostStar: " + JSON.stringify(PostStar.transcript));

                }
                if (post.post_title) {

                    PostStar.post_title = post.post_title;
                    //console.log("setting post_title PostStar: " + JSON.stringify(PostStar.post_title));

                }
                if (post.video) {

                    PostStar.video = post.video;
                    //console.log("setting video PostStar: " + JSON.stringify(PostStar.video));

                }
                if (post.questionAnswerEnabled === true || post.questionAnswerEnabled === false) {

                    PostStar.questionAnswerEnabled = post.questionAnswerEnabled;
                    //console.log("setting questionAnswerEnabled PostStar: " + JSON.stringify(PostStar.questionAnswerEnabled));
                }
                if (post.thumbnailRatio) {

                    PostStar.thumbnailRatio = post.thumbnailRatio;
                    //console.log("setting thumbnailRatio PostStar: " + JSON.stringify(PostStar.thumbnailRatio));
                }

                if (post.file) {

                    PostStar.file = post.file;
                    //console.log("setting file PostStar: " + JSON.stringify(PostStar.file));
                }
                if (post.image) {
                    PostStar.image = post.image;
                    //console.log("setting image PostStar: " + JSON.stringify(PostStar.image));
                }
                if (post.audio) {
                    PostStar.audio = post.audio;
                    //console.log("setting audio PostStar: " + JSON.stringify(PostStar.audio));
                }

                if (post.audioWave) {
                    PostStar.audioWave = post.audioWave;
                    //console.log("setting audioWave PostStar: " + JSON.stringify(PostStar.audioWave));
                }

                if (post.imageRatio) {
                    PostStar.imageRatio = post.imageRatio;
                    //console.log("setting imageRatio PostStar: " + JSON.stringify(PostStar.imageRatio));
                }

                if (post.mediaDuration) {
                    PostStar.mediaDuration = post.mediaDuration;
                    //console.log("setting mediaDuration PostStar: " + JSON.stringify(PostStar.mediaDuration));
                }
                if (post.likesCount) {

                    PostStar.likesCount = post.likesCount;
                    //console.log("setting lkesCount PostStar: i" + JSON.stringify(PostStar.likesCount));
                }
                if (post.video_thumbnail) {
                    PostStar.video_thumbnail = post.video_thumbnail;
                    //console.log("setting video_thumbnail PostStar: " + JSON.stringify(PostStar.video_thumbnail));
                }

                if (post.chatMessages) {

                    PostStar.chatMessages = post.chatMessages;
                    //console.log("setting chatMessages PostStar: " + JSON.stringify(PostStar.chatMessages));
                }

                if (post.type === 'post') {

                    if (post.postMessageCount) {
                        PostStar.postMessageCount = post.postMessageCount;
                        //console.log("setting postMessageCount PostStar: " + JSON.stringify(PostStar.postMessageCount));
                    }
                    if (post.postMessageUnReadCount) {
                        PostStar.postMessageUnReadCount = post.postMessageUnReadCount;
                        //console.log("setting postMessageUnReadCount PostStar: " + JSON.stringify(PostStar.postMessageUnReadCount));
                    }
                    if (post.postMessageQuestionCount) {
                        PostStar.postMessageQuestionCount = post.postMessageQuestionCount;
                        //console.log("setting postMessageQuestionCount PostStar: " + JSON.stringify(PostStar.postMessageQuestionCount));
                    }
                    if (post.postMessageQuestionUnReadCount) {

                        PostStar.postMessageQuestionUnReadCount = post.postMessageQuestionUnReadCount;
                        //console.log("setting postMessageQuestionUnReadCount PostStar: " + JSON.stringify(PostStar.postMessageQuestionUnReadCount));
                    }
                    if (post.postQuestions) {
                        PostStar.postQuestions = post.postQuestions;
                        delete PostStar.postQuestions;
                        //console.log("setting postQuestions PostStar: " + JSON.stringify(PostStar.postQuestions));

                    }


                } else if (post.type === 'question') {

                    console.log("it's a question!: " + JSON.stringify(post.type));

                    if (post.postMessageCount) {

                        PostStar.postMessageCount = post.postMessageCount;
                        //console.log("setting postMessageCount PostStar: " + JSON.stringify(PostStar.postMessageCount));
                    }
                    if (post.postMessageUnReadCount) {

                        PostStar.postMessageUnReadCount = post.postMessageUnReadCount;
                        //console.log("setting postMessageUnReadCount PostStar: " + JSON.stringify(PostStar.postMessageUnReadCount));
                    }
                    if (post.postMessageAnswerCount) {
                        PostStar.postMessageAnswerCount = post.postMessageAnswerCount;
                        //console.log("setting postMessageAnswerCount PostStar: " + JSON.stringify(PostStar.postMessageAnswerCount));
                    }
                    if (post.postMessageAnswerUnReadCount) {

                        PostStar.postMessageAnswerUnReadCount = post.postMessageAnswerUnReadCount;
                        //console.log("setting postMessageAnswerUnReadCount PostStar: " + JSON.stringify(PostStar.postMessageAnswerUnReadCount));
                    }
                    if (post.topAnswer) {
                        PostStar.topAnswer = post.topAnswer;
                        //console.log("setting topAnswer PostStar: " + JSON.stringify(PostStar.topAnswer));

                    }

                }

                let postObjectID = post.objectId + '-0';

                PostStar.objectID = postObjectID;
                //PostStar._tags = tags;
                PostStar.PostSocial = null;

                //console.log("PostStar with *tag: " + JSON.stringify(PostStar));



            }

            //console.log("starting async.map");


            async.mapSeries(postSocials, function (postSocialResult, cb) {

                //console.log("postSocials.length: " + JSON.stringify(postSocials.length));
                let POSTUSER = Parse.Object.extend("Post");
                let PostUser = new POSTUSER();
                PostUser.id = post.objectId;

                let currentUserPost = postSocialResult.get('user');

                PostUser = PostUser.toJSON();

                if (post.workspace) {
                    PostUser.workspace = post.workspace;
                    //console.log("setting workspace PostUser: " + JSON.stringify(PostUser.workspace));

                }

                if (post.isExpanded) {
                    PostUser.isExpanded = post.isExpanded;
                    //console.log("setting workspace PostUser: " + JSON.stringify(PostUser.workspace));

                }

                if (post.channel) {
                    PostUser.channel = post.channel;
                    //console.log("setting channel PostUser: " + JSON.stringify(PostUser.channel));

                }

                if (post.user) {
                    PostUser.user = post.user;
                    //console.log("setting user PostUser: " + JSON.stringify(PostUser.user));

                }

                if (post.archive === true || post.archive === false) {
                    PostUser.archive = post.archive;
                    //console.log("setting archive PostUser: " + JSON.stringify(PostUser.archive));

                }

                if (post.hashtags) {
                    PostUser.hashtags = post.hashtags;
                    //console.log("setting hashtags PostUser: " + JSON.stringify(PostUser.hashtags));

                }

                if (post.mentions) {
                    PostUser.mentions = post.mentions;
                    //console.log("setting mentions PostUser: " + JSON.stringify(PostUser.mentions));

                }


                if (post.type) {
                    PostUser.type = post.type;
                    //console.log("setting type PostUser: " + JSON.stringify(PostUser.type));

                }

                if (post.mediaType) {
                    PostUser.mediaType = post.mediaType;
                    //console.log("setting mediaType PostUser: " + JSON.stringify(PostUser.mediaType));

                }

                if (post.ACL) {
                    PostUser.ACL = post.ACL;
                    //console.log("setting ACL PostUser: " + JSON.stringify(PostUser.ACL));

                }


                if (post.hasURL === true || post.hasURL === false) {

                    PostUser.hasURL = post.hasURL;
                    //console.log("setting hasURL PostUser: " + JSON.stringify(PostUser.hasURL));

                }

                if (post.isIncognito === true || post.isIncognito === false) {
                    PostUser.isIncognito = post.isIncognito;
                    //console.log("setting isIncognito PostUser: " + JSON.stringify(PostUser.isIncognito));

                }
                if (post.chatEnabled === true || post.chatEnabled === false) {

                    PostUser.chatEnabled = post.chatEnabled;
                    //console.log("setting chatEnabled PostUser: " + JSON.stringify(PostUser.chatEnabled));

                }

                if (post.text) {
                    PostUser.text = post.text;
                    //console.log("setting text PostUser: " + JSON.stringify(PostUser.text));

                }
                if (post.updatedAt) {
                    PostUser.updatedAt = post.updatedAt;
                    //console.log("setting updatedAt PostUser: " + JSON.stringify(PostUser.updatedAt));
                }
                if (post.createdAt) {

                    PostUser.createdAt = post.createdAt;
                    //console.log("setting createdAt PostUser: " + JSON.stringify(PostUser.createdAt));
                }


                if (post.transcript) {
                    PostUser.transcript = post.transcript;
                    //console.log("setting transcript PostUser: " + JSON.stringify(PostUser.transcript));

                }
                if (post.post_title) {

                    PostUser.post_title = post.post_title;
                    //console.log("setting post_title PostUser: " + JSON.stringify(PostUser.post_title));

                }
                if (post.video) {

                    PostUser.video = post.video;
                    //console.log("setting video PostUser: " + JSON.stringify(PostUser.video));

                }
                if (post.questionAnswerEnabled === true || post.questionAnswerEnabled === false) {

                    PostUser.questionAnswerEnabled = post.questionAnswerEnabled;
                    //console.log("setting questionAnswerEnabled PostUser: " + JSON.stringify(PostUser.questionAnswerEnabled));
                }
                if (post.thumbnailRatio) {

                    PostUser.thumbnailRatio = post.thumbnailRatio;
                    //console.log("setting thumbnailRatio PostUser: " + JSON.stringify(PostUser.thumbnailRatio));
                }

                if (post.file) {

                    PostUser.file = post.file;
                    //console.log("setting file PostUser: " + JSON.stringify(PostUser.file));
                }
                if (post.image) {
                    PostUser.image = post.image;
                    //console.log("setting image PostUser: " + JSON.stringify(PostUser.image));
                }
                if (post.audio) {
                    PostUser.audio = post.audio;
                    //console.log("setting audio PostUser: " + JSON.stringify(PostUser.audio));
                }

                if (post.audioWave) {
                    PostUser.audioWave = post.audioWave;
                    //console.log("setting audioWave PostUser: " + JSON.stringify(PostUser.audioWave));
                }

                if (post.imageRatio) {
                    PostUser.imageRatio = post.imageRatio;
                    //console.log("setting imageRatio PostUser: " + JSON.stringify(PostUser.imageRatio));
                }

                if (post.mediaDuration) {
                    PostUser.mediaDuration = post.mediaDuration;
                    //console.log("setting mediaDuration PostUser: " + JSON.stringify(PostUser.mediaDuration));
                }
                if (post.likesCount) {

                    PostUser.likesCount = post.likesCount;
                    //console.log("setting likesCount PostUser: i" + JSON.stringify(PostUser.likesCount));
                }
                if (post.video_thumbnail) {
                    PostUser.video_thumbnail = post.video_thumbnail;
                    //console.log("setting video_thumbnail PostUser: " + JSON.stringify(PostUser.video_thumbnail));
                }

                if (post.chatMessages) {

                    PostUser.chatMessages = post.chatMessages;
                    //console.log("setting chatMessages PostUser: " + JSON.stringify(PostUser.chatMessages));
                }

                if (post.type === 'post') {

                    if (post.postMessageCount) {
                        PostUser.postMessageCount = post.postMessageCount;
                        //console.log("setting postMessageCount PostUser: " + JSON.stringify(PostUser.postMessageCount));
                    }
                    if (post.postMessageUnReadCount) {
                        PostUser.postMessageUnReadCount = post.postMessageUnReadCount;
                        //console.log("setting postMessageUnReadCount PostUser: " + JSON.stringify(PostUser.postMessageUnReadCount));
                    }
                    if (post.postMessageQuestionCount) {
                        PostUser.postMessageQuestionCount = post.postMessageQuestionCount;
                        //console.log("setting postMessageQuestionCount PostUser: " + JSON.stringify(PostUser.postMessageQuestionCount));
                    }
                    if (post.postMessageQuestionUnReadCount) {

                        PostUser.postMessageQuestionUnReadCount = post.postMessageQuestionUnReadCount;
                        //console.log("setting postMessageQuestionUnReadCount PostUser: " + JSON.stringify(PostUser.postMessageQuestionUnReadCount));
                    }
                    if (post.postQuestions) {
                        PostUser.postQuestions = post.postQuestions;
                        delete PostUser.postQuestions;
                        //console.log("setting postQuestions PostUser: " + JSON.stringify(PostUser.postQuestions));

                    }


                } else if (post.type === 'question') {

                    //console.log("it's a question!: " + JSON.stringify(post.type));

                    if (post.postMessageCount) {

                        PostUser.postMessageCount = post.postMessageCount;
                        //console.log("setting postMessageCount PostUser: " + JSON.stringify(PostUser.postMessageCount));
                    }
                    if (post.postMessageUnReadCount) {

                        PostUser.postMessageUnReadCount = post.postMessageUnReadCount;
                        //console.log("setting postMessageUnReadCount PostUser: " + JSON.stringify(PostUser.postMessageUnReadCount));
                    }
                    if (post.postMessageAnswerCount) {
                        PostUser.postMessageAnswerCount = post.postMessageAnswerCount;
                        //console.log("setting postMessageAnswerCount PostUser: " + JSON.stringify(PostUser.postMessageAnswerCount));
                    }
                    if (post.postMessageAnswerUnReadCount) {

                        PostUser.postMessageAnswerUnReadCount = post.postMessageAnswerUnReadCount;
                        //console.log("setting postMessageAnswerUnReadCount PostUser: " + JSON.stringify(PostUser.postMessageAnswerUnReadCount));
                    }
                    if (post.topAnswer) {
                        PostUser.topAnswer = post.topAnswer;
                        //console.log("setting topAnswer PostUser: " + JSON.stringify(PostUser.topAnswer));

                    }

                }


                let USER = Parse.Object.extend("_User");
                let UserResult = new USER();
                UserResult.id = postSocialResult.get("user").id;

                //console.log("UserResult: " + JSON.stringify(UserResult));


                let tagUser = [];

                tagUser.push(UserResult.id);

                //console.log("tagUser: " + JSON.stringify(tagUser));

                //console.log("simplifyPostSocial 1: " + JSON.stringify(postSocialResult));

                postSocialResult = simplifyPostSocial(postSocialResult);
                //console.log("simplifyPostSocial 2: " + JSON.stringify(postSocialResult));

                let postObjectID = post.objectId + '-' + UserResult.id;


                PostUser.objectID = postObjectID;
                PostUser._tags = tagUser;
                PostUser.PostSocial = postSocialResult;


                //console.log("post splitObjectAndIndex PostUser.PostSocial: " + JSON.stringify(PostUser.PostSocial));


                postSocialResult = PostUser;

                return cb(null, postSocialResult);


            }, function (err, postSocialResults) {

                //console.log("postSocialResults length: " + JSON.stringify(postSocialResults.length));

                if (err) {
                    return callback2(err);
                } else {

                    if (count === 0 ) {

                        //console.log("postSocialResults: " + JSON.stringify(postSocialResults));


                        //postQuestionMessagesSocialResult = postQuestionMessagesSocialResult.push(JSON.parse(post_zero));

                        postSocialResults.push(PostStar);

                        //console.log("postSocialResults with PostStar: " + JSON.stringify(postSocialResults));


                        // console.log("postQuestionMessagesSocialResult add: asd " + JSON.stringify(postQuestionMessagesSocialResult));

                    }

                    if (postSocialResults.length > 0) {

                        //console.log("postSocialResults.length adsf: " + JSON.stringify(postSocialResults.length));

                        return callback2 (null, postSocialResults);



                    }

                    else {


                        return callback2 (err);

                    }

                }

            });

        }
        else {



            let tags = ['*'];

            //console.log("::starting postSocialQuery no result on postSocial::");

            // let's create a post in algolia with tags = * for any user who doesn't already have postSocial to view it

            //console.log("className: " + JSON.stringify(className));
            let POSTSTAR = Parse.Object.extend("Post");
            let PostStar1 = new POSTSTAR();
            PostStar1.id = post.objectId;

            PostStar1 = PostStar1.toJSON();

            if (post.workspace) {
                PostStar1.workspace = post.workspace;
                //console.log("setting workspace PostStar: " + JSON.stringify(PostStar.workspace));

            }

            if (post.isExpanded) {
                PostStar1.isExpanded = post.isExpanded;
                //console.log("setting workspace PostUser: " + JSON.stringify(PostUser.workspace));

            }

            if (post.channel) {
                PostStar1.channel = post.channel;
                //console.log("setting channel PostStar: " + JSON.stringify(PostStar.channel));

            }

            if (post.user) {
                PostStar1.user = post.user;
                //console.log("setting user PostStar: " + JSON.stringify(PostStar.user));

            }

            if (post.archive === true || post.archive === false) {
                PostStar1.archive = post.archive;
                //console.log("setting archive PostStar: " + JSON.stringify(PostStar.archive));

            }

            if (post.hashtags) {
                PostStar1.hashtags = post.hashtags;
                //console.log("setting hashtags PostStar: " + JSON.stringify(PostStar.hashtags));

            }

            if (post.mentions) {
                PostStar1.mentions = post.mentions;
                //console.log("setting mentions PostStar: " + JSON.stringify(PostStar.mentions));

            }


            if (post.type) {
                PostStar1.type = post.type;
                //console.log("setting type PostStar: " + JSON.stringify(PostStar.type));

            }

            if (post.mediaType) {
                PostStar1.mediaType = post.mediaType;
                //console.log("setting mediaType PostStar: " + JSON.stringify(PostStar.mediaType));

            }

            if (post.ACL) {
                PostStar1.ACL = post.ACL;
                //console.log("setting ACL PostStar: " + JSON.stringify(PostStar.ACL));

            }

            if (post.hasURL === true || post.hasURL === false) {

                PostStar1.hasURL = post.hasURL;
                //console.log("setting hasURL PostStar: " + JSON.stringify(PostStar.hasURL));

            }

            if (post.isIncognito === true || post.isIncognito === false) {
                PostStar1.isIncognito = post.isIncognito;
                //console.log("setting isIncognito PostStar: " + JSON.stringify(PostStar.isIncognito));

            }
            if (post.chatEnabled === true || post.chatEnabled === false) {

                PostStar1.chatEnabled = post.chatEnabled;
                //console.log("setting chatEnabled PostStar: " + JSON.stringify(PostStar.chatEnabled));

            }

            if (post.text) {
                PostStar1.text = post.text;
                //console.log("setting text PostStar: " + JSON.stringify(PostStar.text));

            }
            if (post.updatedAt) {
                PostStar1.updatedAt = post.updatedAt;
                //console.log("setting updatedAt PostStar: " + JSON.stringify(PostStar.updatedAt));
            }
            if (post.createdAt) {

                PostStar1.createdAt = post.createdAt;
                //console.log("setting createdAt PostStar: " + JSON.stringify(PostStar.createdAt));
            }


            if (post.transcript) {
                PostStar1.transcript = post.transcript;
                //console.log("setting transcript PostStar: " + JSON.stringify(PostStar.transcript));

            }
            if (post.post_title) {

                PostStar1.post_title = post.post_title;
                //console.log("setting post_title PostStar: " + JSON.stringify(PostStar.post_title));

            }
            if (post.video) {

                PostStar1.video = post.video;
                //console.log("setting video PostStar: " + JSON.stringify(PostStar.video));

            }
            if (post.questionAnswerEnabled === true || post.questionAnswerEnabled === false) {

                PostStar1.questionAnswerEnabled = post.questionAnswerEnabled;
                //console.log("setting questionAnswerEnabled PostStar: " + JSON.stringify(PostStar.questionAnswerEnabled));
            }
            if (post.thumbnailRatio) {

                PostStar1.thumbnailRatio = post.thumbnailRatio;
                //console.log("setting thumbnailRatio PostStar: " + JSON.stringify(PostStar.thumbnailRatio));
            }

            if (post.file) {

                PostStar1.file = post.file;
                //console.log("setting file PostStar: " + JSON.stringify(PostStar.file));
            }
            if (post.image) {
                PostStar1.image = post.image;
                //console.log("setting image PostStar: " + JSON.stringify(PostStar.image));
            }
            if (post.audio) {
                PostStar1.audio = post.audio;
                //console.log("setting audio PostStar: " + JSON.stringify(PostStar.audio));
            }

            if (post.audioWave) {
                PostStar1.audioWave = post.audioWave;
                //console.log("setting audioWave PostStar: " + JSON.stringify(PostStar.audioWave));
            }

            if (post.imageRatio) {
                PostStar1.imageRatio = post.imageRatio;
                //console.log("setting imageRatio PostStar: " + JSON.stringify(PostStar.imageRatio));
            }

            if (post.mediaDuration) {
                PostStar1.mediaDuration = post.mediaDuration;
                //console.log("setting mediaDuration PostStar: " + JSON.stringify(PostStar.mediaDuration));
            }
            if (post.likesCount) {

                PostStar1.likesCount = post.likesCount;
                //console.log("setting lkesCount PostStar: i" + JSON.stringify(PostStar.likesCount));
            }
            if (post.video_thumbnail) {
                PostStar1.video_thumbnail = post.video_thumbnail;
                //console.log("setting video_thumbnail PostStar: " + JSON.stringify(PostStar.video_thumbnail));
            }

            if (post.chatMessages) {

                PostStar1.chatMessages = post.chatMessages;
                //console.log("setting chatMessages PostStar: " + JSON.stringify(PostStar.chatMessages));
            }

            if (post.type === 'post') {

                if (post.postMessageCount) {
                    PostStar1.postMessageCount = post.postMessageCount;
                    //console.log("setting postMessageCount PostStar: " + JSON.stringify(PostStar.postMessageCount));
                }
                if (post.postMessageUnReadCount) {
                    PostStar1.postMessageUnReadCount = post.postMessageUnReadCount;
                    //console.log("setting postMessageUnReadCount PostStar: " + JSON.stringify(PostStar.postMessageUnReadCount));
                }
                if (post.postMessageQuestionCount) {
                    PostStar1.postMessageQuestionCount = post.postMessageQuestionCount;
                    //console.log("setting postMessageQuestionCount PostStar: " + JSON.stringify(PostStar.postMessageQuestionCount));
                }
                if (post.postMessageQuestionUnReadCount) {

                    PostStar1.postMessageQuestionUnReadCount = post.postMessageQuestionUnReadCount;
                    //console.log("setting postMessageQuestionUnReadCount PostStar: " + JSON.stringify(PostStar.postMessageQuestionUnReadCount));
                }
                if (post.postQuestions) {
                    PostStar1.postQuestions = post.postQuestions;
                    delete PostStar1.postQuestions;
                    //console.log("setting postQuestions PostStar: " + JSON.stringify(PostStar.postQuestions));

                }


            } else if (post.type === 'question') {

                //console.log("it's a question!: " + JSON.stringify(post.type));

                if (post.postMessageCount) {

                    PostStar1.postMessageCount = post.postMessageCount;
                    //console.log("setting postMessageCount PostStar: " + JSON.stringify(PostStar.postMessageCount));
                }
                if (post.postMessageUnReadCount) {

                    PostStar1.postMessageUnReadCount = post.postMessageUnReadCount;
                    //console.log("setting postMessageUnReadCount PostStar: " + JSON.stringify(PostStar.postMessageUnReadCount));
                }
                if (post.postMessageAnswerCount) {
                    PostStar1.postMessageAnswerCount = post.postMessageAnswerCount;
                    //console.log("setting postMessageAnswerCount PostStar: " + JSON.stringify(PostStar.postMessageAnswerCount));
                }
                if (post.postMessageAnswerUnReadCount) {

                    PostStar1.postMessageAnswerUnReadCount = post.postMessageAnswerUnReadCount;
                    //console.log("setting postMessageAnswerUnReadCount PostStar: " + JSON.stringify(PostStar.postMessageAnswerUnReadCount));
                }
                if (post.topAnswer) {
                    PostStar1.topAnswer = post.topAnswer

                    //console.log("setting topAnswer PostStar: " + JSON.stringify(PostStar.topAnswer));

                }

            }

            let postObjectID = post.objectId + '-0';

            PostStar1.objectID = postObjectID;
            PostStar1._tags = tags;
            PostStar1.PostSocial = null;

            //console.log("post_zero with * tag: " + JSON.stringify(PostStar));

            //console.log("::starting postSocialQuery no result on PostStar1::post " + JSON.stringify(PostStar1));

            let PostSocialArrayNone = [];
            PostSocialArrayNone.push(PostStar1);


            return callback2 (null, PostSocialArrayNone);






        }




    }

    function indexPostMessageQuestionSocial (callback2) {


        if (post.type === 'post') {

            //console.log("Starting indexPostMessageQuestionSocial in splitPostAndIndexFaster");


            let postQuestionMessages = postMessageQuestions;

            if (postQuestionMessages.length > 0 ) {

                async.map(postQuestionMessages, function (postQuestionMessage, cb1) {

                        //console.log("starting async.map postQuestionMessages ");

                        //console.log("postQuestionMessage: " + JSON.stringify(postQuestionMessage));


                        let postMessage = new POSTMESSAGE();
                        postMessage.id = postQuestionMessage.objectId;
                        //console.log("postMessage n: " + JSON.stringify(postMessage));

                        //console.log("indexOf async.map: " + JSON.stringify(postQuestionMessages.indexOf(postQuestionMessage)));

                        let async_map_index = postQuestionMessages.indexOf(postQuestionMessage);

                        //console.log(" postMessageSocials: " + JSON.stringify(postMessageSocials));


                        if (postMessageQuestionSocials.length > 0) {

                            //console.log("enter into postMessageQuestionSocials...");

                            let filteredPostMessageSocials = lodash.filter(postMessageQuestionSocials, function (postMessageSocial) {

                                    //console.log(".....postMessageSocial.....: " + JSON.stringify(postMessageSocial));

                                    if (postMessageSocial.get("postMessage").id === postQuestionMessage.objectId) {

                                        //console.log("yay got a match! there is a postMessageSocial for this user for this postMessage of question type");

                                        return postMessageSocial;
                                    } else {

                                        // no postMessageSocial for this user, should we create one?

                                        return ;

                                    }

                                }


                            );
                            //console.log("filteredPostMessageSocials: " + JSON.stringify(filteredPostMessageSocials));


                            postQuestionMessage.PostMessageSocial = filteredPostMessageSocials;
                            //console.log("done postMessageSocial: " + JSON.stringify(postQuestionMessage.PostMessageSocial));

                            return cb1(null, postQuestionMessage);

                        }
                        else {

                            // postMessageSocial doesn't exist, user doesn't have any reactions on postMessage.
                            //console.log("postMessageSocial doesn't exist, user doesn't have any reactions on postMessage");

                            //console.log("postMessageSocial doesn't exist, postQuestionMessage: " + JSON.stringify(postQuestionMessage));

                            postQuestionMessage.PostMessageSocial = [];

                            return cb1(null, postQuestionMessage);


                        }




                    },
                    function (err, postQuestionMessagesSocialResult) {

                        //console.log("postQuestionMessagesSocialResult length: " + JSON.stringify(postQuestionMessagesSocialResult.length));

                        if (err) {
                            return response.error(err);
                        } else {

                            //console.log("postQuestionMessagesSocialResult.postQuestions: " + JSON.stringify(postQuestionMessagesSocialResult));

                            return callback2(null, postQuestionMessagesSocialResult);

                        }

                    });


            }
            else {

                //console.log(":::no postQuestionResults 1:::");

                let postQuestionResult = [];


                return callback2(null, postQuestionResult);


            }


        }
        else {

            //console.log(":::no postQuestionResults 3:::");


            let postQuestions = [];

            return callback2 (null, postQuestions)
        }


    }

    function indexPostMessageAnswerSocial (callback2) {


        if (post.type === 'question') {

            //console.log("Starting indexPostMessageAnswerSocial in splitPostAndIndexFaster");


            let postAnswerMessage = topAnswerForQuestionPost;

            if (postAnswerMessage) {

                //console.log("starting indexPostMessageAnswerSocial postAnswerMessage ");

                //console.log("postQuestionMessage: " + JSON.stringify(postQuestionMessage));

                let postMessage = new POSTMESSAGE();
                postMessage.id = postAnswerMessage.objectId;
                //console.log("postMessage n: " + JSON.stringify(postMessage));

                //console.log(" postMessageSocials: " + JSON.stringify(postMessageSocials));
                let postMessageStar = new POSTMESSAGE();
                //postMessageStar.id = postAnswerMessage.objectId;
                postMessageStar.set("message", postAnswerMessage.message);
                postMessageStar.set("user", postAnswerMessage.user);
                postMessageStar.set("numberOfDownVotes", postAnswerMessage.numberOfDownVotes);
                postMessageStar.set("numberOfUpVotes", postAnswerMessage.numberOfUpVotes);
                postMessageStar.set("upVotedByExpert", postAnswerMessage.upVotedByExpert);
                postMessageStar.set("seenByExpert", postAnswerMessage.seenByExpert);
                postMessageStar.set("createdAt", postAnswerMessage.createdAt);
                postMessageStar.set("updatedAt", postAnswerMessage.updatedAt);
                postMessageStar.set("objectId", postAnswerMessage.objectId);
                postMessageStar.set("PostMessageSocial", null);

                if (postMessageAnswerSocials.length > 0) {

                    //console.log("enter into postMessageAnswerSocials...");

                    let filteredPostMessageSocials = lodash.filter(postMessageAnswerSocials, function (postMessageSocial) {

                            //console.log(".....postMessageSocial.....: " + JSON.stringify(postMessageSocial));

                            if (postMessageSocial.get("postMessage").id === postAnswerMessage.objectId) {

                                //console.log("yay got a match! there is a postMessageSocial for this user for this postMessage of question type");

                                return postMessageSocial;
                            } else {

                                // no postMessageSocial for this user, should we create one?

                                return ;

                            }

                        }


                    );
                    //console.log("filteredPostMessageSocials: " + JSON.stringify(filteredPostMessageSocials));

                    let mapPostAnswerMessageSocial = lodash.map(filteredPostMessageSocials, function (PostMessageSocials) {

                        let postMessage = new POSTMESSAGE();
                        //postMessage.id = postAnswerMessage.objectId;
                        postMessage.set("message", postAnswerMessage.message);
                        postMessage.set("user", postAnswerMessage.user);
                        postMessage.set("numberOfDownVotes", postAnswerMessage.numberOfDownVotes);
                        postMessage.set("numberOfUpVotes", postAnswerMessage.numberOfUpVotes);
                        postMessage.set("upVotedByExpert", postAnswerMessage.upVotedByExpert);
                        postMessage.set("seenByExpert", postAnswerMessage.seenByExpert);
                        postMessage.set("createdAt", postAnswerMessage.createdAt);
                        postMessage.set("updatedAt", postAnswerMessage.updatedAt);
                        postMessage.set("objectId", postAnswerMessage.objectId);
                        postMessage = postMessage.toJSON();

                        PostMessageSocials = simplifyPostMessageSocialAnswer(PostMessageSocials);

                        //console.log("PostMessageSocials: " + JSON.stringify(PostMessageSocials));

                        postMessage.PostMessageSocial = PostMessageSocials;

                        return postMessage;

                    });

                    mapPostAnswerMessageSocial.push(postMessageStar);

                    //postAnswerMessage.PostMessageSocial = filteredPostMessageSocials;
                    //console.log("done mapPostAnswerMessageSocial: " + JSON.stringify(mapPostAnswerMessageSocial));

                    return callback2(null, mapPostAnswerMessageSocial);

                }
                else {

                    // postMessageSocial doesn't exist, user doesn't have any reactions on postMessage.
                    //console.log("postAnswerMessage doesn't exist, user doesn't have any reactions on postMessage");

                    //console.log("postMessageSocial doesn't exist, postQuestionMessage: " + JSON.stringify(postQuestionMessage));
                    let nullPostAnswerMessageSocial = [];

                    nullPostAnswerMessageSocial.push(postMessageStar);


                    return callback2(null, nullPostAnswerMessageSocial);


                }







            }
            else {

                //console.log(":::no postAnswerMessage 1:::");

                let nullPostAnswerMessage = [];


                return callback2(null, nullPostAnswerMessage);


            }



        }
        else {

            //console.log(":::no postAnswers 3:::");


            //console.log(":::no postAnswerMessage 1:::");

            let nullPostAnswerMessage = [];


            return callback2(null, nullPostAnswerMessage);
        }


    }


    async.parallel([
        async.apply(indexPostSocial),
        async.apply(indexPostMessageQuestionSocial),
        async.apply(indexPostMessageAnswerSocial)

    ], function (err, results) {
        if (err) {
            //console.error(err);

            return response.error(err);
        }

        //console.log("starting show results splitPostAndIndexFaster: " + JSON.stringify(results.length));

        if (results.length > 0) {

            //console.log("afterSave PostSocial Post algolia index results length: " + JSON.stringify(results.length));

            let finalPostIndexResults = results[0];
            //console.log("finalPostIndexResults: " + JSON.stringify(finalPostIndexResults.length));

            let finalPostMessageQuestionResults = results[1];
            //console.log("finalPostMessageQuestionResults: " + JSON.stringify(finalPostMessageQuestionResults));

            let finalPostMessageAnswerResults = results[2];
            //console.log("finalPostMessageAnswerResults: " + JSON.stringify(finalPostMessageAnswerResults));

            let arrayLength = 0;

            //let arrayPostMessageSocial = null;

            let arrayQuestionLength = 0;


            //if (finalPostMessageAnswerResults) {

            //  arrayLength = finalPostMessageAnswerResults.PostMessageSocial ? finalPostMessageAnswerResults.PostMessageSocial.length : 0;

            //arrayPostMessageSocial = finalPostMessageAnswerResults.PostMessageSocial ? finalPostMessageAnswerResults.PostMessageSocial : null;


            //}

            if (finalPostMessageQuestionResults.length > 0) {

                arrayQuestionLength = finalPostMessageQuestionResults ? finalPostMessageQuestionResults.length : 0;


            }

            async.mapSeries(finalPostIndexResults, function (finalPostIndexResult, cb7) {

                //console.log("starting async.map finalPostIndexResults: " + JSON.stringify(finalPostIndexResults.indexOf(finalPostIndexResult)));

                //console.log("finalPostIndexResult: " + JSON.stringify(finalPostIndexResult));

                let Questions = finalPostMessageQuestionResults;

                //let answer = finalPostMessageAnswerResults;

                let usersPost = finalPostIndexResult;

                if (usersPost.PostSocial) {

                    //let postSocialId = usersPost.PostSocial.objectId;
                    let userId = usersPost.PostSocial? usersPost.PostSocial.user.objectId : null;

                    if (usersPost.type === 'post') {

                        if (arrayQuestionLength > 0) {

                            //console.log(":::finalPostMessageQuestionResults::: " + JSON.stringify(finalPostMessageQuestionResults));

                            let QuestionsMapped = lodash.map(Questions, function (question) {

                                let questionPostMessageSocialLength = question.PostMessageSocial ? question.PostMessageSocial.length : 0;

                                let postMessageQuestion = new POSTMESSAGE();
                                //postMessage.id = postAnswerMessage.objectId;
                                postMessageQuestion.set("message", question.message);
                                postMessageQuestion.set("user", question.user);
                                postMessageQuestion.set("numberOfDownVotes", question.numberOfDownVotes);
                                postMessageQuestion.set("numberOfUpVotes", question.numberOfUpVotes);
                                postMessageQuestion.set("upVotedByExpert", question.upVotedByExpert);
                                postMessageQuestion.set("seenByExpert", question.seenByExpert);
                                postMessageQuestion.set("createdAt", question.createdAt);
                                postMessageQuestion.set("updatedAt", question.updatedAt);
                                postMessageQuestion.set("objectId", question.objectId);
                                postMessageQuestion = postMessageQuestion.toJSON();
                                question.PostMessageSocial = question.PostMessageSocial? question.PostMessageSocial : [];

                                //console.log("postMessageQuestion: " + JSON.stringify(postMessageQuestion));

                                if (questionPostMessageSocialLength > 0) {

                                    //console.log("question.PostMessageSocial: " + JSON.stringify(question.PostMessageSocial));

                                    let matchResult = lodash.findIndex(question.PostMessageSocial , function (o) {

                                        o = simplifyPostMessageSocialQuestion(o);

                                        //console.log(JSON.stringify(finalPostIndexResults.indexOf(finalPostIndexResult))+ " " + JSON.stringify(Questions.indexOf(question)) +  " o.user.objectId: " + JSON.stringify(o.user.objectId) + ":: userId: " + JSON.stringify(userId));
                                        return o.user.objectId === userId;


                                    });

                                    //console.log("matchResult: " + JSON.stringify(matchResult));

                                    if (matchResult === -1) {

                                        // no match

                                        postMessageQuestion.PostMessageSocial = null;
                                        //console.log("question null prime: " + JSON.stringify(question));

                                        question = postMessageQuestion;

                                        return question;

                                    } else {

                                        // match exists
                                        let postMessageSocialObj = question.PostMessageSocial[matchResult];
                                        postMessageSocialObj = simplifyPostMessageSocialQuestion(postMessageSocialObj);
                                        //console.log("question postMessageSocialObj prime: " + JSON.stringify(postMessageSocialObj));

                                        postMessageQuestion.PostMessageSocial = postMessageSocialObj;

                                        //console.log("question prime: " + JSON.stringify(question));


                                        question = postMessageQuestion;

                                        return  question;

                                    }


                                } else {

                                    //console.log("null postMessageSocial 1");

                                    postMessageQuestion.PostMessageSocial = null;
                                    //console.log("question null prime: " + JSON.stringify(question));

                                    question = postMessageQuestion;

                                    return question;


                                }

                            });

                            if (QuestionsMapped.length > 0) {

                                usersPost.postQuestions = QuestionsMapped;
                                usersPost.topAnswer = null;

                                //console.log("QuestionsMapped: " + JSON.stringify(QuestionsMapped));

                                // indexPosts.addObject(finalPostIndexResult).catch(err => console.error(err));

                                finalPostIndexResult = usersPost;

                                return cb7(null, finalPostIndexResult);


                            }
                            else {

                                usersPost.postQuestions = [];
                                usersPost.topAnswer = null;
                                //console.log("finalPostIndexResult: " + JSON.stringify(finalPostIndexResult));

                                //finalPostIndexResult.postAnswer = finalPostMessageAnswerResults;
                                //test
                                //finalPostIndexResult.chatMessages = finalPostMessageCommentResults;

                                //indexPosts.addObject(finalPostIndexResult).catch(err => console.error(err));

                                finalPostIndexResult = usersPost;

                                return cb7(null, finalPostIndexResult);


                            }

                            /*async.map(Questions, function (question, cb8) {

                                let questionPostMessageSocialLength = question.PostMessageSocial ? question.PostMessageSocial.length : 0;

                                let postMessageQuestion = new POSTMESSAGE();
                                //postMessage.id = postAnswerMessage.objectId;
                                postMessageQuestion.set("message", question.message);
                                postMessageQuestion.set("user", question.user);
                                postMessageQuestion.set("numberOfDownVotes", question.numberOfDownVotes);
                                postMessageQuestion.set("numberOfUpVotes", question.numberOfUpVotes);
                                postMessageQuestion.set("upVotedByExpert", question.upVotedByExpert);
                                postMessageQuestion.set("seenByExpert", question.seenByExpert);
                                postMessageQuestion.set("createdAt", question.createdAt);
                                postMessageQuestion.set("updatedAt", question.updatedAt);
                                postMessageQuestion.set("objectId", question.objectId);
                                postMessageQuestion = postMessageQuestion.toJSON();
                                question.PostMessageSocial = question.PostMessageSocial? question.PostMessageSocial : [];

                                //console.log("postMessageQuestion: " + JSON.stringify(postMessageQuestion));

                                if (questionPostMessageSocialLength > 0) {

                                    //console.log("question.PostMessageSocial: " + JSON.stringify(question.PostMessageSocial));

                                    let matchResult = lodash.findIndex(question.PostMessageSocial , function (o) {

                                        o = simplifyPostMessageSocialQuestion(o);

                                        console.log(JSON.stringify(finalPostIndexResults.indexOf(finalPostIndexResult))+ " " + JSON.stringify(Questions.indexOf(question)) +  " o.user.objectId: " + JSON.stringify(o.user.objectId) + ":: userId: " + JSON.stringify(userId));
                                        return o.user.objectId === userId;


                                    });

                                    //console.log("matchResult: " + JSON.stringify(matchResult));

                                    if (matchResult === -1) {

                                        // no match

                                        postMessageQuestion.PostMessageSocial = null;
                                        //console.log("question null prime: " + JSON.stringify(question));

                                        question = postMessageQuestion;

                                        return cb8(null, question);

                                    } else {

                                        // match exists
                                        let postMessageSocialObj = question.PostMessageSocial[matchResult];
                                        postMessageSocialObj = simplifyPostMessageSocialQuestion(postMessageSocialObj);
                                        //console.log("question postMessageSocialObj prime: " + JSON.stringify(postMessageSocialObj));

                                        postMessageQuestion.PostMessageSocial = postMessageSocialObj;

                                        //console.log("question prime: " + JSON.stringify(question));


                                        question = postMessageQuestion;

                                        return cb8(null, question);

                                    }


                                } else {

                                    //console.log("null postMessageSocial 1");

                                    postMessageQuestion.PostMessageSocial = null;
                                    //console.log("question null prime: " + JSON.stringify(question));

                                    question = postMessageQuestion;

                                    return cb8(null, question);


                                }

                            }, function (err, QuestionsMapped) {

                                if (err) {
                                    return response.error(err);
                                } else {


                                    if (QuestionsMapped.length > 0) {

                                        usersPost.postQuestions = QuestionsMapped;
                                        usersPost.topAnswer = null;

                                        //console.log("QuestionsMapped: " + JSON.stringify(QuestionsMapped));

                                        // indexPosts.addObject(finalPostIndexResult).catch(err => console.error(err));

                                        finalPostIndexResult = usersPost;

                                        return cb7(null, finalPostIndexResult);


                                    }
                                    else {

                                        usersPost.postQuestions = [];
                                        usersPost.topAnswer = null;
                                        //console.log("finalPostIndexResult: " + JSON.stringify(finalPostIndexResult));

                                        //finalPostIndexResult.postAnswer = finalPostMessageAnswerResults;
                                        //finalPostIndexResult.chatMessages = finalPostMessageCommentResults;

                                        //indexPosts.addObject(finalPostIndexResult).catch(err => console.error(err));

                                        finalPostIndexResult = usersPost;

                                        return cb7(null, finalPostIndexResult);


                                    }

                                }

                            });*/





                        } else {

                            //console.log("::no questions on post::");

                            usersPost.postQuestions = [];
                            usersPost.topAnswer = null;
                            //console.log("finalPostIndexResult: " + JSON.stringify(finalPostIndexResult));

                            //finalPostIndexResult.postAnswer = finalPostMessageAnswerResults;
                            //finalPostIndexResult.chatMessages = finalPostMessageCommentResults;

                            //indexPosts.addObject(finalPostIndexResult).catch(err => console.error(err));

                            finalPostIndexResult = usersPost;


                            return cb7(null, finalPostIndexResult);


                        }

                    }

                    else if (usersPost.type === 'question') {

                        if (finalPostMessageAnswerResults.length > 0) {

                            //console.log(":::finalPostMessageAnswerResults::: " + JSON.stringify(finalPostMessageAnswerResults));

                            //console.log("starting async.map finalPostIndexResults: " + JSON.stringify(finalPostIndexResults.indexOf(finalPostIndexResult)));
                            if (finalPostMessageAnswerResults.length === 1 && finalPostMessageAnswerResults[0].PostMessageSocial === null) {
                                // TopAnswer exists but no postSocials

                                usersPost.topAnswer = finalPostMessageAnswerResults[0];
                                usersPost.postQuestions = [];

                                finalPostIndexResult = usersPost;

                                return cb7(null, finalPostIndexResult);



                            } else {

                                let matchExists = false;

                                let matchResult = lodash.findIndex(finalPostMessageAnswerResults, function (o) {


                                    if(o.PostMessageSocial) {

                                        //console.log(JSON.stringify(finalPostIndexResults.indexOf(finalPostIndexResult))+ " o.user.objectId: " + JSON.stringify(o.PostMessageSocial.user.objectId) + ":: userId: " + JSON.stringify(userId));
                                        return o.PostMessageSocial.user.objectId === userId;


                                    } else {

                                        return -1;
                                    }

                                });

                                //console.log("matchResult: " + JSON.stringify(matchResult));


                                if (matchResult === -1) {

                                    // no match

                                    usersPost.topAnswer = finalPostMessageAnswerResults[finalPostMessageAnswerResults.length-1];
                                    usersPost.postQuestions = [];

                                    finalPostIndexResult = usersPost;

                                    return cb7(null, finalPostIndexResult);

                                } else {

                                    // match exists
                                    let postMessageAnswerObj = finalPostMessageAnswerResults[matchResult];

                                    usersPost.topAnswer = postMessageAnswerObj;
                                    usersPost.postQuestions = [];

                                    finalPostIndexResult = usersPost;

                                    return cb7(null, finalPostIndexResult);

                                }



                            }




                        }
                        else {

                            //console.log("::no answer on post::");

                            usersPost.topAnswer = null;
                            usersPost.postQuestions = [];

                            //console.log("finalPostIndexResult: " + JSON.stringify(finalPostIndexResult));

                            //finalPostIndexResult.postAnswer = finalPostMessageAnswerResults;
                            //finalPostIndexResult.chatMessages = finalPostMessageCommentResults;

                            //console.log(":::finalPostIndexResult::: " + JSON.stringify(finalPostIndexResult));

                            finalPostIndexResult = usersPost;

                            return cb7(null, finalPostIndexResult);


                        }


                    }



                } else {

                    if (usersPost.type === 'post') {

                        if (arrayQuestionLength > 0) {

                            let arrQuestionsElse = lodash.map(Questions, function (question) {

                                question.PostMessageSocial = null;

                                return question;

                            });

                            //console.log("arrQuestions: " + JSON.stringify(arrQuestions));

                            usersPost.postQuestions = arrQuestionsElse;
                            usersPost.topAnswer = null;

                            finalPostIndexResult = usersPost;

                            return cb7(null, finalPostIndexResult);

                        }
                        else {

                            usersPost.topAnswer = null;
                            usersPost.postQuestions = [];

                            finalPostIndexResult = usersPost;

                            return cb7(null, finalPostIndexResult);

                        }


                    }
                    else if (usersPost.type === 'question') {

                        if (finalPostMessageAnswerResults.length > 0) {

                            usersPost.topAnswer = finalPostMessageAnswerResults[finalPostMessageAnswerResults.length-1];
                            usersPost.postQuestions = [];

                            finalPostIndexResult = usersPost;

                            return cb7(null, finalPostIndexResult);

                        } else {

                            usersPost.topAnswer = null;
                            usersPost.postQuestions = [];

                            finalPostIndexResult = usersPost;

                            return cb7(null, finalPostIndexResult);

                        }


                    }

                }


            }, function (err, finalPostIndexResultsMapped) {

                if (err) {
                    return response.error(err);
                } else {


                    if (finalPostIndexResultsMapped.length > 0) {

                        //console.log("finalPostIndexResultsMapped: " + JSON.stringify(finalPostIndexResultsMapped));

                        //if (finalPostIndexResults[0].type === 'question') {

                        indexPosts.addObjects(finalPostIndexResultsMapped).catch(err => console.error(err));

                        // indexConversations.addObjects(finalPostIndexResults).catch(err => console.error(err));

                        //}

                        console.log("Parse<>Algolia dev_posts saved from splitPostAndIndex function ");

                        let beforeSaveElse_Time = process.hrtime(time);
                        console.log(`beforeSaveElse_Time splitPostAndIndex took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);


                        return response.success();


                    } else {


                        return response.success();

                    }

                }

            });




        }

        else {

            return response.error("No post to index error in splitPostAndIndexFaster");


        }

    });



}

function SendPostNotifications (request, response) {

    let currentUser = request['user'];
    //console.log("SendNotifications user: " + JSON.stringify(currentUser));
    //console.log("::Starting splitPostAndIndex:: " + JSON.stringify(request));

    let post = request['post'];
    //console.log("SendNotifications post: " + JSON.stringify(post));

    let workspace = request['workspace'];
    //console.log("SendPostNotifications workspace: " + JSON.stringify(workspace));

    let channel = request['channel'];
    //console.log("SendPostNotifications channel: " + JSON.stringify(channel));

    let postTitle = request['postTitle'];
    //console.log("SendPostNotifications postTitle: " + JSON.stringify(postTitle));

    let mentions = request['mentions'];
    //console.log("SendNotifications mentions: " + JSON.stringify(mentions));

    //console.log("starting SendNotifications function: " + JSON.stringify(mentions.length) );
    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let Workspace = new WORKSPACE();
    Workspace.id = workspace.id;

    let USER = Parse.Object.extend("_User");
    let CurrentUser = new USER();
    CurrentUser.id = currentUser.id;


    if (mentions.length > 0) {

        let notifications = new Set();

        for (let i = 0; i < mentions.length; i++) {

            let userId = mentions[i];
            console.log("userId: " + JSON.stringify(userId));

            let userTo = new USER();
            userTo.id = userId;

            let NOTIFICATION = Parse.Object.extend("Notification");
            let notification = new NOTIFICATION();

            notification.set("isDelivered", false);
            notification.set("hasSent", false);
            notification.set("isRead", false);
            notification.set("status", 0);
            notification.set("userFrom", CurrentUser);
            notification.set("userTo", userTo);
            notification.set("workspace", Workspace);
            notification.set("channel", channel);
            notification.set("post", post);
            notification.set("type", 'post'); // mentions in post or postMessage
            notification.set("userFromDisplayName", currentUser.get("displayName"));
            notification.set("messageTitle", '[@' + currentUser.get("displayName") + ':' + currentUser.id + '] ' + 'mentioned you in a post: ');
            notification.set("messageDescription", postTitle);
            notification.set("message", '[@' + currentUser.get("displayName") + ':' + currentUser.id + '] ' + 'mentioned you in a post: ' + postTitle);

            notifications.add(notification);

            //console.log("notification: " + JSON.stringify(notification));

            if (i === mentions.length - 1) {


                //let dupeArray = [3,2,3,3,5,2];
                let notificationArray = Array.from(new Set(notifications));

                //console.log("notificationArray length: " + JSON.stringify(notificationArray.length));

                if (notificationArray.length > 0) {

                    Parse.Object.saveAll(notificationArray, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then(function (result) {
                        // if we got 500 or more results then we know
                        // that we have more results
                        // otherwise we finish


                    }, function (err) {
                        // error
                        console.error(err);

                        return (err);

                    });

                    return response.success(notificationArray);


                } else {

                    return response.success(notificationArray);
                }


            }


        }
    }

    else {

        return response.success();
    }


}

function SendPostMessageNotifications (request, response) {

    let currentUser = request['user'];
    //console.log("SendNotifications user: " + JSON.stringify(currentUser));
    //console.log("::Starting splitPostAndIndex:: " + JSON.stringify(request));

    let post = request['post'];
    //console.log("SendNotifications post: " + JSON.stringify(post));

    let postMessage = request['postMessage'];
    //console.log("SendNotifications postMessage: " + JSON.stringify(postMessage));

    let workspace = request['workspace'];
    //console.log("SendPostNotifications workspace: " + JSON.stringify(workspace));

    let channel = request['channel'];
    //console.log("SendPostNotifications channel: " + JSON.stringify(channel));

    let postMessageDescription = request['postMessageDescription'];
    //console.log("SendPostNotifications postTitle: " + JSON.stringify(postTitle));

    let mentions = request['mentions'];
    //console.log("SendNotifications mentions: " + JSON.stringify(mentions));

    //console.log("starting SendNotifications function: " + JSON.stringify(mentions.length) );
    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let Workspace = new WORKSPACE();
    Workspace.id = workspace.id;

    let USER = Parse.Object.extend("_User");
    let CurrentUser = new USER();
    CurrentUser.id = currentUser.id;


    if (mentions.length > 0) {


        let notifications = new Set();

        for (let i = 0; i < mentions.length; i++) {

            let userId = mentions[i];
            // console.log("userId: " + JSON.stringify(userId));

            let userTo = new USER();
            userTo.id = userId;

            let NOTIFICATION = Parse.Object.extend("Notification");
            let notification = new NOTIFICATION();

            notification.set("isDelivered", false);
            notification.set("hasSent", false);
            notification.set("isRead", false);
            notification.set("status", 0);
            notification.set("userFrom", CurrentUser);
            notification.set("userTo", userTo);
            notification.set("workspace", Workspace);
            notification.set("channel", channel);
            notification.set("post", post);
            notification.set("postMessage", postMessage);
            notification.set("type", 'message'); // mentions in post or postMessage
            notification.set("userFromDisplayName", currentUser.get("displayName"));
            notification.set("messageTitle", '[@' + currentUser.get("displayName") + ':' + currentUser.id + '] ' + 'mentioned you in a message: ');
            notification.set("messageDescription", postMessage.get("message"));
            notification.set("message", '[@'+currentUser.get("displayName")+ ':' + currentUser.id + '] ' + 'mentioned you in a message: ' + postMessage.get("message"));

            notifications.add(notification);

            //console.log("notification: " + JSON.stringify(notification));

            if (i === mentions.length - 1) {


                //let dupeArray = [3,2,3,3,5,2];
                let notificationArray = Array.from(new Set(notifications));

                //console.log("notificationArray length: " + JSON.stringify(notificationArray.length));

                if (notificationArray.length > 0) {

                    Parse.Object.saveAll(notificationArray, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then(function (result) {
                        // if we got 500 or more results then we know
                        // that we have more results
                        // otherwise we finish


                    }, function (err) {
                        // error
                        console.error(err);

                        return (err);

                    });

                    return response.success(notificationArray);


                } else {

                    return response.success(notificationArray);
                }


            }




        }
    } else {

        return response.success();
    }


}


function splitPostMessageAndIndex (request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    var loop = request['loop'];
    console.log("loop: " + JSON.stringify(loop));

    let user = request['user'];
    //console.log("splitPostAndIndex user: " + JSON.stringify(user));
    //console.log("::Starting splitPostMessageAndIndex:: " + JSON.stringify(request));

    let postMessage = request['object'];
    //console.log("postMessage: " + JSON.stringify(postMessage));

    let topAnswerForQuestionPostMessage = request['topAnswerForQuestionPostMessage'];

    let parentPostMessageUser = request['parentPostMessageUser'];

    let POSTMESSAGE = Parse.Object.extend("PostMessage");
    let PostMessage = new POSTMESSAGE();
    PostMessage.id = postMessage.objectId;
    // note object needs to be toJSON()
    //console.log("PostMessage: " + JSON.stringify(PostMessage));

    let count = (request['count'])? request['count'] : 0;
    //console.log("count: " + JSON.stringify(count));

    let postMessageSocialQuery = new Parse.Query("PostMessageSocial");

    postMessageSocialQuery.equalTo('postMessage', PostMessage);

    postMessageSocialQuery.limit(10000);

    postMessageSocialQuery.skip(count);

    postMessageSocialQuery.find({
        useMasterKey: true
        //sessionToken: sessionToken
    }).then((postMessageSocialResults) => {

        //console.log("postMessageSocialResults.length: " + JSON.stringify(postMessageSocialResults));

        if (postMessageSocialResults.length > 0) {

            let tags = ['*'];

            //console.log("starting postMessageSocialQuery");

            let postMessage_zero = postMessage;


            if (count === 0 ) {

                // let's create a post in algolia with tags = * for any user who doesn't already have postSocial to view it

                //console.log("className: " + JSON.stringify(className));
                let POSTMESSAGESTAR = Parse.Object.extend("PostMessage");
                var PostMessageStar = new POSTMESSAGESTAR();
                PostMessageStar.id = postMessage.objectId;

                PostMessageStar = PostMessageStar.toJSON();

                if (postMessage.workspace) {
                    PostMessageStar.workspace = postMessage.workspace;
                    //console.log("setting workspace PostMessageStar: " + JSON.stringify(PostMessageStar.workspace));

                }

                if (postMessage.channel) {
                    PostMessageStar.channel = postMessage.channel;
                    //console.log("setting channel PostMessageStar: " + JSON.stringify(PostMessageStar.channel));

                }

                if (postMessage.post) {
                    PostMessageStar.post = postMessage.post;
                    //console.log("setting post PostMessageStar: " + JSON.stringify(PostMessageStar.post));

                }


                if (postMessage.user) {
                    PostMessageStar.user = postMessage.user;
                    //console.log("setting user PostMessageStar: " + JSON.stringify(PostMessageStar.user));

                }

                if (postMessage.archive === true || postMessage.archive === false) {
                    PostMessageStar.archive = postMessage.archive;
                    //console.log("setting archive PostMessageStar: " + JSON.stringify(PostMessageStar.archive));

                }

                if (postMessage.hashtags) {
                    PostMessageStar.hashtags = postMessage.hashtags;
                    //console.log("setting hashtags PostMessageStar: " + JSON.stringify(PostMessageStar.hashtags));

                }

                if (postMessage.mentions) {
                    PostMessageStar.mentions = postMessage.mentions;
                    //console.log("setting mentions PostMessageStar: " + JSON.stringify(PostMessageStar.mentions));

                }


                if (postMessage.type) {
                    PostMessageStar.type = postMessage.type;
                    //console.log("setting type PostMessageStar: " + JSON.stringify(PostMessageStar.type));

                }

                if (postMessage.mediaType) {
                    PostMessageStar.mediaType = postMessage.mediaType;
                    //console.log("setting mediaType PostMessageStar: " + JSON.stringify(PostMessageStar.mediaType));

                }

                if (postMessage.ACL) {
                    PostMessageStar.ACL = postMessage.ACL;
                    //console.log("setting ACL PostMessageStar: " + JSON.stringify(PostMessageStar.ACL));

                }

                if (postMessage.hasURL === true || postMessage.hasURL === false) {

                    PostMessageStar.hasURL = postMessage.hasURL;
                    //console.log("setting hasURL PostMessageStar: " + JSON.stringify(PostMessageStar.hasURL));

                }

                if (postMessage.isIncognito === true || postMessage.isIncognito === false) {
                    PostMessageStar.isIncognito = postMessage.isIncognito;
                    //console.log("setting isIncognito PostMessageStar: " + JSON.stringify(PostMessageStar.isIncognito));

                }


                if (postMessage.message) {
                    PostMessageStar.message = postMessage.message;
                    //console.log("setting message PostMessageStar: " + JSON.stringify(PostMessageStar.message));

                }
                if (postMessage.updatedAt) {
                    PostMessageStar.updatedAt = postMessage.updatedAt;
                    //console.log("setting updatedAt PostMessageStar: " + JSON.stringify(PostMessageStar.updatedAt));
                }
                if (postMessage.createdAt) {

                    PostMessageStar.createdAt = postMessage.createdAt;
                    //console.log("setting createdAt PostMessageStar: " + JSON.stringify(PostMessageStar.createdAt));
                }

                if (postMessage.video) {

                    PostMessageStar.video = postMessage.video;
                    //console.log("setting video PostMessageStar: " + JSON.stringify(PostMessageStar.video));

                }

                if (postMessage.thumbnailRatio) {

                    PostMessageStar.thumbnailRatio = postMessage.thumbnailRatio;
                    //console.log("setting thumbnailRatio PostMessageStar: " + JSON.stringify(PostMessageStar.thumbnailRatio));
                }

                if (postMessage.file) {

                    PostMessageStar.file = postMessage.file;
                    //console.log("setting file PostMessageStar: " + JSON.stringify(PostMessageStar.file));
                }
                if (postMessage.image) {
                    PostMessageStar.image = postMessage.image;
                    //console.log("setting image PostMessageStar: " + JSON.stringify(PostMessageStar.image));
                }
                if (postMessage.audio) {
                    PostMessageStar.audio = postMessage.audio;
                    //console.log("setting audio PostMessageStar: " + JSON.stringify(PostMessageStar.audio));
                }

                if (postMessage.audioWave) {
                    PostMessageStar.audioWave = postMessage.audioWave;
                    //console.log("setting audioWave PostMessageStar: " + JSON.stringify(PostMessageStar.audioWave));
                }

                if (postMessage.imageRatio) {
                    PostMessageStar.imageRatio = postMessage.imageRatio;
                    //console.log("setting imageRatio PostMessageStar: " + JSON.stringify(PostMessageStar.imageRatio));
                }

                if (postMessage.mediaDuration) {
                    PostMessageStar.mediaDuration = postMessage.mediaDuration;
                    //console.log("setting mediaDuration PostMessageStar: " + JSON.stringify(PostMessageStar.mediaDuration));
                }

                if (postMessage.video_thumbnail) {
                    PostMessageStar.video_thumbnail = postMessage.video_thumbnail;
                    //console.log("setting video_thumbnail PostMessageStar: " + JSON.stringify(PostMessageStar.video_thumbnail));
                }

                if (postMessage.parentPostMessage) {
                    PostMessageStar.parentPostMessage = postMessage.parentPostMessage;

                    PostMessageStar.parentPostMessage.user = parentPostMessageUser;
                    if (postMessage.type === 'question') {

                        PostMessageStar.parentPostMessage.topAnswerForQuestionPostMessage = topAnswerForQuestionPostMessage;
                    }
                    console.log("setting parentPostMessage PostMessageStar: " + JSON.stringify(PostMessageStar.parentPostMessage));

                }

                if (postMessage.postMessageSocialCount) {
                    PostMessageStar.postMessageSocialCount = postMessage.postMessageSocialCount;
                    //console.log("setting postMessageSocialCount PostMessageStar: " + JSON.stringify(PostMessageStar.postMessageSocialCount));
                }

                if (postMessage.childPostMessageCount) {
                    PostMessageStar.childPostMessageCount = postMessage.childPostMessageCount;
                    //console.log("setting childPostMessageCount PostMessageStar: " + JSON.stringify(PostMessageStar.childPostMessageCount));
                }

                if (postMessage.postMessageReadStatusCount) {
                    PostMessageStar.postMessageReadStatusCount = postMessage.postMessageReadStatusCount;
                    //console.log("setting postMessageReadStatusCount PostMessageStar: " + JSON.stringify(PostMessageStar.postMessageReadStatusCount));
                }



                if (postMessage.type === 'question') {

                    if (postMessage.likedCount) {

                        PostMessageStar.likedCount = postMessage.likedCount;
                        //console.log("setting likesCount PostMessageStar: i" + JSON.stringify(PostMessageStar.likedCount));
                    }


                } else  if (postMessage.type === 'answer') {

                    if (postMessage.upVotedByExpert === true || postMessage.upVotedByExpert === false) {
                        PostMessageStar.upVotedByExpert = postMessage.upVotedByExpert;
                        //console.log("setting upVotedByExpert PostMessageStar: " + JSON.stringify(PostMessageStar.upVotedByExpert));

                    }

                    if (postMessage.seenByExpert === true || postMessage.seenByExpert === false) {
                        PostMessageStar.seenByExpert = postMessage.seenByExpert;
                        //console.log("setting seenByExpert PostMessageStar: " + JSON.stringify(PostMessageStar.seenByExpert));

                    }

                    if (postMessage.voteRank) {
                        PostMessageStar.voteRank = postMessage.voteRank;
                        //console.log("setting voteRank PostMessageStar: " + JSON.stringify(PostMessageStar.voteRank));

                    }

                    if (postMessage.numberOfUpVotes) {
                        PostMessageStar.numberOfUpVotes = postMessage.numberOfUpVotes;
                        console.log("setting numberOfUpVotes PostMessageStar: " + JSON.stringify(PostMessageStar.numberOfUpVotes));

                    }


                    if (postMessage.numberOfDownVotes) {
                        PostMessageStar.numberOfDownVotes = postMessage.numberOfDownVotes;
                        //console.log("setting numberOfDownVotes PostMessageStar: " + JSON.stringify(PostMessageStar.numberOfDownVotes));

                    }

                    if (postMessage.postMessageVoteCount) {
                        PostMessageStar.postMessageVoteCount = postMessage.postMessageVoteCount;
                        //console.log("setting postMessageVoteCount PostMessageStar: " + JSON.stringify(PostMessageStar.postMessageVoteCount));

                    }



                } else if (postMessage.type === 'comment') {

                    //console.log("it's a comment!: " + JSON.stringify(postMessage.type));

                    if (postMessage.likedCount) {

                        PostMessageStar.likedCount = postMessage.likedCount;
                        //console.log("setting likesCount PostMessageStar: i" + JSON.stringify(PostMessageStar.likedCount));
                    }

                }

                let postMessageObjectID = postMessage.objectId + '-0';

                PostMessageStar.objectID = postMessageObjectID;
                PostMessageStar._tags = tags;
                PostMessageStar.PostMessageSocial = null;

                //console.log("PostMessageStar with * tag: " + JSON.stringify(PostMessageStar));


            }

            //console.log("starting PostMessageStar async.map");


            async.map(postMessageSocialResults, function (postMessageSocialResult, cb) {

                //console.log("postSocialResults.length: " + JSON.stringify(postSocialResults.length));
                let POSTMESSAGEUSER = Parse.Object.extend("PostMessage");
                let PostMessageUser = new POSTMESSAGEUSER();
                PostMessageUser.id = postMessage.objectId;

                let USER = Parse.Object.extend("_User");
                let UserResult = new USER();
                UserResult.id = postMessageSocialResult.get("user").id;

                PostMessageUser = PostMessageUser.toJSON();

                if (postMessage.workspace) {
                    PostMessageUser.workspace = postMessage.workspace;
                    //console.log("setting workspace PostMessageUser: " + JSON.stringify(PostMessageUser.workspace));

                }

                if (postMessage.channel) {
                    PostMessageUser.channel = postMessage.channel;
                    //console.log("setting channel PostMessageUser: " + JSON.stringify(PostMessageUser.channel));

                }

                if (postMessage.post) {
                    PostMessageUser.post = postMessage.post;
                    //console.log("setting post PostMessageUser: " + JSON.stringify(PostMessageUser.post));

                }

                if (postMessage.user) {
                    PostMessageUser.user = postMessage.user;
                    //console.log("setting user PostMessageUser: " + JSON.stringify(PostMessageUser.user));

                }

                if (postMessage.archive === true || postMessage.archive === false) {
                    PostMessageUser.archive = postMessage.archive;
                    //console.log("setting archive PostMessageUser: " + JSON.stringify(PostMessageUser.archive));

                }

                if (postMessage.hashtags) {
                    PostMessageUser.hashtags = postMessage.hashtags;
                    //console.log("setting hashtags PostMessageUser: " + JSON.stringify(PostMessageUser.hashtags));

                }

                if (postMessage.mentions) {
                    PostMessageUser.mentions = postMessage.mentions;
                    //console.log("setting mentions PostMessageUser: " + JSON.stringify(PostMessageUser.mentions));

                }


                if (postMessage.type) {
                    PostMessageUser.type = postMessage.type;
                    //console.log("setting type PostMessageUser: " + JSON.stringify(PostMessageUser.type));

                }

                if (postMessage.mediaType) {
                    PostMessageUser.mediaType = postMessage.mediaType;
                    //console.log("setting mediaType PostMessageUser: " + JSON.stringify(PostMessageUser.mediaType));

                }

                if (postMessage.ACL) {
                    PostMessageUser.ACL = postMessage.ACL;
                    //console.log("setting ACL PostMessageUser: " + JSON.stringify(PostMessageUser.ACL));

                }

                if (postMessage.hasURL === true || postMessage.hasURL === false) {

                    PostMessageUser.hasURL = postMessage.hasURL;
                    //console.log("setting hasURL PostMessageUser: " + JSON.stringify(PostMessageUser.hasURL));

                }

                if (postMessage.isIncognito === true || postMessage.isIncognito === false) {
                    PostMessageUser.isIncognito = postMessage.isIncognito;
                    //console.log("setting isIncognito PostMessageUser: " + JSON.stringify(PostMessageUser.isIncognito));

                }


                if (postMessage.message) {
                    PostMessageUser.message = postMessage.message;
                    //console.log("setting message PostMessageUser: " + JSON.stringify(PostMessageUser.message));

                }
                if (postMessage.updatedAt) {
                    PostMessageUser.updatedAt = postMessage.updatedAt;
                    //console.log("setting updatedAt PostMessageUser: " + JSON.stringify(PostMessageUser.updatedAt));
                }
                if (postMessage.createdAt) {

                    PostMessageUser.createdAt = postMessage.createdAt;
                    //console.log("setting createdAt PostMessageUser: " + JSON.stringify(PostMessageUser.createdAt));
                }

                if (postMessage.video) {

                    PostMessageUser.video = postMessage.video;
                    //console.log("setting video PostMessageUser: " + JSON.stringify(PostMessageUser.video));

                }

                if (postMessage.thumbnailRatio) {

                    PostMessageUser.thumbnailRatio = postMessage.thumbnailRatio;
                    //console.log("setting thumbnailRatio PostMessageUser: " + JSON.stringify(PostMessageUser.thumbnailRatio));
                }

                if (postMessage.file) {

                    PostMessageUser.file = postMessage.file;
                    //console.log("setting file PostMessageUser: " + JSON.stringify(PostMessageUser.file));
                }
                if (postMessage.image) {
                    PostMessageUser.image = postMessage.image;
                    //console.log("setting image PostMessageUser: " + JSON.stringify(PostMessageUser.image));
                }
                if (postMessage.audio) {
                    PostMessageUser.audio = postMessage.audio;
                    //console.log("setting audio PostMessageUser: " + JSON.stringify(PostMessageUser.audio));
                }

                if (postMessage.audioWave) {
                    PostMessageUser.audioWave = postMessage.audioWave;
                    //console.log("setting audioWave PostMessageUser: " + JSON.stringify(PostMessageUser.audioWave));
                }

                if (postMessage.imageRatio) {
                    PostMessageUser.imageRatio = postMessage.imageRatio;
                    //console.log("setting imageRatio PostMessageUser: " + JSON.stringify(PostMessageUser.imageRatio));
                }

                if (postMessage.mediaDuration) {
                    PostMessageUser.mediaDuration = postMessage.mediaDuration;
                    //console.log("setting mediaDuration PostMessageUser: " + JSON.stringify(PostMessageUser.mediaDuration));
                }

                if (postMessage.video_thumbnail) {
                    PostMessageUser.video_thumbnail = postMessage.video_thumbnail;
                    //console.log("setting video_thumbnail PostMessageUser: " + JSON.stringify(PostMessageUser.video_thumbnail));
                }

                if (postMessage.parentPostMessage) {
                    PostMessageUser.parentPostMessage = postMessage.parentPostMessage;

                    PostMessageUser.parentPostMessage.user = parentPostMessageUser;

                    if (postMessage.type === 'question') {

                        PostMessageUser.parentPostMessage.topAnswerForQuestionPostMessage = topAnswerForQuestionPostMessage;
                    }

                    console.log("setting parentPostMessage PostMessageUser: " + JSON.stringify(PostMessageUser.parentPostMessage));
                }

                if (postMessage.postMessageSocialCount) {
                    PostMessageUser.postMessageSocialCount = postMessage.postMessageSocialCount;
                    //console.log("setting postMessageSocialCount PostMessageUser: " + JSON.stringify(PostMessageUser.postMessageSocialCount));
                }

                if (postMessage.childPostMessageCount) {
                    PostMessageUser.childPostMessageCount = postMessage.childPostMessageCount;
                    //console.log("setting childPostMessageCount PostMessageUser: " + JSON.stringify(PostMessageUser.childPostMessageCount));
                }

                if (postMessage.postMessageReadStatusCount) {
                    PostMessageUser.postMessageReadStatusCount = postMessage.postMessageReadStatusCount;
                    //console.log("setting postMessageReadStatusCount PostMessageUser: " + JSON.stringify(PostMessageUser.postMessageReadStatusCount));
                }



                if (postMessage.type === 'question') {

                    if (postMessage.likedCount) {

                        PostMessageUser.likedCount = postMessage.likedCount;
                        //console.log("setting likesCount PostMessageUser: i" + JSON.stringify(PostMessageUser.likedCount));
                    }

                    //console.log("postMessageSocialResult pre: " + JSON.stringify(postMessageSocialResult));

                    postMessageSocialResult = simplifyPostMessageSocialQuestion(postMessageSocialResult);

                    //console.log("postMessageSocialResult post: " + JSON.stringify(postMessageSocialResult));



                } else  if (postMessage.type === 'answer') {

                    if (postMessage.upVotedByExpert === true || postMessage.upVotedByExpert === false) {
                        PostMessageUser.upVotedByExpert = postMessage.upVotedByExpert;
                        //console.log("setting upVotedByExpert PostMessageUser: " + JSON.stringify(PostMessageUser.upVotedByExpert));

                    }

                    if (postMessage.seenByExpert === true || postMessage.seenByExpert === false) {
                        PostMessageUser.seenByExpert = postMessage.seenByExpert;
                        //console.log("setting seenByExpert PostMessageUser: " + JSON.stringify(PostMessageUser.seenByExpert));

                    }

                    if (postMessage.voteRank) {
                        PostMessageUser.voteRank = postMessage.voteRank;
                        //console.log("setting voteRank PostMessageUser: " + JSON.stringify(PostMessageUser.voteRank));

                    }

                    if (postMessage.numberOfUpVotes) {
                        PostMessageUser.numberOfUpVotes = postMessage.numberOfUpVotes;
                        //console.log("setting numberOfUpVotes PostMessageUser: " + JSON.stringify(PostMessageUser.numberOfUpVotes));

                    }


                    if (postMessage.numberOfDownVotes) {
                        PostMessageUser.numberOfDownVotes = postMessage.numberOfDownVotes;
                        //console.log("setting numberOfDownVotes PostMessageUser: " + JSON.stringify(PostMessageUser.numberOfDownVotes));

                    }

                    if (postMessage.postMessageVoteCount) {
                        PostMessageUser.postMessageVoteCount = postMessage.postMessageVoteCount;
                        //console.log("setting postMessageVoteCount PostMessageUser: " + JSON.stringify(PostMessageUser.postMessageVoteCount));

                    }

                    //console.log("postMessageSocialResult pre: " + JSON.stringify(postMessageSocialResult));


                    postMessageSocialResult = simplifyPostMessageSocialAnswer(postMessageSocialResult);

                    //console.log("postMessageSocialResult post: " + JSON.stringify(postMessageSocialResult));




                } else if (postMessage.type === 'comment') {

                    //console.log("it's a comment!: " + JSON.stringify(postMessage.type));

                    if (postMessage.likedCount) {

                        PostMessageUser.likedCount = postMessage.likedCount;
                        //console.log("setting likesCount PostMessageUser: i" + JSON.stringify(PostMessageUser.likedCount));
                    }

                    //console.log("postMessageSocialResult pre: " + JSON.stringify(postMessageSocialResult));


                    postMessageSocialResult = simplifyPostMessageSocialQuestion(postMessageSocialResult);

                    //console.log("postMessageSocialResult post: " + JSON.stringify(postMessageSocialResult));



                }



                //console.log("postMessageSocialResult UserResult: " + JSON.stringify(UserResult));


                let tagUser = [];

                tagUser.push(UserResult.id);


                let postObjectID = postMessage.objectId + '-' + UserResult.id;


                PostMessageUser.objectID = postObjectID;
                PostMessageUser._tags = tagUser;
                PostMessageUser.PostMessageSocial = postMessageSocialResult;



                //console.log("postMessage splitObjectAndIndex object: " + JSON.stringify(PostMessageUser));

                postMessageSocialResult = PostMessageUser;

                return cb (null, postMessageSocialResult);


            }, function (err, postMessageSocialResults) {

                //console.log("postMessageSocialResults length: " + JSON.stringify(postMessageSocialResults.length));

                if (err) {
                    return response.error(err);
                } else {

                    if (count === 0 ) {

                        //console.log("postMessageSocialResults: " + JSON.stringify(postMessageSocialResults));


                        //postQuestionMessagesSocialResult = postQuestionMessagesSocialResult.push(JSON.parse(post_zero));

                        postMessageSocialResults.push(PostMessageStar);


                        //console.log("postMessageSocialResults add: asd " + JSON.stringify(postMessageSocialResults));

                    }

                    if (postMessageSocialResults.length > 0) {

                        //console.log("postMessageSocialResults.length adsf: " + JSON.stringify(postMessageSocialResults.length));

                        indexPostMessage.saveObjects(postMessageSocialResults, true, function(err, content) {
                            if (err) {
                                return response.error(err);
                            }

                            //console.log("content: " + JSON.stringify(content));



                        });

                        console.log("Parse<>Algolia dev_postMessages saved from splitPosMessageAndIndex function ");

                        let beforeSaveElse_Time = process.hrtime(time);
                        console.log(`beforeSaveElse_Time splitPosMessageAndIndex took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                        response.success();



                    }

                    else {

                        return response.error(err);

                    }

                }

            });

        }
        else {

            if (count === 0) {

                let tags = ['*'];

                //console.log("::starting postMessangeSocialQuery no result on postMessageSocial::");

                // let's create a post in algolia with tags = * for any user who doesn't already have postSocial to view it

                let postMessageObjectID = postMessage.objectId + '-0';

                postMessage.objectID = postMessageObjectID;
                postMessage._tags = tags;
                postMessage.PostMessageSocial = null;

                postMessage.parentPostMessage.user = parentPostMessageUser;

                if (postMessage.type === 'question') {

                    postMessage.parentPostMessage.topAnswerForQuestionPostMessage = topAnswerForQuestionPostMessage;
                }

                //console.log("postMessage with * tag: " + JSON.stringify(postMessage));


                indexPostMessage.saveObject(postMessage, true, function(err, content) {
                    if (err) {
                        return response.error(err);
                    }

                    //console.log("content: " + JSON.stringify(content));



                });

                console.log("Parse<>Algolia dev_postMessages saved from splitPosMessageAndIndex function ");

                let beforeSaveElse_Time = process.hrtime(time);
                console.log(`beforeSaveElse_Time splitPosMessageAndIndex took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                response.success();




            } else {

                return response.success();
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

function splitWorkspaceAndIndex (request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    var loop = request['loop'];
    console.log("loop: " + JSON.stringify(loop));

    let user = request['user'];
    //console.log("splitPostAndIndex user: " + JSON.stringify(user));
    //console.log("::Starting splitPostMessageAndIndex:: " + JSON.stringify(request));

    let workspace = request['object'];
    //console.log("postMessage: " + JSON.stringify(postMessage));

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let Workspace = new WORKSPACE();
    Workspace.id = workspace.objectId;
    // note object needs to be toJSON()
    //console.log("PostMessage: " + JSON.stringify(PostMessage));

    let count = (request['count'])? request['count'] : 0;
    //console.log("count: " + JSON.stringify(count));

    let workspaceFollowerQuery = new Parse.Query("workspace_follower");

    workspaceFollowerQuery.equalTo('workspace', Workspace);

    workspaceFollowerQuery.limit(10000);

    workspaceFollowerQuery.skip(count);

    workspaceFollowerQuery.find({
        useMasterKey: true
        //sessionToken: sessionToken
    }).then((workspaceFollowerResults) => {

        //console.log("postMessageSocialResults.length: " + JSON.stringify(postMessageSocialResults));

        if (workspaceFollowerResults.length > 0) {

            //console.log("starting postMessageSocialQuery");

            if (count === 0 ) {

                // let's create a post in algolia with tags = * for any user who doesn't already have postSocial to view it

                //console.log("className: " + JSON.stringify(className));
                let WORKSPACERSTAR = Parse.Object.extend("WorkSpace");
                var WorkspaceStar = new WORKSPACERSTAR();
                WorkspaceStar.id = workspace.objectId;
                console.log("workspace: " + JSON.stringify(WorkspaceStar.id));

                WorkspaceStar = WorkspaceStar.toJSON();

                workspace.followers = [  ];
                let tags = [];

                if (workspace.type === 'public') {

                    tags.push("*");
                } else if (workspace.type === 'private') {

                    tags.push(workspace.objectId);
                }

                if (workspace.archive === true || workspace.archive === false ) {
                    WorkspaceStar.archive = workspace.archive;
                    //console.log("setting wWorkspaceStar.archive: " + JSON.stringify(WorkspaceStar.archive));

                }

                if (workspace.workspace_name) {
                    WorkspaceStar.workspace_name = workspace.workspace_name;
                    //console.log("setting WorkspaceStar.workspace_name: " + JSON.stringify(WorkspaceStar.workspace_name));

                }

                if (workspace.workspace_url) {
                    WorkspaceStar.workspace_url = workspace.workspace_url;
                    //console.log("setting WorkspaceStar.workspace_url : " + JSON.stringify(WorkspaceStar.workspace_url ));

                }


                if (workspace.mission) {
                    WorkspaceStar.mission = workspace.mission;
                    //console.log("setting WorkspaceStar.mission: " + JSON.stringify(WorkspaceStar.mission));

                }

                if (workspace.description) {
                    WorkspaceStar.description = workspace.description;
                    //console.log("setting WorkspaceStar.mission: " + JSON.stringify(WorkspaceStar.mission));

                }

                if (workspace.memberCount) {
                    WorkspaceStar.memberCount = workspace.memberCount;
                    //console.log("setting WorkspaceStar.mission: " + JSON.stringify(WorkspaceStar.mission));

                }

                if (workspace.followerCount) {
                    WorkspaceStar.followerCount = workspace.followerCount;
                    //console.log("setting WorkspaceStar.mission: " + JSON.stringify(WorkspaceStar.mission));

                }

                if (workspace.skills) {
                    WorkspaceStar.skills = workspace.skills;
                    //console.log("setting WorkspaceStar.skills : " + JSON.stringify(WorkspaceStar.skills ));

                }

                if (workspace.experts) {
                    WorkspaceStar.experts = workspace.experts;
                    //console.log("setting WorkspaceStar.experts: " + JSON.stringify(WorkspaceStar.experts));

                }

                if (workspace.image) {
                    WorkspaceStar.image = workspace.image;
                    //console.log("setting WorkspaceStar.image: " + JSON.stringify(WorkspaceStar.image));

                }


                if (workspace.type) {
                    WorkspaceStar.type = workspace.type;
                    //console.log("setting WorkspaceStar.type: " + JSON.stringify(WorkspaceStar.type));

                }

                if (workspace.updatedAt) {
                    WorkspaceStar.updatedAt = workspace.updatedAt;
                    //console.log("setting uWorkspaceStar.updatedAt: " + JSON.stringify(WorkspaceStar.updatedAt));
                }
                if (workspace.createdAt) {

                    WorkspaceStar.createdAt = workspace.createdAt;
                    //console.log("setting WorkspaceStar.createdAt: " + JSON.stringify(WorkspaceStar.createdAt));
                }

                let workspaceObjectID = workspace.objectId + '-0';

                WorkspaceStar.objectID = workspaceObjectID;
                WorkspaceStar._tags = tags;

                //console.log("WorkspaceStar with * tag: " + JSON.stringify(WorkspaceStar));


            }

            //console.log("starting PostMessageStar async.map");


            async.map(workspaceFollowerResults, function (workspaceFollowerResult, cb) {

                //console.log("postSocialResults.length: " + JSON.stringify(postSocialResults.length));
                let WORKSPACEUSER = Parse.Object.extend("WorkSpace");
                let WorkspaceUser = new WORKSPACEUSER();
                WorkspaceUser.id = workspace.objectId;

                let USER = Parse.Object.extend("_User");
                let UserResult = new USER();
                UserResult.id = workspaceFollowerResult.get("user").id;

                WorkspaceUser = WorkspaceUser.toJSON();

                if (workspace.archive === true || workspace.archive === false ) {
                    WorkspaceUser.archive = workspace.archive;
                    //console.log("setting wWorkspaceStar.archive: " + JSON.stringify(WorkspaceStar.archive));

                }

                if (workspace.workspace_name) {
                    WorkspaceUser.workspace_name = workspace.workspace_name;
                    //console.log("setting WorkspaceStar.workspace_name: " + JSON.stringify(WorkspaceStar.workspace_name));

                }

                if (workspace.workspace_url) {
                    WorkspaceUser.workspace_url = workspace.workspace_url;
                    //console.log("setting WorkspaceStar.workspace_url : " + JSON.stringify(WorkspaceStar.workspace_url ));

                }


                if (workspace.mission) {
                    WorkspaceUser.mission = workspace.mission;
                    //console.log("setting WorkspaceStar.mission: " + JSON.stringify(WorkspaceStar.mission));

                }

                if (workspace.description) {
                    WorkspaceUser.description = workspace.description;
                    //console.log("setting WorkspaceStar.mission: " + JSON.stringify(WorkspaceStar.mission));

                }

                if (workspace.memberCount) {
                    WorkspaceUser.memberCount = workspace.memberCount;
                    //console.log("setting WorkspaceStar.mission: " + JSON.stringify(WorkspaceStar.mission));

                }

                if (workspace.followerCount) {
                    WorkspaceUser.followerCount = workspace.followerCount;
                    //console.log("setting WorkspaceStar.mission: " + JSON.stringify(WorkspaceStar.mission));

                }

                if (workspace.skills) {
                    WorkspaceUser.skills = workspace.skills;
                    //console.log("setting WorkspaceStar.skills : " + JSON.stringify(WorkspaceStar.skills ));

                }

                if (workspace.experts) {
                    WorkspaceUser.experts = workspace.experts;
                    //console.log("setting WorkspaceStar.experts: " + JSON.stringify(WorkspaceStar.experts));

                }

                if (workspace.image) {
                    WorkspaceUser.image = workspace.image;
                    //console.log("setting WorkspaceStar.image: " + JSON.stringify(WorkspaceStar.image));

                }


                if (workspace.type) {
                    WorkspaceUser.type = workspace.type;
                    //console.log("setting WorkspaceStar.type: " + JSON.stringify(WorkspaceStar.type));

                }

                if (workspace.updatedAt) {
                    WorkspaceUser.updatedAt = workspace.updatedAt;
                    //console.log("setting uWorkspaceStar.updatedAt: " + JSON.stringify(WorkspaceStar.updatedAt));
                }
                if (workspace.createdAt) {

                    WorkspaceUser.createdAt = workspace.createdAt;
                    //console.log("setting WorkspaceStar.createdAt: " + JSON.stringify(WorkspaceStar.createdAt));
                }

                let tagUser = [];

                tagUser.push(UserResult.id);


                let workspaceObjectID = workspace.objectId + '-' + UserResult.id;


                WorkspaceUser.objectID = workspaceObjectID;
                WorkspaceUser._tags = tagUser;

                workspaceFollowerResult = simplifyWorkspaceFollowersUserIndex(workspaceFollowerResult);
                WorkspaceUser.followers = [ workspaceFollowerResult ];


                //console.log("postMessage splitObjectAndIndex object: " + JSON.stringify(PostMessageUser));

                workspaceFollowerResult = WorkspaceUser;

                return cb (null, workspaceFollowerResult);


            }, function (err, workspaceFollowResults) {

                //console.log("postMessageSocialResults length: " + JSON.stringify(postMessageSocialResults.length));

                if (err) {
                    return response.error(err);
                } else {

                    if (count === 0 ) {

                        //console.log("postMessageSocialResults: " + JSON.stringify(postMessageSocialResults));


                        //postQuestionMessagesSocialResult = postQuestionMessagesSocialResult.push(JSON.parse(post_zero));

                        workspaceFollowResults.push(WorkspaceStar);


                        //console.log("postMessageSocialResults add: asd " + JSON.stringify(postMessageSocialResults));

                    }

                    if (workspaceFollowResults.length > 0) {

                        //console.log("postMessageSocialResults.length adsf: " + JSON.stringify(postMessageSocialResults.length));

                        indexWorkspaces.saveObjects(workspaceFollowResults, true, function(err, content) {
                            if (err) {
                                return response.error(err);
                            }

                            //console.log("content: " + JSON.stringify(content));



                        });

                        console.log("Parse<>Algolia prod_workspaces saved from splitWorkspaceAndIndex function ");

                        let beforeSaveElse_Time = process.hrtime(time);
                        console.log(`beforeSaveElse_Time splitWorkspaceAndIndex took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                        response.success();



                    }

                    else {

                        return response.error(err);

                    }

                }

            });

        }
        else {

            if (count === 0) {

                let tags = [ ];

                if (workspace.type === 'public') {

                    tags = ['*'];
                } else if (workspace.type === 'private') {

                    tags = [workspace.objectId ];
                }

                //console.log("::starting postMessangeSocialQuery no result on postMessageSocial::");

                // let's create a post in algolia with tags = * for any user who doesn't already have postSocial to view it

                let workspaceObjectID = workspace.objectId + '-0';

                workspace.objectID = workspaceObjectID;
                workspace._tags = tags;
                workspace.followers = [ ];

                //console.log("postMessage with * tag: " + JSON.stringify(postMessage));


                indexWorkspaces.saveObject(workspace, true, function(err, content) {
                    if (err) {
                        return response.error(err);
                    }

                    //console.log("content: " + JSON.stringify(content));



                });

                console.log("Parse<>Algolia prod_workspaces saved from splitWorkspaceAndIndex function ");

                let beforeSaveElse_Time = process.hrtime(time);
                console.log(`beforeSaveElse_Time splitWorkspaceAndIndex took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1]) * MS_PER_NS} milliseconds`);

                response.success();




            } else {

                return response.success();
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


// Parse Server version > 3.0.0
async function splitUserAndIndex (request) {

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

    let USER = Parse.Object.extend("_User");


    const finalWorkspaces = await async.forEachSeries(workspaceFollowers, async function (workspaceFollower) {

        let WORKSPACE = Parse.Object.extend("WorkSpace");
        let workspace = new WORKSPACE();
        workspace.id = workspaceFollower.get("workspace").id;
        //console.log("workspace: " + JSON.stringify(workspace));

        //console.log("indexOf async.map: " + JSON.stringify(workspaceFollowers.indexOf(workspaceFollower)));

        let async_map_index = workspaceFollowers.indexOf(workspaceFollower);

        var userObject = workspaceFollowers[async_map_index].get("user");
        //console.log("userObject: " + JSON.stringify(userObject));
        let UserObject = new USER();
        UserObject.id = userObject.id;

        let queryRole = new Parse.Query(Parse.Role);

        let rolesArray;

        async function getChannelFollow () {

            let CHANNELFOLLOW = Parse.Object.extend("ChannelFollow");
            let queryChannelFollow = new Parse.Query(CHANNELFOLLOW);

            queryChannelFollow.equalTo("workspace", workspace);
            queryChannelFollow.equalTo("isFollower", true);
            queryChannelFollow.equalTo("user", UserObject);

            const channelFollowers = await queryChannelFollow.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            return channelFollowers;

        }

        const results = await getChannelFollow();

        if (results.length > 0) {

            let ChannelFollows = results[0];

            if (ChannelFollows) {

                const finalChannelFollowers = await async.forEachSeries(ChannelFollows, async function (channelFollowObject) {

                    //let newObjectToSave = objectToSave;

                    let channelFollowWorkspaceId = channelFollowObject.get("workspace").id;
                    let channelFollowChannelId = channelFollowObject.get("channel").id;
                    let channelFollowWorkspace = channelFollowObject.get("workspace");
                    let channelFollowClassName = channelFollowObject.get("className");
                    let channelFollowObjectId = channelFollowObject.id;

                    channelFollowObject = objectToSave;

                    channelFollowObject.objectID = object.objectId + '-' + channelFollowWorkspaceId + '-' + channelFollowChannelId;

                    //console.log("channelFollowObject.objectID: " + JSON.stringify(channelFollowObject.objectID));

                    channelFollowObject.channel = channelFollowChannelId;
                    channelFollowObject.workspace = channelFollowWorkspaceId;

                    let tags = ["*"];
                    tags.push(userObject.id);

                    channelFollowObject._tags = tags;

                    let userRoles = userObject.get("roles");

                    //console.log('userRoles: ' + JSON.stringify(userRoles));

                    queryRole = userRoles.query();

                    queryRole.equalTo('workspace', channelFollowWorkspace);

                    queryRole.limit(10);

                    const roles = await queryRole.find({

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        throw new Error(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                    rolesArray = roles;

                    if (roles.length > 0) {

                        channelFollowObject.roles = rolesArray;
                        //console.log("userObject.id: " + JSON.stringify(userObject.id));


                        indexUsers.partialUpdateObject(channelFollowObject, {
                            createIfNotExists: true
                        }).then(({ objectID }) => {

                            console.log("Parse<>Algolia object saved from _User afterSave function: " + JSON.stringify(objectID));

                        });

                        return channelFollowObject;


                    }
                    else {

                        console.error("User doesn't have any roles, function splitUserAndIndex function.");

                        // this case is when a user is following a workspace but for some reason there is no roles assigned to this user so return empty roles.
                        let tags = ["*"];

                        channelFollowObject.roles = [];
                        //console.log("userObject.id: " + JSON.stringify(userObject.id));

                        tags.push(userObject.id);
                        // todo need to push unique items now we are doing duplicate item pushes.

                        channelFollowObject._tags = tags;

                        //console.log("channelFollowObject.objectId: " + JSON.stringify(channelFollowObject.objectId));
                        indexUsers.partialUpdateObject(channelFollowObject, {
                            createIfNotExists: true
                        }).then(({ objectID }) => {

                            console.log("Parse<>Algolia object saved from _User afterSave function: " + JSON.stringify(objectID));


                        });

                        return channelFollowObject;


                    }


                });

                console.log("finalChannelFollowers: " + JSON.stringify(finalChannelFollowers));

                return workspaceFollower;


            }
            else {

                // ChannelFollow doesn't exist, user doesn't have any channels followed.

                let newObjectToSave = objectToSave;


                newObjectToSave.objectID = object.objectId + '-' + '0';

                let tags = ["*"];
                tags.push(userObject.id);

                newObjectToSave._tags = tags;

                let userRoles = userObject.get("roles");

                //console.log('userRoles: ' + JSON.stringify(userRoles));

                queryRole = userRoles.query();

                queryRole.equalTo('workspace', workspace);

                queryRole.limit(10);

                const roles = await queryRole.find({

                    useMasterKey: true
                    //sessionToken: sessionToken

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    throw new Error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                rolesArray = roles;

                if (roles.length > 0) {

                    newObjectToSave.roles = rolesArray;
                    //console.log("userObject.id: " + JSON.stringify(userObject.id));


                    //console.log("newObjectToSave.objectId: " + JSON.stringify(newObjectToSave.objectId));

                    indexUsers.partialUpdateObject(newObjectToSave, {
                        createIfNotExists: true
                    }).then(({ objectID }) => {

                        console.log("Parse<>Algolia object saved from _User afterSave function: " + JSON.stringify(objectID));


                    });

                    return workspaceFollower;




                } else {

                    console.error("User doesn't have any roles, function splitUserAndIndex function.");


                    newObjectToSave.roles = [];
                    //console.log("userObject.id: " + JSON.stringify(userObject.id));

                    //console.log("newObjectToSave.objectId: " + JSON.stringify(newObjectToSave.objectId));

                    indexUsers.partialUpdateObject(newObjectToSave, {
                        createIfNotExists: true
                    }).then(({ objectID }) => {

                        console.log("Parse<>Algolia object saved from _User afterSave function: " + JSON.stringify(objectID));


                    });

                    return workspaceFollower;
                }



            }


        }
        else {

            console.error("User doesn't have any roles assigned or no channel follows.");

            let newObjectToSave = objectToSave;

            newObjectToSave.objectID = object.objectId + '-' + '0';

            let tags = ["*"];
            tags.push(userObject.id);

            newObjectToSave._tags = tags;

            indexUsers.partialUpdateObject(newObjectToSave, {
                createIfNotExists: true
            }).then(({ objectID }) => {

                console.log("Parse<>Algolia object saved from _User afterSave function: " + JSON.stringify(objectID));


            });

            return workspaceFollower;

        }


    });

    let Final_Time = process.hrtime(time);
    console.log(`splitUserAndIndex took ${(Final_Time[0] * NS_PER_SEC + Final_Time[1]) * MS_PER_NS} milliseconds`);

}


// auto-add type when isBookmarked, isLiked or Comment is added
Parse.Cloud.beforeSave('PostSocial', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    //console.log("beforeSave PostSocial request: " + JSON.stringify(request));

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
        postSocial.set("isNew", true);

        if (!postSocial.get("channel")) {
            return response.error("Channel is required.");
        }
        if (!postSocial.get("user")) {
            return response.error("User is required field.");
        }
        if (!postSocial.get("workspace")) {
            return response.error("Workspace is required.");
        }
        if (!postSocial.get("post")) {
            return response.error("Post is required.");
        }



        let POST = Parse.Object.extend("Post");
        let Post = new POST();
        Post.id = postSocial.get("post").id;

        let USER = Parse.Object.extend("_User");
        let User = new USER();
        User.id = postSocial.get("user").id;

        let postSocialQuery = new Parse.Query("PostSocial");

        postSocialQuery.equalTo("user", User);
        postSocialQuery.equalTo("post", Post);
        //postSocialQuery.include(["user", "workspace", "channel"]);

        // check to make sure that the postSocial is unique
        postSocialQuery.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((postSocialResult) => {
            // The object was retrieved successfully.

            //console.log("beforeSave PostSocial postSocialResult: " + JSON.stringify(postSocialResult));

            if (postSocialResult) {

                //postSocial already exists in db, return an error because it needs to be unique
                console.log("postSocial already exists in db, return an error because it needs to be unique");
                return response.error(postSocialResult);

            } else {

                console.log("setting defaults for beforeSave postSocial");

                console.log("archive: " + JSON.stringify(postSocial.get("archive")));

                if (!postSocial.get("isLiked")) {
                    postSocial.set("isLiked", false);
                }
                if (!postSocial.get("isBookmarked")) {
                    postSocial.set("isBookmarked", false);
                }
                if (!postSocial.get("archive")) {
                    postSocial.set("archive", false);
                }
                if (!postSocial.get("isDelivered")) {
                    postSocial.set("isDelivered", false);
                }
                if (!postSocial.get("hasRead")) {
                    postSocial.set("hasRead", false);
                }

                if (!postSocial.get("postIsNew")) {
                    postSocial.set("postIsNew", false);
                }

                if (!postSocial.get("isExpanded")) {
                    postSocial.set("isExpanded", false);
                }

                let diff = process.hrtime(time);
                console.log(`beforeSave PostSocial took ${(diff[0] * NS_PER_SEC + diff[1])  * MS_PER_NS} milliseconds`);

                return response.success();


            }


        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            //console.log("channelFollowQuery not found");
            return response.error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });


    } else {

        postSocial.set("isNew", false);

        if (postSocial.get("isLiked") === true || postSocial.get("isLiked") === true ) {

            if (!postSocial.get("isDelivered")) {

                postSocial.set("isDelivered", true);

            }

            if (!postSocial.get("hasRead")) {

                postSocial.set("hasRead", true);

            }


        }

        let diff = process.hrtime(time);
        console.log(`beforeSave PostSocial took ${(diff[0] * NS_PER_SEC + diff[1])  * MS_PER_NS} milliseconds`);
        return response.success();
    }



});

// Create relationship from post to PostSocial after a PostSocial is saved
Parse.Cloud.afterSave('PostSocial', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    //console.log("currentUser afterSave PostSocial: " + JSON.stringify(currentUser));
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
    post.id = postSocial.get("post").id;

    //console.log("request afterDelete Post: " + JSON.stringify(request));

    let USER = Parse.Object.extend("_User");
    let owner = new USER();
    owner.id = postSocial.get("user") ? postSocial.get("user").id : currentUser.id;
    //console.log("afterSave PostSocial owner: " + JSON.stringify(owner));

    let queryPost = new Parse.Query(POST);
    queryPost.include( ["user", "workspace", "channel"] );
    //queryPost.select(["user", "ACL", "media_duration", "postImage", "post_File", "audioWave", "archive", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url", "channel.name", "channel.type", "channel.archive", "post_title", "questionAnswerEnabled" /*,"transcript"*/]);
    queryPost.equalTo("objectId", post.id);

    let isPostNew = postSocial.get("postIsNew")? postSocial.get("postIsNew") : false;
    let isNew = postSocial.get("isNew")? postSocial.get("isNew") : false;

    function incrementPostSocialCount(cb) {


        if (isPostNew === true && isNew === true) {

            // We are creating a new post and already created a post Social no need to index since we already indexed previously when creating post!

            return cb (null, postSocial);


        }
        else if (isPostNew === false && isNew === true) {

            post.increment("postSocialCount");
            let relation = post.relation("postSocial");
            //console.log("beforeAdd: " + JSON.stringify(relation));

            relation.add(postSocial);
            //console.log("afterAdd: " + JSON.stringify(relation));

            if (postSocial.get("isLiked") === true) {

                post.increment("likesCount");
            }

            post.save(null, {

                //useMasterKey: true,
                sessionToken: sessionToken

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

                //useMasterKey: true
                sessionToken: sessionToken

            });

        }
        else if (isPostNew === false && isNew === false) {

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

            }
            else if (originalPostSocial.get("isLiked") === true && postSocial.get("isLiked") === false) {

                // decrement likesCount for post
                post.increment("likesCount", -1);

                post.save(null, {

                    //useMasterKey: true,
                    sessionToken: sessionToken

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

                    //useMasterKey: true
                    sessionToken: sessionToken

                });

            }
            else if (originalPostSocial.get("isLiked") === false && postSocial.get("isLiked") === false) {

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


            }
            else if (originalPostSocial.get("isLiked") === false && postSocial.get("isLiked") === true) {

                // increment likesCount for post
                post.increment("likesCount");

                post.save(null, {

                    //useMasterKey: true,
                    sessionToken: sessionToken

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

                    //useMasterKey: true
                    sessionToken: sessionToken

                });
            }
            else {

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
        else if (isPostNew === true && isNew === false) {

            // We are creating a new post and already created a post Social no need to index since we already indexed previously when creating post!

            return cb (null, postSocial);


        }


    }


    function updatePostsAlgolia1 (PostObject, cb) {

        //console.log("starting updatePostsAlgolia: " + JSON.stringify(Post));

        if (isPostNew === true && isNew === true) {

            // We are creating a new post and already created a post Social no need to index since we already indexed previously when creating post!

            return cb (null, PostObject);


        }
        else if (isPostNew === false && isNew === true) {

            console.log("PostObject: " + JSON.stringify(PostObject));

            PostObject.save(null, {

                //useMasterKey: true
                sessionToken: sessionToken

            }).then((PostSaved) => {
                // The object was retrieved successfully.
                //console.log("Result from get " + JSON.stringify(Workspace));

                //console.log("done PostSaved : " + JSON.stringify(PostSaved));


                return cb (null, PostSaved);


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                return cb(error);
            }, {

                //useMasterKey: true
                sessionToken: sessionToken

            });


        }
        else if (isPostNew === false && isNew === false) {

            console.log("PostObject: " + JSON.stringify(PostObject));

            PostObject.save(null, {

                //useMasterKey: true
                sessionToken: sessionToken

            }).then((PostSaved) => {
                // The object was retrieved successfully.
                //console.log("Result from get " + JSON.stringify(Workspace));

                //console.log("done PostSaved : " + JSON.stringify(PostSaved));


                return cb (null, PostSaved);


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                return cb(error);
            }, {

                //useMasterKey: true
                sessionToken: sessionToken

            });


        }
        else if (isPostNew === true && isNew === false) {

            // We are creating a new post and already created a post Social no need to index since we already indexed previously when creating post!

            return cb (null, PostObject);


        }


    }



    async.waterfall([
        async.apply(incrementPostSocialCount),
        async.apply(updatePostsAlgolia1)


    ], function (err, results) {
        if (err) {
            return response.error(err);
        }

        if (results) {


            let finalTime = process.hrtime(time);
            console.log(`finalTime took afterSave PostSocial ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

            return response.success();


        }

    });



});


Parse.Cloud.beforeSave('Notification', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    //console.log("beforeSave Notification request: " + JSON.stringify(request));

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.beforeSave.Notification.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let notification = request.object;

    if (notification.isNew()) {

        //console.log("isLiked: "+postSocial.get("isLiked"));
        //console.log("isBookmarked: "+postSocial.get("isBookmarked"));
        notification.set("isNew", true);

        if (!notification.get("channel") && ((notification.get("type") === 'post') || (notification.get("type") === 'addToChannel') || (notification.get("type") === 'message') || (notification.get("type") === 'message'))  ) {
            return response.error("Channel is required.");
        }
        if (!notification.get("userFrom")) {
            return response.error("userFrom is required field.");
        }
        if (!notification.get("userTo")) {
            return response.error("userTo is required field.");
        }
        if (!notification.get("workspace")) {
            return response.error("Workspace is required.");
        }
        if (!notification.get("post") && (notification.get("type") === 'post') || notification.get("type") === 'message') {
            return response.error("Post is required.");
        }

        let POSTMESSAGE = Parse.Object.extend("PostMessage");
        let PostMessage = new POSTMESSAGE();

        if (notification.get("postMessage")) {

            PostMessage.id = notification.get("postMessage").id;

        }

        if (notification.get("post")) {

            var POST = Parse.Object.extend("Post");
            var Post = new POST();
            Post.id = notification.get("post").id;

        }

        if (notification.get("channel")) {

            var CHANNEL = Parse.Object.extend("Channel");
            var Channel = new CHANNEL();
            Channel.id = notification.get("channel").id;

        }


        let WORKSPACE = Parse.Object.extend("WorkSpace");
        let Workspace = new WORKSPACE();
        Workspace.id = notification.get("workspace").id;

        let USER = Parse.Object.extend("_User");
        let UserFrom = new USER();
        UserFrom.id = notification.get("userFrom").id;

        let UserTo = new USER();
        UserTo.id = notification.get("userTo").id;

        let notificationQuery = new Parse.Query("Notification");

        notificationQuery.equalTo("userTo", UserTo);
        if (!notification.get("postMessage")) {

            // this is a post level notification

            notificationQuery.equalTo("post", Post);

        } else {
            // this is a postMessage level notification
            notificationQuery.equalTo("postMessage", PostMessage);
        }

        //postSocialQuery.include(["user", "workspace", "channel"]);

        // check to make sure that the postSocial is unique
        notificationQuery.first({

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((notificationResult) => {
            // The object was retrieved successfully.

            //console.log("beforeSave PostSocial postSocialResult: " + JSON.stringify(postSocialResult));

            if (notificationResult) {

                //postSocial already exists in db, return an error because it needs to be unique
                console.error("notification already exists in db, return an error because it needs to be unique");
                return response.error(notificationResult);

            } else {

                //console.log("setting defaults for beforeSave notificationResult");


                if (!notification.get("isDelivered")) {
                    notification.set("isDelivered", false);
                }
                if (!notification.get("hasSent")) {
                    notification.set("hasSent", false);
                }
                if (!notification.get("isRead")) {
                    notification.set("isRead", false);
                }
                if (!notification.get("status")) {
                    notification.set("status", '0');
                }


                function setWorkspaceFollower (callback) {

                    let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");

                    let queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);
                    queryWorkspaceFollower.equalTo("workspace", Workspace);
                    queryWorkspaceFollower.equalTo("user", UserTo);
                    queryWorkspaceFollower.first({
                        useMasterKey: true
                        //sessionToken: sessionToken
                    }).then((WorkspaceFollower) => {

                        if (WorkspaceFollower) {

                            notification.set("workspaceFollower", WorkspaceFollower);

                            return callback(null, WorkspaceFollower);



                        }
                        else {


                            // no workspaceFollowers to delete return
                            return callback(null);

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

                function setChannelFollower (callback) {

                    let CHANNELFOLLOWER = Parse.Object.extend("ChannelFollow");

                    let queryChannelFollower = new Parse.Query(CHANNELFOLLOWER);
                    queryChannelFollower.equalTo("channel", Channel);
                    queryChannelFollower.equalTo("user", UserTo);
                    queryChannelFollower.first({
                        useMasterKey: true
                        //sessionToken: sessionToken
                    }).then((ChannelFollow) => {

                        if (ChannelFollow) {

                            notification.set("channelFollower", ChannelFollow);

                            return callback(null, ChannelFollow);



                        }
                        else {


                            // no workspaceFollowers to delete return
                            return callback(null);

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

                function checkNotificationSettings (callback) {

                    let WORKSPACENOTIFICATIONSETTING = Parse.Object.extend("WorkSpaceNotificationSetting");
                    let queryWorkspaceNotificationSetting = new Parse.Query(WORKSPACENOTIFICATIONSETTING);
                    queryWorkspaceNotificationSetting.equalTo("workspace", Workspace);
                    queryWorkspaceNotificationSetting.equalTo("user", UserTo);

                    //console.log("Request: " + JSON.stringify(request));
                    //console.log("objectID: " + objectToSave.objectId);
                    //console.log("objectID: " + objectToSave.user.objectId);

                    queryWorkspaceNotificationSetting.first({
                        useMasterKey: true
                        //sessionToken: sessionToken
                    }).then((WorkspaceNotificationSetting) => {

                        if (WorkspaceNotificationSetting) {

                            if (WorkspaceNotificationSetting.get("muteWorkspace") === true || WorkspaceNotificationSetting.get("onlyMentionMe") === false) {

                                notification.set("hasSent", true);

                                // don't send device notificcations, set this flag to true

                                return callback (null, WorkspaceNotificationSetting);

                            }  else {


                                // send notifications don't set any flag it's already sends notifications

                                return callback (null, WorkspaceNotificationSetting);


                            }


                        }
                        else {

                            // do nothing send notifications by default to user
                            return callback (null, WorkspaceNotificationSetting);

                        }


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        console.log(error);
                        return callback (error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });


                }

                async.parallel([
                    async.apply(setWorkspaceFollower),
                    async.apply(setChannelFollower),
                    async.apply(checkNotificationSettings)


                ], function (err, results) {
                    if (err) {
                        return response.error(err);
                    }

                    if (results.length > 0) {


                        let finalTime = process.hrtime(time);
                        console.log(`finalTime took beforeSave Notification ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                        return response.success();


                    } else {

                        console.error(`ERROR: no workspaceFollower or channelFollower for beforeSave notifications cloud function `);


                        return response.error();
                    }

                });





            }


        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            //console.log("channelFollowQuery not found");
            return response.error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });


    } else {

        notification.set("isNew", false);

        let diff = process.hrtime(time);
        console.log(`beforeSave notification took ${(diff[0] * NS_PER_SEC + diff[1])  * MS_PER_NS} milliseconds`);
        return response.success();
    }



});


Parse.Cloud.afterSave('Notification', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    console.log("currentUser afterSave Notification: " + JSON.stringify(currentUser));
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.afterSave.Notification.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    //console.log("request afterSave Notification: " + JSON.stringify(request));

    // Get notification object
    let notification = request.object;
    let originalNotification = request.original;

    //console.log("originalNotification: " + JSON.stringify(originalNotification));

    let CHANNEL = Parse.Object.extend("Channel");
    let channel = new CHANNEL();

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();


    let POST = Parse.Object.extend("Post");
    let post = new POST();


    //console.log("request afterDelete Post: " + JSON.stringify(request));

    let USER = Parse.Object.extend("_User");
    let userTo = new USER();


    if (notification.get("isNew") === true) {

        workspace.id = notification.get("workspace").id;
        if (notification.get("post")) {

            post.id = notification.get("post").id;

        }

        if (notification.get("channel")) {

            channel.id = notification.get("channel").id;

        }

        userTo.id = notification.get("userTo").id;

    } else {

        workspace.id = originalNotification.get("workspace").id;

        if (originalNotification.get("post")) {

            post.id = originalNotification.get("post").id;

        }

        if (originalNotification.get("channel")) {

            channel.id = originalNotification.get("channel").id;

        }

        userTo.id = originalNotification.get("userTo").id;


    }


    //console.log("afterSave originalNotification userTo: " + JSON.stringify(userTo));


    function incrementUserNotificationCount(cb) {

        if (notification.get("isNew") === true) {

            userTo.increment("notificationCount");

            userTo.save(null, {

                useMasterKey: true,
                //sessionToken: sessionToken

            }).then((UserTo) => {
                // The object was retrieved successfully.
                //console.log("Result from get " + JSON.stringify(Workspace));
                return cb(null, UserTo);


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                return cb(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


        } else {

            if (notification.get("isRead") === true) {

                userTo.increment("notificationCount", -1);

                userTo.save(null, {

                    useMasterKey: true,
                    //sessionToken: sessionToken

                }).then((UserTo) => {
                    // The object was retrieved successfully.
                    //console.log("Result from get " + JSON.stringify(Workspace));
                    return cb(null, UserTo);


                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return cb(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });


            } else {

                return cb(null, userTo);

            }


        }


    }

    function incrementWorkspaceNotificationCount(cb) {

        if (notification.get("isNew") === true) {


            let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");

            let queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);
            queryWorkspaceFollower.equalTo("workspace", workspace);
            queryWorkspaceFollower.equalTo("user", userTo);
            queryWorkspaceFollower.first({
                useMasterKey: true
                //sessionToken: sessionToken
            }).then((WorkspaceFollower) => {

                if (WorkspaceFollower) {

                    WorkspaceFollower.increment("notificationCount");

                    WorkspaceFollower.save(null, {

                        useMasterKey: true,
                        //sessionToken: sessionToken

                    }).then((WorkspaceFollowerResult) => {
                        // The object was retrieved successfully.
                        //console.log("Result from get " + JSON.stringify(Workspace));
                        return cb(null, WorkspaceFollowerResult);


                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return cb(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });



                }
                else {


                    // no workspaceFollowers to delete return
                    return cb(null, userTo);

                }



            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                return cb(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });




        }

        else {

            if (notification.get("isRead") === true) {

                let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");

                let queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);
                queryWorkspaceFollower.equalTo("workspace", workspace);
                queryWorkspaceFollower.equalTo("user", userTo);
                queryWorkspaceFollower.first({
                    useMasterKey: true
                    //sessionToken: sessionToken
                }).then((WorkspaceFollower) => {

                    if (WorkspaceFollower) {

                        WorkspaceFollower.increment("notificationCount", -1);

                        WorkspaceFollower.save(null, {

                            useMasterKey: true,
                            //sessionToken: sessionToken

                        }).then((WorkspaceFollowerResult) => {
                            // The object was retrieved successfully.
                            //console.log("Result from get " + JSON.stringify(Workspace));
                            return cb(null, WorkspaceFollowerResult);


                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            return cb(error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });



                    }
                    else {


                        // no workspaceFollowers to delete return
                        return cb(null, userTo);

                    }



                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return cb(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });


            } else {

                return cb(null, userTo);

            }


        }


    }

    function incrementChannelNotificationCount(cb) {

        if (notification.get("channel")) {

            if (notification.get("isNew") === true) {

                let CHANNELFOLLOWER = Parse.Object.extend("ChannelFollow");

                let queryChannelFollower = new Parse.Query(CHANNELFOLLOWER);
                queryChannelFollower.equalTo("channel", channel);
                queryChannelFollower.equalTo("user", userTo);
                queryChannelFollower.first({
                    useMasterKey: true
                    //sessionToken: sessionToken
                }).then((Channel_Follower) => {

                    if (Channel_Follower) {

                        Channel_Follower.increment("notificationCount");

                        Channel_Follower.save(null, {

                            useMasterKey: true,
                            //sessionToken: sessionToken

                        }).then((channelFollowResult) => {
                            // The object was retrieved successfully.
                            //console.log("Result from get " + JSON.stringify(Workspace));
                            return cb(null, channelFollowResult);


                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            return cb(error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });



                    }
                    else {


                        // no workspaceFollowers to delete return
                        return cb(null, userTo);

                    }



                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return cb(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });




            }

            else {

                let CHANNELFOLLOWER = Parse.Object.extend("ChannelFollow");

                let queryChannelFollower = new Parse.Query(CHANNELFOLLOWER);
                queryChannelFollower.equalTo("channel", channel);
                queryChannelFollower.equalTo("user", userTo);
                queryChannelFollower.first({
                    useMasterKey: true
                    //sessionToken: sessionToken
                }).then((Channel_Follower) => {

                    if (Channel_Follower) {

                        Channel_Follower.increment("notificationCount", -1);

                        Channel_Follower.save(null, {

                            useMasterKey: true,
                            //sessionToken: sessionToken

                        }).then((channelFollowResult) => {
                            // The object was retrieved successfully.
                            //console.log("Result from get " + JSON.stringify(Workspace));
                            return cb(null, channelFollowResult);


                        }, (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            return cb(error);
                        }, {

                            useMasterKey: true
                            //sessionToken: sessionToken

                        });



                    }
                    else {


                        // no workspaceFollowers to delete return
                        return cb(null, userTo);

                    }



                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return cb(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });


            }


        }

        else {

            return cb (null, notification);


        }



    }

    async.parallel([
        async.apply(incrementUserNotificationCount),
        async.apply(incrementWorkspaceNotificationCount),
        async.apply(incrementChannelNotificationCount)


    ], function (err, results) {
        if (err) {
            return response.error(err);
        }

        if (results) {


            let finalTime = process.hrtime(time);
            console.log(`finalTime took afterSave Notification ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

            return response.success();


        }

    });



});

Parse.Cloud.afterSave('_Installation', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    console.log("currentUser afterSave _Installation: " + JSON.stringify(currentUser));

    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.afterSave._Installation.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    //console.log("request afterSave Notification: " + JSON.stringify(request));

    // Get notification object
    let installation = request.object;
    console.log("installation: " + JSON.stringify(installation));

    if (currentUser) {

        let USER = Parse.Object.extend("_User");
        let User = new USER();
        User.id = currentUser.id;

        User.set("deviceToken", installation.get("deviceToken"));

        User.save(null, {

            useMasterKey: true
            //sessionToken: sessionToken

        });


    }



    let finalTime = process.hrtime(time);
    console.log(`finalTime took afterSave Notification ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

    return response.success();

});

// Add and Update AlgoliaSearch post object if it's deleted from Parse

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
    let userPostCreator = new USER();

    // Convert Parse.Object too JSON
    let post = request.object;
    let mentions = post.get("mentions");
    //let postToSave = post.toJSON();

    let originalPost = request.original;

    //console.log("originalPost: " + JSON.stringify(originalPost));

    userPostCreator = originalPost ? originalPost.get("user") : post.get("user");
    //console.log("userPostCreator afterSave Post: " + JSON.stringify(userPostCreator));

    currentUser = currentUser ? currentUser : userPostCreator;
    //console.log("currentUser afterSave Post: " + JSON.stringify(currentUser));

    let CHANNEL = Parse.Object.extend("Channel");
    let channel = new CHANNEL();

    channel.id = originalPost ? originalPost.get("channel").id : post.get("channel").id;
    //console.log("channel afterSave Post: " + JSON.stringify(channel));

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();

    workspace.id = originalPost ? originalPost.get("workspace").id : post.get("workspace").id;
    //console.log("workspace afterSave Post: " + JSON.stringify(workspace));

    let isNewPost = post.get("isNew") ? post.get("isNew") : false;
    //console.log("isNewPost afterSave Post: " + JSON.stringify(isNewPost));

    let postType;

    if (originalPost) {

        postType = post.get("type") ? post.get("type") : originalPost.get("type");
        //console.log("postType afterSave Post: " + JSON.stringify(postType));

    } else {
        postType = post.get("type");
        //console.log("postType afterSave Post: " + JSON.stringify(postType));
    }

    let postTitle = post.get("post_title") ? post.get("post_title") : originalPost.get("post_title");
    //console.log("postTitle afterSave Post: " + JSON.stringify(postTitle));

    // setup the queries

    // getPost query setup

    let POST = Parse.Object.extend("Post");
    let queryPost = new Parse.Query(POST);
    queryPost.include( ["user", "workspace", "channel"] );
    queryPost.equalTo("objectId", post.id);


    // getTopAnswerForQuestionPost query setup

    let POSTMESSAGEANSWER = Parse.Object.extend("PostMessage");
    let queryPostMessageAnswer = new Parse.Query(POSTMESSAGEANSWER);
    //queryPostQuestionMessage.equalTo("workspace", workspace);
    //queryPostQuestionMessage.equalTo("channel", channel);
    queryPostMessageAnswer.equalTo("post", post);
    //queryPostQuestionMessage.equalTo("archive", false);
    queryPostMessageAnswer.equalTo("type", "answer");
    queryPostMessageAnswer.descending("voteRank");
    queryPostMessageAnswer.include( ["user"] );
    queryPostMessageAnswer.select(PostMessageAnswerArray);
    queryPostMessageAnswer.doesNotExist("parentPostMessage");

    // getPostMessageComments query setup

    let POSTMESSAGECOMMENT = Parse.Object.extend("PostMessage");
    let queryPostMessageComment = new Parse.Query(POSTMESSAGECOMMENT);
    //queryPostChatMessage.equalTo("workspace", workspace);
    //queryPostChatMessage.equalTo("channel", channel);
    queryPostMessageComment.equalTo("post", post);
    //queryPostMessageComment.select(PostMessageReplyArray_1);
    //queryPostMessageComment.equalTo("type", "comment");
    if (postType === 'question') {
        //queryPostMessageComment.equalTo("type", "question");
        //queryPostMessageComment.equalTo("type", "answer");

        queryPostMessageComment.select(PostMessageReplyArray_1);


    } else if (postType === 'post') {

        queryPostMessageComment.notEqualTo("type", "question");
        queryPostMessageComment.select(PostMessageReplyArray_2);

    }
    queryPostMessageComment.include( ["user"] );
    queryPostMessageComment.limit(2);
    queryPostMessageComment.descending("createdAt");

    // getPostMessageQuestions query setup

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

    // getPostSocial query setup

    let postSocialQuery = new Parse.Query("PostSocial");
    postSocialQuery.equalTo('post', post);
    postSocialQuery.limit(10000);

    let channelFollowQuery = new Parse.Query("ChannelFollow");
    channelFollowQuery.equalTo('workspace', workspace);
    channelFollowQuery.equalTo('channel', channel);
    channelFollowQuery.limit(10000);

    let workspaceFollowerQuery = new Parse.Query("workspace_follower");
    workspaceFollowerQuery.equalTo('workspace', workspace);
    //workspaceFollowerQuery.matchesQuery("postMessage", queryPostMessageQuestion);
    workspaceFollowerQuery.limit(10000);

    let postACL = null;

    function getPost (callback) {

        //console.log("starting getPost function.");

        queryPost.first({
            useMasterKey: true
            //sessionToken: sessionToken
        }).then((Post) => {

            postACL = Post.getACL();

            return callback (null, Post);


        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            console.log(error);

            return callback (error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });



    }

    function getTopAnswerForQuestionPost(callback) {

        //console.log("starting getTopAnswerForQuestionPost function.");

        if (postType === 'question') {

            queryPostMessageAnswer.first({
                useMasterKey: true
                //sessionToken: sessionToken
            }).then((postMessageAnswer) => {

                //console.log("getTopAnswerForQuestionPost postMessageAnswer: " + JSON.stringify(postMessageAnswer));


                if (postMessageAnswer) {

                    postMessageAnswer = simplifyPostQuestionMessage(postMessageAnswer);

                    return callback(null, postMessageAnswer);


                } else {

                    let postMessageAnswer = null;
                    // no workspaceFollowers to delete return
                    return callback(null, postMessageAnswer);

                }


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                console.log(error);
                // no workspaceFollowers to delete return
                return callback(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


        } else {

            // this post is not a question post but a normal post so no answer

            let postMessageAnswer = null;
            // no workspaceFollowers to delete return
            return callback(null, postMessageAnswer);
        }



    }

    function getPostMessageComments(callback) {

        //console.log("starting getPostMessageComments function.");

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
            // no workspaceFollowers to delete return
            return callback(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });





    }

    function getPostMessageQuestions(callback) {

        console.log("starting getPostMessageQuestions function.");

        if (postType === 'post') {

            queryPostMessageQuestion.find({
                useMasterKey: true
                //sessionToken: sessionToken
            }).then((PostMessageQuestions) => {

                //console.log("PostMessageQuestions: " + JSON.stringify(PostMessageQuestions));


                if (PostMessageQuestions.length > 0) {

                    let simplifiedPostMessageQuestions = [];

                    for (var i = 0; i < PostMessageQuestions.length; i++) {

                        simplifiedPostMessageQuestions.push(simplifyPostChatMessage(PostMessageQuestions[i]));
                        //console.log("simplifyPostChatMessage: " + JSON.stringify(PostMessageQuestions[i]));

                        if (i === (PostMessageQuestions.length - 1)) {

                            // finished iterating through all items

                            return callback(null, simplifiedPostMessageQuestions);

                        }

                    }


                } else {

                    let PostMessageQuestions = [];
                    return callback(null, PostMessageQuestions);

                }


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                console.log(error);
                return callback(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

        }
        else {


            let PostMessageQuestions = [];
            return callback(null, PostMessageQuestions);



        }



    }

    function getPostSocials (callback) {

        //console.log("starting getPostSocials function.");


        //postSocialQuery.skip(skip);

        postSocialQuery.find({

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((postSocials) => {
            // The object was retrieved successfully.


            if (postSocials.length > 0) {

                return callback (null, postSocials);


            } else {

                let postSocials = [];

                //console.log("no postSocials");

                return callback (null, postSocials);

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

    function getPostMessageQuestionSocials (callback) {


        //console.log("starting getPostMessageQuestionSocials function.");


        let POSTMESSAGESOCIAL = Parse.Object.extend("PostMessageSocial");
        let queryPostMessageSocial = new Parse.Query(POSTMESSAGESOCIAL);

        //console.log("user: " + JSON.stringify(UserResult.id));

        // queryPostMessageSocial.equalTo("user", UserResult);
        queryPostMessageSocial.matchesQuery("postMessage", queryPostMessageQuestion);
        queryPostMessageSocial.matchesQuery("postSocial", postSocialQuery);


        queryPostMessageSocial.find({

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((postMessageSocials) => {
            // The object was retrieved successfully.

            //let finalChannelFollowers = [];
            //console.log("postMessageSocials: " + JSON.stringify(postMessageSocials));

            if (postMessageSocials.length > 0) {

                return callback (null, postMessageSocials);


            } else {

                let postMessageSocials = [];

                //console.log("no postMessageSocials");

                return callback (null, postMessageSocials);

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

    function getPostMessageAnswerSocials (callback) {

        //console.log("starting getPostMessageAnswerSocials function.");


        let POSTMESSAGESOCIAL = Parse.Object.extend("PostMessageSocial");
        let queryPostMessageAnswerSocial = new Parse.Query(POSTMESSAGESOCIAL);

        //console.log("user: " + JSON.stringify(UserResult.id));

        // queryPostMessageSocial.equalTo("user", UserResult);
        queryPostMessageAnswerSocial.matchesQuery("postMessage", queryPostMessageAnswer);
        queryPostMessageAnswerSocial.matchesQuery("postSocial", postSocialQuery);


        queryPostMessageAnswerSocial.find({

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((postMessageAnswerSocials) => {
            // The object was retrieved successfully.

            //let finalChannelFollowers = [];
            //console.log("postMessageSocials: " + JSON.stringify(postMessageSocials));

            if (postMessageAnswerSocials.length > 0) {

                return callback (null, postMessageAnswerSocials);


            } else {

                let postMessageAnswerSocials = [];

                //console.log("no postMessageAnswerSocials");

                return callback (null, postMessageAnswerSocials);

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

    function createPostSocial (callback) {

        console.log("starting createPostSocial function: " + JSON.stringify(isNewPost) );


        if (isNewPost) {

            let POSTSOCIAL = Parse.Object.extend("PostSocial");
            let postSocial = new POSTSOCIAL();

            postSocial.set("isLiked", false);
            postSocial.set("isBookmarked", false);
            postSocial.set("archive", false);
            postSocial.set("isDelivered", false);
            postSocial.set("hasRead", false);
            postSocial.set("user", userPostCreator);
            postSocial.set("workspace", workspace);
            postSocial.set("channel", channel);
            postSocial.set("post", post);
            postSocial.set("postIsNew", true);
            postSocial.set("isExpanded", false);

            //console.log("postSocial: " + JSON.stringify(postSocial));


            postSocial.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((PostSocial) => {
                // The object was retrieved successfully.
                //console.log("Result from get " + JSON.stringify(Workspace));

                //console.log("done PostSocial: " + JSON.stringify(PostSocial));




                return callback (null, PostSocial);


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

            let postSocial = null;

            return callback (null, postSocial);


        }


    }

    function SendNotifications ( ) {

        console.log("starting SendNotifications function: " + JSON.stringify(mentions.length) );


        if (mentions.length > 0) {

            let WORKSPACENOTIFICATIONSETTING = Parse.Object.extend("WorkSpaceNotificationSetting");
            let queryWorkspaceNotificationSetting = new Parse.Query(WORKSPACENOTIFICATIONSETTING);
            queryWorkspaceNotificationSetting.equalTo("workspace", workspace);
            queryWorkspaceNotificationSetting.equalTo("user", currentUser);

            //console.log("Request: " + JSON.stringify(request));
            //console.log("objectID: " + objectToSave.objectId);
            //console.log("objectID: " + objectToSave.user.objectId);

            queryWorkspaceNotificationSetting.first({
                useMasterKey: true
                //sessionToken: sessionToken
            }).then((WorkspaceNotificationSetting) => {

                if (WorkspaceNotificationSetting) {

                    if (WorkspaceNotificationSetting.get("muteWorkspace") === true || WorkspaceNotificationSetting.get("onlyMentionMe") === false) {

                        let notificationArray = [];
                        return notificationArray;
                    }  else {

                        let notifications = new Set();

                        for (let i = 0; i < mentions.length; i++) {

                            let userId = mentions[i];
                            console.log("userId: " + JSON.stringify(userId));

                            let userTo = new USER();
                            userTo.id = userId;

                            let NOTIFICATION = Parse.Object.extend("Notification");
                            let notification = new NOTIFICATION();

                            notification.set("isDelivered", false);
                            notification.set("hasSent", false);
                            notification.set("isRead", false);
                            notification.set("status", 0);
                            notification.set("userFrom", currentUser);
                            notification.set("userTo", userTo);
                            notification.set("workspace", workspace);
                            notification.set("channel", channel);
                            notification.set("post", post);
                            notification.set("type", '5'); // mentions in post or postMessage
                            notification.set("message", '[@'+currentUser.get("displayName")+ ':' + currentUser.id + '] ' + 'mentioned you in a post: ' + postTitle);

                            notifications.add(notification);

                            console.log("notification: " + JSON.stringify(notification));

                            if (i === mentions.length - 1) {


                                //let dupeArray = [3,2,3,3,5,2];
                                let notificationArray = Array.from(new Set(notifications));

                                console.log("notificationArray length: " + JSON.stringify(notificationArray.length));

                                if (notificationArray.length > 0) {

                                    Parse.Object.saveAll(notificationArray, {

                                        useMasterKey: true
                                        //sessionToken: sessionToken

                                    }).then(function(result) {
                                        // if we got 500 or more results then we know
                                        // that we have more results
                                        // otherwise we finish

                                        return result;


                                    }, function(err) {
                                        // error
                                        console.error(err);

                                        return err;

                                    });


                                }






                            }

                        }


                    }


                } else {

                    let notifications = new Set();

                    for (let i = 0; i < mentions.length; i++) {

                        let userId = mentions[i];
                        console.log("userId: " + JSON.stringify(userId));

                        let userTo = new USER();
                        userTo.id = userId;

                        let NOTIFICATION = Parse.Object.extend("Notification");
                        let notification = new NOTIFICATION();

                        notification.set("isDelivered", false);
                        notification.set("hasSent", false);
                        notification.set("isRead", false);
                        notification.set("status", 0);
                        notification.set("userFrom", currentUser);
                        notification.set("userTo", userTo);
                        notification.set("workspace", workspace);
                        notification.set("channel", channel);
                        notification.set("post", post);
                        notification.set("type", '5'); // mentions in post or postMessage
                        notification.set("message", '[@'+currentUser.get("displayName")+ ':' + currentUser.id + '] ' + 'mentioned you in a post: ' + postTitle);

                        notifications.add(notification);

                        console.log("notification: " + JSON.stringify(notification));

                        if (i === mentions.length - 1) {


                            //let dupeArray = [3,2,3,3,5,2];
                            let notificationArray = Array.from(new Set(notifications));

                            console.log("notificationArray length: " + JSON.stringify(notificationArray.length));

                            if (notificationArray.length > 0) {

                                Parse.Object.saveAll(notificationArray, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                }).then(function(result) {
                                    // if we got 500 or more results then we know
                                    // that we have more results
                                    // otherwise we finish

                                    return result;


                                }, function(err) {
                                    // error
                                    console.error(err);

                                    return err;

                                });


                            }






                        }

                    }

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




        }
        else {

            // no need to send notifications


            let notificationArray = [];
            return notificationArray;


        }


    }

    function getChannelFollow (callback) {

        channelFollowQuery.find({

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((channelFollows) => {
            // The object was retrieved successfully.


            if (channelFollows.length > 0) {

                let arrUsers = lodash.map(channelFollows, function(channelFollow) {

                    channelFollow = channelFollow.get('user');

                    return channelFollow;

                });



                return callback (null, arrUsers);


            } else {

                let ChannelFollow = [];

                //console.log("no postSocials");

                return callback (null, ChannelFollow);

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

    function getWorkspaceFollower (callback) {

        workspaceFollowerQuery.find({

            useMasterKey: true
            //sessionToken: sessionToken

        }).then((workspaceFollowers) => {
            // The object was retrieved successfully.


            if (workspaceFollowers.length > 0) {

                return callback (null, workspaceFollowers);


            } else {

                let WorkspaceFollowers = [];

                //console.log("no postSocials");

                return callback (null, WorkspaceFollowers);

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
        async.apply(getPost),
        async.apply(getTopAnswerForQuestionPost),
        async.apply(getPostMessageComments),
        async.apply(getPostMessageQuestions),
        async.apply(getPostSocials),
        async.apply(getPostMessageQuestionSocials),
        async.apply(getPostMessageAnswerSocials),
        async.apply(createPostSocial),
        async.apply(getWorkspaceFollower),
        async.apply(getChannelFollow)

    ], function (err, results) {
        if (err) {
            response.error(err);
        }

        // console.log("starting show results " + JSON.stringify(results.length));
        //console.log("isNewPost Post: " + JSON.stringify(isNewPost));


        if (results.length > 0) {

            //console.log("afterSave Post results length: " + JSON.stringify(results.length));

            let postToSave = results[0];
            postToSave = simplifyPost(postToSave);
            //console.log("postToSave: " + JSON.stringify(postToSave));

            let topAnswerForQuestionPost = results[1];
            //console.log("topAnswerForQuestionPost: " + JSON.stringify(topAnswerForQuestionPost));

            let postMessageComments = results[2];
            //console.log("postMessageComments: " + JSON.stringify(postMessageComments));

            let postMessageQuestions = results[3];
            //console.log("postMessageQuestions: " + JSON.stringify(postMessageQuestions));


            // set all postSocials for this post to save/update algolia index
            let postSocials = results[4];
            //console.log("postSocials: " + JSON.stringify(postSocials));

            let postMessageQuestionSocials = results[5];
            //console.log("postMessageQuestionSocials: " + JSON.stringify(postMessageQuestionSocials));

            let postMessageAnswerSocials = results[6];
            //console.log("postMessageAnswerSocials: " + JSON.stringify(postMessageAnswerSocials));

            let workspaceFollowersResult = results[8];

            let channelFollowUsers = results[9];

            let finalWorkspaceFollowers = lodash.map(channelFollowUsers, function(channelFollower) {

                let userId = channelFollower.get('user').id;

                let matchResult = lodash.findIndex(finalWorkspaceFollowers , function (o) {

                    //o = o.toJSON();

                    //console.log(JSON.stringify(finalPostIndexResults.indexOf(finalPostIndexResult))+ " " + JSON.stringify(Questions.indexOf(question)) +  " o.user.objectId: " + JSON.stringify(o.user.objectId) + ":: userId: " + JSON.stringify(userId));
                    return o.get('user').id === userId;


                });

                //console.log("matchResult: " + JSON.stringify(matchResult));

                // match exists
                let workspacefollowerMatch = finalWorkspaceFollowers[matchResult];

                workspacefollowerMatch.set("post", post);

                channelFollower = workspacefollowerMatch;

                return  channelFollower;


            });

            Parse.Object.saveAll(finalWorkspaceFollowers, {

                useMasterKey: true
                //sessionToken: sessionToken

            }).then(function(result) {
                // if we got 500 or more results then we know
                // that we have more results
                // otherwise we finish

                return result;


            }, function(err) {
                // error
                console.error(err);

                return err;

            });



            let postSocial;

            //postToSave.postQuestions = postMessageQuestions;
            postToSave.chatMessages = postMessageComments;
            //postToSave.topAnswer = topAnswerForQuestionPost;
            //postToSave.user = simplifyUser(postToSave.user);

            //console.log("postToSave f: " + JSON.stringify(postToSave));


            if (isNewPost === true) {

                // post is new there is only one postSocial for the user who created the post
                postSocial = results[7];
                let postSocialNewlyCreated = [];
                postSocialNewlyCreated.push(postSocial);
                postSocials = postSocialNewlyCreated;

                //console.log("postToSave isNewPost: " + JSON.stringify(postToSave));


            }

            //console.log("entering splitPostAndIndexFasterPrime...");

            splitPostAndIndexFasterPrime({'user':currentUser, 'postJSON':postToSave, 'postMessageQuestions': postMessageQuestions, 'topAnswerForQuestionPost': topAnswerForQuestionPost, 'postSocials': postSocials, 'postMessageAnswerSocials':postMessageAnswerSocials, 'postMessageQuestionSocials':postMessageQuestionSocials, 'postACL':postACL, 'skip':0}, {
                success: function (count) {

                    //SendNotifications ();

                    if (isNewPost === true) {

                        SendPostNotifications({'user':currentUser, 'post':post, 'postTitle':postTitle, 'mentions':mentions, 'workspace':workspace, 'channel':channel}, {
                            success: function (count) {

                                let Final_Time = process.hrtime(time);
                                console.log(`SendPostNotifications took ${(Final_Time[0] * NS_PER_SEC + Final_Time[1]) * MS_PER_NS} milliseconds`);
                            },
                            error: function (error) {
                                console.error(error);
                            }
                        });


                    }



                    // todo check if postSocial > 500, if yes then skip 500 and get postSocials

                    let Final_Time = process.hrtime(time);
                    console.log(`splitPostAndIndexFasterPrime after SendNotifications took ${(Final_Time[0] * NS_PER_SEC + Final_Time[1]) * MS_PER_NS} milliseconds`);

                    response.success();
                },
                error: function (error) {
                    return response.error(error);
                }
            });



        } else {

            return response.error("error in afterSave Post");
        }


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
    let mentions = postMessage.get("mentions");

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

        let user = PostMessage.get("user");
        //console.log("user: " + JSON.stringify(user));

        currentUser = currentUser ? currentUser : user;

        let postMessageDescription = PostMessage.get("message");


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

        function getParentPostMessageUser (callback) {

            if (PostMessage.get("parentPostMessage")) {

                ParentPostMessage.fetch(ParentPostMessage.id, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }).then((parentPostMessage) => {

                    let User = new USER();
                    User = parentPostMessage.get("user");

                    User.fetch(User.id, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((userObject) => {

                        userObject = simplifyUser(userObject);

                        return callback (null, userObject);

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        return callback(error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });



                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    return callback(error);
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

                //useMasterKey: true
                sessionToken: sessionToken

            }).then((PostSaved) => {
                // The object was retrieved successfully.
                //console.log("Result from get " + JSON.stringify(Workspace));

                //console.log("done saveParentPost : " + JSON.stringify(PostSaved));


                return callback (null, PostSaved);


            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                return callback(error);
            }, {

                //useMasterKey: true
                sessionToken: sessionToken

            });

        }

        function SendNotifications () {

            console.log("starting SendNotifications function: " + JSON.stringify(mentions.length) );


            if (mentions.length > 0) {

                let notifications = new Set();

                for (let i = 0; i < mentions.length; i++) {

                    let userId = mentions[i];

                    let userTo = new USER();
                    userTo.id = userId;

                    let NOTIFICATION = Parse.Object.extend("Notification");
                    let notification = new NOTIFICATION();

                    notification.set("isDelivered", false);
                    notification.set("hasSent", false);
                    notification.set("isRead", false);
                    notification.set("status", 0);
                    notification.set("userFrom", currentUser);
                    notification.set("userTo", userTo);
                    notification.set("workspace", workspace);
                    notification.set("channel", channel);
                    notification.set("post", Post);
                    notification.set("postMessage", postMessage);
                    notification.set("type", 'message'); // mentions in post or postMessage
                    notification.set("message", '[@'+currentUser.get("displayName")+ ':' + currentUser.id + '] ' + 'mentioned you in a message: ' + postMessage.get("message"));

                    notifications.add(notification);

                    console.log("notification: " + JSON.stringify(notification));

                    if (i === mentions.length - 1) {


                        //let dupeArray = [3,2,3,3,5,2];
                        let notificationArray = Array.from(new Set(notifications));

                        console.log("notificationArray length: " + JSON.stringify(notificationArray.length));

                        if (notificationArray.length > 0) {

                            Parse.Object.saveAll(notificationArray, {

                                useMasterKey: true
                                //sessionToken: sessionToken

                            }).then(function(result) {
                                // if we got 500 or more results then we know
                                // that we have more results
                                // otherwise we finish

                                return result;


                            }, function(err) {
                                // error
                                console.error(err);

                                return err;

                            });


                        }






                    }

                }




            }
            else {

                // no need to send notifications



                return mentions;


            }


        }

        async.parallel([
            async.apply(prepIndex),
            async.apply(getTopAnswerForQuestionMessage),
            async.apply(saveParentPost),
            async.apply(getParentPostMessageUser)


        ], function (err, results) {
            if (err) {
                response.error(err);
            }

            if (results.length > 0) {

                console.log("afterSave postMessage results length: " + JSON.stringify(results.length));

                postMessageToSave = results[0];
                //let chatMessages = results[2];
                //let postSocial = results[3];
                let topAnswerForQuestionPostMessage = results[1];
                let parentPostMessageUser = results[3];

                //postToSave.postQuestions = postQuestions;
                //postToSave.chatMessages = chatMessages;
                //postToSave.PostSocial = postSocial;
                //postToSave.topAnswer = topAnswerForQuestionPost;


                //console.log("postQuestions: " + JSON.stringify(postQuestions));
                //console.log("chatMessages: " + JSON.stringify(chatMessages));
                //console.log("PostSocial: " + JSON.stringify(postSocial));
                console.log("topAnswerForQuestionPostMessage: " + JSON.stringify(topAnswerForQuestionPostMessage));
                console.log("parentPostMessageUser: " + JSON.stringify(parentPostMessageUser));


                splitPostMessageAndIndex({'user':currentUser, 'object':postMessageToSave, 'topAnswerForQuestionPostMessage':topAnswerForQuestionPostMessage, 'parentPostMessageUser':parentPostMessageUser}, {
                    success: function (count) {

                        SendPostMessageNotifications({'user':currentUser, 'post':Post, 'postMessage':postMessage, 'postMessageDescription':postMessageDescription, 'mentions':mentions, 'workspace':workspace, 'channel':channel}, {
                            success: function (count) {

                                let Final_Time = process.hrtime(time);
                                console.log(`SendPostMessageNotifications took ${(Final_Time[0] * NS_PER_SEC + Final_Time[1]) * MS_PER_NS} milliseconds`);

                                return response.success();
                            },
                            error: function (error) {
                                return response.error(error);
                            }
                        });



                    },
                    error: function (error) {
                        return response.error(error);
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


// Parse Server version >= 3.0.0 Add and Update AlgoliaSearch user object if it's deleted from Parse
Parse.Cloud.afterSave('_User', async (request) => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {

        throw new Error('afterSave-User.UNAUTHENTICATED_USER');

    }

    let User = request.object;

    let queryUser = new Parse.Query("_User");
    queryUser.include( ["currentCompany"] );

    //console.log("request User: " + JSON.stringify(User));

    //queryUser.equalTo("objectId", userToSave.objectId);

    let user = await queryUser.get(User.id , {

        useMasterKey: true
        //sessionToken: sessionToken

    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        throw new Error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });

    console.log("user: " + JSON.stringify(user));

    let USER = Parse.Object.extend("_User");
    let userObject = new USER();
    userObject.id = user.objectId;

    let userToSave = simplifyUserMentions(user);
    console.log("userTosave: " + JSON.stringify(userToSave));

    let userACL = user.getACL();

    async function updateAlgoliaWorkspaceExpertProfileImage () {

        console.log("displayName: " + JSON.stringify(user.toJSON().displayName));

        if ((user.get("isDirtyProfileimage") === false || !user.get("isDirtyProfileimage")) && (user.get("isDirtyIsOnline") === false || !user.get("isDirtyIsOnline")) && (user.get("isDirtyTyping") === false || !user.get("isDirtyTyping")) && (user.get("isDirtyShowAvailability") === false || !user.get("isDirtyShowAvailability"))) {

            console.log("no update to workspaces in algolia: " + user.get("isDirtyProfileimage") + " " + user.get("isDirtyIsOnline"));

            return user;

        } else if (user.get("isNew") === true) {

            return user;
        } else {

            var WORKSPACE = Parse.Object.extend("WorkSpace");
            var workspaceQuery = new Parse.Query(WORKSPACE);
            var User = Parse.Object.extend("_User");
            var userQuery = new Parse.Query(User);


            userQuery.equalTo("objectId", User.id);
            //console.log("username: " + JSON.stringify(userToSave.username));
            workspaceQuery.matchesQuery("experts", userQuery);
            workspaceQuery.select(["user.fullname", "user.displayName", "user.isOnline", "user.showAvailability", "user.profileimage", "user.createdAt", "user.updatedAt", "user.objectId", "type", "archive", "workspace_url", "workspace_name", "experts", "ACL", "objectId", "mission", "description", "createdAt", "updatedAt", "followerCount", "memberCount", "isNew", "image"]);

            const workspaces = await workspaceQuery.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            console.log("workspaces length: " + JSON.stringify(workspaces.length));

            let arrWorkspaces = lodash.map(workspaces, function (workspaceObject) {

                let WorkSpaceObj = new WORKSPACE();
                WorkSpaceObj.id = workspaceObject.id;
                WorkSpaceObj.set("isDirtyExperts", true);
                workspaceObject = WorkSpaceObj;

                return workspaceObject;

            });

            console.log("arrWorkspaces: " + JSON.stringify(arrWorkspaces));



            if (arrWorkspaces.length > 0 ) {

                return await Parse.Object.saveAll(arrWorkspaces, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    throw new Error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });


            } else {

                return [];
            }


        }


    }

    async function updateAlgoliaPostsProfileImage () {

        console.log("updateAlgoliaPostsProfileImage displayName: " + JSON.stringify(user.toJSON().displayName));

        if ((user.get("isDirtyProfileimage") === false || !user.get("isDirtyProfileimage")) && (user.get("isDirtyIsOnline") === false  || !user.get("isDirtyIsOnline")) && (user.get("isDirtyTyping") === false || user.get("isDirtyTyping") === true || !user.get("isDirtyTyping")) && ( user.get("isDirtyShowAvailability") === false || !user.get("isDirtyShowAvailability"))) {

            console.log("no update to workspaces in algolia: " + user.get("isDirtyProfileimage") + " " + user.get("isDirtyIsOnline"));

            return user;

        }

        else if (user.get("isNew") === true) {

            return user;
        }

        else {

            var POST = Parse.Object.extend("Post");
            var postQuery = new Parse.Query(POST);

            var USER = Parse.Object.extend("_User");
            var UserObject = new USER();
            UserObject.id = user.id;

            postQuery.equalTo("user", UserObject);

            const posts = await postQuery.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            console.log("posts.length: " + JSON.stringify(posts.length));


            if (posts.length > 0 ) {

                return await Parse.Object.saveAll(posts, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    throw new Error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });


            } else {

                return [];
            }

        }

    }

    async function updateChannelExpertProfileImage () {

        console.log("updateChannelExpertProfileImage displayName: " + JSON.stringify(user.toJSON().displayName));

        if ((user.get("isDirtyProfileimage") === false || !user.get("isDirtyProfileimage")) && (user.get("isDirtyIsOnline") === false || !user.get("isDirtyIsOnline")) && (user.get("isDirtyTyping") === false || !user.get("isDirtyTyping")) && ( user.get("isDirtyShowAvailability") === false || !user.get("isDirtyShowAvailability"))) {

            console.log("no update to workspaces in algolia: " + user.get("isDirtyProfileimage") + " " + user.get("isDirtyIsOnline"));

            return user;

        }

        else if (user.get("isNew") === true) {

            return user;
        }

        else {

            var CHANNEL = Parse.Object.extend("Channel");
            var channelQuery = new Parse.Query(CHANNEL);
            var User = Parse.Object.extend("_User");
            var userQuery = new Parse.Query(User);


            userQuery.equalTo("objectId", User.id);
            //console.log("updateChannelExpertProfileImage username: " + JSON.stringify(user.username));
            channelQuery.matchesQuery("experts", userQuery);
            //channelQuery.select(["user.fullname", "user.displayName", "user.isOnline", "user.showAvailability", "user.profileimage", "user.createdAt", "user.updatedAt", "user.objectId", "type", "archive","workspace_url", "workspace_name", "experts", "ACL", "objectId", "mission", "description","createdAt", "updatedAt", "followerCount", "memberCount", "isNew", "image"]);

            const channels = await channelQuery.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


            let arrChannels = lodash.map(channels, function(channelObject) {

                let ChannelObj = new CHANNEL();
                ChannelObj.id = channelObject.id;
                ChannelObj.set("isDirtyExperts", true);
                channelObject = ChannelObj;

                return channelObject;

            });

            console.log("arrChannels: " + JSON.stringify(arrChannels));

            if (arrChannels.length > 0 ) {

                return await Parse.Object.saveAll(arrChannels, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    throw new Error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });


            } else {

                return [];
            }




        }


    }

    async function prepIndex( ) {

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


        } else if (!userACL) {

            // this means it's public read write
            console.log("no userACL for this post.");
            userToSave._tags = ['*'];
        }

        console.log("prepIndex userToSave: " + JSON.stringify(userToSave));


        return userToSave;

    }

    async function getSkills( ) {

        //console.log("workspace.get_isDirtySkills: " + JSON.stringify(workspace.get("isDirtySkills")));
        //console.log("Skill Length:" + skillObject);

        //let skillObject = Parse.Object.extend("Skill");
        //var skillsRelation = new skillObject.relation("skills");
        let skillRelation= user.get("mySkills");

        //console.log("user in getSkills: " + JSON.stringify(user));


        let skillRelationQuery = skillRelation.query();

        skillRelationQuery.ascending("level");

        //console.log("skillObject Exists: " + JSON.stringify(skillRelation));

        const skills = await skillRelationQuery.find({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

        let skillObject = [];

        if (skills.length > 0) {

            // skills exist return then then
            skillObject = skills;
        } else {

            // do nothing and return empty skill object no skills;

        }

        console.log('skillObject: ' + JSON.stringify(skillObject));

        return skillObject;


    }

    async function getSkillsToLearn ( ) {

        //console.log("workspace.get_isDirtySkills: " + JSON.stringify(workspace.get("isDirtySkills")));

        //let skillObject = Parse.Object.extend("Skill");
        //var skillsRelation = new skillObject.relation("skills");
        let skillRelation = user.get("skillsToLearn");

        let skillObjectQuery = skillRelation.query();
        skillObjectQuery.ascending("level");

        const skills = await skillObjectQuery.find({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });


        let skillObject = [];

        if (skills.length > 0) {

            // skills exist return then then
            skillObject = skills;
        } else {

            // do nothing and return empty skill object no skills;

        }

        console.log("skillObject skillsToLearn: " + JSON.stringify(skillObject));

        return skillObject;


    }

    async function getWorkspaceFollowers ( ) {


        let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
        let queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);

        queryWorkspaceFollower.equalTo("user", user);

        queryWorkspaceFollower.limit(10000);
        queryWorkspaceFollower.include( ["user"] );
        queryWorkspaceFollower.equalTo("isFollower", true);

        console.log("workspaceFollowers query: " + JSON.stringify(queryWorkspaceFollower));

        return await queryWorkspaceFollower.find({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });



    }

    async function checkIfInvited ( ) {

        let workspaceFollowersUserInvites = [];

        console.log('checkIfInvited');

        if (user.get("isNew") === true) {

            let USERINVITES = Parse.Object.extend("UserInvites");
            let queryUserInvites = new Parse.Query(USERINVITES);

            queryUserInvites.equalTo("email", user.get("email"));

            queryUserInvites.limit(500);

            const userInvites = await queryUserInvites.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


            console.log("user userInvites " + JSON.stringify(userInvites));


            if (userInvites.length > 0) {

                let workspaceFollowerSet = new Set();

                let Users = [];
                Users.push(user);

                for (var i = 0; i < userInvites.length; i++) {

                    let userInvite = userInvites[i];
                    let userWhoInvited = userInvite.get("userWhoInvited");
                    let workspaceObject = userInvite.get("workspace");
                    console.log("workspaceObject: " + JSON.stringify(workspaceObject));

                    let sessionTokenUserWhoInvited = userWhoInvited.getSessionToken();

                    const workspaceFollowers = await Parse.Cloud.run("addPeopleToWorkspace", {
                            //user: currentUser,
                            workspace: workspaceObject,
                            usersToAdd: Users

                        },
                        {sessionToken: sessionTokenUserWhoInvited}
                        , (error) => {
                            // The object was not retrieved successfully.
                            // error is a Parse.Error with an error code and message.
                            throw new Error(error);
                        }, {

                            //useMasterKey: true
                            sessionToken: sessionTokenUserWhoInvited

                        });

                    console.log("workspaceFollower: "+ JSON.stringify(workspaceFollowers));

                    workspaceFollowerSet.add(workspaceFollowers[0]);

                    if ( i === (userInvites.length - 1)) {

                        console.log("workspaceFollowerSet 1: " + JSON.stringify(workspaceFollowerSet));
                        console.log("workspaceFollowerSet Size: " + JSON.stringify(workspaceFollowerSet.size));

                        //let dupeArray = [3,2,3,3,5,2];
                        let workspaceFollowerArray = Array.from(new Set(workspaceFollowerSet));

                        console.log("workspaceFollowerArray length: " + JSON.stringify(workspaceFollowerArray.length));

                        return workspaceFollowerArray;


                    }


                }

            }

            else {

                return workspaceFollowersUserInvites;


            }


        } else {

            console.log("nothing new checkifInvited false");

            return workspaceFollowersUserInvites;
        }


    }

    let finalResults = await Promise.all([
        updateAlgoliaWorkspaceExpertProfileImage(),
        prepIndex(),
        getSkills(),
        getSkillsToLearn(),
        getWorkspaceFollowers(),
        checkIfInvited(),
        updateAlgoliaPostsProfileImage(),
        updateChannelExpertProfileImage()

    ]);


    /*const finalResults = await async.parallel([
        async.apply(updateAlgoliaWorkspaceExpertProfileImage),
        async.apply(prepIndex),
        async.apply(getSkills),
        async.apply(getSkillsToLearn),
        async.apply(getWorkspaceFollowers),
        async.apply(checkIfInvited),
        async.apply(updateAlgoliaPostsProfileImage),
        async.apply(updateChannelExpertProfileImage)


    ]);*/

    console.log("starting show finalResults " + JSON.stringify(finalResults.length));


    if (finalResults.length > 0) {

        let userToSaveFinal = finalResults[1];
        let mySkills = finalResults[2];
        let skillsToLearn = finalResults[3];
        let workspaceFollowers = finalResults[4];
        let checkIfInvited = finalResults[5];

        workspaceFollowers = workspaceFollowers.concat(checkIfInvited);

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

            indexUsers.partialUpdateObject(userToSaveFinal, {
                createIfNotExists: true
            }).then(({ objectID }) => {

                console.log("Parse<>Algolia object saved from _User afterSave function: " + JSON.stringify(objectID));


            });


        } else {


            if (user.get("isUpdateAlgoliaIndex") === true) {

                console.log("isUpdateAlgoliaIndex: " + JSON.stringify(user.get("isUpdateAlgoliaIndex")));

                const count = await splitUserAndIndex({
                    'user': user,
                    'object': userToSaveFinal,
                    'className': 'Role',
                    'loop': true,
                    'workspaceFollowers': workspaceFollowers
                }, {
                    success: function (count) {

                        return count;
                    },
                    error: function (error) {
                        throw new Error(error);
                    }
                });

                let Final_Time = process.hrtime(time);
                console.log(`splitUserAndIndex took ${(Final_Time[0] * NS_PER_SEC + Final_Time[1]) * MS_PER_NS} milliseconds`);


            } else {

                let Final_Time = process.hrtime(time);
                console.log(`splitUserAndIndex took ${(Final_Time[0] * NS_PER_SEC + Final_Time[1]) * MS_PER_NS} milliseconds`);

            }


        }


    } else {

        throw new Error("error in afterSave Post");
    }


}, {useMasterKey: true});



Parse.Cloud.afterSave('ChannelFollow', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    // Convert Parse.Object to JSON
    let channelfollow = request.object;
    let originalChannelFollow = request.original;

    let USER = Parse.Object.extend("_User");
    let user = new USER();
    user.id = channelfollow.get("user").id;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let workspace = new WORKSPACE();
    workspace.id = channelfollow.get("workspace").id;

    let CHANNEL = Parse.Object.extend("Channel");
    let channel = new CHANNEL();
    channel.id = channelfollow.get("channel").id;

    //console.log("afterSave ChannelFollow: " + JSON.stringify(channelfollow));

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.002.afterSave-ChannelFollow.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let _tagPublic = '*';
    let _tagUserId = user.id;

    let defaultTagFilters = new Set();
    defaultTagFilters.add(_tagUserId);
    defaultTagFilters.add(_tagPublic);
    //console.log("defaultTagFilters: " + JSON.stringify(defaultTagFilters.size));

    function addIsSelectedChannelFollowPointerWorkspaceFollow (callback) {

        console.log("channelfollow.isSelected: " + channelfollow.get("isSelected"));

        //todo fix use originalChannelFollow and check for isSelected

        if (channelfollow.get("isSelected") === true) {

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
        else if (channelfollow.get("isSelected") === false) {

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


        }
        else {



            return callback (null, channelfollow);


        }


    }

    function updateUserACLAlgolia (callback) {

        //console.log("Starting updateUserACLAlgolia..");

        if ( (channelfollow.get("isNew") === true) && channelfollow.get("isMember") === true) {

            console.log("updateUserACLAlgolia enter into if statement 1...");

            user.fetch(user.id , {

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((User) => {

                if (User) {

                    let tagFiltersArray = User.get("tagFilters")? User.get("tagFilters") : ["*", user.id];
                    console.log("tagFiltersArray: " + JSON.stringify(tagFiltersArray));

                    let tagFiltersSet = new Set();

                    if (tagFiltersArray.length > 0) {

                        tagFiltersArray.forEach(item => tagFiltersSet.add(item));

                    } else {

                        tagFiltersSet.add(_tagPublic);
                        tagFiltersSet.add(_tagUserId);

                    }

                    //console.log("tagFiltersSet: " + JSON.stringify(tagFiltersSet.size));


                    //console.log("tagFiltersArray: " + JSON.stringify(tagFiltersArray));

                    let unique_channelId = channelfollow.get("workspace").id + '-' + channelfollow.get("channel").id;
                    //console.log("unique_channelId: " + JSON.stringify(unique_channelId));

                    tagFiltersSet.add(unique_channelId);

                    //console.log("tagFiltersSet set: " + JSON.stringify(tagFiltersSet.size));

                    let tagFiltersArrayFinal= Array.from(new Set(tagFiltersSet));

                    console.log("tagFiltersArrayFinal: " + JSON.stringify(tagFiltersArrayFinal));

                    let CHANNEL = Parse.Object.extend("Channel");
                    let queryChannel = new Parse.Query(CHANNEL);

                    queryChannel.get(channel.id, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((Channel) => {



                        if (Channel) {

                            if (Channel.get("type") === 'private' || 'privateMembers' || 'privateAdmins' || 'privateExperts' || 'privateModerators' || 'privateOwners') {

                                const user_public_key = client.generateSecuredApiKey(
                                    '4cbf716235b59cc21f2fa38eb29c4e39',
                                    {
                                        //validUntil: expiresAt,
                                        tagFilters: [ tagFiltersArrayFinal ],
                                        userToken: user.id
                                    }
                                );

                                console.log("new algoliaPublic in afterSave ChannelFollow key generated for " + JSON.stringify(user.id));

                                user.set("algoliaSecureAPIKey", user_public_key);
                                user.set("tagFilters", tagFiltersArrayFinal);


                                user.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                }).then((userSaved) => {
                                    // The object was retrieved successfully.
                                    //console.log("Result from get " + JSON.stringify(Workspace));

                                    //console.log("done saveParentPost : " + JSON.stringify(PostSaved));
                                    return callback (null, channelfollow);


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    return callback(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });




                            } else {

                                return callback (null, channelfollow);
                            }



                        } else {

                            return callback (null, channelfollow);
                        }

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        console.error("error queryChannel afterSave ChannelFollow");
                        return callback (error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                }

                else {

                    return callback (null, channelfollow);
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

        else if (channelfollow.get("isNew") === false && channelfollow.get("isMember") === false && originalChannelFollow.get("isMember") === true) {

            console.log("updateUserACLAlgolia enter into if statement 2...");

            user.fetch(user.id , {

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((User) => {

                if (User) {

                    let unique_channelId = channelfollow.get("workspace").id + '-' + channelfollow.get("channel").id;
                    //console.log("unique_channelId: " + JSON.stringify(unique_channelId));

                    let tagFiltersArray = User.get("tagFilters")? User.get("tagFilters") : ["*", user.id];
                    //console.log("tagFiltersArray: " + JSON.stringify(tagFiltersArray));

                    let tagFiltersSet = new Set();

                    if (tagFiltersArray.length > 0) {

                        tagFiltersArray.forEach(function (item) {
                            if (item !== unique_channelId) {

                                tagFiltersSet.add(item);

                            }
                        });


                    }

                    else {

                        tagFiltersSet.add(_tagPublic);
                        tagFiltersSet.add(_tagUserId);

                    }

                    //console.log("tagFiltersSet: " + JSON.stringify(tagFiltersSet));


                    //console.log("tagFiltersArray: " + JSON.stringify(tagFiltersArray));

                    let tagFiltersArrayFinal= Array.from(new Set(tagFiltersSet));

                    console.log("tagFiltersArrayFinal: " + JSON.stringify(tagFiltersArrayFinal));

                    let CHANNEL = Parse.Object.extend("Channel");
                    let queryChannel = new Parse.Query(CHANNEL);

                    queryChannel.get(channel.id, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((Channel) => {



                        if (Channel) {

                            if (Channel.get("type") === 'private' || 'privateMembers' || 'privateAdmins' || 'privateExperts' || 'privateModerators' || 'privateOwners') {

                                const user_public_key = client.generateSecuredApiKey(
                                    '4cbf716235b59cc21f2fa38eb29c4e39',
                                    {
                                        //validUntil: expiresAt,
                                        tagFilters: [ tagFiltersArrayFinal ],
                                        userToken: user.id
                                    }
                                );

                                console.log("new algoliaPublic in afterSave ChannelFollow key generated for " + JSON.stringify(user.id));

                                user.set("algoliaSecureAPIKey", user_public_key);
                                user.set("tagFilters", tagFiltersArrayFinal);



                                user.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                }).then((userSaved) => {
                                    // The object was retrieved successfully.
                                    //console.log("Result from get " + JSON.stringify(Workspace));

                                    //console.log("done saveParentPost : " + JSON.stringify(PostSaved));
                                    return callback (null, channelfollow);


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    return callback(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });




                            } else {

                                return callback (null, channelfollow);
                            }



                        } else {

                            return callback (null, channelfollow);
                        }

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        console.error("error queryChannel afterSave ChannelFollow");
                        return callback (error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                }

                else {

                    return callback (null, channelfollow);
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

        else if (channelfollow.get("isNew") === false && channelfollow.get("isMember") === true && originalChannelFollow.get("isMember") === false) {

            console.log("updateUserACLAlgolia enter into if statement 3...");


            user.fetch(user.id , {

                useMasterKey: true
                //sessionToken: sessionToken

            }).then((User) => {

                if (User) {

                    let tagFiltersArray = User.get("tagFilters")? User.get("tagFilters") : ["*", user.id];
                    //console.log("tagFiltersArray: " + JSON.stringify(tagFiltersArray));

                    let tagFiltersSet = new Set();

                    if (tagFiltersArray.length > 0) {

                        tagFiltersArray.forEach(item => tagFiltersSet.add(item));

                    } else {

                        tagFiltersSet.add(_tagPublic);
                        tagFiltersSet.add(_tagUserId);

                    }

                    //console.log("tagFiltersSet: " + JSON.stringify(tagFiltersSet));


                    //console.log("tagFiltersArray: " + JSON.stringify(tagFiltersArray));

                    let unique_channelId = channelfollow.get("workspace").id + '-' + channelfollow.get("channel").id;
                    //console.log("unique_channelId: " + JSON.stringify(unique_channelId));

                    tagFiltersSet.add(unique_channelId);

                    //console.log("tagFiltersSet set: " + JSON.stringify(tagFiltersSet));

                    let tagFiltersArrayFinal= Array.from(new Set(tagFiltersSet));

                    console.log("tagFiltersArrayFinal: " + JSON.stringify(tagFiltersArrayFinal));

                    let CHANNEL = Parse.Object.extend("Channel");
                    let queryChannel = new Parse.Query(CHANNEL);

                    queryChannel.get(channel.id, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    }).then((Channel) => {



                        if (Channel) {

                            if (Channel.get("type") === 'private' || 'privateMembers' || 'privateAdmins' || 'privateExperts' || 'privateModerators' || 'privateOwners') {

                                const user_public_key = client.generateSecuredApiKey(
                                    '4cbf716235b59cc21f2fa38eb29c4e39',
                                    {
                                        //validUntil: expiresAt,
                                        tagFilters: [ tagFiltersArrayFinal ],
                                        userToken: user.id
                                    }
                                );

                                console.log("new algoliaPublic in afterSave ChannelFollow key generated for " + JSON.stringify(user.id));

                                user.set("algoliaSecureAPIKey", user_public_key);
                                user.set("tagFilters", tagFiltersArrayFinal);



                                user.save(null, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                }).then((userSaved) => {
                                    // The object was retrieved successfully.
                                    //console.log("Result from get " + JSON.stringify(Workspace));

                                    //console.log("done saveParentPost : " + JSON.stringify(PostSaved));
                                    return callback (null, channelfollow);


                                }, (error) => {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    return callback(error);
                                }, {

                                    useMasterKey: true
                                    //sessionToken: sessionToken

                                });




                            } else {

                                return callback (null, channelfollow);
                            }



                        } else {

                            return callback (null, channelfollow);
                        }

                    }, (error) => {
                        // The object was not retrieved successfully.
                        // error is a Parse.Error with an error code and message.
                        console.error("error queryChannel afterSave ChannelFollow 2");
                        return callback (error);
                    }, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                }

                else {

                    return callback (null, channelfollow);
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

        else if (channelfollow.get("isNew") === false && channelfollow.get("isMember") === false  && originalChannelFollow.get("isMember") === false) {

            // do nothing user is not a member and was not added

            console.log("updateUserACLAlgolia enter into if statement 4...");

            return callback (null, channelfollow);
        }

        else if (channelfollow.get("isNew") === false && channelfollow.get("isMember") === true  && originalChannelFollow.get("isMember") === true) {

            console.log("updateUserACLAlgolia enter into if statement 5...");


            // do nothing user is already a member
            return callback (null, channelfollow);
        }


        else {

            console.log("updateUserACLAlgolia enter into if statement 6...");


            return callback (null, channelfollow);
        }


    }


    async.parallel([
        async.apply(addIsSelectedChannelFollowPointerWorkspaceFollow),
        async.apply(updateUserACLAlgolia)

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


Parse.Cloud.afterSave('workspace_follower',async (request) => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    // Convert Parse.Object to JSON
    let workspace_follow = request.object;

    let USER = Parse.Object.extend("_User");
    let user = new USER();
    user.id = workspace_follow.get("user").id;

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let Workspace = new WORKSPACE();
    Workspace.id = workspace_follow.get("workspace").id;

    let WORKSPACEFOLLOW = Parse.Object.extend("workspace_follower");
    let workspace_follower = new WORKSPACEFOLLOW();
    workspace_follower.id = workspace_follow.id;


    //console.log("afterSave workspace_follower: " + JSON.stringify(workspace_follow));

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        throw new Error('afterSave-WorkSpace.UNAUTHENTICATED_USER');
    }

    let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");


    async function addIsSelectedWorkspaceFollowPointerToUser () {

        //console.log("workspace_follow.isSelected: " + workspace_follow.toJSON().isSelected);

        if (workspace_follow.get("isNew") === true) {

            //console.log("workspaceFollow aftersave user: " + JSON.stringify(user));

            user.set("isSelectedWorkspaceFollower", workspace_follower);
            await user.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                }

            );

            return workspace_follower;

        }
        else {

            return workspace_follower;

        }


    }
    async function createWorkspaceNotificationSettings () {

        if (workspace_follow.get("isNew") === true) {

            let WORKSPACENOTIFICATIONSETTINGS = Parse.Object.extend("WorkSpaceNotificationSetting");
            let workspace_notification_settings = new WORKSPACENOTIFICATIONSETTINGS();

            workspace_notification_settings.set("user", user);
            workspace_notification_settings.set("workspace", Workspace);
            workspace_notification_settings.set("muteWorkspace", false);
            workspace_notification_settings.set("onlyMentionMe", true);
            workspace_notification_settings.set("repliesToMessageEnabled", false);
            workspace_notification_settings.set("answerToMyQuestionEnabled", false);
            workspace_notification_settings.set("allPostOrMessages", false);
            workspace_notification_settings.set("unansweredQuestionEnabled", false);

            await workspace_notification_settings.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            return workspace_notification_settings;


        } else {

            return workspace_follow;
        }

    }

    async function fetchWorkspace () {

        let queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);

        queryWorkspaceFollower.equalTo("objectId", workspace_follower.id);
        queryWorkspaceFollower.include( ["workspace"], ["post"], ["postSocial"], ["postMessage"], ["postMessageSocial"] );

        return await queryWorkspaceFollower.find({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    }

    const results = await Promise.all([
        addIsSelectedWorkspaceFollowPointerToUser(),
        createWorkspaceNotificationSettings(),
        fetchWorkspace()
    ]);

    //console.log("results length: " + JSON.stringify(results));
    let indexConversation = results[2];
    indexConversation = indexConversation.toJSON();
    indexConversation.objectID = indexConversation.objectId;
    let tags = [];
    tags.push(indexConversation.user.objectId);
    indexConversation._tags = tags;

    await indexConversations.addObject(indexConversation).catch(err => console.error(err));

    let finalTime = process.hrtime(time);
    console.log(`finalTime took afterSave workspace_follower ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);


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

            //console.log("channel isNew: " + channel.get("isNew"));
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

                //console.log("channelFollow:d " + JSON.stringify(channelFollow));

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

// Parse Server version > 3.0.0 Add and Update AlgoliaSearch Workspace object if it's deleted from Parse & create Workspace roles
Parse.Cloud.afterSave('WorkSpace', async (request) => {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {

        throw new Error('afterSave-WorkSpace.UNAUTHENTICATED_USER');
    }

    // Convert Parse.Object to JSON
    let workspace = request.object;

    let workspaceToSave = request.object.toJSON();

    let WORKSPACE = Parse.Object.extend("WorkSpace");
    let queryWorkspace = new Parse.Query(WORKSPACE);

    queryWorkspace.equalTo("objectId", workspaceToSave.objectId);
    queryWorkspace.include( ["user"] );
    queryWorkspace.select(["isDirtySkills", "isDirtyExperts", "expertsArray", "user.fullname", "user.displayName", "user.isOnline", "user.showAvailability", "user.profileimage", "user.createdAt", "user.updatedAt", "user.objectId", "type", "archive","workspace_url", "workspace_name", "experts", "ACL", "objectId", "mission", "description","createdAt", "updatedAt", "followerCount", "memberCount", "isNew", "skills", "image"]);

    //console.log("Workspace Object: " + JSON.stringify(workspace));
    //console.log("objectID: " + objectToSave.objectId);
    //console.log("objectID: " + objectToSave.user.objectId);

    //var Workspace = new Parse.Object("WorkSpace");

    const Workspace = await queryWorkspace.get(workspace.id , {

        useMasterKey: true
        //sessionToken: sessionToken

    }, (error) => {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        throw new Error(error);
    }, {

        useMasterKey: true
        //sessionToken: sessionToken

    });

    //let WORKSPACE_FOLLOW = Parse.Object.extend("workspace_follower");
    let OWNER = Parse.Object.extend("_User");
    let owner = new OWNER();
    owner = Workspace.get("user");
    //console.log("owner: " + JSON.stringify(owner));

    let USER = Parse.Object.extend("_User");
    let User = new USER();
    User.id = Workspace.get("user").id;
    //console.log("User: " + JSON.stringify(User));

    let WorkSpace = new WORKSPACE();
    WorkSpace.id =  workspace.id;
    //console.log("WorkSpace: " + JSON.stringify(WorkSpace));

    workspace = Workspace;
    workspaceToSave = simplifyWorkspace(Workspace);
    //console.log("Workspace from afterSave Query: " + JSON.stringify(workspaceToSave));

    let skillObject = Parse.Object.extend("Skill");
    //var skillsRelation = new skillObject.relation("skills");
    skillObject = workspace.get("skills");

    async function createWorkspaceRoles () {

        console.log("createWorkspaceRoles isNew: " + workspace.get("isNew"));

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
                "canMentionMembers": false,
                "canEditPost": false,
                "canDeletePost": false,
                "canArchivePost": false,
                "canEditUserRole": false
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
                "canMentionMembers": true,
                "canEditPost": false,
                "canDeletePost": false,
                "canArchivePost": false,
                "canEditUserRole": false
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
                "canMentionMembers": true,
                "canEditPost": false,
                "canDeletePost": true,
                "canArchivePost": true,
                "canEditUserRole": false
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
                "canMentionMembers": true,
                "canEditPost": false,
                "canDeletePost": true,
                "canArchivePost": true,
                "canEditUserRole": true
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
                "canMentionMembers": true,
                "canEditPost": false,
                "canDeletePost": true,
                "canArchivePost": true,
                "canEditUserRole": true

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
                "canMentionMembers": true,
                "canEditPost": false,
                "canDeletePost": true,
                "canArchivePost": true,
                "canEditUserRole": true

            });
            //console.log("ownerRole 2: " + JSON.stringify(ownerRole));
            //ownerRole.save(null, {useMasterKey: true});
            //console.log("ownerRole 3: " + JSON.stringify(ownerRole));

            const savedRoles =  await Parse.Object.saveAll([ownerRole, expertRole, adminRole, moderatorRole, memberRole, followerRole], {

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });


            var memberrole = savedRoles[4];
            //memberrole.getUsers().add(usersToAddToRole);
            await memberrole.getRoles().add(followerRole);
            await memberrole.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            var moderatorrole = savedRoles[3];
            //memberrole.getUsers().add(usersToAddToRole);
            await moderatorrole.getRoles().add(memberRole);
            await moderatorrole.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            var adminrole = savedRoles[2];
            //memberrole.getUsers().add(usersToAddToRole);
            await adminrole.getRoles().add(moderatorRole);
            await adminrole.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            var expertrole = savedRoles[1];
            await expertrole.getUsers().add(owner);
            //expertrole.getUsers().add(usersToAddToRole);
            await expertrole.getRoles().add(moderatorRole);
            await expertrole.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            var ownerrole = savedRoles[0];
            await ownerrole.getUsers().add(owner);
            await ownerrole.getRoles().add(expertRole);
            await ownerrole.getRoles().add(adminRole);
            await ownerrole.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            var userRolesRelation = owner.relation("roles");
            userRolesRelation.add(ownerRole); // add owner role to the user roles field.
            userRolesRelation.add(expertrole); // add owner role to the user roles field.
            await owner.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            return savedRoles;

        }
        else {
            return workspace;
        }

    }

    async function getSkills () {

        //console.log("workspace.get_isDirtySkills: " + JSON.stringify(workspace.get("isDirtySkills")));
        //console.log("Skill Length:" + skillObject);

        let skillObjectQuery = skillObject.query();
        skillObjectQuery.ascending("level");

        return await skillObjectQuery.find({

            useMasterKey: true
            //sessionToken: sessionToken

        }, (error) => {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            throw new Error(error);
        }, {

            useMasterKey: true
            //sessionToken: sessionToken

        });

    }

    async function getExperts () {

        let expertObject = Parse.Object.extend("_User");
        expertObject = workspace.get("experts");
        let expertsArray = [];

        if (workspace.get("isNew") === true) {

            expertsArray = workspace.get("expertsArray");

            // console.log("isNew Workspace expertsArray: " + JSON.stringify(expertsArray));

            return expertsArray;

        }
        else {

            //console.log("workspace.dirty_experts: " + JSON.stringify(workspace.dirty("experts")));

            if (workspace.get("isDirtyExperts") === true) {

                // expert being added or removed, update algolia, else return callback.

                let experts = await expertObject.query().select(["fullname", "displayName", "isOnline", "showAvailability", "profileimage", "createdAt", "updatedAt", "objectId"]).find({


                    useMasterKey: true
                    //sessionToken: sessionToken

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    throw new Error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                // Convert Parse.Object to JSON
                //workspace = workspace.toJSON();
                let User = new Parse.Object("_User");
                let queryRole = new Parse.Query(Parse.Role);

                //console.log("\n Experts: " + JSON.stringify(experts));

                queryRole.equalTo('name', 'expert-' + workspace.id);

                const expertRole =  await queryRole.first({

                    useMasterKey: true
                    //sessionToken: sessionToken

                }, (error) => {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and message.
                    throw new Error(error);
                }, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });

                // console.log("Role: " + JSON.stringify(expertRole));

                await expertRole.getUsers().add(experts);
                await expertRole.save(null, {

                    useMasterKey: true
                    //sessionToken: sessionToken

                });
                //var userRolesRelation;

                for (let i = 0; i < experts.length; i++) {

                    let expertObject = experts[i];
                    //console.log("expertObject: " + JSON.stringify(expertObject));

                    experts[i] = simplifyUser(expertObject);

                    let userRolesRelation = expertObject.relation("roles");
                    //console.log("userRolesRelation afterSave Workspace: " + JSON.stringify(userRolesRelation));
                    userRolesRelation.add(expertRole); // add owner role to the user roles field.
                    await expertObject.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });

                }

                return experts;


            }
            else {

                expertsArray = workspace.get("expertsArray");

                //console.log("isNew Workspace expertsArray: isDirtyExperts false " + JSON.stringify(expertsArray));

                return expertsArray;

            }


        }


    }

    async function getWorkspaceFollowers () {

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

        if (workspace.get("isNew") === true) {

            console.log("isNew Workspace no followers yet except workspace owner: " + JSON.stringify(followersArray));

            return [];

        } else {

            let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
            let queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);

            let viewableBy = [];

            queryWorkspaceFollower.equalTo("workspace", workspace);

            // todo if there is more than 10k people following workspace need to split algolia index into two objects and implement pagination here.
            queryWorkspaceFollower.limit(10000);
            // queryWorkspaceFollower.include( ["workspace"] );

            let followers =  await queryWorkspaceFollower.find({

                useMasterKey: true
                //sessionToken: sessionToken

            }, (error) => {
                // The object was not retrieved successfully.
                // error is a Parse.Error with an error code and message.
                throw new Error(error);
            }, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            //console.log("workspace.type: " + JSON.stringify(workspaceToSave.type));

            workspaceToSave.objectID = workspaceToSave.objectId;
            workspaceToSave['followers'] = followers;


            for (var i = 0; i < followers.length; i++) {

                followers[i] = simplifyWorkspaceFollowersUserIndex(followers[i]);

                if (workspaceToSave.type === 'private') {
                    viewableBy.push(followers[i].user.objectId);
                    console.log("user id viewableBy: " + followers[i].toJSON().user.objectId) ;
                }


            }

            if (workspaceToSave.type === 'private') {

                workspaceToSave._tags= viewableBy;
                //console.log("workspace 2: " + JSON.stringify(workspaceToSave));

            }
            else if (workspaceToSave.type === 'public') {

                workspaceToSave._tags = ['*'];

            }

            // console.log("followers: " + JSON.stringify(workspaceToSave.followers));

            return workspaceToSave;

        }

    }

    async function createOwnerWorkspaceFollower () {


        //console.log("ACL Channel: " + JSON.stringify(channel.getACL()));

        if (workspace.get("isNew") === true) {

            console.log("workspace createOwnerWorkspaceFollower isNew: " + workspace.get("isNew"));

            let viewableBy = [];
            let followersArray = [];

            let WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
            let workspaceFollower = new WORKSPACEFOLLOWER();

            console.log("workspaceFollowerL: " + JSON.stringify(workspaceFollower));

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

            console.log("workspaceFollower final: " + JSON.stringify(workspaceFollower));

            //console.log("workspaceFollower: " + JSON.stringify(workspaceFollower));

            let result = await workspaceFollower.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            });

            // save was successful

            //console.log("workspace new workspace: " + JSON.stringify(result));

            //workspaceToSave = simplifyWorkspace(workspaceToSave);
            //console.log("workspaceToSave: " + JSON.stringify(workspaceToSave));

            workspaceToSave.objectID = workspaceToSave.objectId;
            result = simplifyWorkspaceFollowersUserIndex(result);
            //console.log("simplify result: " + JSON.stringify(result));

            followersArray.push(result);
            workspaceToSave['followers'] = followersArray;

            //console.log("workspaceToSave with followers: " + JSON.stringify(workspaceToSave));


            // add _tags for this workspacefollower so it's visible in algolia
            //console.log("user id viewableBy: " + JSON.stringify(User.id)) ;

            if (workspace.get("type") === 'private' ) {
                viewableBy.push(User.id);
                // console.log("user id viewableBy: " + JSON.stringify(User.id)) ;
            }


            if (workspace.get("type") === 'private') {

                workspaceToSave._tags= viewableBy;
                //console.log("workspace 2: " + JSON.stringify(workspaceToSave));

            } else if (workspace.get("type")=== 'public') {

                workspaceToSave._tags = ['*'];

            }

            return workspaceToSave;


        }
        else {

            return workspace;
        }

    }

    const results = await Promise.all([
        createWorkspaceRoles(),
        getSkills(),
        getExperts(),
        getWorkspaceFollowers(),
        createOwnerWorkspaceFollower()
    ]);

    //console.log("results length: " + JSON.stringify(results.length));
    console.log("isNew dd: " + JSON.stringify(workspace.get("isNew")));

    if(workspace.get("isNew") === true) {
        //console.log("workspaceToSave: " + JSON.stringify(workspaceToSave));

        workspaceToSave = results[4];
        //console.log("workspaceToSave after: " + JSON.stringify(workspaceToSave));
        workspace.set("isDirtyExperts", true);

    }
    else {
        workspaceToSave = results[3];

    }
    let skillsToSave = results[1];
    let expertsToSave = results[2];

    workspaceToSave["skills"] = skillsToSave;
    workspaceToSave["experts"] = expertsToSave;
    // console.log("experts: " + JSON.stringify(expertsToSave));

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

        // console.log("Channel save in afterSave Workspace cloud function: " + JSON.stringify(Channel));

        await Channel.save(null, {

                useMasterKey: true
                //sessionToken: sessionToken

            }
        );
    }


    //console.log("skillsToSave: " + JSON.stringify(skillsToSave));
    //console.log("expertsToSave: " + JSON.stringify(expertsToSave));
    //console.log("workspaceToSave final: " + JSON.stringify(workspaceToSave));

    return splitWorkspaceAndIndex({'user':currentUser, 'object':workspaceToSave}, {
        success: function (count) {

            let Final_Time = process.hrtime(time);
            console.log(`splitWorkspaceAndIndex took ${(Final_Time[0] * NS_PER_SEC + Final_Time[1]) * MS_PER_NS} milliseconds`);

        },
        error: function (error) {
            throw new Error (error);
        }
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

            let userObjectIDs = [];

            if (postSocials.length > 0) {


                for (var i = 0; i < postSocials.length; i++) {

                    let object = postSocials[i];
                    let objectFinal = post.id + '-' + object.get("user").id;

                    userObjectIDs.push(objectFinal);

                    if (i === (postSocials.length-1)) {

                        // finished iterating through all items

                        Parse.Object.destroyAll(postSocials, {
                            success: function(result) {
                                console.log('Did successfully delete postSocials in afterDelete postMessageSocial Cloud Function');
                                //return callback(null, userObjectIDs);
                            },
                            error: function(error) {
                                console.error("Error  delete postMessageSocial " + error.code + ": " + error.message);
                                return callback(error);
                            },
                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                        return callback(null, userObjectIDs);

                    }

                }



            } else {

                //postSocials = [];
                // no workspaceFollowers to delete return
                return callback(null, userObjectIDs);

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

    function searchAlgoliaObjectIds (callback) {


        indexPosts.search('', {
            attributesToRetrieve: ['objectId', 'objectID'],
            filters: 'objectId:' + post.id,
            hitsPerPage: 1000,
        }).then(({ hits }) => {

            let mapAlgoliaObjects = lodash.map(hits, function (hit) {

                hit =  post.id + '-' + hit.objectID;

                //console.log("hit: " + JSON.stringify(hit));


                return hit;

            });

            let channelObjectID = post.id + '-' + channel.id;
            let zero = post.id + '-0';

            mapAlgoliaObjects.push(zero);
            mapAlgoliaObjects.push(channelObjectID);
        });



    }


    async.parallel([
        async.apply(deletePostSocial),
        //async.apply(deletePostQuestion),
        async.apply(deletePostMessage),
        async.apply(searchAlgoliaObjectIds)

    ], function (err, results) {
        if (err) {
            return response.error(err);
        }

        if (results) {

            let userObjectIDsFinal = results[0];

            let postIdArray = results[2];

            postIdArray= postIdArray.concat(userObjectIDsFinal);

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
        queryPostMessageSocial.equalTo("postMessage", postMessage);
        queryPostMessageSocial.limit(10000);
        queryPostMessageSocial.find({
            useMasterKey: true
            //sessionToken: sessionToken
        }).then((postMessageSocials) => {

            let userObjectIDs = [];


            if (postMessageSocials.length > 0) {


                for (var i = 0; i < postMessageSocials.length; i++) {

                    let object = postMessageSocials[i];
                    let objectFinal = postMessage.id + '-' + object.get("user").id;

                    userObjectIDs.push(objectFinal);

                    if (i === (postMessageSocials.length-1)) {

                        // finished iterating through all items

                        Parse.Object.destroyAll(postMessageSocials, {
                            success: function(result) {
                                console.log('Did successfully delete postSocials in afterDelete postMessageSocial Cloud Function');
                                return callback(null, userObjectIDs);
                            },
                            error: function(error) {
                                console.error("Error  delete postMessageSocial " + error.code + ": " + error.message);
                                return callback(error);
                            },
                            useMasterKey: true
                            //sessionToken: sessionToken

                        });

                    }

                }






            } else {

                //postMessageSocial = [];
                // no workspaceFollowers to delete return
                return callback(null, userObjectIDs);

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
        queryPostMessage.equalTo("parentPostMessage", postMessage);
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

    function searchAlgoliaObjectIds (callback) {


        indexPostMessage.search('', {
            attributesToRetrieve: ['objectId', 'objectID'],
            filters: 'objectId:' + postMessage.id,
            hitsPerPage: 1000,
        }).then(({ hits }) => {
            //console.log("hits: " + JSON.stringify(hits));


            //console.log("hits: " + JSON.stringify(hits));

            let mapAlgoliaObjects = lodash.map(hits, function (hit) {

                hit =  postMessage.id + '-' + hit.objectID;

                //console.log("hit: " + JSON.stringify(hit));


                return hit;

            });

            let channelObjectID = postMessage.id + '-' + channel.id;
            let zero = postMessage.id + '-0';

            mapAlgoliaObjects.push(zero);
            mapAlgoliaObjects.push(channelObjectID);

            //console.log("mapAlgoliaObjects: " + JSON.stringify(mapAlgoliaObjects));

            return callback (null, mapAlgoliaObjects);
        });



    }


    async.parallel([
        async.apply(deletePostMessageSocial),
        //async.apply(deletePostMessageThreads),
        async.apply(searchAlgoliaObjectIds)

    ], function (err, results) {
        if (err) {
            return response.error(err);
        }

        if (results) {

            let postMessageIdArray = results[1];
            //console.log("postIDArray: " + JSON.stringify(postMessageIdArray));
            let userObjectIDsFinal = results[0];

            postMessageIdArray= postMessageIdArray.concat(userObjectIDsFinal);
            //console.log("final Concat: " + JSON.stringify(postMessageIdArray));

            // Remove the object from Algolia
            indexPostMessage.deleteObjects(postMessageIdArray, function(err, content) {
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



            }
            else {

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
Parse.Cloud.afterDelete('_User', function(request, response) {

    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    let time = process.hrtime();

    let currentUser = request.user;
    let sessionToken = currentUser ? currentUser.getSessionToken() : null;

    if (!request.master && (!currentUser || !sessionToken)) {
        response.error(JSON.stringify({
            code: 'PAPR.ERROR.afterDelete-User.UNAUTHENTICATED_USER',
            message: 'Unauthenticated user.'
        }));
        return;
    }

    let USER = Parse.Object.extend("_User");
    let user = new USER();
    user.id = request.object;


    //console.log("request afterDelete Post: " + JSON.stringify(request));


    function searchAlgoliaObjectIds (callback) {


        indexUsers.search('', {
            attributesToRetrieve: ['objectId', 'objectID'],
            filters: 'objectId:' + user.id,
            hitsPerPage: 1000,
        }).then(({ hits }) => {
            console.log(hits);

            return callback (null, hits);
        });



    }


    async.parallel([
        async.apply(searchAlgoliaObjectIds)

    ], function (err, results) {
        if (err) {
            return response.error(err);
        }

        if (results) {

            let userIdArray = results[0];
            //console.log("postIDArray: " + JSON.stringify(postIdArray));

            // Remove the object from Algolia
            indexUsers.deleteObjects(userIdArray, function(err, content) {
                if (err) {
                    return response.error(err);
                }
                console.log('Parse<>Algolia user deleted');

                let finalTime = process.hrtime(time);
                console.log(`finalTime took afterDelete user ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

                return response.success(content);
            });



        }

    });

});

Parse.Cloud.define("sendEmail", function(request, response) {
    // Email configuration
    var transporter = nodemailer.createTransport({

        host: 'smtp.sendgrid.net',
        port: 465,
        secure: true,
        auth: {
            user: 'apikey',
            pass: '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'
        }
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
    };
    // var i = 0;
    let allMail = request.params.emails;
    var counter = require('counter'),
        count = counter(0, { target: Object.keys(allMail).length - 1, once: true }),
        i, l = Object.keys(allMail).length - 1;
    count.on('target', function() {
        console.log("Total count : ", Object.keys(allMail).length);
    }).start();
    var flag = 0;
    for (var j = 0; j < allMail.length; j++) {

        let emailSingle = allMail[j];

        console.log("email: " + JSON.stringify(allMail[j]));
        console.log("emailSingle: " + JSON.stringify(emailSingle.email));

        readHTMLFile(__dirname + '/templates/email-template.html', function(err, html) {
            var template = handlebars.compile(html);
            var temp = {
                workspace : request.params.workspaceName,
                username : request.params.username,
                workspaceId : request.params.workspaceID,
                email :  emailSingle.email
            };
            var htmlToSend = template(temp);
            var mailOptions = {
                from: 'developer@papr.ai',
                // from: 'Papr, Inc.',
                to :  emailSingle.email,
                subject : request.params.username + ' invited you to join his Workspace on Papr',
                html : htmlToSend
            };
            transporter.sendMail(mailOptions).then(function(info){
                console.log("Mail sent: " + JSON.stringify(emailSingle.email) + info.response);
            }).catch(function(err){
                console.log(err);
                response.error(err);
            });

            if (j === allMail.length - 1) {
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
    query.equalTo('hasSent', true);
    query.find({
        success: function(results) {
            async.each(results, function (result, callback) {
                var note = new apn.Notification();
                note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
                note.title = "Papr.ai",
                    note.body = result.get("message"),
                    note.payload = {
                        'workspace' : result.get("workspace"),
                        'channel' : result.get("channel"),
                        'type' : result.get("type"),
                        'post' : result.get("post"),
                        'postMessage' : result.get("postMessage"),
                    };
                note.topic = "ai.papr.dev";
                apnProvider.send(note, result.get("userTo").get("deviceToken")).then( (res) => {
                    result.set("hasSent", false);
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
    //console.log("user: " + JSON.stringify(user));

    //console.log(notification_body);


    var Notification = Parse.Object.extend('Notification');
    var query = new Parse.Query(Notification);
    query.include('userTo.deviceToken');
    query.matchesQuery("userTo", user);
    query.equalTo('hasSent', false);
    query.find({
        success: function(results) {
            async.each(results, function (result, callback) {

                let notification_body = result.get("messageDescription");
                let notification_title = result.get("messageTitle");
                //let p = '[@shawkat:QK5IjSVtwF] mentioned you in a message: Great #tip [@Sam:wW30jjrrjO] I also would add the following: /n 1. Talk to your customers and users to build deep understanding of what their un-met needs are and understand their drivers for success /n 2. Deep dive on your product’s metrics and understand how product decisions were made /n 3. Understand your company and product #OKR or goals';

                const userMentionRegex = /(^|\s)(\[@[a-zA-Z\d]+:[a-zA-Z\d]+\]|\[@[a-zA-Z\d]+(\W)[a-zA-Z\d]+:[a-zA-Z\d]+\])/gi;
                let userBodyMentions = notification_body.match(userMentionRegex);
                //console.log(userMentions);

                if (userBodyMentions.length > 0) {

                    for (var j = 0; j < userBodyMentions.length; j++) {

                        let userBodyNameMention = userBodyMentions[j].match(/(^|\s|)(\@[a-zA-Z\d]+(\W)[a-zA-Z\d]+\:|\@[a-zA-Z\d]+\:)/gi);
                        let userBodyNameMentionMatch = userBodyNameMention[0];
                        let userBodyNameMentionFinal = userBodyNameMentionMatch.match(/(^|\s|)(\@[a-zA-Z\d]+(\W)[a-zA-Z\d]+[^:]|\@[a-zA-Z\d]+[^:])/gi);
                        notification_body = notification_body.replace(userBodyMentions[j], ' ' + userBodyNameMentionFinal);
                    }

                }


                let userTitleMentions = notification_title.match(userMentionRegex);

                if (userTitleMentions.length > 0) {

                    for (var k = 0; k < userTitleMentions.length; k++) {

                        let userTitleNameMention = userTitleMentions[k].match(/(^|\s|)(\@[a-zA-Z\d]+(\W)[a-zA-Z\d]+\:|\@[a-zA-Z\d]+\:)/gi);
                        let userTitleNameMentionFirstMatch = userTitleNameMention[0];
                        let userTitleNameMentionFinal = userTitleNameMentionFirstMatch.match(/(^|\s|)(\@[a-zA-Z\d]+(\W)[a-zA-Z\d]+[^:]|\@[a-zA-Z\d]+[^:])/gi);
                        notification_title = notification_title.replace(userTitleMentions[k], ' ' + userTitleNameMentionFinal);
                    }

                }


                var note = new apn.Notification();
                note.expiry = Math.floor(Date.now() / 1000) + 3600;
                note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
                note.title = notification_title,
                    note.body = notification_body,
                    note.payload = {
                        'workspace' : result.get("workspace"),
                        'channel' : result.get("channel"),
                        'type' : result.get("type"),
                        'post' : result.get("post"),
                        'postMessage' : result.get("postMessage"),

                    };
                note.topic = "ai.papr";
                //console.log("deviceToken: " + JSON.stringify(result.get("userTo")) + " " + JSON.stringify( result.get("userTo").get("deviceToken")));
                apnProvider.send(note, result.get("userTo").get("deviceToken")).then( (res) => {
                    result.set("hasSent", true);
                    result.save(null, {

                        useMasterKey: true
                        //sessionToken: sessionToken

                    });
                    if((res.sent).length == 1) {
                        console.log("Sent To ", res.sent[0].device);
                    } else{
                        console.log("Error Sending Notification: \nUsername : " + result.get("userTo").get("username") + "\nDevice Token : " + res.failed[0].device + "\nReason : " + res.failed[0].response.reason);
                    }
                }).catch(err => {
                    console.log(err);
                    callback(err);
                });
                callback(null, result);
            }, function(err) {
                if (err){
                    console.log('ERROR', err);
                    //return response.error(err);
                }
                console.log("notification sent to users");
                //return response.success("Notification sent to all users");
            });
        },
        error: function(e) {
            console.error(e);
            //return response.error(e);
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
        teamId: 'W73RAM957L',
        production: production
    };
    var apnProvider = new apn.Provider(options);
    var note = new apn.Notification();
    note.expiry = Math.floor(Date.now() / 1000) + 3600;
    note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
    note.title = "Papr.ai";
    note.body = "test message";
    note.payload = {'messageFrom': 'John Doe'};
    note.topic = "ai.papr";
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

