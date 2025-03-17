
/* SOURCES:
	- express:
		https://expressjs.com/en/starter/examples.html
	- express https server:
		https://stackoverflow.com/questions/11744975/enabling-https-on-express-js
	- creating an SSL certificate:
		https://www.digitalocean.com/community/tutorials/how-to-create-a-self-signed-ssl-certificate-for-apache-in-ubuntu-16-04
		> sudo openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout ./sslcert/server.key -out ./sslcert/server.crt
	- serving static content:
		https://expressjs.com/en/starter/static-files.html
	- setting up typescript:
		https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html
*/

import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import express from "express";
import * as CORS from "cors";
import * as API from "./API.js";
import * as DB from "./db.js";
import { test } from "./Test.js";
import { init_tables } from "./Tables.js";
const privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
const certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
const credentials = {key: privateKey, cert: certificate};
//const hostname = "[::1]";
const hostname = "localhost";
const port_http  = 5080;
const port_https = 5443;

// HTTP server - for redirctinng to HTTPS.
async function init_server_http_redirect() {
	const app = express();
	app.get("/*", (req, res) => {
		const old_url = req.originalUrl;
		const new_url = `https://${hostname}:${port_https}${old_url}`;
		console.log("old_url", old_url);
		console.log("new_url", new_url);
		res.redirect(new_url);
	});

	const http_server = http.createServer(app);
	http_server.listen(port_http, () => { console.log(`HTTP: Listening on http://${hostname}:${port_http}`); });
}

// HTTPS server - for serving requests.
async function init_server_https() {
	const app = express();

	// add cors handler for pre-flight requests.
	// https://expressjs.com/en/resources/middleware/cors.html
	const corsOptions:CORS.CorsOptions = {
		//origin: ["http://localhost:5173"],
		origin: ["https://localhost:5443", "https://192.168.122.96:5443"],
		optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
	};
	const corsHandler = CORS.default(corsOptions);
	app.use("*", corsHandler);

	// add body parser, as this is now seperate from core express framework.
	// https://expressjs.com/en/resources/middleware/body-parser.html
	// https://stackoverflow.com/questions/9177049/express-js-req-body-undefined
	app.use(express.json());

	// initialize tables.
	const db = DB.client.db("social_site_demo");
	await db.dropDatabase();
	init_tables(db);

	// log all requests.
	app.use((req, res, next) => { console.log("IP", req.ip, req.ips); next(); });
	// serve static files.
	app.use('/static', express.static('static'));
	app.use('/static_frontend', express.static('static_frontend'));
	// accounts.
	app.post("/account/create"	, async(req, res) => { res.send(await API.account_create(req.body)); });
	app.post("/account/login"	, async(req, res) => { res.send(await API.account_login(req.body)); });
	app.post("/account/logout"	, async(req, res) => { res.send(await API.account_logout(req.body)); });
	app.post("/account/remove"	, async(req, res) => { res.send(await API.account_remove(req.body)); });
	app.post("/account/update_t", async(req, res) => { res.send(await API.account_update_with_token(req.body)); });
	app.post("/account/update_p", async(req, res) => { res.send(await API.account_update_with_password(req.body)); });
	// users.
	app.post("/users/public"	, async(req, res) => { res.send(await API.users_get_public_info(req.body)); });
	app.post("/users/search"	, async(req, res) => { res.send(await API.users_search(req.body)); });
	// posts.
	app.post("/posts/update"	, async(req, res) => { res.send(await API.posts_update(req.body)); });
	app.post("/posts/get"		, async(req, res) => { res.send(await API.posts_get(req.body)); });
	// friends.
	app.post("/friends/list"	, async(req, res) => { res.send(await API.friends_list(req.body)); });
	app.post("/friends/insert"	, async(req, res) => { res.send(await API.friends_insert(req.body)); });
	app.post("/friends/remove"	, async(req, res) => { res.send(await API.friends_remove(req.body)); });
	app.post("/friends/newchat"	, async(req, res) => { res.send(await API.friends_create_chat(req.body)); });
	// chats.
	app.post("/chats/get"		, async(req, res) => { res.send(await API.chats_get(req.body)); });
	app.post("/chats/add_post"	, async(req, res) => { res.send(await API.chats_add_post(req.body)); });
	// blogs.
	app.post("/blogs/insert"	, async(req, res) => { res.send(await API.blogs_insert_post(req.body)); });
	app.post("/blogs/remove"	, async(req, res) => { res.send(await API.blogs_remove_post(req.body)); });
	app.post("/blogs/list"		, async(req, res) => { res.send(await API.blogs_list_posts(req.body)); });
	// notifs.
	app.post("/notifs/get/chat"	, async(req, res) => { res.send(await API.notifs_get_chat(req.body)); });
	// index.
	app.use("/", (req, res) => {
		res.redirect("/static_frontend");
	});
	// 404.
	app.use((req, res) => {
		console.log("url", req.originalUrl);
		res.status(404);
		res.format({
			//json	: () => res.json({ error: 'Not found' }),
			default	: () => res.type('txt').send('Not found'),
		});
	});

	await DB.run();

	const https_server = https.createServer(credentials, app);
	https_server.listen(port_https, () => { console.log(`HTTPS: Listening on https://${hostname}:${port_https}`); });

	await init_server_http_redirect();

	// run tests against API.
	test();

	// TODO: close db connection when shutting down https server.
}
init_server_https();

