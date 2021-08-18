const express = require('express');
const app = express();
const path = require("path");
const router = express.Router();
const http = require('http');

const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('config');
const { MongoClient } = require("mongodb");
const PORT = config.get('API.apiport');
const CONNECTION_URL = config.get('API.dbconnection');
const DATABASE_NAME = config.get('API.dbname');
const DATABASE_COLLECTION = config.get('API.dbcollection');
const controls = require("./controls");
const changeStreams = require('./changeStreams');


app.use(cors());

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let pageInfo = {};
pageInfo.title = "MusicExtractor";
pageInfo.queue = [];


router.get("/", async (req, res) => {
  console.log('Connecting to the database...');
  const client = new MongoClient(CONNECTION_URL, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        console.log(`Connected to ${DATABASE_NAME}`);
        
        const database = client.db(DATABASE_NAME);
        const collection = database.collection(DATABASE_COLLECTION);
   
        let queue = await collection.find().toArray();
        queue = queue.reverse();
        pageInfo.queue = queue;

        res.render("asset", pageInfo);

      } finally {
        await client.close();
      }
});

router.get("/remove", async (req, res) => {
  const client = new MongoClient(CONNECTION_URL, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        
        const database = client.db(DATABASE_NAME);
        const collection = database.collection(DATABASE_COLLECTION);

        let globalID = req.query.glid;

        await collection.deleteOne({ mobid :  globalID});
   
        let queue = await collection.find().toArray();
        queue = queue.reverse();

        pageInfo.queue = queue;
        
        res.render("asset", pageInfo);

      } finally {
        await client.close();
      }
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

    let sentBy = '';
    let ip = await controls.getRequestIP(req);
    let token = await controls.getAccessToken();
    let sessions = await controls.getSessions(token);

    sentBy = sessions[ip];

    const client = new MongoClient(CONNECTION_URL, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        
        const database = client.db(DATABASE_NAME);
        const collection = database.collection(DATABASE_COLLECTION);
        // create a document to be inserted
        const doc = { name : assetName, mobid : globalID.slice(indexOfID), insertTime :  dateTime, status : 'Queued', sentBy : sentBy };
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

        pageInfo.queue = queue;

        res.render("asset", pageInfo);

      } finally {
        await client.close();
      }
});

changeStreams.changeStreamMonitor();

app.use("/", router);
const server = http.createServer(app);
const io = require('socket.io')(server);
server.listen(process.env.port || PORT);

io.on('connection', (socket) => {
  console.log('a user connected')
  socket.on('chatter', (message) => {
    console.log('chatter : ', message)
    io.emit('chatter', message)
  })
})