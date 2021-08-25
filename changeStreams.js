const { MongoClient } = require('mongodb');
const config = require('config');
const CONNECTION_URL = config.get('API.dbconnection');
const DATABASE_NAME = config.get('API.dbname');
const DATABASE_COLLECTION = config.get('API.dbcollection');
const io = require('socket.io-client')


function closeChangeStream(timeInMs = 120000, changeStream) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("Closing the change stream");
            changeStream.close();
            resolve();
        }, timeInMs)
    })
};

const uri = CONNECTION_URL;
const client = new MongoClient(uri, { useUnifiedTopology: true });

async function monitorListingsUsingEventEmitter(app, timeInMs = 60000, pipeline = []){  
    const collection = client.db(DATABASE_NAME).collection(DATABASE_COLLECTION);
    let cachedResumeToken;
    let changeStream = module.exports = collection.watch(resume_after=cachedResumeToken);
    
    changeStream.on('change', (change) => {
        // TODO if operationType is update then emit status change
        cachedResumeToken = change["_id"]
        
        if(change.operationType == 'update')
        {
            app.get("socketService").emiter('connection','This is coming from changeStream');
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


    async function changeStreamMonitor(app) {      
        try {
            // Connect to the MongoDB cluster
            await client.connect();

            // Make the appropriate DB calls
            await monitorListingsUsingEventEmitter(app);

        } finally {
            // Close the connection to the MongoDB cluster
            //await client.close();
        }
    }


exports.changeStreamMonitor = changeStreamMonitor;

// main().catch(console.error);

// Add functions that make DB calls here
