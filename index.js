require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');

const dns = require('node:dns');
//const { resourceLimits } = require('node:worker_threads');

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

// Basic Configuration
const port = process.env.PORT || 3000;

const URLSchema = new mongoose.Schema({
  original_url: {type: String, required: true, unique:true},
  short_url: {type:String, require:true, unique:true}
});

let URLModel = mongoose.model("url", URLSchema);

//middleware function to parse post requests
app.use(express.urlencoded({extended: true}));

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});
//request to shorturl
app.get('/api/shorturl/:short_url', function(req,res){
  let short_url =req.params.short_url;
  //find oirginal url in database
  URLModel.findOne({short_url: short_url}).then((foundURL) => {
    if (foundURL){
      let original_url = foundURL.original_url;
      res.redirect(original_url);
    } else {
      res.json({message: "the shorturl does not exist"});
    }
  }); 
})

// Your first API endpoint
app.post('/api/shorturl', function(req, res){
  let url = req.body.url;
  //validate url, url module 
  try {
    urlObj = new URL(url);
    //if domain exists it will return address
    dns.lookup(urlObj.hostname, function(err, address,family){
      //if DNS domain does not exist no address returned
      if (!address){
        res.json({ error: 'invalid url' });
      } 
      // we have valid url -- proceed
      else {
        let original_url = urlObj.href;
        //check that the url does not exist in database already
        URLModel.findOne({original_url: original_url}).then((foundURL)=>{
          if (foundURL){
            //return what is in the database if found
            res.json({original_url: foundURL.original_url, short_url: foundURL.short_url})
          } 
          // if url does no exist, create new short url and add to database
          else {
            let short_url = 1;
            //get latest short_url
            URLModel.findOne({}).sort(
            {short_url: "desc"}).limit(1).then((latestURL) => {
            if (latestURL != null){
              short_url = parseInt(latestURL.short_url) + 1;
          } 
            resObj = {original_url: original_url, short_url: short_url};
            //create an entry in database
            let newURL = new URLModel(resObj); 
            newURL.save();
            res.json(resObj);
        }
          )
          }
        })
      }
    })
  }
  // if fails to create new url 
  catch {
    res.json({ error: 'invalid url' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
