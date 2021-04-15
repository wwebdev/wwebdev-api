'use strict'

var MongoClient = require('mongodb').MongoClient;
const _ = require('lodash')
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
      processEvent(event, context, callback);
  }
};

function processEvent(event, context, callback) {
  const query = event.queryStringParameters.q
  const jsonString = decodeURI(query)
  const jsonContents = jsonString ? JSON.parse(jsonString) : { }
  const filteredQuery = _.pick(jsonContents, ['weekly', 'search', 'page'])

  // the following line is critical for performance reasons to
  // allow re-use of database connections across calls to this Lambda
  // function and avoid closing the database connection. The first call to this
  // lambda function takes about 5 seconds to complete, while subsequent, close
  // calls will only take a few hundred milliseconds.
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const mongoFunction = filteredQuery.weekly ? getDocsById : searchDocs

    if (cachedDb == null) {
      console.log('=> connecting to database');
      MongoClient.connect(atlas_connection_uri, function (err, client) {
        cachedDb = client.db('weekly');

        return mongoFunction(cachedDb, filteredQuery, callback);
      });
    }
    else {
      mongoFunction(cachedDb, filteredQuery, callback);
    }
  }
  catch (err) {
    console.error('an error occurred', err);
  }
}

function getDocsById (db, json, callback) {
  const collection = db.collection("weekly")
  collection.find(json, async (err, result) => {
    if (!!err) {
      console.error("an error occurred in getDocs", err);
      sendCallback(callback, err)
    }
    else {
      const data = await result.toArray()
      sendCallback(callback, data)
    }
  });
}

function searchDocs (db, json, callback) {
  const collection = db.collection("weekly")
  const page = json.page ? parseInt(json.page) : 1

  const query = [
    json.search && {
      $search: {
        "text": {
          "query": json.search,
          "path": ["description", "title"]
        }
      }
    },
    {
      $limit: page * 20
    },
    {
      $skip: (page - 1) * 20
    }
  ].filter(Boolean)
  // https://docs.atlas.mongodb.com/reference/atlas-search/tutorial/#std-label-fts-tutorial-ref
  collection.aggregate(query, async (err, result) => {
    if (!!err) {
      console.error("an error occurred in getDocs", err);
      sendCallback(callback, err)
    }
    else {
      const data = await result.toArray()
      sendCallback(callback, data)
    }
  })
};

function sendCallback(callback, data) {
  callback(null, {
    statusCode: 200,
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      // TODO allow localhost and wweb.dev or have multiple stages
      'Access-Control-Allow-Origin': '*'
    }
  });
}