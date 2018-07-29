
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

// Initialize the Algolia Search Indexes for posts, users, hashtags and meetings
var indexPosts = client.initIndex('dev_posts');
var indexUsers = client.initIndex('dev_users');
var indexMeetings = client.initIndex('dev_meetings');
var indexProject = client.initIndex('dev_channels');
var indexWorkspaces = client.initIndex('dev_workspaces');

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
Parse.Cloud.define("QueryPostFeed3", function(request, response) {
   
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
  var querypostSocial = Parse.Object.extend("PostSocial");
  var queryPostSocial = new Parse.Query(querypostSocial); 
  
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
        
        queryP.find({
        success: function(results) {
          
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
        queryPostSocial.containedIn("type", ["1", "2"]);
        //queryPostSocial.matchesQuery("post", queryP);
        //postSocialRelationQuery.doesNotExist("archive");
        //postSocialRelationQuery.select(["isBookmarked", "isLiked"]); 
        queryPostSocial.find({
        success: function(postSocialResults) {
          //console.log("postSocialResults 1: "+JSON.stringify(postSocialResults));
                   
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
    
              //var postResults = results[0];
              //var postSocialResults = results[1];
              
              // using process.hrtime since it's more precise 
              //var queryFinal = process.hrtime(time);            
              //console.log(`queryFinal took ${(queryFinal[0] * NS_PER_SEC + queryFinal[1])  * MS_PER_NS} milliseconds`);             
              //var beforelodash = process.hrtime();
              

            var merge = lodash.merge(results[0], results[1]);
            
            /*var merge = _.map(postSocialResults, function(item) {
                return _.merge(item, _.find(postResults, { 'objectId' : (item.get("post")).objectId }));
            });*/

                
             /*var postResultsFinal = lodash.find(postResults, function(obj2){ 
                                  
                  POST = obj2;
                  postId2 = obj2.objectId;
                  //postId1 = lodash.filter(postResults, { "objectId": postId2 } );
                  
                  lodash.find(postSocialResults, function(obj){ 
                  
                  	if((obj.get("post")).objectId == postId2){
                  
                  		POST.set("isLiked", obj.isLiked);
                      POST.set("isBookmarked", obj.isBookmarked);
                      POST.set("postSocialId", obj.id);
                      console.log("we have a match! WOhooo: " + POST);       
                  
                  	}
                    
                    var lodashTime = process.hrtime(beforelodash);            
                    console.log(`lodash took ${(lodashTime[0] * NS_PER_SEC + lodashTime[1])  * MS_PER_NS} milliseconds`);             

                  
                  });
                  
                                
              });*/
                           
                         
              //console.log("postResults: "+ JSON.stringify(merge.length));
              var finalTime = process.hrtime(time); 
              console.log(`finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);
              response.success(merge);
              //return callback (null, resultsToMap);             
                    
        });
   // }
          
  
        

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
  var querypostSocial = Parse.Object.extend("PostSocial");
  var queryPostSocial = new Parse.Query(querypostSocial); 
  
  var Workspace = new Parse.Object("WorkSpace"); 
  Workspace.id = workspace;
  
  var User = new Parse.Object("_User");
  User.id = user;

  queryP.include(["user", "workspace", "project", "postSocial.user", "postSocial.isLiked", "postSocial.isBookmarked"] );
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
  queryPostSocial.select(["user.fullname", "user.profileimage.url" ,"ACL", "media_duration", "postImage", "post_File", "audioWave", "imageRatio", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url" , "workspace.image", "workspace.objective", "workspace.mission", "workspace.postCount", "project.name", "project.type", "project.postCount", "project.image", "project.category", "project.objective", "BookmarkedBy", "isLikedBy", "isBookmarked", "isLiked", "followerCount", "memberCount"]); 
  queryPostSocial.matchesQuery("post", queryP);
  queryPostSocial.include(["post.user", "post", "post.workspace", "post.project"]);
  queryPostSocial.equalTo("userGroup", User);

  var beforeQuery = process.hrtime(time);
  console.log(`before query took ${(beforeQuery[0] * NS_PER_SEC + beforeQuery[1])  * MS_PER_NS} milliseconds`);       
          
  queryPostSocial.find({
    success: function(results) {
      
      //console.log("results: "+JSON.stringify(results.length));  
     
                        
      var finalTime = process.hrtime(time);
      console.log(`after finalTime took ${(finalTime[0] * NS_PER_SEC + finalTime[1])  * MS_PER_NS} milliseconds`);                             
      response.success(results);  
                                          
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
  
  // function to create 4 postSocials for each post to track likes/bookmarks
  function createPostSocial (callback) {
    
    var NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e-6;
    var timecreatePostSocial = process.hrtime();
    var reatePostSocial_Time;
    
    var objs = [];
    var postSocialObj = Parse.Object.extend("PostSocial");
    var PostSocialObj1 = new Parse.Object(postSocialObj);
    var PostSocialObj2 = new Parse.Object(postSocialObj);
    var PostSocialObj3 = new Parse.Object(postSocialObj);
    var PostSocialObj4 = new Parse.Object(postSocialObj);
    PostSocialObj1.set("post", post.id);
    PostSocialObj1.set("isBookmarked", true);
    PostSocialObj1.set("isLiked", true);
    PostSocialObj2.set("post", post.id);
    PostSocialObj2.set("isBookmarked", true);
    PostSocialObj2.set("isLiked", false);
    PostSocialObj3.set("post", post.id);
    PostSocialObj3.set("isBookmarked", false);
    PostSocialObj3.set("isLiked", true);
    PostSocialObj4.set("post", post.id);
    PostSocialObj4.set("isBookmarked", false);
    PostSocialObj4.set("isLiked", false);
    objs.push([PostSocialObj1,PostSocialObj2, PostSocialObj3, PostSocialObj4 ]);   
    
    if(post.isNew()) {
      
      
      Parse.Object.saveAll(objs, {
        success: function (result) {

            console.log('success: '+ JSON.stringify(result));
            reatePostSocial_Time = process.hrtime(timecreatePostSocial);
            console.log(`CreatePostSocial_Time took ${(reatePostSocial_Time[0] * NS_PER_SEC + reatePostSocial_Time[1]) * MS_PER_NS} milliseconds`);
             
            return callback(null, post);
        },
        error: function (err) {
            response.error('error:' + err);
             
        }
      });
        
      
      
      
    }
    
    
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
  console.log("workspace_post: " + JSON.stringify(workspace));
  var project = workspace_follower.get("project"); 
  console.log("project_post: " + JSON.stringify(project));

  console.log("post: " + JSON.stringify(workspace_follower));
  
  // Function to count number of followers/members
  function countWorkspaceFollower (callback) {
    
      var NS_PER_SEC = 1e9;
      const MS_PER_NS = 1e-6;
      var timeCountPosts = process.hrtime();
      var countPosts_Time; 
      
      // if there is a post that got added, then increase counter, else ignoremyObject
      if (workspace_follower.isNew()) {
        
        var WORKSPACEFOLLOWER = Parse.Object.extend("workspace_follower");
        var WorkspaceFollower = new WORKSPACEFOLLOWER();
        WorkspaceFollower.id = workspace_follower.objectId;
        
        // add counter for posts to workspace collection
        var WORKSPACE = Parse.Object.extend("WorkSpace");
        var Workspace = new WORKSPACE();
        Workspace.id = workspace.id;
        
        // Convert Parse.Object to JSON
        //var objectToSave = Workspace.id.toJSON();
        
        //var Post = Parse.Object.extend("Post");
        var queryWorkspace = new Parse.Query(Workspace);
        //queryWorkspace.include( ["workspace"] );
        queryWorkspace.select(["followerCount", "memberCount"]);
        queryWorkspace.equalTo("objectId", workspace.id);
        
        console.log("Request: " + JSON.stringify(req));
        console.log("Workspace.id: " + workspace.id);
  
        queryWorkspace.first({
          success: function(myObject) {
              
              // Successfully retrieved the object.
              console.log("queryWorkspace: " + JSON.stringify(myObject));
                     
              if (!myObject.get("followerCount")) {
                myObject.set("followerCount", 0);
                console.log("Workspace undefined: " + JSON.stringify(myObject));
              } 
              
              console.log("followerCount before: "+ JSON.stringify(myObject.get("followerCount")));
              
              myObject.increment("followerCount", 1);
              console.log("followerCount after: "+ JSON.stringify(myObject.get("followerCount")));
              //myObject.set("user", user);
              //myObject.setACL(new Parse.ACL(user));
              
              WorkspaceFollower.set("workspace", myObject);
              console.log("postWorkspace: " + JSON.stringify(WorkspaceFollower));
              console.log("Workspace final: " + JSON.stringify(myObject));
              
              myObject.save(null, {
                  success: function(object) {
                    // Execute any logic that should take place after the object is saved.
                    console.log("followerCount Updated: " + JSON.stringify(object));
                    
                    alert('New post created for this workspace ID: ' + object.id);
                   
                  
                },
                  error: function(object, error) {
                    // Execute any logic that should take place if the save fails.
                    // error is a Parse.Error with an error code and message.
                    alert('Failed to create new object, with error code: Workspace Save ' + error.message);
                    response.error('error Save followerCount for Workspace' + error.message);
                  }
                });
                      
              workspace_follower = WorkspaceFollower;
              
              //return callback(null, post);
              
            },
          error: function(myObject, error) {
            // The object was not refreshed successfully.
            // error is a Parse.Error with an error code and message.
            alert('Failed to refresh workspace, with error code: Workspace Save ' + error.message);
            
            //return callback(null, post);
          }
        });
        
         if (project) {
          // add counter for posts to project collection
          var PROJECT = Parse.Object.extend("Project");
          var Project = new PROJECT();
          Project.id = project.id;
          
          console.log("Project: " + JSON.stringify(Project));
          
          var queryProject = new Parse.Query(Project);
          queryProject.select(["followerCount", "memberCount"]);
          queryProject.equalTo("objectId", project.id);
          
         
          queryProject.first({
            success: function(myObject) {
                
                // Successfully retrieved the object.
                console.log("queryProject: " + JSON.stringify(myObject));
                       
                if (!myObject.get("followerCount")) {
                  myObject.set("followerCount", 0);
                  console.log("Project undefined: " + JSON.stringify(myObject));
                } 
                
                console.log("followerCount before: "+ JSON.stringify(myObject.get("followerCount")));
                
                myObject.increment("followerCount", 1);
                console.log("followerCount after: "+ JSON.stringify(myObject.get("followerCount")));
                //myObject.set("user", user);
                //myObject.setACL(new Parse.ACL(user));
                
                WorkspaceFollower.set("Project", myObject);
                console.log("postProject: " + JSON.stringify(WorkspaceFollower));
                console.log("Project final: " + JSON.stringify(myObject));
                
                myObject.save(null, {
                    success: function(object) {
                      // Execute any logic that should take place after the object is saved.
                      console.log("postCount Updated: " + JSON.stringify(object));
                      
                      alert('New post created for this project ID: ' + object.id);
                     
                    
                  },
                    error: function(object, error) {
                      // Execute any logic that should take place if the save fails.
                      // error is a Parse.Error with an error code and message.
                      alert('Failed to create new object, with error code: Workspace Save ' + error.message);
                      response.error('error Save postCount for Workspace' + error.message);
                    }
                  });
                        
                workspace_follower = WorkspaceFollower;
                
                countPosts_Time = process.hrtime(timeCountPosts);
              
                console.log(`countWorkspaceFollower took ${(countPosts_Time[0] * NS_PER_SEC + countPosts_Time[1])  * MS_PER_NS} milliseconds`);

                
                return callback(null, workspace_follower);
                
              },
            error: function(myObject, error) {
              // The object was not refreshed successfully.
              // error is a Parse.Error with an error code and message.
              alert('Failed to refresh workspace, with error code: Workspace Save ' + error.message);
              
              countPosts_Time = process.hrtime(timeCountPosts); 
              console.log(`countWorkspaceFollower took ${(countPosts_Time[0] * NS_PER_SEC + countPosts_Time[1])  * MS_PER_NS} milliseconds`);

              return callback(null, workspace_follower);
            }
        });
          
          
        } else {
        
        countPosts_Time = process.hrtime(timeCountPosts); 
        console.log(`countWorkspaceFollower took ${(countPosts_Time[0] * NS_PER_SEC + countPosts_Time[1])  * MS_PER_NS} milliseconds`);

        return callback(null, workspace_follower);
        
        }
      
               
        
      }
      
      else {
        
        countPosts_Time = process.hrtime(timeCountPosts); 
        console.log(`countPosts_Time took ${(countPosts_Time[0] * NS_PER_SEC + countPosts_Time[1])  * MS_PER_NS} milliseconds`);
 
        return callback(null, workspace_follower);
        
      }
        
       

  }
 
  
  async.parallel([ 
    async.apply(countWorkspaceFollower)
    
  ], function (err, post) {
        if (err) {
            response.error(err);
        }

        console.log("final post: " + JSON.stringify(post));
        
        var beforeSave_Time = process.hrtime(time); 
        console.log(`beforeSave_Time Posts took ${(beforeSave_Time[0] * NS_PER_SEC + beforeSave_Time[1])  * MS_PER_NS} milliseconds`);

        response.success();
    });
  
  
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


