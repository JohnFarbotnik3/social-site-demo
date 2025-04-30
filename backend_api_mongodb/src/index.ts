
import * as http from "http";
import express, { Request, Response } from "express";
import * as CORS from "cors";
import * as api_fetch from "./api_fetch.js";
import * as api_ws from "./api_ws.js";
import { test } from "./tables_init_test.js";
import { init_tables } from "./tables.js";
import { Db, MongoClient, ServerApiVersion } from "mongodb";
import expressWS from "express-ws";
import { hostname, port_https, ENDPOINTS } from "backend_api_types/endpoints.js";
import { emit_logs } from "./logging.js";
import { try_exit_process } from "./shutdown.js";

/* SOURCES:
	- express:
		https://expressjs.com/en/starter/examples.html
	- express https server:
		https://stackoverflow.com/questions/11744975/enabling-https-on-express-js
	- creating an SSL certificate:
		https://www.digitalocean.com/community/tutorials/how-to-create-a-self-signed-ssl-certificate-for-apache-in-ubuntu-16-04
		> sudo openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout ./sslcert/server.key -out ./sslcert/server.crt
	- setting up typescript:
		https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html
	- docker:
		https://docs.docker.com/engine/install/
		https://docs.docker.com/get-started/workshop/
		https://docs.docker.com/reference/cli/docker/
	- mongodb docker image + important configuration info:
		https://hub.docker.com/_/mongo
	- start API after DB:
		https://docs.docker.com/compose/how-tos/startup-order/
		https://stackoverflow.com/questions/54384042/why-does-the-docker-compose-healthcheck-of-my-mongo-container-always-fail
	- express websockets:
		https://www.npmjs.com/package/express-ws#usage
		https://stackoverflow.com/questions/76194756/how-to-set-up-a-websocket-server-with-express-js-properly
*/

// ============================================================
// MongoDB.
// ------------------------------------------------------------

// Replace the placeholder with your Atlas connection string.
// https://www.mongodb.com/docs/manual/reference/connection-string/#std-label-connections-standard-connection-string-format
// mongodb://[username:password@]host1[:port1][,...hostN[:portN]][/[defaultauthdb][?options]]
export let uri = process.env.ME_CONFIG_MONGODB_URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
export let db_client = new MongoClient(uri,  {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	}
});

export async function db_run() {
	try {
		console.log("URI", uri);
		// Connect the client to the server (optional starting in v4.7)
		await db_client.connect();
		// Send a ping to confirm a successful connection
		await db_client.db("admin").command({ ping: 1 });
		console.log("Successfully connected to MongoDB.");
	} catch(err) {
		console.error(err);
		// ensure that the client closes.
		db_close();
	}
}

export async function db_close() {
	await db_client.close();
	db_client = null;
}

// ============================================================
// HTTPS server - for serving requests.
// ------------------------------------------------------------

//const privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
//const certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
//const credentials = {key: privateKey, cert: certificate};

function try_catch_response(req:Request, res:Response, func:Function) {
	func(req, res).catch((error: Error) => {
		console.error(error);
		console.error("request ip:", req.ip);
		console.error("request body:", req.body);
		res.sendStatus(500);
	});
}

async function on_shutdown(err: Error) {
	db_close();
	await emit_logs();
	if(err) {
		console.error(err);
	} else {
		console.log("server shut down successfully.");
		try_exit_process();
	}
}

async function reset_db(db: Db) {
	await db.dropDatabase();
	init_tables(db);
}

async function init_server_https() {
	const app = express();
	//const server = https.createServer(credentials, app);
	const server = http.createServer(app);
	const app_ws = expressWS(app, server);

	// add cors handler for pre-flight requests.
	// https://expressjs.com/en/resources/middleware/cors.html
	const corsOptions:CORS.CorsOptions = {
		origin: ["http://localhost:4173", "http://localhost:5173", "https://localhost:8443", "https://192.168.122.96:8443"],
		optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
	};
	const corsHandler = CORS.default(corsOptions);
	app.use("*", corsHandler);

	// add body parser, as this is now seperate from core express framework.
	// https://expressjs.com/en/resources/middleware/body-parser.html
	// https://stackoverflow.com/questions/9177049/express-js-req-body-undefined
	app.use(express.json());

	// initialize tables.
	const db = db_client.db("social_site_demo");
	await reset_db(db);

	// accept websocket connections.
	app.get(ENDPOINTS.ws_chat	, function(_req, res, _next){ res.end(); });
	app.get(ENDPOINTS.ws_user	, function(_req, res, _next){ res.end(); });
	app_ws.app.ws(ENDPOINTS.ws_chat	, function(ws, req) { api_ws.setup_websocket_chat(ws, req); });
	app_ws.app.ws(ENDPOINTS.ws_user	, function(ws, req) { api_ws.setup_websocket_user(ws, req); });
	// accounts.
	app.post(ENDPOINTS.account_token_valid	, (req, res) => try_catch_response(req, res, api_fetch.account_token_valid	));
	app.post(ENDPOINTS.account_create		, (req, res) => try_catch_response(req, res, api_fetch.account_create		));
	app.post(ENDPOINTS.account_delete		, (req, res) => try_catch_response(req, res, api_fetch.account_delete		));
	app.post(ENDPOINTS.account_login		, (req, res) => try_catch_response(req, res, api_fetch.account_login		));
	app.post(ENDPOINTS.account_logout		, (req, res) => try_catch_response(req, res, api_fetch.account_logout		));
	app.post(ENDPOINTS.account_remove		, (req, res) => try_catch_response(req, res, api_fetch.account_remove		));
	app.post(ENDPOINTS.account_update_t		, (req, res) => try_catch_response(req, res, api_fetch.account_update_with_token	));
	app.post(ENDPOINTS.account_update_p		, (req, res) => try_catch_response(req, res, api_fetch.account_update_with_password	));
	app.post(ENDPOINTS.users_search			, (req, res) => try_catch_response(req, res, api_fetch.users_search			));
	app.post(ENDPOINTS.blogs_insert_post	, (req, res) => try_catch_response(req, res, api_fetch.blogs_insert_post	));
	app.post(ENDPOINTS.blogs_remove_post	, (req, res) => try_catch_response(req, res, api_fetch.blogs_remove_post	));
	app.post(ENDPOINTS.blogs_update_post	, (req, res) => try_catch_response(req, res, api_fetch.blogs_update_post	));
	app.post(ENDPOINTS.notifs_clear			, (req, res) => try_catch_response(req, res, api_fetch.notifs_clear			));
	app.post(ENDPOINTS.get_blog_posts	, (req, res) => try_catch_response(req, res, api_fetch.get_blog_posts	));
	app.post(ENDPOINTS.get_chat_posts	, (req, res) => try_catch_response(req, res, api_fetch.get_chat_posts	));
	app.post(ENDPOINTS.sync_blogs		, (req, res) => try_catch_response(req, res, api_fetch.sync_blogs	));
	app.post(ENDPOINTS.sync_infos		, (req, res) => try_catch_response(req, res, api_fetch.sync_infos	));
	app.post(ENDPOINTS.sync_chats		, (req, res) => try_catch_response(req, res, api_fetch.sync_chats	));
	app.post(ENDPOINTS.sync_flist		, (req, res) => try_catch_response(req, res, api_fetch.sync_flist	));
	app.post(ENDPOINTS.sync_notifs		, (req, res) => try_catch_response(req, res, api_fetch.sync_notifs	));
	// 404.
	app.use((req, res) => {
		console.log("url", req.originalUrl);
		res.status(404);
		res.format({
			//json	: () => res.json({ error: 'Not found' }),
			default	: () => res.type('txt').send('Not found'),
		});
	});

	await db_run();

	server.listen(port_https, () => { console.log(`HTTPS: Listening on https://${hostname}:${port_https}`); });

	// output initial log (for testing purposes).
	emit_logs();
	// periodically emit log files.
	setInterval(emit_logs, 3600 * 1000);
	// https://stackoverflow.com/questions/43003870/how-do-i-shut-down-my-express-server-gracefully-when-its-process-is-killed
	// https://nodejs.org/api/http.html#http_server_close_callback
	process.on('SIGTERM', () => server.close(on_shutdown));
	process.on('SIGINT' , () => server.close(on_shutdown));

	// run initialization test.
	test();

	// clear and reset db every 24 hours.
	setInterval(() => reset_db(db).then(() => test()), 24 * 3600 * 1000);

	// TODO: close db connection when shutting down https server.
}
init_server_https();
