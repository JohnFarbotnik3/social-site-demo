import { MongoClient, ServerApiVersion } from "mongodb";

// Replace the placeholder with your Atlas connection string.
// https://www.mongodb.com/docs/manual/reference/connection-string/#std-label-connections-standard-connection-string-format
// mongodb://[username:password@]host1[:port1][,...hostN[:portN]][/[defaultauthdb][?options]]
// NOTE: running "mongosh" shell command should return this string if "mongodb" service is running.
const username = encodeURIComponent("");
const password = encodeURIComponent("");
const clusterURL = "localhost:27017";
export const uri = `mongodb://${clusterURL}/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.3.9`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
export const client = new MongoClient(uri,  {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	}
});

export async function run() {
	try {
		// Connect the client to the server (optional starting in v4.7)
		await client.connect();
		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log("Successfully connected to MongoDB.");
	} catch(err) {
		console.error(err);
		// Ensures that the client closes.
		await client.close();
	}
}

export async function close() {
	await client.close();
}
