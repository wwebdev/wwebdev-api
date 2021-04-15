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

const weeklyId = '70'

function processEvent(event, context, callback) {
  console.log('Calling MongoDB Atlas from AWS Lambda with event: ' + JSON.stringify(event));

  const data = fs.readFileSync(`./${weeklyId}.json`, 'utf8');

  // parse JSON string to JSON object
  const weekly = JSON.parse(data);

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

        for (let item of weekly.items) {
          const createFunc = new Promise(async ( reject, resolve ) => {
            const result = await createDoc(cachedDb, {
              weekly: weeklyId,
              ...item
            }, callback)
            resolve(result)
          })
        }

        // return createDoc(cachedDb, jsonContents, callback);
      });
    }
  }
  catch (err) {
    console.error('an error occurred', err);
  }
}

const createDoc = (db, json, callback) =>
  db.collection('weekly').insertOne( json, function(err, result) {
    if(err!=null) {
        console.error("an error occurred in createDoc", err);
        // callback(null, JSON.stringify(err));
        return err
    }
    else {
      console.log("Kudos! You just created an entry into the weekly collection with id: " + result.insertedId);
      // callback(null, "SUCCESS");
      return result.insertedId
    }
    //we don't need to close the connection thanks to context.callbackWaitsForEmptyEventLoop = false (above)
    //this will let our function re-use the connection on the next called (if it can re-use the same Lambda container)
    //db.close();
  });
