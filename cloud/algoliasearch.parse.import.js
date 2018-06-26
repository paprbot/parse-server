var algoliasearch = require('cloud/algoliasearch.parse.js');
var client = algoliasearch('K3ET7YKLTI', '67085f00b6dbdd989eddc47fd1975c9c');

// Create a users index to search for people
var index = client.initIndex('users');
function indexData() {
  var objectsToIndex = [];
  //Create a new query for User collection in Parse
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
      // Add or update new objects
      index.saveObjects(objectsToIndex, function(err, content) {
        if (err) {
          throw err;
        }
        console.log('Parse<>Algolia import done');
      });
    },
    error: function(err) {
      throw err;
    }
  });
}
