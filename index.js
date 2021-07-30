const express = require('express');
const app = express();
const path = require("path");
const router = express.Router();
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('config');
const { MongoClient } = require("mongodb");
const PORT = config.get('API.apiport');
const CONNECTION_URL = config.get('API.dbconnection');
const DATABASE_NAME = config.get('API.dbname');
const DATABASE_COLLECTION = config.get('API.dbcollection');

app.use(cors());

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

router.get("/", (req, res) => {
  res.render("index");
});

router.get('/asset', async (req, res) => {
    let globalID = req.query.glid;
    let searchTerm = 'sequence:'
    let indexOfID = globalID.indexOf(searchTerm) + 9;
    let assetName = req.query.Name;

    let today = new Date();
    let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let dateTime = date+' '+time;

    const client = new MongoClient(CONNECTION_URL, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const collection = database.collection(DATABASE_COLLECTION);
        // create a document to be inserted
        const doc = { name : assetName, mobid : globalID.slice(indexOfID), insertTime :  dateTime, status : 'Queued' };
        let alreadyThere = await collection.findOne({ mobid :  globalID.slice(indexOfID)})

        if(!alreadyThere)
        {
          const result = await collection.insertOne(doc);
          console.log(
            `${result.insertedCount} documents were inserted with the _id: ${result.insertedId}`,
          );
        }

        let queue = await collection.find().toArray();
        queue = queue.reverse();
        
        res.render("asset", { title: "Assets waiting to be processed", queue });

      } finally {
        await client.close();
      }
});


app.use("/", router);
app.listen(process.env.port || 3000);