const MongoClient = require('mongodb');
const DB = process.env.DB;

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// const dns = require('dns');
// mongoose.connect(process.env.DB, { useNewUrlParser: true });

let StockSchema = new Schema({
  stock: { type: String, required: true },
  likes: { type: Number, default: 0 },
  ips: [String]
});

let Stock = mongoose.model("Stock", StockSchema);

function stockFunctions() {
  
  this.getData = async (stock) => {
    const obj = { stock };
    const options = {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    };
    let stockdata = await Stock.findOneAndUpdate(obj, { $setOnInsert: obj }, options, (err, data) => {
        if (err) {
          console.log(err);
          return "err updating";
        }
        else {
          return data;
        };
      });
    
    return stockdata;

  };
  
  this.getLike = async (stock, ip) => {
    const obj = { stock };
    let stockdata = await Stock.findOne(obj, 'likes ips', (err, data) => {
      if (err) {
        console.log(err);
        return;
      }
      else {
        if (data.ips.includes(ip)) { // ip has already liked stock, do not update
          return data;
        }
        else {
          data.ips.push(ip);
          data.likes = data.likes + 1;
          data.save();
          return data;
        }
      }
    });
    
    return stockdata;
  };
  
}

module.exports = stockFunctions;