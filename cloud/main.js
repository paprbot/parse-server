
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
var indexProject = client.initIndex('dev_channels');
var indexWorkspaces = client.initIndex('dev_workspaces');
var indexSkills = client.initIndex('dev_skills');
const requestPromise = require('request-promise');
var fs = require('fs');

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
        project: "all",
        skip: 10

    }).then(function(result) {
        console.log("result: "+ JSON.stringify(result));
        response.success();

    }, function(error) {
        response.error(error);
    });


});

// cloud API and function to test query performance of AlgoliaSearch versus Parse
Parse.Cloud.define("QueryPostFeed", function(request, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    //get request params
    var hit = parseInt(request.params.hit);
    var user = request.params.user;
    var project = request.params.project;
    var workspace = request.params.workspace;
    var skip = parseInt(request.params.skip);

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

    queryPOST.include( ["user", "workspace", "project"] );
    //queryP.doesNotExist("project.archive", "workspace.archive", "Archive");

    queryPOST.equalTo("workspace", Workspace);

    // todo get posts that the user is allowed to view

    // setup query filter for post
    //queryP.select(["user.fullname", "user.profileimage.url" ,"ACL", "media_duration", "postImage", "post_File", "audioWave", "imageRatio", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url" , "workspace.image", "workspace.objective", "workspace.mission", "workspace.postCount", "project.name", "project.type", "project.postCount", "project.image", "project.category", "project.objective", "BookmarkedBy", "isLikedBy", "isBookmarked", "isLiked", "followerCount", "memberCount"]);
    queryPOST.descending("createdAt");
    queryPOST.limit(hit); // limit to hits
    if (skip) {
        queryPOST.skip(skip);
    }
    if (project == 'all') {
        // do nothing, since we want all projects in a workspace
    } else if (project) {
        var Project = new Parse.Object("Project");
        Project.id = project;
        queryPOST.equalTo("project", Project);

    }

    //var beforeQuery = process.hrtime(time);
    //console.log(`before query took ${(beforeQuery[0] * NS_PER_SEC + beforeQuery[1])  * MS_PER_NS} milliseconds`);
    //var bQuery = process.hrtime();


    // function to do two queries in parallel async
    //function queryParallel (callback) {


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
    var project = request.params.project;
    var workspace = request.params.workspace;
    var skip = parseInt(request.params.skip);

    // Setup Parse query
    var queryWorkspaceFollow = Parse.Object.extend("workspace_follower");
    var queryWORKSPACEFOLLOW = new Parse.Query(queryWorkspaceFollow);
    var queryProjectFollow = Parse.Object.extend("ProjectFollow");
    var queryPROJECTFOLLOW = new Parse.Query(queryProjectFollow);
    var queryCategory = Parse.Object.extend("Category");
    var queryCATEGORY = new Parse.Query(queryCategory);

    var Workspace = new Parse.Object("WorkSpace");
    var queryWORKSPACE = new Parse.Query("WorkSpace");
    Workspace.id = workspace;

    var Project = new Parse.Object("Project");
    Project.id = project;

    var User = new Parse.Object("_User");
    User.id = user;

    //var beforeQuery = process.hrtime(time);
    //console.log(`before query took ${(beforeQuery[0] * NS_PER_SEC + beforeQuery[1])  * MS_PER_NS} milliseconds`);
    //var bQuery = process.hrtime();


    // todo get posts that the user is allowed to view
    // todo check isMember/isFollower for workspace
    // question - should we give all projects for all workspaces even if they are not selected? an store in local db?

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
        //queryPROJECTFOLLOW.select(["ACL", "objectId", "workspace.workspace_name", "archive", "name", "type" , "default", "category", "isMember", "isFollower", "user"]);
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

    // function to find queryProjectFollowFind results
    function queryProjectFollowFind (callback) {


        //var NS_PER_SEC = 1e9;
        //const MS_PER_NS = 1e-6;
        //var timequerySocialPostFind = process.hrtime();
        //var querySocialPostFindTime;

        queryPROJECTFOLLOW.include("project");
        queryPROJECTFOLLOW.doesNotExist("archive");
        queryPROJECTFOLLOW.equalTo("user", User);
        queryPROJECTFOLLOW.equalTo("type", "1"); // user is either a member of follower of this project

        //queryPROJECTFOLLOW.select(["ACL", "objectId", "workspace.workspace_name", "archive", "name", "type" , "default", "category", "isMember", "isFollower", "user"]);
        if (!workspace || (workspace === "all")) {
            // do nothing, get all projects for the user
            //queryPROJECTFOLLOW.matchesQuery("workspace", queryWORKSPACE);
        } else {
            // only get workspace that the client is asking for
            queryPROJECTFOLLOW.equalTo("workspace", Workspace);

        }

        if (!project || (project === "all")) {
            // do nothing, get all projects for the user
        } else {
            // only get project that the client is asking for
            queryPROJECTFOLLOW.equalTo("project", Project);

        }

        queryPROJECTFOLLOW.find({
            success: function(projectResults) {
                //console.log("postSocialResults 1: "+JSON.stringify(postSocialResults));

                //console.log("querySocialPostFind: "+ postSocialResults.length);

                //querySocialPostFindTime = process.hrtime(timequerySocialPostFind);
                //console.log(`function querySocialPostFindTime took ${(querySocialPostFindTime[0] * NS_PER_SEC + querySocialPostFindTime[1])  * MS_PER_NS} milliseconds`);

                return callback(null, projectResults);
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
        //queryPROJECTFOLLOW.select(["ACL", "objectId", "workspace.workspace_name", "archive", "name", "type" , "default", "category", "isMember", "isFollower", "user"]);
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

        if (!project || (project === "all")) {
            // do nothing, get all projects for the user
        } else {
            // only get project that the client is asking for
            queryCATEGORY.equalTo("project", Project);

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
        async.apply(queryProjectFollowFind),
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
    var project = request.params.project;
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

    queryP.include( ["user", "workspace", "project", "postSocial.user", "postSocial.isLiked", "postSocial.isBookmarked"] );
    queryP.doesNotExist("project.archive", "workspace.archive", "Archive");

    queryP.equalTo("workspace", Workspace);

    // todo get posts that the user is allowed to view

    // setup query filter for post
    queryP.select(["user.fullname", "user.profileimage.url" ,"ACL", "media_duration", "postImage", "post_File", "audioWave", "imageRatio", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url" , "workspace.image", "workspace.objective", "workspace.mission", "workspace.postCount", "project.name", "project.type", "project.postCount", "project.image", "project.category", "project.objective", "BookmarkedBy", "isLikedBy", "isBookmarked", "isLiked", "followerCount", "memberCount"]);
    queryP.descending("updatedAt");
    queryP.limit(hit); // limit to hits
    if (skip) {
        queryP.skip(skip);
    }
    if (project == 'all') {
        // do nothing, since we want all projects in a workspace
    } else if (project) {
        var Project = new Parse.Object("Project");
        Project.id = project;
        queryP.equalTo("project", Project);

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
            query.include( ["user", "workspace", "project"] );
            query.select(["user", "ACL", "media_duration", "postImage", "post_File", "audioWave", "archive", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url" , "project.name", "project.type", "project.archive"]);

            break;
        case "_User":
            index = indexUsers;

            break;
        case "Project":
            index = indexProject;
            query.include( ["user", "workspace", "category"] );

            break;
        case "Meeting":
            index = indexMeetings;

            break;
        case "WorkSpace":
            index = indexWorkspaces;

            break;
        default:
            response.error("The collection entered does not exist. Please enter one of the following collections: _User, Post, WorkSpace, Project, Meeting");
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
            query.include( ["user", "workspace", "project"] );
            //query.select(["user", "ACL", "media_duration", "postImage", "post_File", "audioWave", "archive", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url" , "project.name", "project.type", "project.archive"]);

            break;
        case "_User":
            index = indexUsers;
            skills = "mySkills";
            query.include( ["currentCompany"] );
            skillsToLearn = "skillsToLearn";

            break;
        case "Project":
            index = indexProject;
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
            response.error("The collection entered does not exist. Please enter one of the following collections: _User, Post, WorkSpace, Project, Meeting");
    };



    // Find all items
    query.find({
        success: function(objectsToIndex) {

                async.map(objectsToIndex, function(object, cb) {

                    var workspace = object;
                    var workspaceToSave = object.toJSON();

                    function getSkills (callback) {

                        if (collection != "WorkSpace") {

                            return callback (null, object);

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

                                    console.log("Skills: " + JSON.stringify(skill));

                                    return callback(null, skill);

                                },
                                error: function (error) {
                                    alert("Error: " + error.code + " " + error.message);
                                    return callback(error);
                                }
                            }, {useMasterKey: true});
                        }

                    }

                    function getExperts (callback) {

                        if (collection != "WorkSpace") {

                            return callback (null, object);

                        } else {

                            // todo check if expert is dirty, if no ignore and return callback

                            var expertObject = Parse.Object.extend("_User");
                            expertObject = workspace.get("experts");
                            //console.log("Experts: " + JSON.stringify(expertObject));

                            expertObject.query().select(["fullname", "displayName", "isOnline", "showAvailability", "profileimage", "createdAt", "updatedAt", "objectId"]).find({

                                success: function (experts) {

                                    // Convert Parse.Object to JSON
                                    //workspace = workspace.toJSON();
                                    var User = new Parse.Object("_User");
                                    var queryRole = new Parse.Query(Parse.Role);

                                    console.log("\n Experts: " + JSON.stringify(experts));

                                    queryRole.equalTo('name', 'expert-' + workspace.id);

                                    queryRole.first({
                                        success: function (role) {
                                            //console.log("Role when expert is added: " + JSON.stringify(role));

                                            var expertrole = role;

                                            //console.log("Role: " + JSON.stringify(role));

                                            expertrole.getUsers(null, {useMasterKey: true}).add(experts);
                                            expertrole.save(null, {useMasterKey: true});
                                            var userRolesRelation;

                                            for (var i = 0; i < experts.length; i++) {

                                                userRolesRelation = experts[i].relation("roles");
                                                userRolesRelation.add(expertrole); // add owner role to the user roles field.
                                                experts[i].save(null, {useMasterKey: true});

                                            }

                                            return callback(null, experts);

                                        },
                                        error: function (err) {
                                            return callback(err);
                                        }

                                    }, {useMasterKey: true});


                                },
                                error: function (error) {
                                    alert("Error: " + error.code + " " + error.message);
                                    return callback(error);
                                }
                            }, {useMasterKey: true});

                        }

                    }

                    function getWorkspaceFollowers (callback) {

                        //todo check for when we should be updating workspace_follower in Algolia Index
                        // get workspace_followers only in the following scenarios (1) user isFollower or isMember == true (2) workspace admin sent request for a user to join a workspace it's viewable to that user.

                        if (collection != "WorkSpace") {

                            return callback (null, object);

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

                                        workspaceToSave.viewable_by = viewableBy;
                                        //console.log("workspace 2: " + JSON.stringify(workspaceToSave));

                                    } else if (workspaceToSave.type === 'public') {

                                        workspaceToSave.viewable_by = ['*'];

                                    }

                                    // console.log("followers: " + JSON.stringify(workspaceToSave.followers));

                                    return callback(null, workspaceToSave);

                                },
                                error: function (error) {
                                    alert("Error: " + error.code + " " + error.message);
                                    return callback(error);
                                }
                            }, {useMasterKey: true});

                        }


                    }


                    }

                    async.parallel([
                        async.apply(getSkills),
                        async.apply(getExperts),
                        async.apply(getWorkspaceFollowers)

                    ], function (err, results) {
                        if (err) {
                            return cb (err);
                        }

                        //console.log("results length: " + JSON.stringify(results));

                        if (collection === "WorkSpace") {

                            workspaceToSave = results[3];
                            var skillsToSave = results[1];
                            var expertsToSave = results[2];

                            workspaceToSave["skills"] = skillsToSave;
                            workspaceToSave["experts"] = expertsToSave;

                            console.log("skillsToSave: " + JSON.stringify(skillsToSave));
                            console.log("expertsToSave: " + JSON.stringify(expertsToSave));
                            console.log("workspaceToSave: " + JSON.stringify(workspaceToSave));

                            return cb (null, workspaceToSave);


                            }
                        else {

                                // convert to regular key/value JavaScript object
                                object = results[3];
                                object = object.toJSON();
                                // Specify Algolia's objectID with the Parse.Object unique ID
                                object.objectID = object.objectId;

                                return cb (null, object);
                        }

                    });

                    /*
                    var skillObject = Parse.Object.extend("Skill");
                    var expertObject = Parse.Object.extend("_User");

                    //console.log("workspace: " + JSON.stringify(object));

                    skillObject = object.get("skills");
                    //console.log("Skills Index: " + JSON.stringify(skillObject));

                    expertObject = object.get("experts");
                    //console.log("Experts: " + JSON.stringify(expertObject));

                    // convert to regular key/value JavaScript object
                    object = object.toJSON();
                    // Specify Algolia's objectID with the Parse.Object unique ID
                    object.objectID = object.objectId;

                    var skillObjectQuery = skillObject.query();
                    skillObjectQuery.ascending("level");
                    skillObjectQuery.find({

                        success: function (skill) {

                            //console.log("SKills : "+ JSON.stringify(skill));


                            object['skills'] = skill;
                            //console.log("New Workspace: " + JSON.stringify(object));

                            // Specify Algolia's objectID with the Parse.Object unique ID
                            //workspace.objectID = workspace.objectId;

                            expertObject.query().find({

                                success: function(user) {


                                    //console.log("Experts: " + JSON.stringify(user));

                                    object['experts']  = user;
                                    //console.log("New Workspace experts: " + JSON.stringify(object));

                                    let viewableBy = [];
                                    //experts.map(v => arrayExperts.push(v));

                                    //experts.forEach(v => arrayExperts.push(v));

                                    for(let i = 0; i < user.length; i++) {

                                        viewableBy.push(user[i].toJSON().objectId);
                                        console.log("expertID: " + JSON.stringify(user[i].toJSON().objectId));
                                    }


                                    //viewableBy = lodash.map(arrayExperts, lodash.partial(lodash.ary(lodash.pick, 1), lodash, ['objectId']));

                                    //const results = fp.map(fp.pick(['displayName', 'currentCompany', 'profileimage', 'showAvailability', 'isOnline'], arrayExperts);

                                    console.log("viewableBy: " + JSON.stringify(viewableBy));


                                    if (object.type === 'public') {
                                        object.viewable_by = ['*'];

                                    } else {

                                        object.viewable_by = viewableBy;
                                    }

                                    return cb (null, object);



                                },
                                error: function(error) {
                                    alert("Error: " + error.code + " " + error.message);
                                    return callback(error);
                                }
                            }, {useMasterKey: true});


                        },
                        error: function(error) {
                            alert("Error: " + error.code + " " + error.message);
                            return callback(error);
                        }
                    }, {useMasterKey: true});

                    */


            }, function(err, objectsToIndex) {

                console.log("PrepIndex completed: " + JSON.stringify(objectsToIndex.length));

                // Add or update new objects
                indexWorkspaces.partialUpdateObjects(objectsToIndex, true, function(err, content) {
                    if (err) response.error(err);

                    console.log("Parse<>Algolia workspace saved from indexCollection function ");

                    var finalTime = process.hrtime(time);
                    console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
                    response.success();

                });

            });


        },
        error: function(err) {
            response.error(err);
        }
    }, {useMasterKey: true});

}, {useMasterKey: true});

// Run beforeSave functions for hashtags, mentions, URL and luis.ai intents
Parse.Cloud.beforeSave('_User', function(req, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    var user = req.object;
    var socialProfilePicURL = user.get("socialProfilePicURL");
    var profileImage = user.get("profileimage");


    if (user.dirty("profileimage")) {

        user.set("isDirtyProfileimage", true);

        console.log("Profileimage url: " + JSON.stringify(profileImage.toJSON().url));


    } else {user.set("isDirtyProfileimage", false);}

    if (user.dirty("isOnline")) {
        user.set("isDirtyIsOnline", true);

    } else {user.set("isDirtyIsOnline", false);}

    if (user.isNew()) { user.set("showAvailability", true);}


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


        response.success();
    })
    .catch(console.error);

    } else {response.success();}

});

// Run beforeSave functions workspace
Parse.Cloud.beforeSave('WorkSpace', function(req, response) {

    /*var NS_PER_SEC = 1e9;
     const MS_PER_NS = 1e-6;
     var time = process.hrtime();*/
    var workspace = req.object;
    var owner = new Parse.Object("_User");
    owner = workspace.get("user");
    var expertRelation = workspace.relation("experts");

    //var WORKSPACE = Parse.Object.extend("WorkSpace");
    var WORKspace = new Parse.Object("WorkSpace");

    var queryWorkspace = new Parse.Query(WORKspace);

    if (workspace.isNew() ) {


        queryWorkspace.equalTo("workspace_url", workspace.get("workspace_url"));

        queryWorkspace.first({
            success: function(results) {

                if (results) {

                    // workspace url is not unique return error

                    response.error(results);

                } else {

                    // set the workspace owner as an expert
                    expertRelation.add(owner);

                    workspace.set("isNew", true);

                    //console.log("request: " + JSON.stringify(req));

                    response.success();


                }
            },
            error: function(err) {
                response.error("An error occured: " + err);

            }
        });




    } else if (!workspace.isNew() && workspace.dirty("workspace_url")) {

        workspace.set("isNew", false);

        queryWorkspace.equalTo("workspace_url", workspace.get("workspace_url"));

        queryWorkspace.first({
            success: function(results) {

                if (results) {

                    // workspace url is not unique return error

                    response.error(results);

                } else {



                    response.success();


                }
            },
            error: function(err) {
                response.error("An error occured: " + err);

            }
        });

    } else if (!workspace.isNew()) {

        workspace.set("isNew", false);
        response.success();

    } else {response.success();}

});

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
    var project = post.get("project");
    //console.log("project_post: " + JSON.stringify(project));

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
            Workspace.save();


            if (project) {
                // add counter for posts to project collection
                var PROJECT = Parse.Object.extend("Project");
                var Project = new PROJECT();
                Project.id = project.id;

                Project.increment("postCount");
                Project.save();

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
                        postSocialResults[i].save();

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

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    var workspace_follower = req.object;
    var workspace = workspace_follower.get("workspace");

    var WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
    var WorkspaceFollower = new WORKSPACEFOLLOWER();
    WorkspaceFollower.id = workspace_follower.id;
    var queryWorkspaceFollower = new Parse.Query(WORKSPACEFOLLOWER);

    // add counter for posts to workspace collection
    var WORKSPACE = Parse.Object.extend("WorkSpace");
    var Workspace = new WORKSPACE();
    Workspace.id = workspace.id;

    var user = new Parse.Object("_User");
    user = workspace_follower.get("user");

    var memberName = "member-" + Workspace.id;
    var followerName = "Follower-" + Workspace.id;

    var queryMemberRole = new Parse.Query(Parse.Role);
    var queryfollowerRole = new Parse.Query(Parse.Role);

    // if there is a new workspace_follower object increase counter for number of followers and members on a workspace
    if (workspace_follower.isNew()) {

        var beforeSave_Time;
        var workspaceFollowerName = workspace_follower.get("user").id + "-" + workspace_follower.get("workspace").id;
        console.log("workspaceFollowerName user: " + JSON.stringify(workspaceFollowerName));

        workspace_follower.set("name", workspaceFollowerName);

        queryWorkspaceFollower.equalTo("name", workspaceFollowerName);

        // check to make sure that the workspace_follower for a user - workspace is unique
        queryWorkspaceFollower.first({
            success: function(results) {

                if (results) {

                    //Workspace_follower already exists in DB in Skill table, return an error because it needs to be unique

                    response.error(results);

                } else {

                    if(workspace_follower.get("isFollower") === true && workspace_follower.get("isMember") === true) {
                        Workspace.increment("followerCount");
                        Workspace.increment("memberCount");
                        Workspace.save(null, {useMasterKey: true});

                        // a member is already a follower so only add member role for this user.

                        console.log("user: " + JSON.stringify(user));

                        queryMemberRole.equalTo('name', memberName);
                        queryMemberRole.first({
                            success: function(memberRole) { // Role Object
                                //console.log("Okay, that's a start... in success 1 with memberRole: " + JSON.stringify(memberRole));

                                memberRole.getUsers().add(user);
                                memberRole.save(null, {useMasterKey: true});

                                var userRolesRelation = user.relation("roles");
                                userRolesRelation.add(memberRole);

                                // now add follower since a member is by default a follower
                                queryfollowerRole.equalTo('name', followerName);
                                queryfollowerRole.first({
                                    success: function(followerRole) { // Role Object
                                        //console.log("Okay, that's a start... in success 1 with followerRole: " + JSON.stringify(followerRole));

                                        followerRole.getUsers().add(user);
                                        followerRole.save(null, {useMasterKey: true});

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.add(followerRole);
                                        user.save(null, {useMasterKey: true});

                                    },
                                    error: function(error) {
                                        console.log("Bruh, can't find the Admin role");
                                        response.error(error);
                                    }
                                });

                            },
                            error: function(error) {
                                console.log("Bruh, can't find the Admin role");
                                response.error(error);
                            }
                        });


                        //beforeSave_Time = process.hrtime(time);
                        //console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                        response.success();
                    } else if (workspace_follower.get("isFollower") === true && workspace_follower.get("isMember") === false) {
                        Workspace.increment("followerCount");
                        Workspace.save(null, {useMasterKey: true});

                        queryfollowerRole.equalTo('name', followerName);
                        queryfollowerRole.first({
                            success: function(followerRole) { // Role Object
                                //console.log("Okay, that's a start... in success 1 with followerRole: " + JSON.stringify(followerRole));

                                followerRole.getUsers().add(user);
                                followerRole.save(null, {useMasterKey: true});

                                var userRolesRelation = user.relation("roles");
                                userRolesRelation.add(followerRole);
                                user.save(null, {useMasterKey: true});

                            },
                            error: function(error) {
                                console.log("Bruh, can't find the Admin role");
                                response.error(error);
                            }
                        });


                        //beforeSave_Time = process.hrtime(time);
                        //console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                        response.success();

                    } else if (workspace_follower.get("isFollower") === false && workspace_follower.get("isMember") === true) {
                        Workspace.increment("memberCount");
                        Workspace.save(null, {useMasterKey: true});

                        // a member is already a follower so only add member role for this user.
                        workspace_follower.set("isFollower", true);

                        //console.log("memberName: " + JSON.stringify(memberName));

                        queryMemberRole.equalTo('name', memberName);
                        queryMemberRole.first({
                            success: function(memberRole) { // Role Object
                                //console.log("Okay, that's a start... in success 1 with memberRole: " + JSON.stringify(memberRole));

                                memberRole.getUsers().add(user);
                                memberRole.save(null, {useMasterKey: true});

                                var userRolesRelation = user.relation("roles");
                                userRolesRelation.add(memberRole);

                                // now add follower since a member is by default a follower
                                queryfollowerRole.equalTo('name', followerName);
                                queryfollowerRole.first({
                                    success: function(followerRole) { // Role Object
                                        //console.log("Okay, that's a start... in success 1 with followerRole: " + JSON.stringify(followerRole));

                                        followerRole.getUsers().add(user);
                                        followerRole.save(null, {useMasterKey: true});

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.add(followerRole);
                                        user.save(null, {useMasterKey: true});

                                    },
                                    error: function(error) {
                                        console.log("Bruh, can't find the Admin role");
                                        response.error(error);
                                    }
                                });

                            },
                            error: function(error) {
                                console.log("Bruh, can't find the Admin role");
                                response.error(error);
                            }
                        });

                        response.success();

                    } else {
                        response.error("isFollower and isMember are both required fields and one has to be set to true");

                    }




                }


            },
            error: function(err) {
                response.error("An error occured: " + err);

            }
        });



    } else if (!workspace_follower.isNew() && (workspace_follower.dirty("isFollower") || workspace_follower.dirty("isMember"))) {

        //console.log(WorkspaceFollower.id);
        queryWorkspaceFollower.get(WorkspaceFollower.id, {
                success: function(result) {

                    //console.log("old isFollower: "+JSON.stringify(result.get("isFollower")) + " New isFollower: " + JSON.stringify(workspace_follower.get("isFollower")) + " isFollower.dirty: "+JSON.stringify(workspace_follower.dirty("isFollower")));
                    //console.log("old isMember: "+JSON.stringify(result.get("isMember")) + " New isMember: " + JSON.stringify(workspace_follower.get("isMember")) + " isMember.dirty: "+JSON.stringify(workspace_follower.dirty("isMember")));

                    //queryPTime = process.hrtime(timequeryPostFind);
                    //console.log(`function queryPostFind took ${(queryPTime[0] * NS_PER_SEC + queryPTime[1])  * MS_PER_NS} milliseconds`);

                    if (workspace_follower.dirty("isFollower")) {

                        if (result.get("isFollower") === workspace_follower.get("isFollower")) {

                            console.log("user isFollower did not change");
                            // doin't increment or decrement because the user isFollow status did not change

                        } else if ((result.get("isFollower")  === false || !result.get("isFollower") ) && workspace_follower.get("isFollower") === true) {

                            Workspace.increment("followerCount");
                            console.log("increment Follower");
                            //Workspace.save();

                            queryfollowerRole.equalTo('name', followerName);
                            queryfollowerRole.first({
                                success: function(followerRole) { // Role Object
                                    //console.log("Okay, that's a start... in success 1 with followerRole: " + JSON.stringify(followerRole));

                                    followerRole.getUsers().add(user);
                                    followerRole.save(null, {useMasterKey: true});

                                    var userRolesRelation = user.relation("roles");
                                    userRolesRelation.add(followerRole);
                                    user.save(null, {useMasterKey: true});

                                },
                                error: function(error) {
                                    console.log("Bruh, can't find the Admin role");
                                    response.error(error);
                                }
                            });

                        } else if ((result.get("isFollower")  === true) && workspace_follower.get("isFollower") === false) {


                            if ((!workspace_follower.get("isMember") || workspace_follower.get("isMember") === false) && result.get("isMember")  === false) {

                                // not a member so remove user as follower of that workspace
                                Workspace.increment("followerCount", -1);
                                console.log("decrement Follower");
                                //Workspace.save();

                                queryfollowerRole.equalTo('name', followerName);
                                queryfollowerRole.first({
                                    success: function(followerRole) { // Role Object
                                        //console.log("Okay, that's a start... in success 1 with followerRole: " + JSON.stringify(followerRole));

                                        followerRole.getUsers().remove(user);
                                        followerRole.save(null, {useMasterKey: true});

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.remove(followerRole);
                                        user.save(null, {useMasterKey: true});

                                    },
                                    error: function(error) {
                                        console.log("Bruh, can't find the Admin role");
                                        response.error(error);
                                    }
                                });


                            } else if ((!workspace_follower.get("isMember") || workspace_follower.get("isMember") === false) && result.get("isMember")  === true) {

                                // since the user was a member, and wants to unfollow this workspace we will remove him from this workspace as a member and follower
                                workspace_follower.set("isMember", false);
                                Workspace.increment("followerCount", -1);
                                //Workspace.increment("memberCount", -1);
                                console.log("decrement Member & Follower");

                                // now remove both member and follower roles since the user is leaving the workspace and un-following it.
                                queryMemberRole.equalTo('name', memberName);
                                queryMemberRole.first({
                                    success: function(memberRole) { // Role Object
                                        //console.log("Okay, that's a start... in success 1 with memberRole: " + JSON.stringify(memberRole));

                                        memberRole.getUsers().remove(user);
                                        memberRole.save(null, {useMasterKey: true});

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.remove(memberRole);

                                        // now add follower since a member is by default a follower
                                        queryfollowerRole.equalTo('name', followerName);
                                        queryfollowerRole.first({
                                            success: function(followerRole) { // Role Object
                                                //console.log("Okay, that's a start... in success 1 with followerRole: " + JSON.stringify(followerRole));

                                                followerRole.getUsers().remove(user);
                                                followerRole.save(null, {useMasterKey: true});

                                                var userRolesRelation = user.relation("roles");
                                                userRolesRelation.remove(followerRole);
                                                user.save(null, {useMasterKey: true});

                                            },
                                            error: function(error) {
                                                console.log("Bruh, can't find the Admin role");
                                                response.error(error);
                                            }
                                        });

                                    },
                                    error: function(error) {
                                        console.log("Bruh, can't find the Admin role");
                                        response.error(error);
                                    }
                                });


                            } else if ((!workspace_follower.get("isMember") || workspace_follower.get("isMember") === true) && result.get("isMember")  === false) {

                                // since the user was a member, and wants to unfollow this workspace we will remove him from this workspace as a member and follower
                                workspace_follower.set("isMember", false);
                                Workspace.increment("followerCount", -1);
                                //Workspace.increment("memberCount", -1);
                                console.log("decrement Member & Follower");

                                // now remove both member and follower roles since the user is leaving the workspace and un-following it.
                                queryMemberRole.equalTo('name', memberName);
                                queryMemberRole.first({
                                    success: function(memberRole) { // Role Object
                                        //console.log("Okay, that's a start... in success 1 with memberRole: " + JSON.stringify(memberRole));

                                        memberRole.getUsers().remove(user);
                                        memberRole.save(null, {useMasterKey: true});

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.remove(memberRole);

                                        // now add follower since a member is by default a follower
                                        queryfollowerRole.equalTo('name', followerName);
                                        queryfollowerRole.first({
                                            success: function(followerRole) { // Role Object
                                                //console.log("Okay, that's a start... in success 1 with followerRole: " + JSON.stringify(followerRole));

                                                followerRole.getUsers().remove(user);
                                                followerRole.save(null, {useMasterKey: true});

                                                var userRolesRelation = user.relation("roles");
                                                userRolesRelation.remove(followerRole);
                                                user.save(null, {useMasterKey: true});

                                            },
                                            error: function(error) {
                                                console.log("Bruh, can't find the Admin role");
                                                response.error(error);
                                            }
                                        });

                                    },
                                    error: function(error) {
                                        console.log("Bruh, can't find the Admin role");
                                        response.error(error);
                                    }
                                });


                            } else if ((!workspace_follower.get("isMember") || workspace_follower.get("isMember") === true) && result.get("isMember")  === true) {

                                // since the user was a member, and wants to unfollow this workspace we will remove him from this workspace as a member and follower
                                workspace_follower.set("isMember", false);
                                Workspace.increment("followerCount", -1);
                                //Workspace.increment("memberCount", -1);
                                console.log("decrement Member & Follower");

                                // now remove both member and follower roles since the user is leaving the workspace and un-following it.
                                queryMemberRole.equalTo('name', memberName);
                                queryMemberRole.first({
                                    success: function(memberRole) { // Role Object
                                        //console.log("Okay, that's a start... in success 1 with memberRole: " + JSON.stringify(memberRole));

                                        memberRole.getUsers().remove(user);
                                        memberRole.save(null, {useMasterKey: true});

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.remove(memberRole);

                                        // now add follower since a member is by default a follower
                                        queryfollowerRole.equalTo('name', followerName);
                                        queryfollowerRole.first({
                                            success: function(followerRole) { // Role Object
                                                //console.log("Okay, that's a start... in success 1 with followerRole: " + JSON.stringify(followerRole));

                                                followerRole.getUsers().remove(user);
                                                followerRole.save(null, {useMasterKey: true});

                                                var userRolesRelation = user.relation("roles");
                                                userRolesRelation.remove(followerRole);
                                                user.save(null, {useMasterKey: true});

                                            },
                                            error: function(error) {
                                                console.log("Bruh, can't find the Admin role");
                                                response.error(error);
                                            }
                                        });

                                    },
                                    error: function(error) {
                                        console.log("Bruh, can't find the Admin role");
                                        response.error(error);
                                    }
                                });


                            }



                        } else {

                            console.log("do nothing Follower");
                            // do nothing

                        }

                    }

                    if (workspace_follower.dirty("isMember")) {

                        if (result.get("isMember")  === workspace_follower.get("isMember")) {

                            console.log("user isMember did not change");
                            // doin't increment or decrement because the user isFollow status did not change

                        } else if ((result.get("isMember") === false || !result.get("isMember")) && workspace_follower.get("isMember") === true) {

                            if ((!workspace_follower.get("isFollower") || workspace_follower.get("isFollower") === false) && result.get("isFollower") === false) {

                                // since user was not a follower, but is now a member make him also a follower

                                Workspace.increment("memberCount");
                                Workspace.increment("followerCount");
                                console.log("increment Follower & Member");
                                //Workspace.save();

                                // now add both member and follower roles since the user is leaving the workspace and un-following it.
                                queryMemberRole.equalTo('name', memberName);
                                queryMemberRole.first({
                                    success: function(memberRole) { // Role Object
                                        //console.log("Okay, that's a start... in success 1 with memberRole: " + JSON.stringify(memberRole));

                                        memberRole.getUsers().add(user);
                                        memberRole.save(null, {useMasterKey: true});

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.add(memberRole);

                                        // now add follower since a member is by default a follower
                                        queryfollowerRole.equalTo('name', followerName);
                                        queryfollowerRole.first({
                                            success: function(followerRole) { // Role Object
                                                //console.log("Okay, that's a start... in success 1 with followerRole: " + JSON.stringify(followerRole));

                                                followerRole.getUsers().add(user);
                                                followerRole.save(null, {useMasterKey: true});

                                                var userRolesRelation = user.relation("roles");
                                                userRolesRelation.add(followerRole);
                                                user.save(null, {useMasterKey: true});

                                            },
                                            error: function(error) {
                                                console.log("Bruh, can't find the Admin role");
                                                response.error(error);
                                            }
                                        });

                                    },
                                    error: function(error) {
                                        console.log("Bruh, can't find the Admin role");
                                        response.error(error);
                                    }
                                });


                            } else {

                                // since user is already follower, make him only a member

                                Workspace.increment("memberCount");
                                console.log("increment  Member");
                                //Workspace.save();

                                // now add both member and follower roles since the user is leaving the workspace and un-following it.
                                queryMemberRole.equalTo('name', memberName);
                                queryMemberRole.first({
                                    success: function(memberRole) { // Role Object
                                        //console.log("Okay, that's a start... in success 1 with memberRole: " + JSON.stringify(memberRole));

                                        memberRole.getUsers().add(user);
                                        memberRole.save(null, {useMasterKey: true});

                                        var userRolesRelation = user.relation("roles");
                                        userRolesRelation.add(memberRole);
                                        user.save(null, {useMasterKey: true});


                                    },
                                    error: function(error) {
                                        console.log("Bruh, can't find the Admin role");
                                        response.error(error);
                                    }
                                });



                            }



                        } else if ((result.get("isMember") === true) && workspace_follower.get("isMember") === false) {

                            Workspace.increment("memberCount", -1);
                            console.log("decrement Member");
                            //Workspace.save();

                            queryMemberRole.equalTo('name', memberName);
                            queryMemberRole.first({
                                success: function(memberRole) { // Role Object
                                    //console.log("Okay, that's a start... in success 1 with memberRole: " + JSON.stringify(memberRole));

                                    memberRole.getUsers().remove(user);
                                    memberRole.save(null, {useMasterKey: true});

                                    var userRolesRelation = user.relation("roles");
                                    userRolesRelation.remove(memberRole);
                                    user.save(null, {useMasterKey: true});

                                },
                                error: function(error) {
                                    console.log("Bruh, can't find the Admin role");
                                    response.error(error);
                                }
                            });

                        } else {

                            console.log("do nothing Member");
                            // do nothing

                        }


                    }

                    console.log("Workspace: "+JSON.stringify(Workspace));
                    Workspace.save(null, {useMasterKey: true});
                    beforeSave_Time = process.hrtime(time);
                    console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                    response.success();


                },
                error: function(object, error){
                    response.error("queryWorkspaceFollower Error: "+ JSON.stringify(error));
                }
            }


        );

    }   else {

        //console.log("do nothing at all");

        var beforeSaveElse_Time = process.hrtime(time);
        console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1])  * MS_PER_NS} milliseconds`);

        response.success();

    }

});

// Run beforeSave functions to count number of project followers and members
Parse.Cloud.beforeSave('ProjectFollow', function(req, response) {

    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    var projectfollow = req.object;
    var project = projectfollow.get("workspace");

    var PROJECTFOLLOW = Parse.Object.extend("ProjectFollow");
    var ProjectFollow = new PROJECTFOLLOW();
    ProjectFollow.id = projectfollow.id;
    var queryProjectFollow = new Parse.Query(PROJECTFOLLOW);

    var PROJECT = Parse.Object.extend("Project");
    var Project = new PROJECT();
    Project.id = project.id;

    //console.log("post: " + JSON.stringify(projectfollow));

    // if there is a post that got added, then increase counter, else ignoremyObject
    if (projectfollow.isNew()) {

        var beforeSave_Time;

        if(projectfollow.get("isFollower") === true && projectfollow.get("isMember") === true) {
            Project.increment("followerCount");
            Project.increment("memberCount");
            Project.save();
            beforeSave_Time = process.hrtime(time);
            console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

            response.success();
        } else if (projectfollow.get("isFollower") === true && projectfollow.get("isMember") === false) {
            Project.increment("followerCount");
            Project.save();
            beforeSave_Time = process.hrtime(time);
            console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

            response.success();

        } else if (projectfollow.get("isFollower") === false && projectfollow.get("isMember") === true) {
            Project.increment("memberCount");
            Project.save();
            beforeSave_Time = process.hrtime(time);
            console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

            response.success();

        } else {

            beforeSave_Time = process.hrtime(time);
            console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

            response.success();

        }

    } else if (!projectfollow.isNew() && (projectfollow.dirty("isFollower") || projectfollow.dirty("isMember"))) {

        queryProjectFollow.get(ProjectFollow.id, {
                success: function(result) {

                    console.log("queryWorkspaceFollower: "+JSON.stringify(result));

                    //queryPTime = process.hrtime(timequeryPostFind);
                    //console.log(`function queryPostFind took ${(queryPTime[0] * NS_PER_SEC + queryPTime[1])  * MS_PER_NS} milliseconds`);
                    //console.log("results: "+JSON.stringify(results));

                    if (projectfollow.dirty("isFollower")) {

                        if (result.get("isFollower") === projectfollow.get("isFollower")) {

                            console.log("user isFollower did not change");
                            // doin't increment or decrement because the user isFollow status did not change

                        } else if ((result.get("isFollower") === false || !result.get("isFollower")) && projectfollow.get("isFollower") === true) {

                            Project.increment("followerCount");
                            //Workspace.save();

                        } else if ((result.get("isFollower") === true) && projectfollow.get("isFollower") === false) {

                            Project.increment("followerCount", -1);
                            //Workspace.save();

                        } else {

                            // do nothing

                        }

                    } else if (projectfollow.dirty("isMember")) {

                        if (result.get("isMember") === projectfollow.get("isMember")) {

                            console.log("user isMember did not change");
                            // doin't increment or decrement because the user isFollow status did not change

                        } else if ((result.get("isMember") === false || !result.get("isMember")) && projectfollow.get("isMember") === true) {

                            Project.increment("memberCount");
                            //Workspace.save();

                        } else if ((result.get("isMember") === true) && projectfollow.get("isMember") === false) {

                            Project.increment("memberCount", -1);
                            //Workspace.save();

                        } else {

                            console.log("do nothing Member");
                            // do nothing

                        }

                    }

                    Project.save();
                    beforeSave_Time = process.hrtime(time);
                    console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

                    response.success();


                },
                error: function(err) {
                    response.error("queryProjectFollow Error: "+ err);
                }
            }


        );

    }   else {

        var beforeSaveElse_Time = process.hrtime(time);
        console.log(`beforeSaveElse_Time Posts took ${(beforeSaveElse_Time[0] * NS_PER_SEC + beforeSaveElse_Time[1])  * MS_PER_NS} milliseconds`);

        response.success();

    }

});

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

    post.save();

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
    queryPost.include( ["user", "workspace", "project"] );
    queryPost.select(["user", "ACL", "media_duration", "postImage", "post_File", "audioWave", "archive", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url", "project.name", "project.type", "project.archive", "post_title", "questionAnswerEnabled" /*,"transcript"*/]);
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

            postQuestion.save().then((postQuestion) => {
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
        Post.save();

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

                var Project = new Parse.Object("Project");
                Project.id = meetingObject.get("channel");
                //console.log("Project ID: "  + JSON.stringify(Project.id));

                var User = new Parse.Object("_User");
                User.id = meetingObject.get("user");
                //console.log("User ID: "  + JSON.stringify(User.id));

                //console.log("meetingPost: " + JSON.stringify(meetingPost));

                if (meetingObject.get("workspace")) {meetingPost.set("workspace", Workspace.id);}
                if (meetingObject.get("channel")) {meetingPost.set("project", Project.id);}
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


                meetingPost.save()
                    .then((meetingPost) => {
                    // Execute any logic that should take place after the object is saved.
                    //alert('New object created with objectId: ' + meetingPost.id);
                    //console.log("meetingPost3: " + JSON.stringify(meetingPost.id));

                    if (!meetingObject.get("post")) {
                    meetingObject.set("post", meetingPost);
                    meetingObject.save();
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

        //console.log("userid: " + JSON.stringify(objectToSave.objectId));

        function updateAlgoliaWorkspaceExpertProfileImage (callback) {

        //console.log("username: " + JSON.stringify(objectToSave.username));

        if (user.get("isDirtyProfileimage") != true && user.get("isDirtyIsOnline") != true) {

            //console.log("no update to workspaces in algolia: " + user.get("isDirtyProfileimage") + " " + user.get("isDirtyIsOnline"));

            return callback (null, user);

        }

        var WORKSPACE = Parse.Object.extend("WorkSpace");
        var workspaceQuery = new Parse.Query(WORKSPACE);
        var User = Parse.Object.extend("_User");
        var userQuery = new Parse.Query(User);

        //userQuery.exists("profileimage");
        //userQuery.select(["profileimage"]);
        //console.log("username: " + JSON.stringify(objectToSave.username));
        //userQuery.equalTo("username", objectToSave.username);
        userQuery.equalTo("objectId", objectToSave.objectId);
        //console.log("username: " + JSON.stringify(objectToSave.username));
        workspaceQuery.matchesQuery("experts", userQuery);
        workspaceQuery.select(["experts"], ["skills"]);
        //console.log("imageChanged: " + JSON.stringify(objectToSave.dirty("profileimage")));


        workspaceQuery.find({

            success: function (workspaces) {

                //console.log("workspaces length: " + JSON.stringify(workspaces.length));
                //var mappedWORKSPACE = Parse.Object.extend("WorkSpace");
                //var mappedWorkspace = new Parse.Object(mappedWORKSPACE);

                /*var partialWorkspaces = async.map(workspaces, function (Workspace, cb) {

                 //console.log("Workspace: " + JSON.stringify(Workspace));

                 //var mappedWORKSPACE = Parse.Object.extend("WorkSpace");
                 //var mappedWorkspace = new Parse.Object(mappedWORKSPACE);

                 mappedWorkspace = mappedWorkspace.toJSON();
                 //console.log("mappedWorkspace 1: " + JSON.stringify(mappedWorkspace));

                 var expertsArray = [];
                 //console.log("Workspace ID: " + Workspace.toJSON().objectId);
                 mappedWorkspace['objectID'] = Workspace.toJSON().objectId;
                 //console.log("mappedWorkspace 2: " + JSON.stringify(mappedWorkspace));
                 expertsArray.push(user);
                 //console.log("expertsArray: " + JSON.stringify(expertsArray));
                 mappedWorkspace['experts'] = expertsArray;
                 //console.log("mappedWorkspace 3: " + JSON.stringify(mappedWorkspace));

                 Workspace = mappedWorkspace;

                 cb (null, Workspace);

                 }, function(err)
                 console.log('iterating done partialWorkspaces');
                 return callback (err);

                 });*/

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
                                    //let viewableBy = [];
                                    //experts.map(v => arrayExperts.push(v));

                                    //experts.forEach(v => arrayExperts.push(v));

                                    /*for(let i = 0; i < experts.length; i++) {

                                     viewableBy.push(experts[i].toJSON().objectId);
                                     //console.log("expertID: " + JSON.stringify(experts[i].toJSON().objectId));
                                     arrayExperts.push(experts[i]);
                                     }*/


                                    //viewableBy = lodash.map(arrayExperts, lodash.partial(lodash.ary(lodash.pick, 1), lodash, ['objectId']));

                                    //const results = fp.map(fp.pick(['displayName', 'currentCompany', 'profileimage', 'showAvailability', 'isOnline'], arrayExperts);

                                    //console.log("viewableBy: " + JSON.stringify(viewableBy));

                                    WorkSpace.experts = arrayExperts;
                                    //console.log("New Workspace experts: " + JSON.stringify(WorkSpace));

                                    /*if (WorkSpace.type === 'public') {
                                     WorkSpace.viewable_by = ['*'];

                                     } else {

                                     WorkSpace.viewable_by = viewableBy;
                                     }*/

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

        }, {useMasterKey: true});




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
    });


}, {useMasterKey: true});



// Add and Update AlgoliaSearch project=channel object if it's deleted from Parse
Parse.Cloud.afterSave('Project', function(request, response) {

    // Convert Parse.Object to JSON
    var objectToSave = request.object.toJSON();

    var queryProject = new Parse.Query("Project");
    queryProject.equalTo("objectId", objectToSave.objectId);
    queryProject.include( ["user", "workspace", "category"] );
    //queryProject.select(["user", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url", "project.name", "project.type", "project.archive"]);


    console.log("Request: " + JSON.stringify(request));
    console.log("objectID: " + objectToSave.objectId);
    console.log("objectID: " + objectToSave.user.objectId);

    queryProject.first({
        success: function(project) {
            // Successfully retrieved the object.
            console.log("ObjectToSave: " + JSON.stringify(project));

            // Convert Parse.Object to JSON
            project = project.toJSON();

            // Specify Algolia's objectID with the Parse.Object unique ID
            project.objectID = project.objectId;

            // Add or update object
            indexProject.saveObject(project, function(err, content) {
                if (err) {
                    throw err;
                }
                console.log('Parse<>Algolia object saved');
                response.success();

            });

        },
        error: function(error) {
            alert("Error: " + error.code + " " + error.message);
        }
    });


});




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

/*

 Parse.Cloud.afterSave('workspace_follower', function(request, response) {

 var NS_PER_SEC = 1e9;
 const MS_PER_NS = 1e-6;
 var time = process.hrtime();

 // Convert Parse.Object to JSON
 var workspace_follower = request.object;

 // Specify Algolia's objectID with the Parse.Object unique ID
 var objectToSave = request.object.toJSON();

 //var WORKSPACEFollower = Parse.Object.extend("workspace_follower");
 //var workspaceFollower = new Parse.Object(WORKSPACEFollower);

 var queryWorkspaceFollower = new Parse.Query("workspace_follower");

 var WORKSPACE = Parse.Object.extend("WorkSpace");
 var workspace = new Parse.Object(WORKSPACE);

 workspace = workspace_follower.get("workspace");

 console.log("workspace type: " + JSON.stringify(workspace.id));

 queryWorkspaceFollower.equalTo("workspace", workspace);
 queryWorkspaceFollower.include( ["workspace"] );

 queryWorkspaceFollower.find({

 success: function(followers) {

 let viewableBy = [];

 //console.log("Followers Length: " + JSON.stringify(followers));
 var queryWorkspace = new Parse.Query(WORKSPACE);

 queryWorkspace.equalTo("objectId", workspace.id);
 queryWorkspace.select( ["type"] );

 queryWorkspace.get(workspace.id , {useMasterKey: true})
 .then((Workspace) => {

 workspace = Workspace;

 //console.log("workspace: " + JSON.stringify(workspace));

 // Convert Parse.Object to JSON
 workspace = workspace.toJSON();

 delete workspace.skills;
 delete workspace.experts;

 workspace.objectID = workspace.objectId;
 workspace['followers'] = followers;


 for (var i = 0; i < followers.length; i++) {

 if (workspace.type === 'private') {
 viewableBy.push(followers[i].toJSON().user.objectId);
 console.log("user id viewableBy: " + followers[i].toJSON().user.objectId) ;
 }


 }

 if (workspace.type === 'private') {

 workspace.viewableBy = viewableBy;
 console.log("workspace 2: " + JSON.stringify(workspace));

 }


 indexWorkspaces.partialUpdateObject(workspace, function(err, content) {
 if (err) response.error();

 console.log("Parse<>Algolia workspaces with updated workspace_followers");

 var finalTime = process.hrtime(time);
 console.log(`finalTime workspace_follower took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);

 response.success();

 });

 });
 },
 error: function(error) {
 alert("Error: " + error.code + " " + error.message);
 response.error();
 }
 }, {useMasterKey: true});





 }, {useMasterKey: true});*/




// Add and Update AlgoliaSearch Workspace object if it's deleted from Parse & create Workspace roles
Parse.Cloud.afterSave('WorkSpace', function(request, response) {


    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var time = process.hrtime();

    // Convert Parse.Object to JSON
    var workspace = request.object;

    var workspaceToSave = request.object.toJSON();

    var WORKSPACE = Parse.Object.extend("WorkSpace");
    var queryWorkspace = new Parse.Query(WORKSPACE);

    queryWorkspace.equalTo("objectId", workspaceToSave.objectId);
    queryWorkspace.include( ["user"] );
    queryWorkspace.select(["user.fullname", "user.displayName", "user.isOnline", "user.showAvailability", "user.profileimage", "user.createdAt", "user.updatedAt", "user.objectId", "type", "archive","workspace_url", "workspace_name", "experts", "ACL", "objectId", "mission", "description","createdAt", "updatedAt", "followerCount", "memberCount", "isNew", "skills", "image"]);



    //console.log("Workspace Object: " + JSON.stringify(workspace.id));
    //console.log("objectID: " + objectToSave.objectId);
    //console.log("objectID: " + objectToSave.user.objectId);

    //var Workspace = new Parse.Object("WorkSpace");

    queryWorkspace.get(workspace.id , {useMasterKey: true})
        .then((Workspace) => {
        // The object was retrieved successfully.
        //console.log("Result from get " + JSON.stringify(Workspace));

        var workspace = Parse.Object.extend("WorkSpace");
    workspace = Workspace;
    workspaceToSave = Workspace.toJSON();
    //console.log("ObjectToSave: " + JSON.stringify(workspace));

    function createWorkspaceRoles (callback) {

        var owner = new Parse.Object("_User");
        owner = workspace.get("user");

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


            Parse.Object.saveAll([ownerRole, expertRole, adminRole, moderatorRole, memberRole, followerRole], {useMasterKey: true}).then((savedRoles) => {

                //console.log("savedRoles: " + JSON.stringify(savedRoles));

                var memberrole = savedRoles[4];
            //memberrole.getUsers().add(usersToAddToRole);
            memberrole.getRoles().add(followerRole);
            memberrole.save(null, {useMasterKey: true});

            var moderatorrole = savedRoles[3];
            //memberrole.getUsers().add(usersToAddToRole);
            moderatorrole.getRoles().add(memberRole);
            moderatorrole.save(null, {useMasterKey: true});

            var adminrole = savedRoles[2];
            //memberrole.getUsers().add(usersToAddToRole);
            adminrole.getRoles().add(moderatorRole);
            adminrole.save(null, {useMasterKey: true});

            var expertrole = savedRoles[1];
            //expertrole.getUsers().add(usersToAddToRole);
            expertrole.getRoles().add(moderatorRole);
            expertrole.save(null, {useMasterKey: true});

            var ownerrole = savedRoles[0];
            ownerrole.getUsers().add(owner);
            ownerrole.getRoles().add(expertRole);
            ownerrole.getRoles().add(adminRole);
            ownerrole.save(null, {useMasterKey: true});

            var userRolesRelation = owner.relation("roles");
            userRolesRelation.add(ownerRole); // add owner role to the user roles field.
            owner.save(null, {useMasterKey: true});

            // todo add experts roles here, need to also do both for new or existing

            return callback (null, savedRoles);


        });


        } else {return callback (null, workspace);}



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

            success: function(skill) {

                //console.log("Skills: " + JSON.stringify(skill));


                return callback (null, skill);

            },
            error: function(error) {
                alert("Error: " + error.code + " " + error.message);
                return callback (error);
            }
        }, {useMasterKey: true});


    }

    function getExperts (callback) {

        // todo check if expert is dirty, if no ignore and return callback

        var expertObject = Parse.Object.extend("_User");
        expertObject = workspace.get("experts");
        //console.log("Experts: " + JSON.stringify(expertObject));

        expertObject.query().select(["fullname", "displayName", "isOnline", "showAvailability", "profileimage", "createdAt", "updatedAt", "objectId"]).find({

            success: function(experts) {

                // Convert Parse.Object to JSON
                //workspace = workspace.toJSON();
                var User = new Parse.Object("_User");
                var queryRole = new Parse.Query(Parse.Role);

                //console.log("\n Experts: " + JSON.stringify(experts));

                queryRole.equalTo('name', 'expert-' + workspace.id);

                queryRole.first({
                    success: function(role) {
                        //console.log("Role when expert is added: " + JSON.stringify(role));

                        var expertrole = role;

                        //console.log("Role: " + JSON.stringify(role));

                        expertrole.getUsers(null, {useMasterKey: true}).add(experts);
                        expertrole.save(null, {useMasterKey: true});
                        var userRolesRelation;

                        for (var i = 0; i < experts.length; i++) {

                            userRolesRelation = experts[i].relation("roles");
                            userRolesRelation.add(expertrole); // add owner role to the user roles field.
                            experts[i].save(null, {useMasterKey: true});

                        }

                        return callback (null, experts);

                    },
                    error: function(err) {
                        return callback (err);
                    }

                }, {useMasterKey: true});


            },
            error: function(error) {
                alert("Error: " + error.code + " " + error.message);
                return callback (error);
            }
        }, {useMasterKey: true});

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

            success: function(followers) {

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

                    workspaceToSave.viewable_by = viewableBy;
                    //console.log("workspace 2: " + JSON.stringify(workspaceToSave));

                } else if (workspaceToSave.type === 'public') {

                    workspaceToSave.viewable_by = ['*'];

                }

                // console.log("followers: " + JSON.stringify(workspaceToSave.followers));

                return callback (null, workspaceToSave);

            },
            error: function(error) {
                alert("Error: " + error.code + " " + error.message);
                return callback (error);
            }
        }, {useMasterKey: true});


    }

    async.parallel([
        async.apply(createWorkspaceRoles),
        async.apply(getSkills),
        async.apply(getExperts),
        async.apply(getWorkspaceFollowers)

    ], function (err, results) {
        if (err) {
            response.error(err);
        }

        //console.log("results length: " + JSON.stringify(results));

        workspaceToSave = results[3];
        var skillsToSave = results[1];
        var expertsToSave = results[2];

        workspaceToSave["skills"] = skillsToSave;
        workspaceToSave["experts"] = expertsToSave;

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
    }, {useMasterKey: true});


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

// Delete AlgoliaSearch channel=project object if it's deleted from Parse
Parse.Cloud.afterDelete('Project', function(request) {

    // Get Algolia objectID
    var objectID = request.object.id;

    // Remove the object from Algolia
    indexProject.deleteObject(objectID, function(err, content) {
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

