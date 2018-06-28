
var algoliasearch = require('algoliasearch');
var client = algoliasearch('K3ET7YKLTI', '67085f00b6dbdd989eddc47fd1975c9c');
var async = require('async');
var _ = require("underscore");
var urlRegex = require('url-regex');
var request = require('request');
var querystring = require('querystring');

// Initialize the Algolia Search Indexes for posts, users, hashtags and meetings
var indexPosts = client.initIndex('dev_posts');
var indexUsers = client.initIndex('dev_users');
var indexHashtags = client.initIndex('dev_hashtags');
var indexMeetings = client.initIndex('dev_meeetings');


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

    request(luisRequest,
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
  queryPost.select(["user", "post_type", "privacy","text", "likesCount", "CommentCount", "updatedAt", "objectId", "topIntent", "hasURL","hashtags", "mentions",  "workspace.workspace_name", "workspace.workspace_url", "project.name", "project.type", "project.archive"]);
  queryPost.equalTo("objectId", objectToSave.objectId);
  
  console.log("Request: " + JSON.stringify(request));
  console.log("objectID: " + objectToSave.objectId);
  console.log("objectID: " + objectToSave.user.objectId);
  
  queryPost.first({
    success: function(post) {
      // Successfully retrieved the object.
      console.log("ObjectToSave: " + JSON.stringify(post));
      
      // Convert Parse.Object to JSON
      post = post.toJSON();
      
      // Specify Algolia's objectID with the Parse.Object unique ID
      post.objectID = post.objectId;
      
      // Add or update object
      indexPosts.saveObject(post, function(err, content) {
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


