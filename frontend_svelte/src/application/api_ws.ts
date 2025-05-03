import { ENDPOINTS } from "backend_api_types/endpoints";
import { path_ws } from "./api_config";
import { cache, is_logged_in } from "./api_cache.svelte";
import * as api_fetch from "./api_fetch";
import type { Friend, StringId } from "backend_api_types/types";
import * as types from "backend_api_types/types";
import { state_chat } from "./state_chat.svelte";
import { getDeferredPromise, type DeferredPromise } from "backend_api_types/DeferredPromise";

function get_websocket(path:string) {
	const url = `wss://${path_ws}${path}`;
	return new WebSocket(url);
}

function send_message<T> (socket:WebSocket, message:T) {
	socket.send(JSON.stringify(message));
}

// ==============================
// websockets - user.
// ------------------------------

type ws_socket_user = WebSocket & {
	ready	: DeferredPromise<true>;
};

let user_socket: null | ws_socket_user = null;

// error reponse-handlers.
function ws_user_on_soft_error(message: string) {
	console.error("on_soft_error", message);
}
function ws_user_on_hard_error(message: string) {
	console.error("on_hard_error", message);
	alert("ERROR: user websocket broke.\n" + message);
	api_fetch.account_logout();
}

// init request message.
export async function ws_user_login() {
	console.log("ws_user_login");
	const socket = ws_user_open_socket();
	user_socket = socket;
}
export function ws_user_logout() {
	console.log("ws_user_logout");
	if(user_socket) {
		user_socket.close();
		user_socket = null;
	}
}

// handlers.
export function ws_user_open_socket(): ws_socket_user {
	const ws = get_websocket(ENDPOINTS.ws_user) as ws_socket_user;
	ws.ready = getDeferredPromise();
	// add event handlers.
	ws.onopen		= ws_user_onopen;
	ws.onclose		= ws_user_onclose;
	ws.onerror		= ws_user_onerror;
	ws.onmessage	= ws_user_onmessage;
	return ws;
}
function ws_user_onopen		(ev: Event) {
	console.log("ws_user_onopen", ev);
	const socket = ev.target as ws_socket_user;
	if(!cache.user) throw("no user");
	send_message<types.ws_user_login>(socket, {
		mtype		: types.WS_MESSAGE_TYPE.USER_LOGIN,
		req_id		: Math.random(),
		token_hash	: cache.user.token,
		user_id		: cache.user.id,
	});
}
function ws_user_onclose	(ev: CloseEvent) {
	console.log("ws_user_onclose", ev);
	// check if still logged in.
	if(is_logged_in()) {
		alert("ERROR: user websocket closed while still logged in.");
		/* NOTE:
			during testing with playwright, I found that chromium doesnt call this
			when navigating to blank page, however firefox does.
			this causes login-persistence test to fail.
		*/
		// TODO - figure out a way to not trigger logout when unloading page (and thus closing sockets).
		//api_fetch.account_logout();
	}
}
function ws_user_onerror	(ev: Event) {
	console.log("ws_user_onerror", ev);
	ws_user_on_hard_error(ev.type);
}
function ws_user_onmessage	(ev: MessageEvent) {
	console.log("ws_user_onmessage", ev);
	const socket = ev.target as ws_socket_user;
	// parse message.
	const json_msg = JSON.parse(ev.data) as types.ws_message;
	const msg_type = json_msg.mtype;
	// process message.
	if(msg_type === types.WS_MESSAGE_TYPE.USER_LOGIN_RESPONSE) {
		const msg = json_msg as types.ws_user_login_response;
		if(msg.success)	socket.ready.resolve(true);
		else			socket.close();
	}
	if(msg_type === types.WS_MESSAGE_TYPE.FRIEND_ADD_RESPONSE) {
		const msg = json_msg as types.ws_user_friend_add_response;
		if(msg.success)	ws_user_onmessage_friend_add(msg.friend);
		else			ws_user_on_soft_error(msg.message);
	}
	if(msg_type === types.WS_MESSAGE_TYPE.FRIEND_REM_RESPONSE) {
		const msg = json_msg as types.ws_user_friend_rem_response;
		if(msg.success)	ws_user_onmessage_friend_rem(msg.friend_id);
		else			ws_user_on_soft_error(msg.message);
	}
	if(msg_type === types.WS_MESSAGE_TYPE.FRIEND_ADD_NOTIF) {
		const msg = json_msg as types.ws_user_friend_add_notif;
		ws_user_onmessage_friend_add(msg.friend);
	}
	if(msg_type === types.WS_MESSAGE_TYPE.FRIEND_REM_NOTIF) {
		const msg = json_msg as types.ws_user_friend_rem_notif;
		ws_user_onmessage_friend_rem(msg.friend_id);
	}
	if(msg_type === types.WS_MESSAGE_TYPE.CHAT_ACTIVITY_NOTIF) {
		const msg = json_msg as types.ws_chat_activity_notif;
		ws_user_onmessage_chat_activity(msg.chat_id);
	}
}
function ws_user_onmessage_friend_add(friend: Friend) {
	// update cache.
	const list = cache.friends.list;
	list.push(friend);
	// manually add notif.
	cache.notifs.friends_added.push(friend.user_id);
}
function ws_user_onmessage_friend_rem(friend_id: StringId) {
	// update cache.
	const list = cache.friends.list;
	const ind = list.findIndex(friend => friend.user_id === friend_id);
	if(ind !== -1) list.splice(ind, 1);
	// manually add notif.
	cache.notifs.friends_removed.push(friend_id);
}
function ws_user_onmessage_chat_activity(chat_id: StringId) {
	// manually add notif.
	cache.notifs.chat_activity.push(chat_id);
}

// request-messages.
export function ws_user_friend_add(friend_id: StringId) {
	const socket = user_socket;
	if(!socket) throw("no socket");
	send_message<types.ws_user_friend_add>(socket, { mtype:types.WS_MESSAGE_TYPE.FRIEND_ADD, req_id:Math.random(), friend_id:friend_id });
}
export function ws_user_friend_rem(friend_id: StringId) {
	const socket = user_socket;
	if(!socket) throw("no socket");
	send_message<types.ws_user_friend_rem>(socket, { mtype:types.WS_MESSAGE_TYPE.FRIEND_REM, req_id:Math.random(), friend_id:friend_id });
}

// ==============================
// websockets - chat.
// ------------------------------

export type ws_socket_chat = WebSocket & {
	ready	: DeferredPromise<true>;
	chat_id	: StringId;
};

// handlers.
export function ws_chat_open_socket(chat_id: StringId): ws_socket_chat {
	const ws = get_websocket(ENDPOINTS.ws_chat) as ws_socket_chat;
	ws.ready = getDeferredPromise();
	ws.chat_id		= chat_id;
	// add event handlers.
	ws.onopen		= ws_chat_onopen;
	ws.onclose		= ws_chat_onclose;
	ws.onerror		= ws_chat_onerror;
	ws.onmessage	= ws_chat_onmessage;
	return ws;
}
function ws_chat_onopen		(ev: Event) {
	console.log("ws_chat_onopen", ev);
	const socket = ev.target as ws_socket_chat;
	if(!cache.user) throw("no user");
	send_message<types.ws_chat_login>(socket, {
		mtype		: types.WS_MESSAGE_TYPE.CHAT_LOGIN,
		req_id		: Math.random(),
		token_hash	: cache.user.token,
		user_id		: cache.user.id,
		chat_id		: socket.chat_id,
	});
}
function ws_chat_onclose	(ev: CloseEvent) {
	console.log("ws_chat_onclose", ev);
}
function ws_chat_onerror	(ev: Event) {
	console.log("ws_chat_onerror", ev);
	state_chat.on_hard_error(ev.type);
}
function ws_chat_onmessage	(ev: MessageEvent) {
	console.log("ws_chat_onmessage", ev);
	const socket = ev.target as ws_socket_chat;
	// parse message.
	const json_msg = JSON.parse(ev.data) as types.ws_message;
	const msg_type = json_msg.mtype;
	// process message.
	if(msg_type === types.WS_MESSAGE_TYPE.CHAT_LOGIN_RESPONSE) {
		const msg = json_msg as types.ws_chat_login_response;
		if(msg.success)	socket.ready.resolve(true);
		else			socket.close();
	}
	if(msg_type === types.WS_MESSAGE_TYPE.CHAT_ADD_POST_RESPONSE) {
		const msg = json_msg as types.ws_chat_add_post_response;
		if(msg.success) {
			const post = msg.post;
			cache.chat_posts.set(post._id, post);
			state_chat.on_add_post(post);
		} else {
			state_chat.on_soft_error(msg.message);
		}
	}
	if(msg_type === types.WS_MESSAGE_TYPE.CHAT_ADD_POST_EVENT) {
		const msg = json_msg as types.ws_chat_add_post_event;
		const post = msg.post;
		cache.chat_posts.set(post._id, post);
		state_chat.on_add_post(post);
	}
}

// request-messages.
export function ws_chat_add_post(socket: ws_socket_chat, content: string) {
	send_message<types.ws_chat_add_post>(socket, { mtype:types.WS_MESSAGE_TYPE.CHAT_ADD_POST, req_id:Math.random(), content:content });
}


