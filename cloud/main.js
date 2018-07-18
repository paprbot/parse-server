
var algoliasearch = require('algoliasearch');
var client = algoliasearch('K3ET7YKLTI', '67085f00b6dbdd989eddc47fd1975c9c');
var async = require('async');
var _ = require("underscore");
var urlRegex = require('url-regex');
var requestURL = require('request');
var querystring = require('querystring');
var process = require('process');

// Initialize the Algolia Search Indexes for posts, users, hashtags and meetings
var indexPosts = client.initIndex('dev_posts');
var indexUsers = client.initIndex('dev_users');
var indexMeetings = client.initIndex('dev_meetings');
var indexProject = client.initIndex('dev_channels');
var indexWorkspaces = client.initIndex('dev_workspaces');


// cloud API and function to test query performance of AlgoliaSearch versus Parse
Parse.Cloud.define("testQueryPerformance", function(request, response) {
  
  //var time = new Date().getTime();
  
  var NS_PER_SEC = 1e9;
  const MS_PER_NS = 1e-6;
  var time = process.hrtime();

  
  console.log("timeFirst: " + time);
  
  //Create a new query for User collection in Parse 
  var collection = request.params.collection;
  var search = request.params.search;
  var index;
  
  var query = new Parse.Query(collection); 
  
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
  
            
   function querySmall (callback) {
     
       if (search == 'Parse') {
        
          query.limit(10); // limit to at most 20 results
          
          // Find all items
            query.find({
              success: function(objects) {
                
                /*var timeSmall = new Date().getTime();
                
                timeSmall = timeSmall - time;
                  
                console.log("time querySmall: " + timeSmall);*/
                
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
          
              /*var timeSmall = new Date().getTime();
                
              timeSmall = timeSmall - time;
                
              console.log("time querySmall: " + timeSmall);*/
              
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
              
              /*var timeMedium = new Date().getTime();
              
              timeMedium = timeMedium - time;
  
              console.log("time queryMedium: " + timeMedium);*/
              
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
        
            /*var timeMedium = new Date().getTime();
              
            timeMedium = timeMedium - time;

            console.log("time queryMedium: " + timeMedium);*/
            
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
            
            /*var timeLarge = new Date().getTime();
            
            timeLarge = timeLarge - time;
              
            console.log("time queryLarge: " + timeLarge);*/
            
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
        
            /*var timeLarge = new Date().getTime();
            
            timeLarge = timeLarge - time;
              
            console.log("time queryLarge: " + timeLarge);*/
            
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
  
          /*var timeFinal = new Date().getTime();
          
          timeFinal = timeFinal - time;
  
          console.log("time Final: " + timeFinal);
          
          response.success("time Final: " + timeFinal);*/
          
          // using process.hrtime since it's more precise 
          var diff = process.hrtime(time);
        
          console.log(`queryFinal took ${(diff[0] * NS_PER_SEC + diff[1])  * MS_PER_NS} milliseconds`);
          
          response.success(`queryFinal took ${(diff[0] * NS_PER_SEC + diff[1])  * MS_PER_NS} milliseconds`);
                   
              
                
    });
  
  
});



// cloud API and function to index and import all users from Parse to AlgoliaSearch indexUsers
Parse.Cloud.define("indexCollection", function(request, response) {
  
  var objectsToIndex = [];
  //Create a new query for User collection in Parse
  
  var collection = request.params.collection;
  var index;
  var query = new Parse.Query(collection); 
  query.limit(1000); // limit to at most 1000 results
  
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
        
         console.log("objectToSave: "+ JSON.stringify(objectsToIndex)); 
        
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
    
            console.log("final meeting: " + JSON.stringify(post));
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
 
  var post = req.object;
  var text = post.get("text");
  var toLowerCase = function(w) { return w.toLowerCase(); };
  console.log("post: " + JSON.stringify(post));
  
  // Function to capture hashtags from text posts
  function getHashtags (callback) {
   
      var hashtags = text.match(/(^|\s)(#[a-z\d-]+)/gi);
      hashtags = _.map(hashtags, toLowerCase);
      hashtags = hashtags.map(function (hashtag) {
        return hashtag.trim();
      });
      req.object.set("hashtags", hashtags);
      console.log("getHashtags: " + JSON.stringify(hashtags));
    
      return callback(null, post);
  }
  
  // Function to capture mentions from text posts
  function getMentions (callback) {
    
    var mentions = text.match(/(^|\s)(@[a-z\d-]+)/gi);
    mentions = _.map(mentions, toLowerCase);
    mentions = mentions.map(function (mention) {
      return mention.trim();
    });
    req.object.set("mentions", mentions);
    console.log("getMentions: " + JSON.stringify(mentions));
    
    return callback(null, post);
  }
  
  // Function to identify if a text post hasURL
  function getURL (callback) {

    var hasurl = urlRegex().test(text);
    console.log("hasURL: " + JSON.stringify(hasurl));
    
    req.object.set("hasURL", hasurl);
    
    return callback(null, post);
  }
  
  // Function to get luis.ai topIntent from text post
  function getIntents (callback) {
    //console.log("getIntents: " + JSON.stringify(post));
    
    var endpoint =
        "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/";

    // Set the LUIS_APP_ID environment variable 
    // to df67dcdb-c37d-46af-88e1-8b97951ca1c2, which is the ID
    // of a public sample application.    
    var luisAppId = "685c7d5b-9d64-4182-a69d-bb220a7482ae";
    
    var utterance = post.get("text");
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

    var luisRequest =
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
                console.log('Intents:');
                console.log(data.topScoringIntent.intent);
                
                console.log("Input post: " + JSON.stringify(post));
                req.object.set("topIntent", data.topScoringIntent.intent);
                
                return callback(null, post);            
                
            }
        });
    
  }
  
  async.parallel([ 
    async.apply(getHashtags),
    async.apply(getMentions),
    async.apply(getURL),
    async.apply(getIntents)
    
  ], function (err, post) {
        if (err) {
            response.error(err);
        }

        console.log("final post: " + JSON.stringify(post));
        response.success();
    });
  
  
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
  
  console.log("Request: " + JSON.stringify(request));
  console.log("objectID: " + objectToSave.objectId);
  console.log("objectID: " + objectToSave.user.objectId);
  
  queryPost.first({
    success: function(post) {
      
      function prepIndex (callback) {
        
        // Successfully retrieved the object.
        console.log("ObjectToSave: " + JSON.stringify(post));
        
        // Convert Parse.Object to JSON
        post = post.toJSON();
        
        // Specify Algolia's objectID with the Parse.Object unique ID
        post.objectID = post.objectId;
        
        return callback(null, post);
        
      };
      
            
     function addObjectAlgolia (post, callback) {
        
         console.log("objectToSave: "+ JSON.stringify(post)); 
        
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
    
            console.log("final meeting: " + JSON.stringify(post));
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


