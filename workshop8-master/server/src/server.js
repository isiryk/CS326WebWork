// Imports the express Node module.
var jwt = require('jsonwebtoken');
var secretKey = "7d672134-7365-40d8-acd6-ca6a82728471";
var express = require('express');
var LoginSchema = require('./schemas/login.json');
// Creates an Express server.
var app = express();
var bcrypt = require('bcryptjs');
// Parses response bodies.
var bodyParser = require('body-parser');
var StatusUpdateSchema = require('./schemas/statusupdate.json');
var CommentSchema = require('./schemas/comment.json');
var UserSchema = require('./schemas/user.json');
var validate = require('express-jsonschema').validate;
var mongo_express = require('mongo-express/lib/middleware');
// Use default Mongo Express configuration
var mongo_express_config = require('mongo-express/config.default.js');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var ResetDatabase = require('./resetdatabase');
var url = 'mongodb://localhost:27017/facebook';
// Import Node's HTTPS API.
var https = require('https');
// Import Node's file system API.
var fs = require('fs');
var path = require('path');
// Read in the private key
// __dirname is a magic variable that contains
// the directory that contains server.js. path.join
// joins two file paths together.
var privateKey = fs.readFileSync(path.join(__dirname, 'key.pem'));
// Read in the certificate, which contains the
// public key and signature
var certificate = fs.readFileSync(path.join(__dirname, 'key.crt'));

/**
* Strips a password from a user object.
*/
function stripPassword(user) {
  if (user !== null) {
    delete user.password;
  }
  return user;
}

MongoClient.connect(url, function(err, db) {
  app.use(bodyParser.text());
  app.use(bodyParser.json());
  app.use(express.static('../client/build'));
  app.use('/mongo_express', mongo_express(mongo_express_config));

  /**
  * Resolves a list of user objects. Returns an object that maps user IDs to
  * user objects.
  */
  function resolveUserObjects(userList, callback) {
    // Special case: userList is empty.
    // It would be invalid to query the database with a logical OR
    // query with an empty array.
    if (userList.length === 0) {
      callback(null, {});
    } else {
      // Build up a MongoDB "OR" query to resolve all of the user objects
      // in the userList.
      var query = {
        $or: userList.map((id) => { return {_id: id } })
      };
      // Resolve 'like' counter
      db.collection('users').find(query).toArray(function(err, users) {
        if (err) {
          return callback(err);
        }
        // Build a map from ID to user object.
        // (so userMap["4"] will give the user with ID 4)
        var userMap = {};
        users.forEach((user) => {
          // Remove the Password field from the user.
          stripPassword(user);
          userMap[user._id] = user;
        });
        callback(null, userMap);
      });
    }
  }

  /**
  * Resolves a feed item. Internal to the server, since it's synchronous.
  * @param feedItemId The feed item's ID. Must be an ObjectID.
  * @param callback Called when the operation finishes. First argument is an error object,
  *   which is null if the operation succeeds, and the second argument is the
  *   resolved feed item.
  */
  function getFeedItem(feedItemId, callback) {
    // Get the feed item with the given ID.
    db.collection('feedItems').findOne({
      _id: feedItemId
    }, function(err, feedItem) {
      if (err) {
        // An error occurred.
        return callback(err);
      } else if (feedItem === null) {
        // Feed item not found!
        return callback(null, null);
      }

      // Build a list of all of the user objects we need to resolve.
      // Start off with the author of the feedItem.
      var userList = [feedItem.contents.author];
      // Add all of the user IDs in the likeCounter.
      userList = userList.concat(feedItem.likeCounter);
      // Add all of the authors of the comments.
      feedItem.comments.forEach((comment) => userList.push(comment.author));
      // Resolve all of the user objects!
      resolveUserObjects(userList, function(err, userMap) {
        if (err) {
          return callback(err);
        }
        // Use the userMap to look up the author's user object
        feedItem.contents.author = userMap[feedItem.contents.author];
        // Look up the user objects for all users in the like counter.
        feedItem.likeCounter = feedItem.likeCounter.map((userId) => userMap[userId]);
        // Look up each comment's author's user object.
        feedItem.comments.forEach((comment) => {
          comment.author = userMap[comment.author];
        });
        // Return the resolved feedItem!
        callback(null, feedItem);
      });
    });
  }

  /**
  * Get the feed data for a particular user.
  * @param user The ObjectID of the user document.
  */
  function getFeedData(user, callback) {
    db.collection('users').findOne({
      _id: user
    }, function(err, userData) {
      if (err) {
        return callback(err);
      } else if (userData === null) {
        // User not found.
        return callback(null, null);
      }

      db.collection('feeds').findOne({
        _id: userData.feed
      }, function(err, feedData) {
        if (err) {
          return callback(err);
        } else if (feedData === null) {
          // Feed not found.
          return callback(null, null);
        }

        // We will place all of the resolved FeedItems here.
        // When done, we will put them into the Feed object
        // and send the Feed to the client.
        var resolvedContents = [];

        // processNextFeedItem is like an asynchronous for loop:
        // It performs processing on one feed item, and then triggers
        // processing the next item once the first one completes.
        // When all of the feed items are processed, it completes
        // a final action: Sending the response to the client.
        function processNextFeedItem(i) {
          // Asynchronously resolve a feed item.
          getFeedItem(feedData.contents[i], function (err, feedItem) {
            if (err) {
              // Pass an error to the callback.
              callback(err);
            } else {
              // Success!
              resolvedContents.push(feedItem);
              if (resolvedContents.length === feedData.contents.length) {
                // I am the final feed item; all others are resolved.
                // Pass the resolved feed document back to the callback.
                feedData.contents = resolvedContents;
                callback(null, feedData);
              } else {
                // Process the next feed item.
                processNextFeedItem(i + 1);
              }
            }
          });
        }

        // Special case: Feed is empty.
        if (feedData.contents.length === 0) {
          callback(null, feedData);
        } else {
          processNextFeedItem(0);
        }
      });
    });
  }

  /**
  * Get the user ID from a token. Returns "" (an invalid ID) if it fails.
  */
  /**
  * Get the user ID from a token.
  * Returns "" (an invalid ID) if it fails.
  */
  function getUserIdFromToken(authorizationLine) {
    try {
      // Cut off "Bearer " from the header value.
      var token = authorizationLine.slice(7);
      // Verify the token. Throws if the token is invalid or expired.
      var tokenObj = jwt.verify(token, secretKey);
      var id = tokenObj['id'];
      // Check that id is a string.
      if (typeof id === 'string') {
        return id;
      } else {
        // Not a string. Return "", an invalid ID.
        // This should technically be impossible unless
        // the server accidentally
        // generates a token with a number for an id!
        return "";
      }
    } catch (e) {
      // Return an invalid ID.
      return "";
    }
  }

  /**
  * Get the feed data for a particular user.
  */
  app.get('/user/:userid/feed', function(req, res) {
    var userid = req.params.userid;
    var fromUser = getUserIdFromToken(req.get('Authorization'));
    if (fromUser === userid) {
      // Convert userid into an ObjectID before passing it to database queries.
      getFeedData(new ObjectID(userid), function(err, feedData) {
        if (err) {
          // A database error happened.
          // Internal Error: 500.
          res.status(500).send("Database error: " + err);
        } else if (feedData === null) {
          // Couldn't find the feed in the database.
          res.status(400).send("Could not look up feed for user " + userid);
        } else {
          // Send data.
          res.send(feedData);
        }
      });
    } else {
      // 403: Unauthorized request.
      res.status(403).end();
    }
  });

  app.post('/login', validate({ body: LoginSchema }),
  function(req, res) {
    var loginData = req.body;
    var pw = loginData.password;
    var email = loginData.email.trim().toLowerCase();
    db.collection('users').findOne({ email: email },
      function(err, user) {
        if (err) {
          sendDatabaseError(res, err);
        } else if (user === null) {
          // No user found with given email address.
          // 401 Unauthorized is the correct code to use in this case.
          res.status(401).end();
        } else {
          // User found!
          bcrypt.compare(pw, user.password, function(err, success) {
            if (err) {
              // An internal error occurred. This could only possibly
              // happen if the recorded hash+salt in the database is
              // malformed, or bcryptjs has a bug.
              res.status(500).end();
            } else if (success) {
              // Successful login!

              // PUT CODE TO GENERATE JSON WEB TOKEN HERE
              // Successful login!
              // Create a token that is valid for a week.
              jwt.sign({
                id: user._id
              }, secretKey, { expiresIn: "7 days" },
              function(token) {
                // We have the token.
                // Remove the 'password' field from the user
                // document before sending it to the client.
                stripPassword(user);
                // Send the user document and the token to the client.
                res.send({
                  user: user,
                  token: token
                });
              });
            } else {
              // Invalid password; 'success' was false.
              res.status(401).end();
            }
          })
          // Now we can check the password here...
        }
      });


    });

    /**
    * Adds a new status update to the database.
    * @param user ObjectID of the user.
    */
    function postStatusUpdate(user, location, contents, image, callback) {
      // Get the current UNIX time.
      var time = new Date().getTime();
      // The new status update. The database will assign the ID for us.
      var newStatusUpdate = {
        "likeCounter": [],
        "type": "statusUpdate",
        "contents": {
          "author": user,
          "postDate": time,
          "location": location,
          "contents": contents,
          "image": image,
          "likeCounter": []
        },
        // List of comments on the post
        "comments": []
      };

      // Add the status update to the database.
      db.collection('feedItems').insertOne(newStatusUpdate, function(err, result) {
        if (err) {
          return callback(err);
        }
        // Unlike the mock database, MongoDB does not return the newly added object
        // with the _id set.
        // Attach the new feed item's ID to the newStatusUpdate object. We will
        // return this object to the client when we are done.
        // (When performing an insert operation, result.insertedId contains the new
        // document's ID.)
        newStatusUpdate._id = result.insertedId;

        // Retrieve the author's user object.
        db.collection('users').findOne({ _id: user }, function(err, userObject) {
          if (err) {
            return callback(err);
          }
          // Update the author's feed with the new status update's ID.
          db.collection('feeds').updateOne({ _id: userObject.feed },
            {
              $push: {
                contents: {
                  $each: [newStatusUpdate._id],
                  $position: 0
                }
              }
            },
            function(err) {
              if (err) {
                return callback(err);
              }
              // Return the new status update to the application.
              callback(null, newStatusUpdate);
            }
          );
        });
      });
    }

    //`POST /feeditem { userId: user, location: location, contents: contents  }`
    app.post('/feeditem', validate({ body: StatusUpdateSchema }), function(req, res) {
      // If this function runs, `req.body` passed JSON validation!
      var body = req.body;
      var fromUser = getUserIdFromToken(req.get('Authorization'));

      // Check if requester is authorized to post this status update.
      // (The requester must be the author of the update.)
      if (fromUser === body.userId) {
        postStatusUpdate(new ObjectID(fromUser), body.location, body.contents, body.image, function(err, newUpdate) {
          if (err) {
            // A database error happened.
            // 500: Internal error.
            res.status(500).send("A database error occurred: " + err);
          } else {
            // When POST creates a new resource, we should tell the client about it
            // in the 'Location' header and use status code 201.
            res.status(201);
            res.set('Location', '/feeditem/' + newUpdate._id);
            // Send the update!
            res.send(newUpdate);
          }
        });
      } else {
        // 401: Unauthorized.
        res.status(401).end();
      }
    });

    function sendDatabaseError(res, err) {
      res.status(500).send("A database error occurred: " + err);
    }

    app.post('/user', validate({ body: UserSchema }),
    function(req, res) {
      var user = req.body;
      var password = user.password;
      // Standardize the email to be lower-cased and free of
      // extraneous whitespace. A production server would
      // actually check that the email is formatted
      // properly, and would send a verification email!
      user.email = user.email.trim().toLowerCase();
      if (password.length < 5) {
        // Bad request
        return res.status(400).end();
      }
      bcrypt.hash(password, 10, function(err, hash) {
        if (err) {
          // bcrypt had some sort of error!
          res.status(500).end();
        } else {
          // hash contains **both the hash and the salt**
          // concatenated together. Now, we can store
          // this into the database!
          // Replace the plaintext password with the
          // salt+hash string that bcrypt gave us.
          user.password = hash;
          // Create a new user
          db.collection('users').insertOne(user, function(err, result) {
            if (err) {
              // This will happen if there's already a
              // user with the same email address.
              return sendDatabaseError(res, err);
            }
            var userId = result.insertedId;
            // Create the user's feed.
            db.collection('feeds').insertOne({
              contents: []
            }, function(err, result) {
              if (err) {
                // In a production app, we'd probably
                // also want to remove the user
                // we just created if this fails.
                return sendDatabaseError(res, err);
              }

              // Update the user document with the new feed's ID.
              var feedId = result.insertedId;
              // Set the reference for the user's feed.
              db.collection('users').updateOne({
                _id: userId
              }, {
                $set: {
                  feed: feedId
                }
              }, function(err) {
                if (err) {
                  return sendDatabaseError(res, err);
                }
                // Send a blank response to indicate success!
                res.send();
              })
            });
          });
          // Put database query here
        }
      });
    });

    // `PUT /feeditem/feedItemId/likelist/userId` content
    app.put('/feeditem/:feeditemid/likelist/:userid', function(req, res) {
      var fromUser = getUserIdFromToken(req.get('Authorization'));
      var feedItemId = new ObjectID(req.params.feeditemid);
      var userId = req.params.userid;
      if (fromUser === userId) {
        // First, we can update the like counter.
        db.collection('feedItems').updateOne({ _id: feedItemId },
          {
            $addToSet: {
              likeCounter: new ObjectID(userId)
            }
          }, function(err) {
            if (err) {
              return sendDatabaseError(res, err);
            }
            // Second, grab the feed item now that we have updated it.
            db.collection('feedItems').findOne({ _id: feedItemId }, function(err, feedItem) {
              if (err) {
                return sendDatabaseError(res, err);
              }
              // Return a resolved version of the likeCounter
              resolveUserObjects(feedItem.likeCounter, function(err, userMap) {
                if (err) {
                  return sendDatabaseError(res, err);
                }
                // Return a resolved version of the likeCounter
                res.send(feedItem.likeCounter.map((userId) => userMap[userId]));
              });
            }
          );
        });
      } else {
        // 401: Unauthorized.
        res.status(401).end();
      }
    });

    // Unlike a feed item.
    app.delete('/feeditem/:feeditemid/likelist/:userid', function(req, res) {
      var fromUser = getUserIdFromToken(req.get('Authorization'));
      var feedItemId = new ObjectID(req.params.feeditemid);
      var userId = req.params.userid;
      if (fromUser === userId) {
        // Step 1: Remove userId from the likeCounter.
        db.collection('feedItems').updateOne({ _id: feedItemId },
          {
            // Only removes the userId from the likeCounter, if it is in the likeCounter.
            $pull: {
              likeCounter: new ObjectID(userId)
            }
          }, function(err) {
            if (err) {
              return sendDatabaseError(res, err);
            }
            // Step 2: Get the feed item.
            db.collection('feedItems').findOne({ _id: feedItemId }, function(err, feedItem) {
              if (err) {
                return sendDatabaseError(res, err);
              }
              // Return a resolved version of the likeCounter
              resolveUserObjects(feedItem.likeCounter, function(err, userMap) {
                if (err) {
                  return sendDatabaseError(res, err);
                }
                // Return a resolved version of the likeCounter
                res.send(feedItem.likeCounter.map((userId) => userMap[userId]));
              });
            });
          });
        } else {
          // 401: Unauthorized.
          res.status(401).end();
        }
      });

      // `PUT /feeditem/feedItemId/content newContent`
      app.put('/feeditem/:feeditemid/content', function(req, res) {
        var fromUser = new ObjectID(getUserIdFromToken(req.get('Authorization')));
        var feedItemId = new ObjectID(req.params.feeditemid);

        // Only update the feed item if the author matches the currently authenticated
        // user.
        db.collection('feedItems').updateOne({
          _id: feedItemId,
          "contents.author": fromUser
        }, { $set: { "contents.contents": req.body } }, function(err, result) {
          if (err) {
            return sendDatabaseError(res, err);
          } else if (result.modifiedCount === 0) {
            // Could not find the specified feed item. Perhaps it does not exist, or
            // is not authored by the user.
            // 400: Bad request.
            return res.status(400).end();
          }

          // Update succeeded! Return the resolved feed item.
          getFeedItem(feedItemId, function(err, feedItem) {
            if (err) {
              return sendDatabaseError(res, err);
            }
            res.send(feedItem);
          });
        });
      });

      // `DELETE /feeditem/:id`
      app.delete('/feeditem/:feeditemid', function(req, res) {
        var fromUser = new ObjectID(getUserIdFromToken(req.get('Authorization')));
        var feedItemId = new ObjectID(req.params.feeditemid);

        // Check if authenticated user has access to delete the feed item.
        db.collection('feedItems').findOne({
          _id: feedItemId,
          "contents.author": fromUser
        }, function(err, feedItem) {
          if (err) {
            return sendDatabaseError(res, err);
          } else if (feedItem === null) {
            // Could not find the specified feed item. Perhaps it does not exist, or
            // is not authored by the user.
            // 400: Bad request.
            return res.status(400).end();
          }

          // User authored the feed item!
          // Remove feed item from all feeds using $pull and a blank filter.
          // A blank filter matches every document in the collection.
          db.collection('feeds').updateMany({}, {
            $pull: {
              contents: feedItemId
            }
          }, function(err) {
            if (err) {
              return sendDatabaseError(res, err);
            }

            // Finally, remove the feed item.
            db.collection('feedItems').deleteOne({
              _id: feedItemId
            }, function(err) {
              if (err) {
                return sendDatabaseError(res, err);
              }
              // Send a blank response to indicate success.
              res.send();
            });
          });
        });
      });

      //`POST /search queryText`
      app.post('/search', function(req, res) {
        var fromUser = new ObjectID(getUserIdFromToken(req.get('Authorization')));
        if (typeof(req.body) === 'string') {
          // trim() removes whitespace before and after the query.
          // toLowerCase() makes the query lowercase.
          var queryText = req.body.trim().toLowerCase();
          // Get the user.
          db.collection('users').findOne({ _id: fromUser}, function(err, userData) {
            if (err) {
              return sendDatabaseError(res, err);
            } else if (userData === null) {
              // User not found.
              // 400: Bad request.
              res.status(400).end();
            }

            // Get the user's feed.
            db.collection('feeds').findOne({ _id: userData.feed }, function(err, feedData) {
              if (err) {
                return sendDatabaseError(res, err);
              }

              db.collection('feedItems').find({
                $or: feedData.contents.map((id) => { return { _id: id  }}),
                $text: {
                  $search: queryText
                }
              }).toArray(function(err, items) {
                if (err) {
                  return sendDatabaseError(res, err);
                }
                var resolvedItems = [];
                var errored = false;
                function onResolve(err, feedItem) {
                  if (errored) {
                    return;
                  } else if (err) {
                    errored = true;
                    sendDatabaseError(res, err);
                  } else {
                    resolvedItems.push(feedItem);
                    if (resolvedItems.length === items.length) {
                      res.send(resolvedItems);
                    }
                  }
                }

                // Get all of the matched items in parallel.
                for (var i = 0; i < items.length; i++) {
                  // Would be more efficient if we had a separate helper that
                  // resolved feed items from their objects and not their IDs.
                  // Not a big deal in our small applications, though.
                  getFeedItem(items[i]._id, onResolve);
                }

                // Special case: No results.
                if (items.length === 0) {
                  res.send([]);
                }
              });
            });
          });
        } else {
          // 400: Bad Request.
          res.status(400).end();
        }
      });

      // Post a comment
      app.post('/feeditem/:feeditemid/comments', validate({ body: CommentSchema }), function(req, res) {
        var fromUser = getUserIdFromToken(req.get('Authorization'));
        var comment = req.body;
        var author = req.body.author;
        var feedItemId = new ObjectID(req.params.feeditemid);
        if (fromUser === author) {
          comment.author = new ObjectID(comment.author);
          // Initialize likeCounter to be empty.
          comment.likeCounter = [];
          db.collection('feedItems').findAndModify({
            _id: new ObjectID(feedItemId)
          }, [['_id','asc']], {
            $push: {
              comments: comment
            }
          }, {"new": true}, function(err, result) {
            if (err) {
              sendDatabaseError(res, err);
            } else if (result.value === null) {
              // Document could not be found.
              res.status(400).end();
            } else {
              var feedItem = result.value;
              var index = feedItem.comments.length - 1;
              // 201: Created. Return route to comment.
              res.status(201);
              res.set('Location', '/feeditem/' + feedItemId + "/comments/" + index);
              // Return a resolved version of the feed item.
              getFeedItem(feedItemId, function(err, feedItem) {
                if (err) {
                  sendDatabaseError(res, err);
                } else {
                  // Return a resolved version of the feed item.
                  res.send(feedItem);
                }
              })
            }
          });
        } else {
          // Unauthorized.
          res.status(401).end();
        }
      });

      // Like a comment.
      app.put('/feeditem/:feeditemid/comments/:commentindex/likelist/:userid', function(req, res) {
        var fromUser = getUserIdFromToken(req.get('Authorization'));
        var userId = req.params.userid;
        var feedItemId = req.params.feeditemid;
        var commentIdx = parseInt(req.params.commentindex, 10);
        // Only a user can mess with their own like.
        if (fromUser === userId) {
          // Add the user's ID to the set of Likes on the comment.
          var update = {
            $addToSet: {}
          };
          update.$addToSet['comments.' + commentIdx + ".likeCounter"] = new ObjectID(userId);
          // Find and modify changes a document, and returns the document to us.
          db.collection('feedItems').findAndModify(
            // Filter document: Give us a document with the given ID.
            { _id: new ObjectID(feedItemId)},
            // Sort order, in case the filter matches multiple documents. This isn't optional.
            [['_id','asc']],
            // Update document.
            update,
            // Tell findAndModify that we want to receive the document *after* the update is applied. It defaults to *before*.
            { "new": true },
            function(err, result) {
              if (err) {
                return sendDatabaseError(res, err);
              } else if (result.value === null) {
                // Filter didn't match anything: Bad request.
                res.status(400).end();
              } else {
                var comment = result.value.comments[commentIdx];
                // Resolve the comment.
                db.collection('users').findOne({ _id: comment.author }, function(err, result) {
                  if (err) {
                    sendDatabaseError(res, err);
                  } else {
                    stripPassword(result);
                    comment.author = result;
                    res.send(comment);
                  }
                });
              }
            });
          } else {
            // Unauthorized.
            res.status(401).end();
          }
        });

        app.delete('/feeditem/:feeditemid/comments/:commentindex/likelist/:userid', function(req, res) {
          var fromUser = getUserIdFromToken(req.get('Authorization'));
          var userId = req.params.userid;
          var feedItemId = req.params.feeditemid;
          var commentIdx = parseInt(req.params.commentindex, 10);
          // Only a user can mess with their own like.
          if (fromUser === userId) {
            // Remove the user's ID from the likeCounter of the comment.
            var update = {
              $pull: {}
            };
            update.$pull['comments.' + commentIdx + ".likeCounter"] = new ObjectID(userId);
            db.collection('feedItems').findAndModify(
              { _id: new ObjectID(feedItemId)},
              [['_id','asc']],
              update,
              { "new": true },
              function(err, result) {
                if (err) {
                  return sendDatabaseError(res, err);
                } else if (result.value === null) {
                  // Comment not found: Bad request (400)
                  res.status(400).end();
                } else {
                  var feedItem = result.value;
                  var comment = feedItem.comments[commentIdx];
                  // Resolve the comment's author.
                  db.collection('users').findOne({ _id: comment.author }, function(err, author) {
                    if (err) {
                      sendDatabaseError(res, err);
                    } else {
                      stripPassword(author);
                      comment.author = author;
                      // Send back the updated comment.
                      res.send(comment);
                    }
                  });
                }
              });
            } else {
              // Unauthorized.
              res.status(401).end();
            }
          });

          // Reset database.
          app.post('/resetdb', function(req, res) {
            console.log("Resetting database...");
            ResetDatabase(db, function() {
              res.send();
            });
          });

          /**
          * Translate JSON Schema Validation failures into error 400s.
          */
          app.use(function(err, req, res, next) {
            if (err.name === 'JsonSchemaValidation') {
              // Set a bad request http response status
              res.status(400).end();
            } else {
              // It's some other sort of error; pass it to next error middleware handler
              next(err);
            }
          });

          // Starts the server on port 3000!
          // Starts an https server on port 3000!
          https.createServer({key: privateKey, cert: certificate},
            app).listen(3000, function () {
              console.log('Example app listening on port 3000!');
            });
          });
