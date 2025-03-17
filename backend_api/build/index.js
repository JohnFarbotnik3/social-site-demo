var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import express from "express";
import * as CORS from "cors";
import * as API from "./API.js";
import * as DB from "./db.js";
import { test } from "./Test.js";
import { init_tables } from "./Tables.js";
const privateKey = fs.readFileSync('sslcert/server.key', 'utf8');
const certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
const credentials = { key: privateKey, cert: certificate };
const hostname = "localhost";
const port_http = 5080;
const port_https = 5443;
function init_server_http_redirect() {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
function init_server_https() {
    return __awaiter(this, void 0, void 0, function* () {
        const app = express();
        const corsOptions = {
            origin: ["https://localhost:5443", "https://192.168.122.96:5443"],
            optionsSuccessStatus: 200
        };
        const corsHandler = CORS.default(corsOptions);
        app.use("*", corsHandler);
        app.use(express.json());
        const db = DB.client.db("social_site_demo");
        yield db.dropDatabase();
        init_tables(db);
        app.use((req, res, next) => { console.log("IP", req.ip, req.ips); next(); });
        app.use('/static', express.static('static'));
        app.use('/static_frontend', express.static('static_frontend'));
        app.post("/account/create", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.account_create(req.body)); }));
        app.post("/account/login", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.account_login(req.body)); }));
        app.post("/account/logout", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.account_logout(req.body)); }));
        app.post("/account/remove", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.account_remove(req.body)); }));
        app.post("/account/update_t", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.account_update_with_token(req.body)); }));
        app.post("/account/update_p", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.account_update_with_password(req.body)); }));
        app.post("/users/public", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.users_get_public_info(req.body)); }));
        app.post("/users/search", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.users_search(req.body)); }));
        app.post("/posts/update", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.posts_update(req.body)); }));
        app.post("/posts/get", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.posts_get(req.body)); }));
        app.post("/friends/list", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.friends_list(req.body)); }));
        app.post("/friends/insert", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.friends_insert(req.body)); }));
        app.post("/friends/remove", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.friends_remove(req.body)); }));
        app.post("/friends/newchat", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.friends_create_chat(req.body)); }));
        app.post("/chats/get", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.chats_get(req.body)); }));
        app.post("/chats/add_post", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.chats_add_post(req.body)); }));
        app.post("/blogs/insert", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.blogs_insert_post(req.body)); }));
        app.post("/blogs/remove", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.blogs_remove_post(req.body)); }));
        app.post("/blogs/list", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.blogs_list_posts(req.body)); }));
        app.post("/notifs/get/chat", (req, res) => __awaiter(this, void 0, void 0, function* () { res.send(yield API.notifs_get_chat(req.body)); }));
        app.use("/", (req, res) => {
            res.redirect("/static_frontend");
        });
        app.use((req, res) => {
            console.log("url", req.originalUrl);
            res.status(404);
            res.format({
                default: () => res.type('txt').send('Not found'),
            });
        });
        yield DB.run();
        const https_server = https.createServer(credentials, app);
        https_server.listen(port_https, () => { console.log(`HTTPS: Listening on https://${hostname}:${port_https}`); });
        yield init_server_http_redirect();
        test();
    });
}
init_server_https();
//# sourceMappingURL=index.js.map