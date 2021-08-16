const { MongoClient } = require('mongodb');
const config = require('config');

const CONNECTION_URL = config.get('API.dbconnection');
const DATABASE_NAME = config.get('API.dbname');
const DATABASE_COLLECTION = config.get('API.dbcollection');

const ttimeInMs = 60000;

function closeChangeStream(timeInMs = 120000, changeStream) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("Closing the change stream");
            changeStream.close();
            resolve();
        }, timeInMs)
    })
};


async function monitorListingsUsingEventEmitter(client, timeInMs = 60000, pipeline = [
      
    ]){
    const collection = client.db(DATABASE_NAME).collection(DATABASE_COLLECTION);
    const changeStream = collection.watch(pipeline);

    changeStream.on('change', (next) => {
        console.log(next);
    });

    await closeChangeStream(timeInMs, changeStream);
}

module.exports = {
    changeStreamMonitor : async function main() {
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
            await client.close();
        }
    }
}


// main().catch(console.error);

// Add functions that make DB calls here
