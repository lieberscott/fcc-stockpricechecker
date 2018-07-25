/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

const expect = require('chai').expect;
const MongoClient = require('mongodb');
const fetch = require('node-fetch'); // so fetch works in a development setting (which Glitch is)

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});
const alpha = process.env.ALPHA_KEY;

const stockFuncs = require("../controllers/stockFunctions.js");
const stockFunctions = new stockFuncs();

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(async function (req, res){
      let stock = req.query.stock;
      let like = req.query.like ? true : false; // would otherwise be undefined
      let ip = req.ip; // we add IP address to an array in Mongo, so only one "like" per IP address (per instructions)

      if (Array.isArray(stock)) { // two stocks entered
        let stock0 = stock[0].toLowerCase();
        let stock1 = stock[1].toLowerCase();
        let url0 = "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=" + stock0 + "&interval=1min&outputsize=compact&apikey=" + alpha;
        let url1 = "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=" + stock1 + "&interval=1min&outputsize=compact&apikey=" + alpha;
        
        // STEP 1: get stock info from alpha
        let alphaRes0 = await fetch(url0);
        let alphaRes1 = await fetch(url1);
        let ticker0 = await alphaRes0.json();
        let ticker1 = await alphaRes1.json();
        
        // STEP 2: get stock info from database (insert stock into database if not there)
        let upsert0 = await stockFunctions.getData(stock0);
        let upsert1 = await stockFunctions.getData(stock1);
        
        // STEP 3: insert "like" if necessary
        if (like) {
          upsert0 = await stockFunctions.getLike(stock0, ip);
          upsert1 = await stockFunctions.getLike(stock1, ip);
        }
        
        // set up response variables for each stock
        let metaData0 = ticker0["Meta Data"];
        let lastUpdated0 = metaData0["3. Last Refreshed"];
        let price0 = ticker0["Time Series (1min)"][lastUpdated0]["1. open"];
        let li0 = upsert0.likes;
        
        let metaData1 = ticker1["Meta Data"];
        let lastUpdated1 = metaData1["3. Last Refreshed"];
        let price1 = ticker1["Time Series (1min)"][lastUpdated1]["1. open"];
        let li1 = upsert1.likes;
        
        // relative likes to each other (pointless info to include, but it's in the user stories)
        let relLikes0 = li0 - li1;
        let relLikes1 = li1 - li0;
        
        
        // STEP 4: response
        res.json({
          "stockdata": [{
            stock: stock0,
            price: price0,
            rel_likes: relLikes0
          },
          {
            stock: stock1,
            price: price1,
            rel_likes: relLikes1
          }]
        });
        
        
      }
      else { // one stock entered
        stock = stock.toLowerCase();
        let url = "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=" + stock + "&interval=1min&outputsize=compact&apikey=" + alpha;
        
        // STEP 1: get stock info from alpha
        let alphaRes = await fetch(url); // get data from alpha API
        let ticker = await alphaRes.json(); // convert to JSON        
        
        // STEP 2: get stock info from database (insert stock into database if not there)
        let upsert = await stockFunctions.getData(stock);
        
        // STEP 3: insert like if necessary
        if (like) {
          upsert = await stockFunctions.getLike(stock, ip); // override previous upsert data with updated data
        }

        let metaData = ticker["Meta Data"];
        let lastUpdated = metaData["3. Last Refreshed"]; // object name for next step
        let price = ticker["Time Series (1min)"][lastUpdated]["1. open"]; // stock price from API 
        let li = upsert.likes;
        
        // STEP 4: response
        res.json({
          "stockdata": {
            stock,
            price,
            likes: li
          }
        });
      }
    });
};
