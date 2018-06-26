var tempIndexName = 'users_temp';
var mainIndexName = 'users';
var algoliasearch = require('cloud/algoliasearch.parse.js');
var client = algoliasearch('K3ET7YKLTI', '67085f00b6dbdd989eddc47fd1975c9c');
var tempIndex = client.initIndex(tempIndexName);
var reindexData = function() {
  var objectsToIndex = [];
  // Create a temp index
  var tempIndex = client.initIndex(tempIndexName);
  // Create a new query for Contacts
  var query = new Parse.Query('User');
  // Find all items
  query.find({
    success: function(users) {
      // prepare objects to index from users
      objectsToIndex = users.map(function(user) {
        // convert to regular key/value JavaScript object
        user = user.toJSON();
        // Specify Algolia's objectID with the Parse.Object unique ID
        user.objectID = user.objectId;
        return user;
      });
      // Add new objects to temp index
      tempIndex.saveObjects(objectsToIndex, function(err, content) {
        if (err) {
          throw err;
        }
        // Overwrite main index with temp index
        client.moveIndex(tempIndexName, mainIndexName, function(err, content) {
          if (err) {
            throw err;
          }
          console.log('Parse<>Algolia reimport done');
        });
      });
    },
    error: function(err) {
      throw err;
    }
  });
};
