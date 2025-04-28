var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
define("api_simulation_test", ["require", "exports", "../../../backend_api_types/types", "../../../backend_api_types/endpoints", "../../../backend_api_types/performance", "../../../backend_api_types/DeferredPromise"], function (require, exports, types, endpoints_1, performance_1, DeferredPromise_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    types = __importStar(types);
    /*
    this simulation is for testing to ensure that the API will function correctly
    from the user's perspective.
    
    this will perform fetch requests, as well as open large numbers of websockets,
    to test performance, scaling, and integrity of API.
    
    NOTE: this will test the combined-get function, but I'm not (yet) planning on testing
    the combined-sync function here as this would require maintaining a cache-instance for each user,
    which will make the test implementation larger.
    (this project was only meant to be a learning experience and proof-of-concept.)
    
    NOTE: having the get/sync operations all share the same perf-group prevents telling their performance characteristics apart.
    
    NOTE: this simulation does not resemble typical site usage patterns.
    a better approach would be to spawn N threads, and to have them randomly perform actions
    in some reasonable order (and with timing operation-specific gaps in between), for example:
    view posts [30s], enter chat [1s], read chat [20s], add 3 chat messages [10s], leave chat [1s], add friend [5s], ...
    
    NOTE: there are a lot of code paths not tested here that should be tested in a real
    production setting - particularly websocket failure paths ("should_succeed === false");
    however testing failure paths of request-response cycles over websockets will require
    some form of request-response tracking structure (ex. request ids), which is easier said than done.
    ^ however, just logging all errors and testing if client and server values all match may suffice.
    ^ since there is less request processing overhead with websockets, per-feature round-trip times may not be needed.
        just collecting general per-request and per-throughput websocket performance figures should be generally accurate.
    ^^ the same may be true for fetch requests as well. the processing overhead across features is mostly the same.
    
    
    NOTE: I wrote this whole test all at once before testing it. that was stupid.
    a much smarter approach would have been:
    1. start by outlining the basic ideas and objectives of the test.
    2. implement one simple test (testing a single fetch function, opening one kind of websocket, etc.).
    3. incrementally implement one one, then run test again, then repeat.
    however, this test is organized sloghtly better then the frontend-apis are,
    a possible side-effect of the all-at-once approach (or perhaps just because it was my second shot at implementing them).
    
    */
    // random number generating function.
    // see: https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
    // src: https://pracrand.sourceforge.net/
    function sfc32(a, b, c, d) {
        return function () {
            a |= 0;
            b |= 0;
            c |= 0;
            d |= 0;
            let t = (a + b | 0) + d | 0;
            d = d + 1 | 0;
            a = b ^ b >>> 9;
            b = c + (c << 3) | 0;
            c = (c << 21 | c >>> 11);
            c = c + t | 0;
            return (t >>> 0) / 4294967296;
        };
    }
    function basic_uniformity_test() {
        const seedgen = () => (Math.random() * 2 ** 32) >>> 0;
        const getRand = sfc32(seedgen(), seedgen(), seedgen(), seedgen());
        const buckets = new Array(10).fill(0);
        for (let i = 0; i < 1000; i++)
            buckets[Math.floor(10 * getRand())]++;
        console.log(buckets);
    }
    function array_swap_remove(array, index) {
        if (index < 0 || index >= array.length)
            throw ("index out of bounds");
        array[index] = array[array.length - 1];
        return array.pop();
    }
    function shuffle_array_inplace(arr, rand) {
        const temp = new Array(arr.length);
        for (let x = 0; x < arr.length; x++)
            temp[x] = arr[x];
        for (let x = 0; x < arr.length; x++) {
            // pick random element.
            const ind = Math.floor(rand() * temp.length);
            arr[x] = temp[ind];
            // swap to end and pop.
            temp[ind] = temp[temp.length];
            temp.pop();
        }
    }
    function compare_lists(a, b) {
        if (a.length !== b.length)
            throw ("lengths dont match");
        const sa = new Set(a);
        const sb = new Set(b);
        for (const k of sa.keys())
            if (!sb.has(k))
                throw ("set contents dont match: " + JSON.stringify({ a, b }));
    }
    // ==============================
    // fetch functions.
    // ------------------------------
    const msg_success_error = "operation succeeded when it should not have";
    async function test_fetch(path, request_body) {
        const url = `https://${endpoints_1.hostname}:${endpoints_1.port_https}${path}`;
        console.log("request url", url);
        //const url = `${new URL(location).origin}${path}`;
        const req = {
            method: "post",
            headers: {
                // WARNING: content type is very important, as request body is likely to be discarded without it.
                // https://stackoverflow.com/questions/9177049/express-js-req-body-undefined
                // https://developer.mozilla.org/docs/Web/API/Headers
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request_body),
        };
        const response = await fetch(url, req);
        const response_body = await response.json();
        return response_body;
    }
    async function test_account_token_valid(client, should_succeed) {
        const t0 = performance.now();
        if (!client.user_id)
            throw ("no user_id");
        if (!client.token_hash)
            throw ("no token_hash");
        const res = await test_fetch(endpoints_1.ENDPOINTS.account_token_valid, {
            user_id: client.user_id,
            token_hash: client.token_hash,
        });
        if (res.valid !== should_succeed)
            throw (msg_success_error);
        performance_1.perf_fa_tvalid.push(t0);
    }
    async function test_account_create(client, should_succeed) {
        const t0 = performance.now();
        const res = await test_fetch(endpoints_1.ENDPOINTS.account_create, {
            username: client.username,
            nickname: client.nickname,
            password: client.password,
        });
        if (should_succeed && res.success) {
            const { id, token, nickname } = res;
            client.user_id = id;
            client.token_hash = token;
            client.nickname = nickname;
        }
        if (should_succeed && !res.success)
            throw (res.message);
        if (!should_succeed && res.success)
            throw (msg_success_error);
        performance_1.perf_fa_create.push(t0);
    }
    async function test_account_login(client, should_succeed) {
        const t0 = performance.now();
        const res = await test_fetch(endpoints_1.ENDPOINTS.account_login, {
            username: client.username,
            password: client.password,
        });
        if (should_succeed && res.success) {
            const { id, token, nickname } = res;
            client.user_id = id;
            client.token_hash = token;
            client.nickname = nickname;
        }
        if (should_succeed && !res.success)
            throw (res.message);
        if (!should_succeed && res.success)
            throw (msg_success_error);
        performance_1.perf_fa_login.push(t0);
    }
    async function test_account_logout(client, should_succeed) {
        const t0 = performance.now();
        if (!client.user_id)
            throw ("no user_id");
        if (!client.token_hash)
            throw ("no token_hash");
        const res = await test_fetch(endpoints_1.ENDPOINTS.account_logout, {
            user_id: client.user_id,
            token_hash: client.token_hash,
        });
        if (res.success !== should_succeed)
            throw (msg_success_error);
        performance_1.perf_fa_logout.push(t0);
    }
    async function test_compare_get_posts(client, post_ids) {
        const t0 = performance.now();
        if (!client.user_id)
            throw ("no user_id");
        if (!client.token_hash)
            throw ("no token_hash");
        const res = await test_fetch(endpoints_1.ENDPOINTS.combined_get, {
            user_id: client.user_id,
            token_hash: client.token_hash,
            posts: post_ids,
        });
        if (res.success) {
            // verify that client and server values match.
            const posts = res.posts;
            if (!posts)
                throw ("no posts");
            for (const post_s of posts) {
                const post_c = client.posts.get(post_s._id);
                if (post_s.content !== post_c?.content)
                    throw ("post contents dont match: " + JSON.stringify({ server: post_s, client: post_c }));
            }
        }
        else
            throw (res.message);
        performance_1.perf_fc_get.push(t0);
    }
    async function test_compare_get_infos(client, user_ids, clients) {
        const t0 = performance.now();
        if (!client.user_id)
            throw ("no user_id");
        if (!client.token_hash)
            throw ("no token_hash");
        const res = await test_fetch(endpoints_1.ENDPOINTS.combined_get, {
            user_id: client.user_id,
            token_hash: client.token_hash,
            infos: user_ids,
        });
        if (res.success) {
            // verify that client and server values match.
            const infos = res.infos;
            if (!infos)
                throw ("no posts");
            for (const info_s of infos) {
                const info_c = clients.get(info_s._id);
                if (info_s.username !== info_c?.username)
                    throw ("usernames dont match: " + JSON.stringify({ server: info_s.username, client: info_c?.username }));
                if (info_s.nickname !== info_c?.nickname)
                    throw ("nicknames dont match: " + JSON.stringify({ server: info_s.nickname, client: info_c?.nickname }));
            }
        }
        else
            throw (res.message);
        performance_1.perf_fc_get.push(t0);
    }
    async function test_compare_get_blog(client) {
        const t0 = performance.now();
        if (!client.user_id)
            throw ("no user_id");
        if (!client.token_hash)
            throw ("no token_hash");
        const res = await test_fetch(endpoints_1.ENDPOINTS.combined_get, {
            user_id: client.user_id,
            token_hash: client.token_hash,
            blogs: [client.user_id],
        });
        if (res.success) {
            // verify that client and server values match.
            if (!res.blogs)
                throw ("no blogs");
            if (res.blogs.length !== 1)
                throw ("wrong blogs length: " + JSON.stringify(res.blogs));
            const blog_s = res.blogs[0];
            const blog_c = client.blog;
            compare_lists(blog_c.post_ids, blog_s.post_ids);
        }
        else
            throw (res.message);
        performance_1.perf_fc_get.push(t0);
    }
    async function test_compare_get_chat(client, chat_id) {
        const t0 = performance.now();
        if (!client.user_id)
            throw ("no user_id");
        if (!client.token_hash)
            throw ("no token_hash");
        const res = await test_fetch(endpoints_1.ENDPOINTS.combined_get, {
            user_id: client.user_id,
            token_hash: client.token_hash,
            chats: [chat_id],
        });
        if (res.success) {
            // verify that client and server values match.
            if (!res.chats)
                throw ("no chats");
            if (res.chats.length !== 1)
                throw ("wrong chats length: " + JSON.stringify(res.chats));
            const chat_s = res.chats[0];
            const chat_c = client.chat;
            compare_lists(chat_c.post_ids, chat_s.post_ids);
            compare_lists(chat_c.user_ids, chat_s.user_ids);
        }
        else
            throw (res.message);
        performance_1.perf_fc_get.push(t0);
    }
    async function test_compare_get_flist(client) {
        const t0 = performance.now();
        if (!client.user_id)
            throw ("no user_id");
        if (!client.token_hash)
            throw ("no token_hash");
        const res = await test_fetch(endpoints_1.ENDPOINTS.combined_get, {
            user_id: client.user_id,
            token_hash: client.token_hash,
            flist: true,
        });
        if (res.success) {
            // verify that client and server values match.
            if (!res.flist)
                throw ("no flist");
            const flist_s = res.flist;
            const flist_c = client.flist;
            compare_lists(flist_c.list.map(f => f.user_id), flist_s.list.map(f => f.user_id));
            compare_lists(flist_c.list.map(f => f.chat_id), flist_s.list.map(f => f.chat_id));
        }
        else
            throw (res.message);
        performance_1.perf_fc_get.push(t0);
    }
    async function test_compare_get_notifs(client) {
        const t0 = performance.now();
        if (!client.user_id)
            throw ("no user_id");
        if (!client.token_hash)
            throw ("no token_hash");
        const res = await test_fetch(endpoints_1.ENDPOINTS.combined_get, {
            user_id: client.user_id,
            token_hash: client.token_hash,
            notifs: true,
        });
        if (res.success) {
            // verify that client and server values match.
            if (!res.notifs)
                throw ("no notifs");
            // NOTE: testing correctness of notifications is a bit involved, so I'll skip it for now.
        }
        else
            throw (res.message);
        performance_1.perf_fc_get.push(t0);
    }
    async function test_compare_user_search(search_str) {
        const t0 = performance.now();
        const res = await test_fetch(endpoints_1.ENDPOINTS.users_search, {
            search_str: search_str,
        });
        if (res.user_ids) {
            // NOTE: I opted to skip testing user search correctness as well.
        }
        performance_1.perf_fu_search.push(t0);
    }
    async function test_blogs_insert_post(client, content) {
        const t0 = performance.now();
        if (!client.user_id)
            throw ("no user_id");
        if (!client.token_hash)
            throw ("no token_hash");
        const res = await test_fetch(endpoints_1.ENDPOINTS.blogs_insert_post, {
            user_id: client.user_id,
            token_hash: client.token_hash,
            content: content,
        });
        if (res.success) {
            // update local values.
            const postinfo = res.postinfo;
            const post = { ...postinfo, content };
            client.blog.post_ids.push(post._id);
            client.posts.set(post._id, post);
        }
        else
            throw (res.message);
        performance_1.perf_fb_insert.push(t0);
    }
    async function test_blogs_update_post(client, post_id, content) {
        const t0 = performance.now();
        if (!client.user_id)
            throw ("no user_id");
        if (!client.token_hash)
            throw ("no token_hash");
        const res = await test_fetch(endpoints_1.ENDPOINTS.blogs_update_post, {
            user_id: client.user_id,
            token_hash: client.token_hash,
            content: content,
            post_id: post_id,
        });
        if (res.success) {
            // update local values.
            const postinfo = res.postinfo;
            const post = { ...postinfo, content };
            client.posts.set(post._id, post);
        }
        else
            throw (res.message);
        performance_1.perf_fb_update.push(t0);
    }
    async function test_blogs_remove_post(client, post_id) {
        const t0 = performance.now();
        if (!client.user_id)
            throw ("no user_id");
        if (!client.token_hash)
            throw ("no token_hash");
        const res = await test_fetch(endpoints_1.ENDPOINTS.blogs_remove_post, {
            user_id: client.user_id,
            token_hash: client.token_hash,
            post_id: post_id,
        });
        if (res.success) {
            // update local values.
            const ind = client.blog.post_ids.indexOf(post_id);
            if (ind === -1)
                throw ("failed to find index of post_id: " + post_id);
            client.blog.post_ids.splice(ind, 1);
            client.posts.delete(post_id);
        }
        else
            throw (res.message);
        performance_1.perf_fb_remove.push(t0);
    }
    // ==============================
    // websocket functions.
    // ------------------------------
    // helpers.
    function get_websocket(path) {
        const url = `wss://${endpoints_1.hostname}:${endpoints_1.port_https}${path}`;
        return new WebSocket(url);
    }
    function send_message(socket, message) {
        socket.send(JSON.stringify(message));
    }
    // user socket stuff.
    let n_user_sockets_open = 0;
    let n_user_messages_pending = 0;
    function test_user_socket_open(client) {
        const ws = get_websocket(endpoints_1.ENDPOINTS.ws_user);
        ws.client = client;
        ws.ready = (0, DeferredPromise_1.getDeferredPromise)();
        // add to client.
        client.ws_user = ws;
        // add event handlers.
        ws.onopen = ws_user_onopen;
        ws.onclose = ws_user_onclose;
        ws.onerror = ws_user_onerror;
        ws.onmessage = ws_user_onmessage;
    }
    function test_user_socket_close(client) {
        if (!client.ws_user)
            throw ("no ws_user");
        client.ws_user.close();
        client.ws_user = null;
    }
    function ws_user_onopen(ev) {
        n_user_sockets_open++;
        const socket = ev.target;
        if (!socket.client.user_id)
            throw ("no user_id");
        if (!socket.client.token_hash)
            throw ("no token_hash");
        send_message(socket, {
            mtype: types.WS_MESSAGE_USER.LOGIN,
            token_hash: socket.client.token_hash,
            user_id: socket.client.user_id,
        });
    }
    function ws_user_onclose(ev) { n_user_sockets_open--; }
    function ws_user_onerror(ev) { console.error("ws_user_onerror", ev); }
    function ws_user_onmessage(ev) {
        const socket = ev.target;
        const client = socket.client;
        // parse message.
        const json_msg = JSON.parse(ev.data);
        const msg_type = json_msg.mtype;
        // process message.
        if (msg_type === types.WS_MESSAGE_USER.LOGIN_RESPONSE) {
            const msg = json_msg;
            if (msg.success)
                socket.ready.resolve(true);
            else
                console.error(msg.message);
        }
        if (msg_type === types.WS_MESSAGE_USER.FRIEND_ADD_RESPONSE) {
            const msg = json_msg;
            if (msg.success) {
                n_user_messages_pending--;
                ws_user_onmessage_friend_add(client, msg.friend);
            }
            else
                console.error(msg.message);
        }
        if (msg_type === types.WS_MESSAGE_USER.FRIEND_REM_RESPONSE) {
            const msg = json_msg;
            if (msg.success)
                n_user_messages_pending--;
            else
                console.error(msg.message);
        }
        if (msg_type === types.WS_MESSAGE_USER.FRIEND_ADD_NOTIF) {
            const msg = json_msg;
            ws_user_onmessage_friend_add(client, msg.friend);
        }
        // NOTE: some Notifications and Events are ignored for this test.
        /*
        if(msg_type === types.WS_MESSAGE_USER.FRIEND_REM_NOTIF) {}
        if(msg_type === types.WS_MESSAGE_USER.CHAT_ACTIVITY_NOTIF) {}
        */
    }
    function ws_user_onmessage_friend_add(client, friend) {
        // verify local user_id is already set correctly (done manually by an earlier test function).
        const local_friend = client.flist.list.find(f => f.user_id === friend.user_id);
        if (!local_friend)
            throw ("missing friend");
        // set chat_id.
        local_friend.chat_id = friend.chat_id;
    }
    // chat socket stuff.
    let n_chat_sockets_open = 0;
    let n_chat_messages_pending = 0;
    function test_chat_socket_open(client, chat_id) {
        const ws = get_websocket(endpoints_1.ENDPOINTS.ws_chat);
        ws.client = client;
        ws.ready = (0, DeferredPromise_1.getDeferredPromise)();
        // add to client.
        client.ws_chat = ws;
        client.ws_chat_id = chat_id;
        // add event handlers.
        ws.onopen = ws_chat_onopen;
        ws.onclose = ws_chat_onclose;
        ws.onerror = ws_chat_onerror;
        ws.onmessage = ws_chat_onmessage;
    }
    function test_chat_socket_close(client) {
        if (!client.ws_chat)
            throw ("no ws_chat");
        client.ws_chat.close();
        client.ws_chat = null;
        client.ws_chat_id = null;
    }
    function ws_chat_onopen(ev) {
        n_chat_sockets_open++;
        const socket = ev.target;
        if (!socket.client.user_id)
            throw ("no user_id");
        if (!socket.client.token_hash)
            throw ("no token_hash");
        if (!socket.client.ws_chat_id)
            throw ("no ws_chat_id");
        send_message(socket, {
            mtype: types.WS_MESSAGE_CHAT.LOGIN,
            token_hash: socket.client.token_hash,
            user_id: socket.client.user_id,
            chat_id: socket.client.ws_chat_id,
        });
    }
    function ws_chat_onclose(ev) { n_chat_sockets_open--; }
    function ws_chat_onerror(ev) { console.error("ws_chat_onerror", ev); }
    function ws_chat_onmessage(ev) {
        const socket = ev.target;
        const client = socket.client;
        // parse message.
        const json_msg = JSON.parse(ev.data);
        const msg_type = json_msg.mtype;
        // process message.
        if (msg_type === types.WS_MESSAGE_CHAT.LOGIN_RESPONSE) {
            const msg = json_msg;
            if (msg.success)
                socket.ready.resolve(true);
            else
                console.error(msg.message);
        }
        if (msg_type === types.WS_MESSAGE_CHAT.ADD_POST_RESPONSE) {
            const msg = json_msg;
            if (msg.success)
                n_chat_messages_pending--;
            else
                console.error(msg.message);
        }
        // NOTE: some Notifications and Events are ignored for this test.
        /*
        if(msg_type === types.WS_MESSAGE_CHAT.ADD_POST_EVENT) {}
        */
    }
    // messages.
    async function test_ws_user_friend_add(clients, user_id_a, user_id_b) {
        // update client lists.
        const client_a = clients.get(user_id_a);
        const client_b = clients.get(user_id_b);
        if (!client_a)
            throw ("no client_a");
        if (!client_b)
            throw ("no client_b");
        client_a.flist.list.push({ user_id: user_id_b, chat_id: "NONE_ID" });
        client_b.flist.list.push({ user_id: user_id_a, chat_id: "NONE_ID" });
        // send message to server.
        n_user_messages_pending++;
        if (!client_a.ws_user)
            throw ("no client_a.ws_user");
        await client_a.ws_user.ready;
        send_message(client_a.ws_user, {
            mtype: types.WS_MESSAGE_USER.FRIEND_ADD,
            friend_id: user_id_b,
        });
    }
    async function test_ws_user_friend_rem(clients, user_id_a, user_id_b) {
        // update client lists.
        const client_a = clients.get(user_id_a);
        const client_b = clients.get(user_id_b);
        if (!client_a)
            throw ("no client_a");
        if (!client_b)
            throw ("no client_b");
        array_swap_remove(client_a.flist.list, client_a.flist.list.findIndex(friend => friend.user_id === user_id_b));
        array_swap_remove(client_b.flist.list, client_b.flist.list.findIndex(friend => friend.user_id === user_id_a));
        // send message to server.
        n_user_messages_pending++;
        if (!client_a.ws_user)
            throw ("no client_a.ws_user");
        await client_a.ws_user.ready;
        send_message(client_a.ws_user, {
            mtype: types.WS_MESSAGE_USER.FRIEND_REM,
            friend_id: user_id_b,
        });
    }
    async function test_ws_chat_post_add(clients, user_id, content) {
        // update local lists.
        // NOTE: this is skipped for now.
        const client = clients.get(user_id);
        if (!client)
            throw ("no client");
        // send message to server.
        n_chat_messages_pending++;
        if (!client.ws_chat)
            throw ("no client.ws_chat");
        await client.ws_chat.ready;
        send_message(client.ws_chat, {
            mtype: types.WS_MESSAGE_CHAT.ADD_POST,
            content: content,
        });
    }
    // ==============================
    // test.
    // ------------------------------
    test();
    async function test() {
        // create random number generator.
        const seedgen = () => (Math.random() * 2 ** 32) >>> 0;
        const seeds = [seedgen(), seedgen(), seedgen(), seedgen()];
        console.log("seeds", seeds);
        const rand = sfc32(seeds[0], seeds[1], seeds[2], seeds[3]);
        // ==============================
        // generate accounts.
        // ------------------------------
        const n_clients = rand() * 500 + 500;
        console.log("generating accounts", n_clients);
        const clients_arr = [];
        for (let x = 0; x < n_clients; x++) {
            const client = {
                username: "user_" + x,
                nickname: "nick_" + x,
                password: "pwd*_" + x,
                user_id: null,
                token_hash: null,
                ws_user: null,
                ws_chat: null,
                ws_chat_id: null,
                posts: new Map(),
                blog: { updated: types.NONE_TIMESTAMP, post_ids: [] },
                chat: { updated: types.NONE_TIMESTAMP, post_ids: [], user_ids: [] },
                flist: { updated: types.NONE_TIMESTAMP, list: [] },
            };
            clients_arr.push(client);
        }
        // create accounts.
        shuffle_array_inplace(clients_arr, rand);
        const clients_map = new Map();
        for (let x = 0; x < n_clients; x++) {
            const client = clients_arr[x];
            await test_account_create(client, true);
            if (!client.user_id)
                throw ("no user_id");
            clients_map.set(client.user_id, client);
        }
        // verify all users have user_ids.
        for (let x = 0; x < n_clients; x++) {
            const client = clients_arr[x];
            if (!client.user_id)
                throw ("client missing user_id: " + JSON.stringify(client));
        }
        // try creating accounts with already existing usernames.
        shuffle_array_inplace(clients_arr, rand);
        for (let x = 0; x < n_clients; x++) {
            const client = clients_arr[x];
            if (rand() < 0.1)
                await test_account_create(client, false);
        }
        // perform login-logout cycles.
        shuffle_array_inplace(clients_arr, rand);
        for (let x = 0; x < n_clients; x++) {
            const client = clients_arr[x];
            await test_account_logout(client, true);
            await test_account_token_valid(client, false);
            await test_account_login(client, true);
            await test_account_token_valid(client, true);
        }
        // open user sockets.
        shuffle_array_inplace(clients_arr, rand);
        for (let x = 0; x < n_clients; x++) {
            const client = clients_arr[x];
            test_user_socket_open(client);
        }
        // modify account info with token and with password.
        // TODO
        // ==============================
        // generate random blog posts.
        // ------------------------------
        let n_posts = 0;
        for (let z2 = 0; z2 < 5; z2++) {
            // randomly insert, update, or remove posts.
            for (let z1 = 0; z1 < 9; z1++) {
                shuffle_array_inplace(clients_arr, rand);
                for (let x = 0; x < n_clients; x++) {
                    const client = clients_arr[x];
                    const r = rand();
                    if (0.0 <= r && r < 0.6) {
                        const content = "post_" + n_posts++;
                        await test_blogs_insert_post(client, content);
                    }
                    if (0.6 <= r && r < 0.8 && client.posts.size > 0) {
                        const posts = [...client.posts.keys()];
                        const post_id = posts[Math.floor(rand() * posts.length)];
                        const content = "post_" + n_posts++;
                        await test_blogs_update_post(client, post_id, content);
                    }
                    if (0.8 <= r && r < 1.0 && client.posts.size > 0) {
                        const posts = [...client.posts.keys()];
                        const post_id = posts[Math.floor(rand() * posts.length)];
                        await test_blogs_remove_post(client, post_id);
                    }
                }
            }
            // verify blogs and posts are correct.
            shuffle_array_inplace(clients_arr, rand);
            for (let x = 0; x < n_clients; x++) {
                const client = clients_arr[x];
                await test_compare_get_blog(client);
                await test_compare_get_posts(client, client.blog.post_ids);
            }
        }
        // ==============================
        // generate friend pairs.
        // ------------------------------
        // add friends.
        shuffle_array_inplace(clients_arr, rand);
        for (let x = 0; x < n_clients; x++) {
            const client = clients_arr[x];
            const R = Math.floor(rand() * rand() * 100);
            for (let r = 0; r < R; r++) {
                const ind = Math.floor(rand() * n_clients);
                if (ind <= x)
                    continue;
                const uid_a = client.user_id;
                const uid_b = clients_arr[ind].user_id;
                await test_ws_user_friend_add(clients_map, uid_a, uid_b);
            }
        }
        // remove some friends.
        // TODO
        // verify after adding friends than each user's returned friends-list is correct.
        shuffle_array_inplace(clients_arr, rand);
        for (let x = 0; x < n_clients; x++) {
            const client = clients_arr[x];
            test_compare_get_flist(client);
        }
        // make sure each user can get their friends user-infos correctly.
        shuffle_array_inplace(clients_arr, rand);
        for (let x = 0; x < n_clients; x++) {
            const client = clients_arr[x];
            const ids = client.flist.list.map(friend => friend.user_id);
            test_compare_get_infos(client, ids, clients_map);
        }
        // ==============================
        // generate random chat posts.
        // ------------------------------
        // randomly pick which chat each user is in.
        shuffle_array_inplace(clients_arr, rand);
        for (let x = 0; x < n_clients; x++) {
            const client = clients_arr[x];
            if (client.flist.list.length === 0)
                continue;
            const chat_id = client.flist.list[Math.floor(client.flist.list.length * rand())].chat_id;
            test_chat_socket_open(client, chat_id);
        }
        // have all users post something.
        for (let z = 0; z < 5; z++) {
            shuffle_array_inplace(clients_arr, rand);
            for (let x = 0; x < n_clients; x++) {
                const client = clients_arr[x];
                const user_id = client.user_id;
                const content = "post_" + n_posts++;
                test_ws_chat_post_add(clients_map, user_id, content);
            }
        }
        // leave chats.
        shuffle_array_inplace(clients_arr, rand);
        for (let x = 0; x < n_clients; x++) {
            const client = clients_arr[x];
            test_chat_socket_close(client);
        }
        // make sure all other users either recieved (correct) posts, or (correct) notifications.
        // TODO
        // ==============================
        // consistency checks.
        // ------------------------------
        if (n_user_sockets_open !== 0)
            throw ("n_open_user_sockets !== 0: " + JSON.stringify(n_user_sockets_open));
        if (n_chat_sockets_open !== 0)
            throw ("n_chat_sockets_open !== 0: " + JSON.stringify(n_chat_sockets_open));
        if (n_user_messages_pending !== 0)
            throw ("n_user_messages_pending !== 0: " + JSON.stringify(n_user_messages_pending));
        if (n_chat_messages_pending !== 0)
            throw ("n_chat_messages_pending !== 0: " + JSON.stringify(n_chat_messages_pending));
        // check unused functions to make sure they work.
        shuffle_array_inplace(clients_arr, rand);
        for (let x = 0; x < n_clients; x++) {
            const client = clients_arr[x];
            for (const friend of client.flist.list)
                test_compare_get_chat(client, friend.chat_id);
        }
        shuffle_array_inplace(clients_arr, rand);
        for (let x = 0; x < n_clients; x++) {
            const client = clients_arr[x];
            test_compare_get_notifs(client);
        }
        shuffle_array_inplace(clients_arr, rand);
        for (let x = 0; x < n_clients; x++) {
            const client = clients_arr[x];
            const len = Math.max(4, client.username.length * rand());
            const str = client.username.substring(0, len);
            test_compare_user_search(str);
        }
        // ==============================
        // cleanup.
        // ------------------------------
        // close user sockets.
        shuffle_array_inplace(clients_arr, rand);
        for (let x = 0; x < n_clients; x++) {
            const client = clients_arr[x];
            test_user_socket_close(client);
        }
        // ==============================
        // performance tests.
        // ------------------------------
        // test general round-trip time of fetch requests.
        // TODO - N = 100K.
        // test general round-trip time of ws requests.
        // TODO - N = 100K.
    }
});
