const { MongoClient } = require('mongodb');
const config = require('config');
const CONNECTION_URL = config.get('API.dbconnection');
const DATABASE_NAME = config.get('API.dbname');
const DATABASE_COLLECTION = config.get('API.dbcollection');
const io = require('socket.io-client')
//const io = require('https://cdn.socket.io/3.1.3/socket.io.min.js');


//socket.emit("helloFromChangeStream", { a: "This is coming from changeStream.js", c: [] });

function closeChangeStream(timeInMs = 120000, changeStream) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("Closing the change stream");
            changeStream.close();
            resolve();
        }, timeInMs)
    })
};


async function monitorListingsUsingEventEmitter(client, timeInMs = 60000, pipeline = []){
    const collection = client.db(DATABASE_NAME).collection(DATABASE_COLLECTION);
    let cachedResumeToken;
    let changeStream = module.exports = collection.watch(resume_after=cachedResumeToken);

    changeStream.on('change', (change) => {
        // TODO if operationType is update then emit status change
        cachedResumeToken = change["_id"]
        
        if(change.operationType == 'update')
        {
            const socket = io();
            socket.emit("helloFromChangeStream", { 'Message' : 'This is coming from changeStream' });
            console.log('Update event emitted');
        }
    });

    changeStream.on('error', (error) => {
        console.log(error)
        if (cachedResumeToken) {
            establishChangeStream(cachedResumeToken)
        }
    })

    // TODO Handle changestream closure
    //await closeChangeStream(timeInMs, changeStream);
}


    async function changeStreamMonitor() {
        /**
         * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
         * See https://docs.mongodb.com/drivers/node/ for more details
         */
        const uri = CONNECTION_URL;
        /**
         * The Mongo Client you will use to interact with your database
         * See https://mongodb.github.io/node-mongodb-native/3.6/api/MongoClient.html for more details
         * In case: '[MONGODB DRIVER] Warning: Current Server Discovery and Monitoring engine is deprecated...'
         * pass option { useUnifiedTopology: true } to the MongoClient constructor.
         * const client =  new MongoClient(uri, {useUnifiedTopology: true})
         */
        const client = new MongoClient(uri, { useUnifiedTopology: true });
        

        try {
            // Connect to the MongoDB cluster
            await client.connect();

            // Make the appropriate DB calls
            await monitorListingsUsingEventEmitter(client);

        } finally {
            // Close the connection to the MongoDB cluster
            //await client.close();
        }
    }


exports.changeStreamMonitor = changeStreamMonitor;

// main().catch(console.error);

// Add functions that make DB calls here
