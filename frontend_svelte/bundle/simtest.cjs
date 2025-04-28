"use strict";

// ../backend_api_types/types.ts
var NONE_TIMESTAMP = 0;

// ../backend_api_types/endpoints.ts
var hostname = "localhost";
var port_https = 5443;
var ENDPOINTS = {
  ws_chat: "/ws_chat",
  ws_user: "/ws_user",
  account_token_valid: "/account_token_valid",
  account_create: "/account_create",
  account_login: "/account_login",
  account_logout: "/account_logout",
  account_remove: "/account_remove",
  account_update_with_token: "/account_update_t",
  account_update_with_password: "/account_update_p",
  users_search: "/users_search",
  blogs_insert_post: "/blogs_insert_post",
  blogs_remove_post: "/blogs_remove_post",
  blogs_update_post: "/blogs_update_post",
  notifs_clear: "/notifs_clear",
  get_blogs: "/get_blogs",
  get_posts: "/get_posts",
  get_infos: "/get_infos",
  get_chats: "/get_chats",
  get_flist: "/get_flist",
  get_notifs: "/get_notifs",
  sync_blogs: "/sync_blogs",
  sync_posts: "/sync_posts",
  sync_infos: "/sync_infos",
  sync_chats: "/sync_chats",
  sync_flist: "/sync_flist",
  sync_notifs: "/sync_notifs"
};

// ../backend_api_types/DeferredPromise.ts
function getDeferredPromise() {
  const { promise, resolve, reject } = Promise.withResolvers();
  Object.assign(promise, { resolve, reject });
  return promise;
}

// src/application/api_simulation_test.ts
function sfc32(a, b, c, d) {
  return function() {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    let t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = c << 21 | c >>> 11;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  };
}
function shuffle_array_inplace(arr, rand) {
  const temp = new Array(arr.length);
  for (let x = 0; x < arr.length; x++) temp[x] = arr[x];
  for (let x = 0; x < arr.length; x++) {
    const ind = Math.floor(rand() * temp.length);
    arr[x] = temp[ind];
    temp[ind] = temp[temp.length - 1];
    temp.pop();
  }
}
function compare_lists(a, b) {
  if (a.length !== b.length) throw "lengths dont match: " + JSON.stringify({ al: a.length, bl: b.length, a, b });
  const sa = new Set(a);
  const sb = new Set(b);
  for (const k of sa.keys()) if (!sb.has(k)) throw "set contents dont match: " + JSON.stringify({ a, b });
}
function try_until_truthy(func, interval, timeout, timeout_message) {
  const prom = getDeferredPromise();
  const itv = setInterval(() => {
    const value = func();
    if (value) {
      clearInterval(itv);
      prom.resolve(value);
    }
  }, interval);
  const tmt = setTimeout(() => {
    prom.reject(timeout_message);
  }, timeout);
  return prom;
}
var msg_success_error = "operation succeeded when it should not have";
async function test_fetch(path, request_body) {
  const url = `https://${hostname}:${port_https}${path}`;
  const req = {
    method: "post",
    headers: {
      // WARNING: content type is very important, as request body is likely to be discarded without it.
      // https://stackoverflow.com/questions/9177049/express-js-req-body-undefined
      // https://developer.mozilla.org/docs/Web/API/Headers
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request_body)
  };
  const response = await fetch(url, req);
  const response_body = await response.json();
  return response_body;
}
async function test_account_token_valid(client, should_succeed) {
  if (!client.user_id) throw "no user_id";
  if (!client.token_hash) throw "no token_hash";
  const res = await test_fetch(ENDPOINTS.account_token_valid, {
    user_id: client.user_id,
    token_hash: client.token_hash
  });
  if (res.valid !== should_succeed) throw msg_success_error;
}
async function test_account_create(client, should_succeed) {
  const res = await test_fetch(ENDPOINTS.account_create, {
    username: client.username,
    nickname: client.nickname,
    password: client.password
  });
  if (should_succeed && res.success) {
    const { id, token, nickname } = res;
    client.user_id = id;
    client.token_hash = token;
    client.nickname = nickname;
  }
  if (should_succeed && !res.success) throw res.message;
  if (!should_succeed && res.success) throw msg_success_error;
}
async function test_account_login(client, should_succeed) {
  const res = await test_fetch(ENDPOINTS.account_login, {
    username: client.username,
    password: client.password
  });
  if (should_succeed && res.success) {
    const { id, token, nickname } = res;
    client.user_id = id;
    client.token_hash = token;
    client.nickname = nickname;
  }
  if (should_succeed && !res.success) throw res.message;
  if (!should_succeed && res.success) throw msg_success_error;
}
async function test_account_logout(client, should_succeed) {
  if (!client.user_id) throw "no user_id";
  if (!client.token_hash) throw "no token_hash";
  const res = await test_fetch(ENDPOINTS.account_logout, {
    user_id: client.user_id,
    token_hash: client.token_hash
  });
  if (res.success !== should_succeed) throw msg_success_error;
}
async function test_compare_get_posts(client, post_ids) {
  if (!client.user_id) throw "no user_id";
  if (!client.token_hash) throw "no token_hash";
  const res = await test_fetch(ENDPOINTS.get_posts, {
    posts: post_ids
  });
  if (res.success) {
    const posts = res.posts;
    if (!posts) throw "no posts";
    for (const post_s of posts) {
      const post_c = client.posts.get(post_s._id);
      if (post_s.content !== post_c?.content) throw "post contents dont match: " + JSON.stringify({ server: post_s, client: post_c });
    }
  } else throw res.message;
}
async function test_compare_get_infos(client, user_ids, clients) {
  if (!client.user_id) throw "no user_id";
  if (!client.token_hash) throw "no token_hash";
  const res = await test_fetch(ENDPOINTS.get_infos, {
    user_id: client.user_id,
    token_hash: client.token_hash,
    infos: user_ids
  });
  if (res.success) {
    const infos = res.infos;
    if (!infos) throw "no posts";
    for (const info_s of infos) {
      const info_c = clients.get(info_s._id);
      if (info_s.username !== info_c?.username) throw "usernames dont match: " + JSON.stringify({ server: info_s.username, client: info_c?.username });
      if (info_s.nickname !== info_c?.nickname) throw "nicknames dont match: " + JSON.stringify({ server: info_s.nickname, client: info_c?.nickname });
    }
  } else throw res.message;
}
async function test_compare_get_blog(client) {
  if (!client.user_id) throw "no user_id";
  if (!client.token_hash) throw "no token_hash";
  const res = await test_fetch(ENDPOINTS.get_blogs, {
    blogs: [client.user_id]
  });
  if (res.success) {
    if (!res.blogs) throw "no blogs";
    if (res.blogs.length !== 1) throw "wrong blogs length: " + JSON.stringify(res.blogs);
    const blog_s = res.blogs[0];
    const blog_c = client.blog;
    compare_lists(blog_c.post_ids, blog_s.post_ids);
  } else throw res.message;
}
async function test_compare_get_flist(client) {
  if (!client.user_id) throw "no user_id";
  if (!client.token_hash) throw "no token_hash";
  const res = await test_fetch(ENDPOINTS.get_flist, {
    user_id: client.user_id,
    token_hash: client.token_hash
  });
  if (res.success) {
    if (!res.flist) throw "no flist";
    const flist_c = client.flist.list;
    const flist_s = res.flist.list;
    compare_lists(flist_c.map((f) => f.user_id), flist_s.map((f) => f.user_id));
    compare_lists(flist_c.map((f) => f.chat_id), flist_s.map((f) => f.chat_id));
  } else throw res.message;
}
async function test_compare_get_notifs(client) {
  if (!client.user_id) throw "no user_id";
  if (!client.token_hash) throw "no token_hash";
  const res = await test_fetch(ENDPOINTS.get_notifs, {
    user_id: client.user_id,
    token_hash: client.token_hash
  });
  if (res.success) {
    if (!res.notifs) throw "no notifs";
  } else throw res.message;
}
async function test_compare_user_search(search_str) {
  const res = await test_fetch(ENDPOINTS.users_search, {
    search_str
  });
  if (res.user_ids) {
  }
}
async function test_blogs_insert_post(client, content) {
  if (!client.user_id) throw "no user_id";
  if (!client.token_hash) throw "no token_hash";
  const res = await test_fetch(ENDPOINTS.blogs_insert_post, {
    user_id: client.user_id,
    token_hash: client.token_hash,
    content
  });
  if (res.success) {
    const postinfo = res.postinfo;
    const post = { ...postinfo, content };
    client.blog.post_ids.push(post._id);
    client.posts.set(post._id, post);
  } else throw res.message;
}
async function test_blogs_update_post(client, post_id, content) {
  if (!client.user_id) throw "no user_id";
  if (!client.token_hash) throw "no token_hash";
  const res = await test_fetch(ENDPOINTS.blogs_update_post, {
    user_id: client.user_id,
    token_hash: client.token_hash,
    content,
    post_id
  });
  if (res.success) {
    const postinfo = res.postinfo;
    const post = { ...postinfo, content };
    client.posts.set(post._id, post);
  } else throw res.message;
}
async function test_blogs_remove_post(client, post_id) {
  if (!client.user_id) throw "no user_id";
  if (!client.token_hash) throw "no token_hash";
  const res = await test_fetch(ENDPOINTS.blogs_remove_post, {
    user_id: client.user_id,
    token_hash: client.token_hash,
    post_id
  });
  if (res.success) {
    const ind = client.blog.post_ids.indexOf(post_id);
    if (ind === -1) throw "failed to find index of post_id: " + post_id;
    client.blog.post_ids.splice(ind, 1);
    client.posts.delete(post_id);
  } else throw res.message;
}
function get_websocket(path) {
  const url = `wss://${hostname}:${port_https}${path}`;
  return new WebSocket(url);
}
function send_message(socket, message) {
  socket.send(JSON.stringify(message));
}
var n_user_sockets_open = 0;
var n_user_messages_pending = 0;
function test_user_socket_open(client) {
  const ws = get_websocket(ENDPOINTS.ws_user);
  ws.client = client;
  ws.ready = getDeferredPromise();
  client.ws_user = ws;
  ws.onopen = ws_user_onopen;
  ws.onclose = ws_user_onclose;
  ws.onerror = ws_user_onerror;
  ws.onmessage = ws_user_onmessage;
}
function test_user_socket_close(client) {
  if (!client.ws_user) throw "no ws_user";
  client.ws_user.close();
  client.ws_user = null;
}
function ws_user_onopen(ev) {
  n_user_sockets_open++;
  const socket = ev.target;
  if (!socket.client.user_id) throw "no user_id";
  if (!socket.client.token_hash) throw "no token_hash";
  send_message(socket, {
    mtype: 0 /* USER_LOGIN */,
    req_id: Math.random(),
    token_hash: socket.client.token_hash,
    user_id: socket.client.user_id
  });
}
function ws_user_onclose(ev) {
  n_user_sockets_open--;
}
function ws_user_onerror(ev) {
  console.error("ws_user_onerror", ev);
}
function ws_user_onmessage(ev) {
  const socket = ev.target;
  const client = socket.client;
  const json_msg = JSON.parse(ev.data);
  const msg_type = json_msg.mtype;
  if (msg_type === 1 /* USER_LOGIN_RESPONSE */) {
    const msg = json_msg;
    if (msg.success) socket.ready.resolve(true);
    else console.error(msg.message);
  }
  if (msg_type === 5 /* FRIEND_ADD_RESPONSE */) {
    const msg = json_msg;
    if (msg.success) {
      n_user_messages_pending--;
      ws_user_onmessage_friend_add(client, msg.friend);
    } else console.error(msg.message);
  }
  if (msg_type === 8 /* FRIEND_REM_RESPONSE */) {
    const msg = json_msg;
    if (msg.success) n_user_messages_pending--;
    else console.error(msg.message);
  }
  if (msg_type === 6 /* FRIEND_ADD_NOTIF */) {
    const msg = json_msg;
    ws_user_onmessage_friend_add(client, msg.friend);
  }
}
function ws_user_onmessage_friend_add(client, friend) {
  const local_friend = client.flist.list.find((f) => f.user_id === friend.user_id);
  if (!local_friend) throw "missing friend";
  local_friend.chat_id = friend.chat_id;
}
var n_chat_sockets_open = 0;
var n_chat_messages_pending = 0;
function test_chat_socket_open(client, chat_id) {
  const ws = get_websocket(ENDPOINTS.ws_chat);
  ws.client = client;
  ws.ready = getDeferredPromise();
  client.ws_chat = ws;
  client.ws_chat_id = chat_id;
  ws.onopen = ws_chat_onopen;
  ws.onclose = ws_chat_onclose;
  ws.onerror = ws_chat_onerror;
  ws.onmessage = ws_chat_onmessage;
}
function test_chat_socket_close(client) {
  if (!client.ws_chat) throw "no ws_chat";
  client.ws_chat.close();
  client.ws_chat = null;
  client.ws_chat_id = null;
}
function ws_chat_onopen(ev) {
  n_chat_sockets_open++;
  const socket = ev.target;
  if (!socket.client.user_id) throw "no user_id";
  if (!socket.client.token_hash) throw "no token_hash";
  if (!socket.client.ws_chat_id) throw "no ws_chat_id";
  send_message(socket, {
    mtype: 2 /* CHAT_LOGIN */,
    req_id: Math.random(),
    token_hash: socket.client.token_hash,
    user_id: socket.client.user_id,
    chat_id: socket.client.ws_chat_id
  });
}
function ws_chat_onclose(ev) {
  n_chat_sockets_open--;
}
function ws_chat_onerror(ev) {
  console.error("ws_chat_onerror", ev);
}
function ws_chat_onmessage(ev) {
  const socket = ev.target;
  const client = socket.client;
  const json_msg = JSON.parse(ev.data);
  const msg_type = json_msg.mtype;
  if (msg_type === 3 /* CHAT_LOGIN_RESPONSE */) {
    const msg = json_msg;
    if (msg.success) socket.ready.resolve(true);
    else console.error(msg.message);
  }
  if (msg_type === 11 /* CHAT_ADD_POST_RESPONSE */) {
    const msg = json_msg;
    if (msg.success) n_chat_messages_pending--;
    else console.error(msg.message);
  }
}
async function test_ws_user_friend_add(clients, user_id_a, user_id_b) {
  const client_a = clients.get(user_id_a);
  const client_b = clients.get(user_id_b);
  if (!client_a) throw "no client_a";
  if (!client_b) throw "no client_b";
  client_a.flist.list.push({ user_id: user_id_b, chat_id: "NONE_ID" });
  client_b.flist.list.push({ user_id: user_id_a, chat_id: "NONE_ID" });
  n_user_messages_pending++;
  if (!client_a.ws_user) throw "no client_a.ws_user";
  await client_a.ws_user.ready;
  send_message(client_a.ws_user, {
    mtype: 4 /* FRIEND_ADD */,
    req_id: Math.random(),
    friend_id: user_id_b
  });
}
async function test_ws_chat_post_add(clients, user_id, content) {
  const client = clients.get(user_id);
  if (!client) throw "no client";
  n_chat_messages_pending++;
  if (!client.ws_chat) throw "no client.ws_chat";
  await client.ws_chat.ready;
  send_message(client.ws_chat, {
    mtype: 10 /* CHAT_ADD_POST */,
    req_id: Math.random(),
    content
  });
}
test();
async function test() {
  const seedgen = () => Math.random() * 2 ** 32 >>> 0;
  const seeds = [seedgen(), seedgen(), seedgen(), seedgen()];
  console.log("seeds", seeds);
  const rand = sfc32(seeds[0], seeds[1], seeds[2], seeds[3]);
  const n_clients = Math.floor(rand() * 50 + 50);
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
      posts: /* @__PURE__ */ new Map(),
      blog: { updated: NONE_TIMESTAMP, post_ids: [] },
      chat: { updated: NONE_TIMESTAMP, post_ids: [], user_ids: [] },
      flist: { updated: NONE_TIMESTAMP, list: [] }
    };
    clients_arr.push(client);
  }
  console.log("create accounts.");
  shuffle_array_inplace(clients_arr, rand);
  const clients_map = /* @__PURE__ */ new Map();
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    if (!client) console.error("missing client", x, clients_arr, clients_arr[x]);
    await test_account_create(client, true);
    if (!client.user_id) throw "no user_id";
    clients_map.set(client.user_id, client);
  }
  console.log("verify all users have user_ids.");
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    if (!client.user_id) throw "client missing user_id: " + JSON.stringify(client);
  }
  console.log("try creating accounts with already existing usernames.");
  shuffle_array_inplace(clients_arr, rand);
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    if (rand() < 0.1) await test_account_create(client, false);
  }
  console.log("perform login-logout cycles.");
  shuffle_array_inplace(clients_arr, rand);
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    await test_account_logout(client, true);
    await test_account_token_valid(client, false);
    await test_account_login(client, true);
    await test_account_token_valid(client, true);
  }
  console.log("open user sockets.");
  shuffle_array_inplace(clients_arr, rand);
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    test_user_socket_open(client);
  }
  console.log("wait until all user sockets are ready.");
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    if (!client.ws_user) throw "no socket";
    await client.ws_user.ready;
  }
  console.log("");
  let n_posts = 0;
  for (let z2 = 0; z2 < 5; z2++) {
    console.log("randomly insert, update, or remove posts.");
    for (let z1 = 0; z1 < 9; z1++) {
      shuffle_array_inplace(clients_arr, rand);
      for (let x = 0; x < n_clients; x++) {
        const client = clients_arr[x];
        const r = rand();
        if (0 <= r && r < 0.6) {
          const content = "post_" + n_posts++;
          await test_blogs_insert_post(client, content);
        }
        if (0.6 <= r && r < 0.8 && client.posts.size > 0) {
          const posts = [...client.posts.keys()];
          const post_id = posts[Math.floor(rand() * posts.length)];
          const content = "post_" + n_posts++;
          await test_blogs_update_post(client, post_id, content);
        }
        if (0.8 <= r && r < 1 && client.posts.size > 0) {
          const posts = [...client.posts.keys()];
          const post_id = posts[Math.floor(rand() * posts.length)];
          await test_blogs_remove_post(client, post_id);
        }
      }
    }
    console.log("verify blogs and posts are correct.");
    shuffle_array_inplace(clients_arr, rand);
    for (let x = 0; x < n_clients; x++) {
      const client = clients_arr[x];
      await test_compare_get_blog(client);
      await test_compare_get_posts(client, client.blog.post_ids);
    }
  }
  console.log("add friends.");
  shuffle_array_inplace(clients_arr, rand);
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    const R = Math.floor(rand() * rand() * 100);
    for (let r = 0; r < R; r++) {
      const ind = Math.floor(rand() * n_clients);
      const uid_a = client.user_id;
      const uid_b = clients_arr[ind].user_id;
      if (uid_a === uid_b) continue;
      if (client.flist.list.find((friend) => friend.user_id === uid_b)) continue;
      await test_ws_user_friend_add(clients_map, uid_a, uid_b);
    }
  }
  await try_until_truthy(() => {
    return n_user_messages_pending === 0;
  }, 50, 5e3, "took too long to finish ws_user message request-response cycles.");
  console.log("verify after adding friends than each user's returned friends-list is correct.");
  shuffle_array_inplace(clients_arr, rand);
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    await test_compare_get_flist(client);
  }
  console.log("make sure each user can get their friends user-infos correctly.");
  shuffle_array_inplace(clients_arr, rand);
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    const ids = client.flist.list.map((friend) => friend.user_id);
    await test_compare_get_infos(client, ids, clients_map);
  }
  console.log("randomly pick which chat each user is in.");
  shuffle_array_inplace(clients_arr, rand);
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    if (client.flist.list.length === 0) continue;
    const chat_id = client.flist.list[Math.floor(client.flist.list.length * rand())].chat_id;
    test_chat_socket_open(client, chat_id);
  }
  console.log("wait until all chat sockets are ready.");
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    if (!client.ws_chat) throw "no socket";
    await client.ws_chat.ready;
  }
  console.log("have all users post something.");
  for (let z = 0; z < 5; z++) {
    shuffle_array_inplace(clients_arr, rand);
    for (let x = 0; x < n_clients; x++) {
      const client = clients_arr[x];
      const user_id = client.user_id;
      const content = "post_" + n_posts++;
      await test_ws_chat_post_add(clients_map, user_id, content);
    }
  }
  console.log("wait for all chat messages to be sent.");
  await try_until_truthy(() => {
    return n_chat_messages_pending === 0;
  }, 50, 5e3, "took too long to finish ws_chat message request-response cycles.");
  console.log("leave chats.");
  shuffle_array_inplace(clients_arr, rand);
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    test_chat_socket_close(client);
  }
  console.log("wait for chat sockets to close.");
  await try_until_truthy(() => {
    return n_chat_sockets_open === 0;
  }, 50, 5e3, "took too long to finish closing chat-sockets.");
  console.log("close user sockets.");
  shuffle_array_inplace(clients_arr, rand);
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    test_user_socket_close(client);
  }
  console.log("wait for user sockets to close.");
  await try_until_truthy(() => {
    return n_user_sockets_open === 0;
  }, 50, 5e3, "took too long to finish closing user-sockets.");
  console.log("consistency checks.");
  if (n_user_sockets_open !== 0) throw "n_open_user_sockets !== 0: " + JSON.stringify(n_user_sockets_open);
  if (n_chat_sockets_open !== 0) throw "n_chat_sockets_open !== 0: " + JSON.stringify(n_chat_sockets_open);
  if (n_user_messages_pending !== 0) throw "n_user_messages_pending !== 0: " + JSON.stringify(n_user_messages_pending);
  if (n_chat_messages_pending !== 0) throw "n_chat_messages_pending !== 0: " + JSON.stringify(n_chat_messages_pending);
  console.log("compare notifs");
  shuffle_array_inplace(clients_arr, rand);
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    await test_compare_get_notifs(client);
  }
  console.log("compare user-search");
  shuffle_array_inplace(clients_arr, rand);
  for (let x = 0; x < n_clients; x++) {
    const client = clients_arr[x];
    const len = Math.max(4, client.username.length * rand());
    const str = client.username.substring(0, len);
    await test_compare_user_search(str);
  }
}
//# sourceMappingURL=simtest.cjs.map
