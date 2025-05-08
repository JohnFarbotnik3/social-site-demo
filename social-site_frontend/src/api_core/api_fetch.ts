import { NONE_TIMESTAMP, type notifs_clear_request, type notifs_clear_response, type request_get_blog_posts, type request_get_chat_posts, type request_get_infos, type request_sync_blogs, type request_sync_chats, type request_sync_flist, type request_sync_infos, type request_sync_notifs, type response_get_blog_posts, type response_get_chat_posts, type response_get_infos, type response_sync_blogs, type response_sync_chats, type response_sync_flist, type response_sync_infos, type response_sync_notifs, type StringId } from "backend_api_types/types";
import { API_cache } from "./api_cache";
import { ENDPOINTS } from "backend_api_types/endpoints";


const api_host = process.env["API_HOST_URL"] ?? "https://localhost:8443";
async function api_fetch<RequestT, ResponseT>(path:string, request_body:RequestT): Promise<ResponseT> {
	const url = `${api_host}/${path}`;
	console.log("request url", url);
	const req = {
		method:"post",
		headers: {
			// WARNING: content type is very important, as request body is likely to be discarded without it.
			// https://stackoverflow.com/questions/9177049/express-js-req-body-undefined
			// https://developer.mozilla.org/docs/Web/API/Headers
			"Content-Type": "application/json",
		},
		body:JSON.stringify(request_body),
	};
	const response = await fetch(url, req);
	const response_body = await response.json();
	return response_body;
}


function filter_by_included(ids: StringId[], filter: StringId[]) {
	const result = [];
	for(const id of ids) if(filter.includes(id)) result.push(id);
	return result;
}

function filter_by_not_included(ids: StringId[], filter: StringId[]) {
	const result = [];
	for(const id of ids) if(!filter.includes(id)) result.push(id);
	return result;
}

function filter_by_not_in_map<V>(ids: StringId[], filter: Map<StringId, V>) {
	const result = [];
	for(const id of ids) if(!filter.has(id)) result.push(id);
	return result;
}


export class API_fetch {
/** reference to API_cache instance. */
cache: API_cache;

constructor(cache: API_cache) {
	this.cache	= cache;
}

// ============================================================
// notifications.
// ------------------------------------------------------------

async notifs_clear_friends_added(friend_ids:StringId[]) {
	const cache = this.cache;
	if(cache.user_id === null || cache.token === null) throw("not logged in");
	// filter out items which dont have notifications.
	const notif_ids = filter_by_included(friend_ids, cache.notifs.friends_added);
	if(notif_ids.length <= 0) return;
	// send clear-request.
	const response = await api_fetch<notifs_clear_request, notifs_clear_response>(ENDPOINTS.notifs_clear, {
		user_id			: cache.user_id,
		token_hash		: cache.token.hash,
		friends_added	: notif_ids,
	});
	if(!response.success) throw(response.message);
	// update cache.
	cache.notifs.friends_added = filter_by_not_included(cache.notifs.friends_added, notif_ids);
}

async notifs_clear_friends_removed(friend_ids:StringId[]) {
	const cache = this.cache;
	if(cache.user_id === null || cache.token === null) throw("not logged in");
	// filter out items which dont have notifications.
	const notif_ids = filter_by_included(friend_ids, cache.notifs.friends_removed);
	if(notif_ids.length <= 0) return;
	// send clear-request.
	const response = await api_fetch<notifs_clear_request, notifs_clear_response>(ENDPOINTS.notifs_clear, {
		user_id			: cache.user_id,
		token_hash		: cache.token.hash,
		friends_removed	: notif_ids,
	});
	if(!response.success) throw(response.message);
	// update cache.
	cache.notifs.friends_removed = filter_by_not_included(cache.notifs.friends_removed, notif_ids);
}

async notifs_clear_chat_activity(chat_id:StringId) {
	const cache = this.cache;
	if(cache.user_id === null || cache.token === null) throw("not logged in");
	// filter out items which dont have notifications.
	const notif_ids = filter_by_included([chat_id], cache.notifs.chat_activity);
	if(notif_ids.length <= 0) return;
	// send clear-request.
	const response = await api_fetch<notifs_clear_request, notifs_clear_response>(ENDPOINTS.notifs_clear, {
		user_id			: cache.user_id,
		token_hash		: cache.token.hash,
		chat_activity	: notif_ids,
	});
	if(!response.success) throw(response.message);
	// update cache.
	cache.notifs.chat_activity = filter_by_not_included(cache.notifs.chat_activity, notif_ids);
}

// ============================================================
// GET and SYNC functions.
// ------------------------------------------------------------

async get_blog_posts(post_ids: StringId[]) {
	const cache = this.cache;
	// filter out items that are already cached.
	const filtered_ids = filter_by_not_in_map(post_ids, cache.blog_posts);
	if(filtered_ids.length <= 0) return;
	// get items.
	const response = await api_fetch<request_get_blog_posts, response_get_blog_posts>(ENDPOINTS.get_blog_posts, {
		posts		:	filtered_ids,
	});
	if(!response.success) throw(response.message);
	// update cache.
	for(const post of response.posts) cache.blog_posts.set(post._id, post);
}

async get_chat_posts(post_ids: StringId[]) {
	const cache = this.cache;
	if(cache.user_id === null || cache.token === null) throw("not logged in");
	// filter out items that are already cached.
	const filtered_ids = filter_by_not_in_map(post_ids, cache.chat_posts);
	if(filtered_ids.length <= 0) return;
	// get items.
	const response = await api_fetch<request_get_chat_posts, response_get_chat_posts>(ENDPOINTS.get_chat_posts, {
		user_id		: cache.user_id,
		token_hash	: cache.token.hash,
		posts		: filtered_ids,
	});
	if(!response.success) throw(response.message);
	// update cache.
	for(const post of response.posts) cache.chat_posts.set(post._id, post);
}

async sync_infos(user_ids: StringId[]) {
	const cache = this.cache;
	if(cache.user_id === null || cache.token === null) throw("not logged in");
	// filter out items that are already cached.
	const filtered_ids = filter_by_not_in_map(user_ids, cache.user_infos);
	if(filtered_ids.length <= 0) return;
	// get items.
	const response = await api_fetch<request_sync_infos, response_sync_infos>(ENDPOINTS.sync_infos, {
		user_id		: cache.user_id,
		token_hash	: cache.token.hash,
		infos		: filtered_ids.map(id => [id, cache.user_infos.get(id)?.updated ?? NONE_TIMESTAMP]),
	});
	if(!response.success) throw(response.message);
	// update cache.
	for(const info of response.changed_infos) cache.user_infos.set(info._id, info);
}

async sync_blog(blog_id: StringId) {
	const cache = this.cache;
	// get items.
	const response = await api_fetch<request_sync_blogs, response_sync_blogs>(ENDPOINTS.sync_blogs, {
		blogs		: [[blog_id, cache.blogs.get(blog_id)?.updated ?? NONE_TIMESTAMP]],
	});
	if(!response.success) throw(response.message);
	// update cache.
	for(const blog of response.changed_blogs) cache.blogs.set(blog._id, blog);
}

async sync_chat(chat_id:StringId) {
	const cache = this.cache;
	if(cache.user_id === null || cache.token === null) throw("not logged in");
	// get items.
	const response = await api_fetch<request_sync_chats, response_sync_chats>(ENDPOINTS.sync_chats, {
		user_id		: cache.user_id,
		token_hash	: cache.token.hash,
		chats		: [[chat_id, cache.chats.get(chat_id)?.updated ?? NONE_TIMESTAMP]],
	});
	if(!response.success) throw(response.message);
	// update cache.
	for(const chat of response.changed_chats) cache.chats.set(chat._id, chat);
}

async sync_friendlist() {
	const cache = this.cache;
	if(cache.user_id === null || cache.token === null) throw("not logged in");
	// get items.
	const response = await api_fetch<request_sync_flist, response_sync_flist>(ENDPOINTS.sync_flist, {
		user_id		: cache.user_id,
		token_hash	: cache.token.hash,
		flist		: cache.friends_ts,
	});
	if(!response.success) throw(response.message);
	// update cache.
	if(response.changed_flist) {
		const flist = response.changed_flist;
		cache.friends_ts = flist.updated;
		cache.friends.clear();
		for(const friend of flist.list) cache.friends.set(friend.user_id, friend);
	}
}

async sync_notifs() {
	const cache = this.cache;
	if(cache.user_id === null || cache.token === null) throw("not logged in");
	// get items.
	const response = await api_fetch<request_sync_notifs, response_sync_notifs>(ENDPOINTS.sync_notifs, {
		user_id		: cache.user_id,
		token_hash	: cache.token.hash,
		notifs		: cache.notifs.updated ?? NONE_TIMESTAMP,
	});
	if(!response.success) throw("request failed");
	// update cache.
	if(response.changed_notifs) {
		cache.notifs = response.changed_notifs;
	}
}

// TODO - continue implementing API_core from here.

// ==============================
// search functions.
// ------------------------------

export async function user_search(search_str:string) {
	const response_body = await api_fetch<types.users_search_request, types.users_search_response>(ENDPOINTS.users_search, {
		search_str: search_str,
	});
	const user_ids = response_body.user_ids;
	await get_infos(user_ids);
	// return list of user-infos.
	return user_ids.map(id => cache.infos.get(id));
}

// ==============================
// account management.
// ------------------------------

async function on_login(user: LocalUser) {
	// set local user.
	api_cache.local_user_set(user);
	// create user socket.
	api_ws.ws_user_login();
	// pre-load some stuff.
	await sync_notifs();
	await sync_friendlist();
}
function on_logout() {
	// close user socket.
	api_ws.ws_user_logout();
	// clear some cache contents (privacy).
	api_cache.cache_on_logout();
	api_cache.local_user_clear();
	// go to login page.
	goto(ROUTES.login);
}

export async function account_token_valid(user: LocalUser) {
	const response_body = await api_fetch<types.account_token_valid_request, types.account_token_valid_response>(ENDPOINTS.account_token_valid, {
		user_id		: user.id,
		token_hash	: user.token,
	});
	const { valid } = response_body;
	return valid;
}

export async function account_create(username:string, password:string, nickname:string) {
	const response_body = await api_fetch<types.account_create_request, types.account_login_response>(ENDPOINTS.account_create, {
		username,
		nickname,
		password,
	});
	if(response_body.success) {
		const { id, token, nickname } = response_body;
		const user: LocalUser = { id, token, username, nickname };
		await on_login(user);
		return { success:response_body.success, user:user };
	} else {
		return { success:response_body.success, message:response_body.message };
	}
}

export async function account_delete(password:string) {
	if(!cache.user) throw("user is null");
	const response_body = await api_fetch<types.account_delete_request, types.account_delete_response>(ENDPOINTS.account_delete, {
		user_id		: cache.user.id,
		password,
	});
	if(response_body.success) {
		on_logout();
		return { success:response_body.success };
	} else {
		return { success:response_body.success, message:response_body.message };
	}
}

export async function account_login(username:string, password:string) {
	const response_body = await api_fetch<types.account_login_request, types.account_login_response>(ENDPOINTS.account_login, {
		username,
		password,
	});
	if(response_body.success) {
		const { id, token, nickname } = response_body;
		const user: LocalUser = { id, token, username, nickname };
		await on_login(user);
		return { success:response_body.success, user:user };
	} else {
		return { success:response_body.success, message:response_body.message };
	}
}

export async function account_login_local(): Promise<boolean> {
	// check if there is user-data in local storage.
	const stored_user = api_cache.local_user_get();
	if(!stored_user) return false;
	// check if token is still valid.
	const valid = await account_token_valid(stored_user);
	if(valid) {
		await on_login(stored_user);
		return true;
	} else {
		api_cache.local_user_clear();
		return false;
	}
}

export async function account_logout() {
	if(!cache.user) throw("user is null");
	try {
		const response_body = await api_fetch<types.account_logout_request, types.account_logout_response>(ENDPOINTS.account_logout, {
			user_id		: cache.user.id,
			token_hash	: cache.user.token,
		});
		if(response_body.success) {
			on_logout();
			return { success:response_body.success, message:null };
		} else {
			console.error(response_body.message);
			on_logout();
			return { success:response_body.success, message:response_body.message };
		}
	} catch(err) {
		console.error(err);
		on_logout();
		return { success:false, message:err };
	}
}

export async function account_patch_with_token(props:Partial<types.UserPatch_t>) {
	if(!cache.user) throw("user is null");
	const response_body = await api_fetch<types.account_update_with_token_request, types.account_update_with_token_response>(ENDPOINTS.account_update_with_token, {
		user_id		: cache.user.id,
		token_hash	: cache.user.token,
		props		: props,
	});
	// update local user state.
	if(response_body.success) api_cache.local_user_patch(props);
	return { success:response_body.success, message:response_body.message };
}

export async function account_patch_with_password(props:Partial<types.UserPatch_p>, password:string) {
	if(!cache.user) throw("user is null");
	const response_body = await api_fetch<types.account_update_with_password_request, types.account_update_with_password_response>(ENDPOINTS.account_update_with_password, {
		user_id		: cache.user.id,
		password	: password,
		props		: props,
	});
	// update local user state.
	if(response_body.success) api_cache.local_user_patch(props);
	return { success:response_body.success, message:response_body.message };
}

// NOTE: auto-login on load.
cache.user = api_cache.local_user_get();
account_login_local();

// ==============================
// blogs.
// ------------------------------

export async function blogs_insert_post(content:string) {
	if(!cache.user) throw("user is null");
	// add post.
	const response_body = await api_fetch<types.blogs_insert_post_request, types.blogs_insert_post_response>(ENDPOINTS.blogs_insert_post, {
		user_id		: cache.user.id,
		token_hash	: cache.user.token,
		content		: content,
	});
	if(response_body.success) {
		const { success, postinfo } = response_body;
		const blog_id = cache.user.id;
		api_cache.cache_on_blog_insert_post(blog_id, { ...postinfo, content });
		return { success, postinfo };
	} else {
		const { success, message } = response_body;
		return { success, message };
	}
}

export async function blogs_update_post(post_id: StringId, content: string) {
	if(!cache.user) throw("user is null");
	// update remote item.
	const response_body = await api_fetch<types.blogs_update_post_request, types.blogs_update_post_response>(ENDPOINTS.blogs_update_post, {
		user_id		: cache.user.id,
		token_hash	: cache.user.token,
		post_id		: post_id,
		content		: content,
	});
	if(response_body.success) {
		const { success, postinfo } = response_body;
		api_cache.cache_on_blog_update_post({ ...postinfo, content });
		return { success, postinfo };
	} else {
		const { success, message } = response_body;
		return { success, message };
	}
}

export async function blogs_remove_post(post_id: StringId) {
	if(!cache.user) throw("user is null");
	const response_body = await api_fetch<types.blogs_remove_post_request, types.blogs_remove_post_response>(ENDPOINTS.blogs_remove_post, {
		user_id		: cache.user.id,
		token_hash	: cache.user.token,
		post_id		: post_id,
	});
	if(response_body.success) {
		const { success } = response_body;
		const blog_id = cache.user.id;
		api_cache.cache_on_blog_remove_post(blog_id, post_id);
		return { success, message:null };
	} else {
		const { success, message } = response_body;
		return { success, message };
	}
}


};


