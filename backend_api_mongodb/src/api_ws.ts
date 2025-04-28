import { WebSocket } from "ws";
import {
	StringId,
	ws_chat_login,
    ws_user_login,
    ws_user_friend_add,
    ws_user_friend_add_response,
    ws_user_friend_add_notif,
    ws_user_friend_rem_response,
    ws_user_friend_rem_notif,
    ws_user_friend_rem,
    WS_CLOSE_CODE,
    ws_user_login_response,
    ws_chat_login_response,
    WS_MESSAGE_TYPE,
    ws_message,
    ws_chat_add_post,
    ws_chat_add_post_response,
    ws_chat_add_post_event,
    ws_chat_activity_notif,
} from "backend_api_types/types.js";
import { tables } from "./tables.js";
import { Request } from "express";
import { ERR_TYPE, LOG_TYPE, push_log_entry_ws } from "./logging.js";


type SocketId = number;
let next_socket_id = 0;
const MAX_SOCKET_IDS = 0xffffffff;
export type Socket_api = WebSocket & {
	socket_id	: SocketId,
	ip			: string,
};

function close_with_error(socket:Socket_api, log_type: LOG_TYPE, t0: number, errtype: ERR_TYPE, errmsg: string): void {
	/* NOTE:
		a correct close-code must be used, otherwise this code will error without actually closing the socket.
		see:
			https://stackoverflow.com/questions/19304157/getting-the-reason-why-websockets-closed-with-close-code-1006/19305172#19305172
			https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close
			https://www.rfc-editor.org/rfc/rfc6455.html#section-7.1.5
			https://www.rfc-editor.org/rfc/rfc6455.html#section-7.4.1
		I am personally disappointed by the fact that the no link or documentation is provided by types/ws,
		nor any warning given, that tells me this is even a problem that existed.
	*/
	socket.close(WS_CLOSE_CODE.SERVER_ERROR, errmsg);
	push_log_entry_ws(socket, log_type, t0, errtype);
}
function send_message<T> (socket:WebSocket, message:T) {
	socket.send(JSON.stringify(message));
}
function respond_with_message<T>(socket:Socket_api, log_type: LOG_TYPE, t0: number, errtype: ERR_TYPE, message:T): void {
	socket.send(JSON.stringify(message));
	push_log_entry_ws(socket, log_type, t0, errtype);
}


// ==============================
// socket groups.
// ------------------------------

class SocketGroup_Map<A,B> {
	map: Map<A, B>;
	constructor() {
		this.map = new Map();
	}
	has(a:A): boolean {
		return this.map.has(a);
	}
	get(a:A): B {
		return this.map.get(a);
	}
	add(a:A, b:B): void {
		this.map.set(a,b);
	}
	rem(a:A): void {
		this.map.delete(a);
	}
}

class SocketGroup_MapMap<A,B,C> {
	map: Map<A, Map<B,C>>;
	constructor() {
		this.map = new Map();
	}
	has(a:A, b:B): boolean {
		let group = this.map.get(a);
		if(group)	return group.has(b);
		else		return false;
	}
	get_map(a:A): Map<B,C> | undefined {
		return this.map.get(a);
	}
	add(a:A, b:B, c:C): void {
		let group = this.map.get(a);
		if(group)	group.set(b,c);
		else		this.map.set(a, new Map<B,C>([[b,c]]));
	}
	rem(a:A, b:B): void {
		let group = this.map.get(a);
		if(group)	{ group.delete(b); if(group.size === 0) this.map.delete(a); }
		else		return;
	}
}

// ==============================
// websockets - user.
// ------------------------------

type Socket_user = Socket_api & {
	token_hash	: null | string,
	user_id		: null | StringId,
};
const sockets_user = new Map<SocketId, Socket_user>();
const evgroup_user = new SocketGroup_Map<StringId, Socket_user>();

function ws_user_onopen	() {
	const socket = this as Socket_user;
	push_log_entry_ws(socket, LOG_TYPE.WS_USER_ONOPEN, performance.now(), ERR_TYPE.SUCCESS);
}
function ws_user_onclose	(_code: number, _reason: Buffer) {
	const socket = this as Socket_user;
	push_log_entry_ws(socket, LOG_TYPE.WS_USER_ONCLOSE, performance.now(), ERR_TYPE.SUCCESS);
	// remove from event group.
	if(socket.user_id) evgroup_user.rem(socket.user_id);
}
function ws_user_onerror	(error: Error) {
	const socket = this as Socket_user;
	push_log_entry_ws(socket, LOG_TYPE.WS_USER_ONERROR, performance.now(), ERR_TYPE.WS_ERROR);
	console.error("ws_user_onerror", socket.socket_id, socket.user_id, error);
}
async function ws_user_onmessage	(data: WebSocket.RawData, _isBinary: boolean) {
	const t0 = performance.now();
	const socket = this as Socket_user;
	try {
		// parse message.
		let msg: ws_message | null = null;
		if(typeof data !== "string") return respond_with_message(socket, LOG_TYPE.WS_USER, t0, ERR_TYPE.WS_FAILED_TO_PARSE_MESSAGE_TYPE, "failed to parse message");
		try {
			msg = JSON.parse(data);
		}catch(error: unknown) { return respond_with_message(socket, LOG_TYPE.WS_USER, t0, ERR_TYPE.WS_FAILED_TO_PARSE_MESSAGE_JSON, "failed to parse message"); }
		// process message - pre login.
		if(msg.mtype === WS_MESSAGE_TYPE.USER_LOGIN) {
			const mtype = WS_MESSAGE_TYPE.USER_LOGIN_RESPONSE;
			const log_type = LOG_TYPE.WS_USER_LOGIN;
			const { req_id, token_hash, user_id } = msg as ws_user_login;
			// check if they've already logged in.
			if(socket.token_hash) {
				const res: ws_user_login_response = { mtype, req_id, success:false, message:"already logged in" };
				return respond_with_message(socket, log_type, t0, ERR_TYPE.WS_ALREADY_LOGGED_IN, res);
			}
			// validate token.
			if(!tables.tokens.validate(user_id, token_hash)) {
				const res: ws_user_login_response = { mtype, req_id, success:false, message:"invalid token" };
				return respond_with_message(socket, log_type, t0, ERR_TYPE.INVALID_TOKEN, res);
			}
			// update socket config.
			socket.token_hash	= token_hash;
			socket.user_id		= user_id;
			// add to event group.
			evgroup_user.add(user_id, socket);
			// send response.
			const res: ws_user_login_response = { mtype, req_id, success:true };
			return respond_with_message<ws_user_login_response>(socket, log_type, t0, ERR_TYPE.SUCCESS, res);
		}
		// validate token.
		const { token_hash, user_id } = socket;
		if(!tables.tokens.validate(user_id, token_hash)) {
			return close_with_error(socket, LOG_TYPE.WS_USER, t0, ERR_TYPE.INVALID_TOKEN, "invalid token");
		}
		// process message - post login.
		if(msg.mtype === WS_MESSAGE_TYPE.FRIEND_ADD) {
			const mtype = WS_MESSAGE_TYPE.FRIEND_ADD_RESPONSE;
			const log_type = LOG_TYPE.WS_USER_FRIEND_ADD;
			const { req_id, friend_id } = msg as ws_user_friend_add;
			const friend = await tables.friend_lists.insert_friend_pair(user_id, friend_id);
			if(!friend) {
				const res: ws_user_friend_add_response = { mtype, req_id, success:false, message:"operation failed 300" };
				return respond_with_message(socket, log_type, t0, ERR_TYPE.TABLE_UPDATE_FAILED, res);
			} else {
				// notify friend.
				tables.notifs.on_friend_insert(friend_id, user_id);
				if(evgroup_user.has(friend_id)) {
					const other_socket = evgroup_user.get(friend_id);
					send_message<ws_user_friend_add_notif>(other_socket, { mtype:WS_MESSAGE_TYPE.FRIEND_ADD_NOTIF, friend:{ user_id:user_id, chat_id:friend.chat_id } });
				}
				// send response.
				const res: ws_user_friend_add_response = { mtype, req_id, success:true, friend };
				return respond_with_message(socket, log_type, t0, ERR_TYPE.SUCCESS, res);
			}
		}
		if(msg.mtype === WS_MESSAGE_TYPE.FRIEND_REM) {
			const mtype = WS_MESSAGE_TYPE.FRIEND_REM_RESPONSE;
			const log_type = LOG_TYPE.WS_USER_FRIEND_REM;
			const { req_id, friend_id } = msg as ws_user_friend_rem;
			const success = await tables.friend_lists.remove_friend_pair(user_id, friend_id);
			if(!success) {
				const res: ws_user_friend_rem_response = { mtype, req_id, success:false, message:"operation failed 200" };
				return respond_with_message(socket, log_type, t0, ERR_TYPE.TABLE_UPDATE_FAILED, res);
			} else {
				// notify friend.
				tables.notifs.on_friend_remove(friend_id, user_id);
				if(evgroup_user.has(friend_id)) {
					const other_socket = evgroup_user.get(friend_id);
					send_message<ws_user_friend_rem_notif>(other_socket, { mtype:WS_MESSAGE_TYPE.FRIEND_REM_NOTIF, friend_id:user_id });
				}
				// send response.
				const res: ws_user_friend_rem_response = { mtype, req_id, success:true, friend_id };
				return respond_with_message(socket, log_type, t0, ERR_TYPE.SUCCESS, res);
			}
		}
	} catch(err: any) {
		return close_with_error(socket, LOG_TYPE.WS_USER, t0, ERR_TYPE.WS_ERROR, "server error");
	}
}
export function setup_websocket_user(ws: WebSocket, req: Request) {
	// add new socket.
	const socket:Socket_user = ws as Socket_user;
	const socket_id = socket.socket_id = (next_socket_id++) % MAX_SOCKET_IDS;
	socket.ip = req.ip;
	sockets_user.set(socket_id, socket);
	// add event handlers.
	// NOTE: onopen is not reliably called if socket is open before these are set up.
	// https://github.com/websockets/ws/issues/1603
	// https://dev.to/ndrbrt/wait-for-the-websocket-connection-to-be-open-before-sending-a-message-1h12
	if(socket.readyState === socket.OPEN) push_log_entry_ws(socket, LOG_TYPE.WS_USER_ONOPEN, performance.now(), ERR_TYPE.SUCCESS);
	else socket.on("open"	, ws_user_onopen);
	socket.on("close"	, ws_user_onclose);
	socket.on("error"	, ws_user_onerror);
	socket.on("message"	, ws_user_onmessage);
}

// ==============================
// websockets - chat.
// ------------------------------

type Socket_chat = Socket_api & {
	token_hash	: null | string,
	user_id		: null | StringId,
	chat_id		: null | StringId,
};
const sockets_chat = new Map<SocketId, Socket_chat>();
const evgroup_chat = new SocketGroup_MapMap</** chat_id */StringId, /** user_id */StringId, Socket_chat>();

function ws_chat_onopen		() {
	const socket = this as Socket_chat;
	push_log_entry_ws(socket, LOG_TYPE.WS_CHAT_ONOPEN, performance.now(), ERR_TYPE.SUCCESS);
}
function ws_chat_onclose	(_code: number, _reason: Buffer) {
	const socket = this as Socket_chat;
	push_log_entry_ws(socket, LOG_TYPE.WS_CHAT_ONCLOSE, performance.now(), ERR_TYPE.SUCCESS);
	// remove from event group.
	if(socket.chat_id) evgroup_chat.rem(socket.chat_id, socket.user_id);
}
function ws_chat_onerror	(error: Error) {
	const socket = this as Socket_chat;
	push_log_entry_ws(socket, LOG_TYPE.WS_CHAT_ONERROR, performance.now(), ERR_TYPE.WS_ERROR);
	console.error("ws_chat_onerror", socket.socket_id, socket.user_id, error);
}
async function ws_chat_onmessage	(data: WebSocket.RawData, _isBinary: boolean) {
	const t0 = performance.now();
	const socket = this as Socket_chat;
	try {
		// parse message.
		let msg: ws_message | null = null;
		if(typeof data !== "string") return respond_with_message(socket, LOG_TYPE.WS_CHAT, t0, ERR_TYPE.WS_FAILED_TO_PARSE_MESSAGE_TYPE, "failed to parse message");
		try {
			msg = JSON.parse(data);
		}catch(error: unknown) { return respond_with_message(socket, LOG_TYPE.WS_CHAT, t0, ERR_TYPE.WS_FAILED_TO_PARSE_MESSAGE_JSON, "failed to parse message"); }
		// process message - pre login.
		if(msg.mtype === WS_MESSAGE_TYPE.CHAT_LOGIN) {
			const mtype = WS_MESSAGE_TYPE.CHAT_LOGIN_RESPONSE;
			const log_type = LOG_TYPE.WS_CHAT_LOGIN;
			const { req_id, token_hash, user_id, chat_id } = msg as ws_chat_login;
			// check if they've already logged in.
			if(socket.token_hash) {
				const res: ws_chat_login_response = { mtype, req_id, success:false, message:"already logged in" };
				return respond_with_message(socket, log_type, t0, ERR_TYPE.WS_ALREADY_LOGGED_IN, res);
			}
			// validate token.
			if(!tables.tokens.validate(user_id, token_hash)) {
				const res: ws_chat_login_response = { mtype, req_id, success:false, message:"invalid token" };
				return respond_with_message(socket, log_type, t0, ERR_TYPE.INVALID_TOKEN, res);
			}
			// check if they are a member of chat.
			if(!tables.chats.is_chat_member(chat_id, user_id)) {
				const res: ws_chat_login_response = { mtype, req_id, success:false, message:"not member of chat" };
				return respond_with_message(socket, log_type, t0, ERR_TYPE.UNAUTHORIZED_READ, res);
			}
			// update socket config.
			socket.token_hash	= token_hash;
			socket.user_id		= user_id;
			socket.chat_id		= chat_id;
			// add to event group.
			evgroup_chat.add(chat_id, user_id, socket);
			// send response.
			const res: ws_chat_login_response = { mtype, req_id, success:true };
			return respond_with_message<ws_chat_login_response>(socket, log_type, t0, ERR_TYPE.SUCCESS, res);
		}
		// validate token.
		const { token_hash, user_id, chat_id } = socket;
		if(!tables.tokens.validate(user_id, token_hash)) {
			return close_with_error(socket, LOG_TYPE.WS_CHAT, t0, ERR_TYPE.INVALID_TOKEN, "invalid token");
		}
		// process message - post login.
		if(msg.mtype === WS_MESSAGE_TYPE.CHAT_ADD_POST) {
			const mtype = WS_MESSAGE_TYPE.CHAT_ADD_POST_RESPONSE;
			const log_type = LOG_TYPE.WS_CHAT_ADD_POST;
			const { req_id, content } = msg as ws_chat_add_post;
			const post = await tables.chats.insertPost(chat_id, { user_id, chat_id, content });
			if(!post) {
				const res: ws_chat_add_post_response = { mtype, req_id, success:false, message:"operation failed 100" };
				return respond_with_message(socket, log_type, t0, ERR_TYPE.TABLE_UPDATE_FAILED, res);
			} else {
				// notify other chat members.
				const member_ids = await tables.chats.get_other_participants(chat_id, user_id);
				const member_sockets = evgroup_chat.get_map(chat_id);
				for(const member_id of member_ids) {
					if(member_sockets.has(member_id)) {
						// send chat update.
						const other_socket = member_sockets.get(member_id);
						send_message<ws_chat_add_post_event>(other_socket, { mtype:WS_MESSAGE_TYPE.CHAT_ADD_POST_EVENT, post });
					} else {
						// send notification.
						tables.notifs.on_chat_activity(member_id, chat_id);
						if(evgroup_user.has(member_id)) {
							const other_socket = evgroup_user.get(member_id);
							send_message<ws_chat_activity_notif>(other_socket, { mtype:WS_MESSAGE_TYPE.CHAT_ACTIVITY_NOTIF, chat_id:chat_id });
						}
					}
				}
				// send response.
				const res: ws_chat_add_post_response = { mtype, req_id, success:true, post };
				return respond_with_message(socket, log_type, t0, ERR_TYPE.SUCCESS, res);
			}
		}
	} catch(err: any) {
		return close_with_error(socket, LOG_TYPE.WS_CHAT, t0, ERR_TYPE.WS_ERROR, "server error");
	}
}
export function setup_websocket_chat(ws: WebSocket, req: Request) {
	// add new socket.
	const socket:Socket_chat = ws as Socket_chat;
	const socket_id = socket.socket_id = (next_socket_id++) % MAX_SOCKET_IDS;
	socket.ip = req.ip;
	sockets_chat.set(socket_id, socket);
	// add event handlers.
	if(socket.readyState === socket.OPEN) push_log_entry_ws(socket, LOG_TYPE.WS_CHAT_ONOPEN, performance.now(), ERR_TYPE.SUCCESS);
	else socket.on("open"	, ws_chat_onopen);
	socket.on("close"	, ws_chat_onclose);
	socket.on("error"	, ws_chat_onerror);
	socket.on("message"	, ws_chat_onmessage);
}







