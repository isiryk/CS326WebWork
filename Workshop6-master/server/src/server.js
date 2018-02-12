var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var doc = require('./database.js')
var StatusUpdateSchema = require('./schemas/statusupdate.json');
var CommentUpdateSchema = require('./schemas/comment.json');
var validate = require('express-jsonschema').validate;
var writeDocument = doc.writeDocument;
var addDocument = doc.addDocument;

app.use(bodyParser.text());
app.use(bodyParser.json());

app.use(express.static('../client/build'));

app.post('/resetdb', function(req, res) {
  console.log("Resetting database...");
  // This is a debug route, so don't do any validation.
  doc.resetDatabase();
  // res.send() sends an empty response with status code 200
  res.send();
});

app.delete('/feeditem/:feeditemid', function(req, res) {
  var fromUser = getUserIdFromToken(req.get('Authorization'));
  // Convert from a string into a number.
  var feedItemId = parseInt(req.params.feeditemid, 10);
  var feedItem = doc.readDocument('feedItems', feedItemId);
  // Check that the author of the post is requesting the delete.
  if (feedItem.contents.author === fromUser) {
    doc.deleteDocument('feedItems', feedItemId);
    // Remove references to this feed item from all other feeds.
    var feeds = doc.getCollection('feeds');
    var feedIds = Object.keys(feeds);
    feedIds.forEach((feedId) => {
      var feed = feeds[feedId];
      var itemIdx = feed.contents.indexOf(feedItemId);
      if (itemIdx !== -1) {
        // Splice out of array.
        feed.contents.splice(itemIdx, 1);
        // Update feed.
        doc.writeDocument('feeds', feed);
      }
    });
    // Send a blank response to indicate success.
    res.send();
  } else {
    // 401: Unauthorized.
    res.status(401).end();
  }
});

app.put('/feeditem/:feeditemid/content', function(req, res) {
  var fromUser = getUserIdFromToken(req.get('Authorization'));
  var feedItemId = req.params.feeditemid;
  var feedItem = doc.readDocument('feedItems', feedItemId);
  // Check that the requester is the author of this feed item.
  if (fromUser === feedItem.contents.author) {
    // Check that the body is a string, and not something like a JSON object.
    // We can't use JSON validation here, since the body is simply text!
    if (typeof(req.body) !== 'string') {
      // 400: Bad request.
      res.status(400).end();
      return;
    }
    // Update text content of update.
    feedItem.contents.contents = req.body;
    writeDocument('feedItems', feedItem);
    res.send(getFeedItemSync(feedItemId));
  } else {
    // 401: Unauthorized.
    res.status(401).end();
  }
});

//like feed item
app.put('/feeditem/:feeditemid/likelist/:userid', function(req, res) {
  var fromUser = getUserIdFromToken(req.get('Authorization'));
  // Convert params from string to number.
  var feedItemId = parseInt(req.params.feeditemid, 10);
  var userId = parseInt(req.params.userid, 10);
  if (fromUser === userId) {
    var feedItem = doc.readDocument('feedItems', feedItemId);
    // Add to likeCounter if not already present.
    if (feedItem.likeCounter.indexOf(userId) === -1) {
      feedItem.likeCounter.push(userId);
      writeDocument('feedItems', feedItem);
    }
    // Return a resolved version of the likeCounter
    res.send(feedItem.likeCounter.map((userId) =>
    doc.readDocument('users', userId)));
  } else {
    // 401: Unauthorized.
    res.status(401).end();
  }
});

//unlikeFeedItem
app.delete('/feeditem/:feeditemid/likelist/:userid', function(req, res) {
  var fromUser = getUserIdFromToken(req.get('Authorization'));
  // Convert params from string to number.
  var feedItemId = parseInt(req.params.feeditemid, 10);
  var userId = parseInt(req.params.userid, 10);
  if (fromUser === userId) {
    var feedItem = doc.readDocument('feedItems', feedItemId);
    var likeIndex = feedItem.likeCounter.indexOf(userId);
    // Remove from likeCounter if present
    if (likeIndex !== -1) {
      feedItem.likeCounter.splice(likeIndex, 1);
      writeDocument('feedItems', feedItem);
    }
    // Return a resolved version of the likeCounter
    // Note that this request succeeds even if the
    // user already unliked the request!
    res.send(feedItem.likeCounter.map((userId) =>
    doc.readDocument('users', userId)));
  } else {
    // 401: Unauthorized.
    res.status(401).end();
  }
});

app.post('/search', function(req, res) {
  var fromUser = getUserIdFromToken(req.get('Authorization'));
  var user = doc.readDocument('users', fromUser);
  if (typeof(req.body) === 'string') {
    // trim() removes whitespace before and after the query.
    // toLowerCase() makes the query lowercase.
    var queryText = req.body.trim().toLowerCase();
    // Search the user's feed.
    var feedItemIDs = doc.readDocument('feeds', user.feed).contents;
    // "filter" is like "map" in that it is a magic method for
    // arrays. It takes an anonymous function, which it calls
    // with each item in the array. If that function returns 'true',
    // it will include the item in a return array. Otherwise, it will
    // not.
    // Here, we use filter to return only feedItems that contain the
    // query text.
    // Since the array contains feed item IDs, we later map the filtered
    // IDs to actual feed item objects.
    res.send(feedItemIDs.filter((feedItemID) => {
      var feedItem = doc.readDocument('feedItems', feedItemID);
      return feedItem.contents.contents
      .toLowerCase()
      .indexOf(queryText) !== -1;
    }).map(getFeedItemSync));
  } else {
    // 400: Bad Request.
    res.status(400).end();
  }
});

function getFeedItemSync(feedItemId) {
  var feedItem = doc.readDocument('feedItems', feedItemId);
  // Resolve 'like' counter.
  feedItem.likeCounter = feedItem.likeCounter.map((id) => doc.readDocument('users', id));
  // Assuming a StatusUpdate. If we had other types of FeedItems in the DB, we would
  // need to check the type and have logic for each type.
  feedItem.contents.author = doc.readDocument('users', feedItem.contents.author);
  // Resolve comment author.
  feedItem.comments.forEach((comment) => {
    comment.author = doc.readDocument('users', comment.author);
  });
  return feedItem;
}

/**
 * Emulates a REST call to get the feed data for a particular user.
 */
function getFeedData(user) {
  var userData = doc.readDocument('users', user);
  var feedData = doc.readDocument('feeds', userData.feed);
  // While map takes a callback, it is synchronous, not asynchronous.
  // It calls the callback immediately.
  feedData.contents = feedData.contents.map(getFeedItemSync);
  // Return FeedData with resolved references.
  return feedData;
}

app.get('/user/:userid/feed', function(req, res) { // URL parameters are stored in req.params
  var userid = req.params.userid;
  var fromUser = getUserIdFromToken(req.get('Authorization'));
// userid is a string. We need it to be a number.
// Parameters are always strings.
  var useridNumber = parseInt(userid, 10);
  if (fromUser === useridNumber) {
// Send response.
    res.send(getFeedData(userid));
  } else {
// 401: Unauthorized request.
    res.status(401).end();
  }
});

//------------------------------------------------------------

function postComment(feedItemId, user, contents){
  var comment = {
    "author": user,
    "contents": contents,
    "postDate": new Date().getTime(),
    "likeCounter": []
  };
  var feedItem = doc.readDocument('feedItems', feedItemId);
  feedItem.comments.push(comment);
  writeDocument('feedItems', feedItem);

  return feedItem;
}

function likeComment(feedItemId, commentIdx, userId) {
  var feedItem = doc.readDocument('feedItems', feedItemId);
  var comment = feedItem.comments[commentIdx];
  comment.likeCounter.push(parseInt(userId));
  writeDocument('feedItems', feedItem);
  comment.author = doc.readDocument('users', comment.author);
  return comment;
}

app.put('/feeditem/:feedItemId/comment/:commentIdx/likelist/:userId', function (req, res) {
  res.send(likeComment(req.params.feedItemId, req.params.commentIdx, req.params.userId));
});

app.delete('/feeditem/:feedItemId/comment/:commentIdx/likelist/:userId', function (req, res) {
  res.send(unlikeComment(req.params.feedItemId, req.params.commentIdx, req.params.userId));
});

function unlikeComment(feedItemId, commentIdx, userId) {
  var feedItem = doc.readDocument('feedItems', feedItemId);
  var comment = feedItem.comments[commentIdx];
  var userIndex = comment.likeCounter.indexOf(parseInt(userId));
  if (userIndex !== -1) {
    comment.likeCounter.splice(userIndex, 1);
    writeDocument('feedItems', feedItem);
  }
  comment.author = doc.readDocument('users', comment.author);
  return comment;
}

app.post('/feeditem/:feedItemId/comment', validate({ body: CommentUpdateSchema}), function(req, res) {
  var body = req.body;
  var fromUser = getUserIdFromToken(req.get('Authorization'));
  if(fromUser === body.userId) {
    var newUpdate = postComment(req.params.feedItemId, body.userId, body.contents);

    res.status(201);
    res.set('/feeditem/' + newUpdate._id);
    res.send(newUpdate);
  } else {
    res.status(401).end();
  }
});

//--------------------------------------------

function getUserIdFromToken(authorizationLine) {
  try {
  // Cut off "Bearer " from the header value.
    var token = authorizationLine.slice(7);
  // Convert the base64 string to a UTF-8 string.
    var regularString = new Buffer(token, 'base64').toString('utf8');
  // Convert the UTF-8 string into a JavaScript object.
    var tokenObj = JSON.parse(regularString);
    var id = tokenObj['id'];
  // Check that id is a number.
    if (typeof id === 'number') {
      return id;
    } else {
    // Not a number. Return -1, an invalid ID.
      return -1;
    }
  } catch (e) {
  // Return an invalid ID.
  return -1;
  }
}



function postStatusUpdate(user, location, contents){
  var time = new Date().getTime();
  var newStatusUpdate = {
    "likeCounter": [], "type": "statusUpdate",
    "contents": {
      "author": user,
      "postDate": time,
      "location": location,
      "contents": contents,
      "likeCounter": []
    },
    "comments": []
  };
  newStatusUpdate = addDocument('feedItems', newStatusUpdate);

  var userData = doc.readDocument('users', user);
  var feedData = doc.readDocument('feeds', userData.feed);
  feedData.contents.unshift(newStatusUpdate._id);
  writeDocument('feeds', feedData);
  return newStatusUpdate;
}

app.post('/feeditem', validate({ body: StatusUpdateSchema}), function(req, res) {
  var body = req.body;
  var fromUser = getUserIdFromToken(req.get('Authorization'));
  if(fromUser === body.userId) {
    var newUpdate = postStatusUpdate(body.userId, body.location, body.contents);

    res.status(201);
    res.set('Location', '/feeditem/' + newUpdate._id);
    res.send(newUpdate);
  } else {
    res.status(401).end();
  }
});

app.use(function(err, req, res, next) {
  if (err.name === 'JsonSchemaValidation') {
  // Set a bad request http response status
    res.status(400).end();
  } else {
  // It's some other sort of error; pass it to next error middleware handler
    next(err);
  }
});

app.listen(3000, function(){
  console.log('Example app listening on port 3000!');
});
