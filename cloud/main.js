
var algoliasearch = require('algoliasearch');
var client = algoliasearch('K3ET7YKLTI', '67085f00b6dbdd989eddc47fd1975c9c');
var async = require('async');
var lodash = require('lodash');
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

// Send Email
var nodemailer = require('nodemailer');
var EmailTemplate = require('email-templates');
var smtpTransport = require('nodemailer-smtp-transport');
var handlebars = require('handlebars');
var fs = require('fs');

const path = require('path');
const PushNotification = require('push-notification');
var cron = require('node-cron');

const isProduction = true;
var fileForPushNotification;
var keyFileForPushNotification;
if( isProduction ){
  fileForPushNotification = 'Papr-Distribution-APNS.pem';
  keyFileForPushNotification = 'Key-Distribution.pem';
} else {
  fileForPushNotification = 'Papr-Development-APNS.pem';
  keyFileForPushNotification = 'Key.pem';
}

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
      
      async.map(results, function (object, callback){

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

  var objectsToIndex = [];
  //Create a new query for User collection in Parse
  
  var collection = request.params.collection;
  var index;
  var query = new Parse.Query(collection); 
  query.limit(1000); // todo limit to at most 1000 results need to change and iterate until done todo
  
  console.log('collection: ' + request.params.collection);
  
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
  
  // Find all items
  query.find({
    success: function(objects) {

      function prepIndex (callback) {

        // prepare objects to index from objects
        objectsToIndex = objects.map(function(object) {
          // convert to regular key/value JavaScript object
          object = object.toJSON();
          // Specify Algolia's objectID with the Parse.Object unique ID
          object.objectID = object.objectId;
          return object;
        });
        
        return callback(null, objectsToIndex);
        
      };
      

      function addObjectsAlgolia (objectsToIndex, callback) {

         //console.log("objectToSave: "+ JSON.stringify(objectsToIndex)); 

        // Add or update new objects
        index.saveObjects(objectsToIndex, function(err, content) {
          if (err) {
            throw err;
          }
          console.log('Parse<>Algolia import done');
          response.success("Imported the following collection: " + collection);
        });

      };
      
      async.waterfall([ 
        async.apply(prepIndex),
        async.apply(addObjectsAlgolia)

        ], function (err, post) {
          if (err) {
            response.error(err);
          }

            //console.log("final meeting: " + JSON.stringify(post));
            response.success();
          });
    },
    error: function(err) {
      throw err;
    }
  });
  
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
  
  // if there is a post that got added, then increase counter, else ignoremyObject
  if (workspace_follower.isNew()) {

    var beforeSave_Time;
    
    if(workspace_follower.get("isFollower") === true && workspace_follower.get("isMember") === true) {
      Workspace.increment("followerCount"); 
      Workspace.increment("memberCount");
      Workspace.save();         
      beforeSave_Time = process.hrtime(time); 
      console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

      response.success();
    } else if (workspace_follower.get("isFollower") === true && workspace_follower.get("isMember") === false) {
      Workspace.increment("followerCount"); 
      Workspace.save();  
      beforeSave_Time = process.hrtime(time); 
      console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

      response.success();
      
    } else if (workspace_follower.get("isFollower") === false && workspace_follower.get("isMember") === true) {
      Workspace.increment("memberCount");
      Workspace.save();  
      beforeSave_Time = process.hrtime(time); 
      console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

      response.success();
      
    } else {
      if (workspace_follower.get("type") === "1") {
        response.error("error: type is 1, Please mark isMember or isFollower to true or change workspace_follower.type = 2 for comments");
      } else {

        beforeSave_Time = process.hrtime(time); 
        console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

        response.success();
      }

    }  

  } else if (!workspace_follower.isNew() && (workspace_follower.dirty("isFollower") || workspace_follower.dirty("isMember"))) {

    //console.log(WorkspaceFollower.id);
    //queryWorkspaceFollower.equalTo("objectId", WorkspaceFollower.id);
    queryWorkspaceFollower.get(WorkspaceFollower.id, {
      success: function(result) {

        console.log("queryWorkspaceFollower: "+JSON.stringify(result.get("isFollower") ));

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
              
            } else if ((result.get("isFollower")  === true) && workspace_follower.get("isFollower") === false) {

              Workspace.increment("followerCount", -1); 
              console.log("decrement Follower");
              //Workspace.save();  
              
            } else {

              console.log("do nothing Follower");
              // do nothing
              
            }                 

          } else if (workspace_follower.dirty("isMember")) {

            if (result.get("isMember")  === workspace_follower.get("isMember")) {

              console.log("user isMember did not change");
              // doin't increment or decrement because the user isFollow status did not change

            } else if ((result.get("isMember") === false || !result.get("isMember")) && workspace_follower.get("isMember") === true) {

              Workspace.increment("memberCount"); 
              console.log("increment Member");
              //Workspace.save();              
              
            } else if ((result.get("isMember") === true) && workspace_follower.get("isMember") === false) {

              Workspace.increment("memberCount", -1);  
              console.log("decrement Member");
              //Workspace.save();  
              
            } else {

              console.log("do nothing Member");
              // do nothing
              
            }            


          }
          
          console.log("Workspace: "+JSON.stringify(Workspace));
          Workspace.save();
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
  queryPost.select(["user", "ACL", "media_duration", "postImage", "post_File", "audioWave", "archive", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url", "project.name", "project.type", "project.archive"]);
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


// Add and Update AlgoliaSearch meetings object if it's deleted from Parse
Parse.Cloud.afterSave('Meeting', function(req, response) {

  var objectsToIndex = [];
  
  // Convert Parse.Object to JSON
  var meeting = req.object.toJSON();
  //var meetingURL = req.object.MeetingJson.url;
  console.log("meetingObject1: " + JSON.stringify(meeting));
  
  function getMeetingObject (callback) {

    var meetingObject = Parse.Object.extend("Meeting");
    var query = new Parse.Query(meetingObject);
    query.get(req.object.id, {
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

    console.log("\n meetingObject3: " + JSON.stringify(meetingObject));

    //console.log("\n Meetingurl: " + JSON.stringify(meetingObject.MeetingJson.url));
    var meetingFile = meetingObject.get("MeetingJson");
    console.log("MeetingFile: " + JSON.stringify(meetingFile));
    console.log("MeetingURL: " + JSON.stringify(meetingFile.url()) );
    
    requestURL({
      url: meetingFile.url(),
      json: true
    }, function (error, resp, body) {

      console.log("error: " + error);
      console.log("response: " + JSON.stringify(resp));
      console.log("body: " + JSON.stringify(body));

      if (!error && resp.statusCode === 200) {
              console.log("body: " + JSON.stringify(body)); // Print the json response
              
              objectsToIndex = body.IBMjson.results;
              
              return callback(null, objectsToIndex);

            }
          });

    
  };

  function prepIndex (objectsToIndex, callback) { 

    // Specify Algolia's objectID with the Parse.Object unique ID
    
    console.log("objectsToIndex: " + JSON.stringify(objectsToIndex));

    
    // prepare objects to index from users
    /*objectsToIndex = objectsToIndex.map(function(object) {
      // convert to regular key/value JavaScript object
      //object = JSON.stringify(object);
      // Specify Algolia's objectID with the Parse.Object unique ID
      //object = object.alternatives;

      object['ConferenceID'] = req.object.ConferenceID;
      object['MeetingEvents'] = req.object.MeetingEvents;
      object['MeetingInfo'] = req.object.MeetingInfo;
      object['meetingID'] = req.object.objectId;
      object['FullMeetingURL'] = req.object.FullMeetingURL;
      
      console.log("object: " + JSON.stringify(object));
      
      //object = JSON.parse(object);
      
      return object;
    });*/

    //console.log("objectID: " + meetingObject.objectId);
    //console.log("objectID: " + meetingObject.user.objectId);
    
    //objectsToIndex = objectsToIndex.results;
    
    async.forEach(objectsToIndex, function (meetingUtterance, callback){ 

      console.log("meetingUtterance: " + JSON.stringify(meetingUtterance));

      
        //meetingUtterance = meetingUtterance.alternatives[0];
        
        console.log("meetingUtterance1: "+ JSON.stringify(meetingUtterance)); // print the key
        //var updatedUtterance = meetingUtterance.toJSON();
        console.log("ConferenceID: " + JSON.stringify(meeting.ConferenceID));
        console.log("MeetingObject: " + JSON.stringify(meeting));
        
        meetingUtterance['ConferenceID'] = meeting.ConferenceID;
        meetingUtterance['MeetingEvents'] = meeting.MeetingEvents;
        meetingUtterance['MeetingInfo'] = meeting.MeetingInfo;
        meetingUtterance['meetingID'] = meeting.objectId;
        meetingUtterance['FullMeetingURL'] = meeting.FullMeetingURL;
        meetingUtterance['FullMeetingText'] = meeting.FullMeetingText;
        meetingUtterance['objectID'] = meetingUtterance.alternatives[0].objectID;
        
        console.log("meetingUtterance2: "+ JSON.stringify(meetingUtterance));
        
        // tell async that that particular element of the iterator is done
        callback(null, meetingUtterance); 

      }, function(err) {
        console.log('iterating done: ' + JSON.stringify(objectsToIndex));

      });  
    
    return callback(null, objectsToIndex);
    
  };
  
  function addObjectsAlgolia (objectsToIndex, callback) {

   console.log("objectToIndex2: "+ JSON.stringify(objectsToIndex)); 

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
  async.apply(getMeetingTranscript),
  async.apply(prepIndex),
  async.apply(addObjectsAlgolia)

  ], function (err, objectsToIndex) {
    if (err) {
      response.error(err);
    }

    console.log("final meeting: " + JSON.stringify(objectsToIndex));
    response.success();
  });


});


// Add and Update AlgoliaSearch user object if it's deleted from Parse
Parse.Cloud.afterSave('_User', function(request) {

  // Convert Parse.Object to JSON
  var objectToSave = request.object.toJSON();
  
  // Specify Algolia's objectID with the Parse.Object unique ID
  objectToSave.objectID = objectToSave.objectId;
  
  // Add or update object
  indexUsers.saveObject(objectToSave, function(err, content) {
    if (err) {
      throw err;
    }
    console.log('Parse<>Algolia object saved');
  });
});


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
Parse.Cloud.afterSave('_User', function(request) {

  // Convert Parse.Object to JSON
  var objectToSave = request.object.toJSON();
  
  // Specify Algolia's objectID with the Parse.Object unique ID
  objectToSave.objectID = objectToSave.objectId;
  
  // Add or update object
  indexUsers.saveObject(objectToSave, function(err, content) {
    if (err) {
      throw err;
    }
    console.log('Parse<>Algolia object saved');
  });
});

// Add and Update AlgoliaSearch Workspace object if it's deleted from Parse
Parse.Cloud.afterSave('WorkSpace', function(request) {

  // Convert Parse.Object to JSON
  var objectToSave = request.object.toJSON();
  
  // Specify Algolia's objectID with the Parse.Object unique ID
  objectToSave.objectID = objectToSave.objectId;
  
  // Add or update object
  indexWorkspaces.saveObject(objectToSave, function(err, content) {
    if (err) {
      throw err;
    }
    console.log('Parse<>Algolia object saved');
  });
});



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
  const pn = PushNotification({
    apn: {
      cert: path.resolve(fileForPushNotification),
      key: path.resolve(keyFileForPushNotification),
      passphrase: 'papr@123',
      production: isProduction,
    }
  });
  const DeviceType = PushNotification.DeviceType;
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
        var data = {
          title: 'Papr',
          message: result.get("message"),
          payload: {
            workspace : result.get("workspace"),
            type : result.get("type"),
            post : result.get("post"),
            postQuestionMessage : result.get("postQuestionMessage"),
            postQuestion : result.get("postQuestion"),
          }
        };
        pn.push(result.get("userTo").get("deviceToken"), data, DeviceType.IOS)
        .then(res => {
          result.set("hasSent", true);
          result.save();
          console.log(res);
        }).catch(err => {
          console.log(err);
          callback(err);
        });
        callback(null, result);
      }, function(err) {
        if (err){
          console.log('ERROR', err);
          response.error(err);
        }
        console.log("ALL FINISH");
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
  const pn = PushNotification({
    apn: {
      cert: path.resolve(fileForPushNotification),
      key: path.resolve(keyFileForPushNotification),
      passphrase: 'papr@123',
      production: isProduction,
    }
  });
  const DeviceType = PushNotification.DeviceType;
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
        var data = {
          title: 'Papr',
          message: result.get("message"),
          payload: {
            workspace : result.get("workspace"),
            type : result.get("type"),
            post : result.get("post"),
            postQuestionMessage : result.get("postQuestionMessage"),
            postQuestion : result.get("postQuestion"),
          }
        };
        pn.push(result.get("userTo").get("deviceToken"), data, DeviceType.IOS)
        .then(res => {
          result.set("hasSent", true);
          result.save();
          console.log(res);
        }).catch(err => {
          console.log(err);
          callback(err);
        });
        callback(null, result);
      }, function(err) {
        if (err){
          console.log('ERROR', err);
          response.error(err);
        }
        console.log("ALL FINISH");
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
  const pn = PushNotification({
    apn: {
      cert: path.resolve('Papr-Development-APNS.pem'),
      key: path.resolve('Key.pem'),
      passphrase: 'papr@123',
      production: false,
    }
  });
  const DeviceType = PushNotification.DeviceType;
  const data = {
    title: 'Title',
    message: 'Message',
    badge: '',
    sound: '',
    payload: {
      param1: 'additional data',
      param2: 'another data'
    }
  };
  pn.push("7689db229f040ad9e35a59732a5506b7fd27bb5c0b6f151615383ff8c71caddf", data, DeviceType.IOS)
  .then(res => {
    console.log(res); 
    response.success(res)
  }).catch(err => {
    console.log(err); 
    response.error(JSON.stringify(err))
  });
});


Parse.Cloud.define("liveQueryMessageType", function(request, response) {
  response.success(request);
    let query = new Parse.Query('PostQuestionMessage');
    query.equalTo('type', '2');
    let subscription = query.subscribe();
    subscription.on('update', (people) => {
      response.success(people); // This should output Mengyan
    });
});