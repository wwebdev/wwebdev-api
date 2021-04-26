'use strict'

const fs = require('fs')
var MongoClient = require('mongodb').MongoClient
const config = require('./config')

let atlas_connection_uri;
let cachedDb = null;

exports.handler = (event, context, callback) => {
  var uri = config['MONGODB_ATLAS_CLUSTER_URI'];

  if (atlas_connection_uri != null) {
      processEvent(event, context, callback);
  }
  else {
      atlas_connection_uri = uri;
      console.log('the Atlas connection string is ' + atlas_connection_uri);
      processEvent(event, context, callback);
  }
};

const weeklyId = '1'

function processEvent(event, context, callback) {
  console.log('Calling MongoDB Atlas from AWS Lambda with event: ' + JSON.stringify(event));

  // the following line is critical for performance reasons to
  // allow re-use of database connections across calls to this Lambda
  // function and avoid closing the database connection. The first call to this
  // lambda function takes about 5 seconds to complete, while subsequent, close
  // calls will only take a few hundred milliseconds.
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    if (cachedDb == null) {
      console.log('=> connecting to database');
      MongoClient.connect(atlas_connection_uri, async (err, client) => {
        cachedDb = client.db('weekly');
        const promises = []

        const result = await updateItem(cachedDb, callback)
        resolve(result)
      });
    }
  }
  catch (err) {
    console.error('an error occurred', err);
  }
}

const updateItem = (db, callback) =>
    db.collection('weekly').find({ "image": /wwebdev-images/ }).forEach(function(doc) {
      console.log(doc._id)
      var updated_url = doc.image.replace(
        'https://wwebdev-images.s3.eu-central-1.amazonaws.com/content/weekly',
        '/weekly/content'
      );
      db.collection('weekly').update(
        {"_id": doc._id},
        {
          "$set": {
            "image": updated_url
          }
      }
    );
  });

