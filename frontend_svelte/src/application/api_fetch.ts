import { goto } from "$app/navigation";
import { ENDPOINTS } from "backend_api_types/endpoints";
import { path_fetch } from "./api_config";
import * as types from "backend_api_types/types.js";
import { NONE_TIMESTAMP } from "backend_api_types/types";
import type { StringId } from "backend_api_types/types";
import { cache, type LocalUser } from "./api_cache.svelte";
import * as api_cache from "./api_cache.svelte";
import * as api_ws from "./api_ws";
import { ROUTES } from "./routes";

async function api_fetch<RequestT, ResponseT>(path:string, request_body:RequestT): Promise<ResponseT> {
	const url = `https://${path_fetch}${path}`;
	//console.log("request url", url);
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

// helpers: notifications.
export async function notifs_clear_friends_added(friend_ids:StringId[]) {
	if(!cache.user) throw("user is null");
	// filter out items which dont have notifications.
	friend_ids = friend_ids.filter(id => cache.notifs.friends_added.includes(id));
	if(friend_ids.length <= 0) return;
	// send clear-request.
	const response_body = await api_fetch<types.notifs_clear_request, types.notifs_clear_response>(ENDPOINTS.notifs_clear, {
		user_id			: cache.user.id,
		token_hash		: cache.user.token,
		friends_added	: friend_ids,
	});
	if(response_body.success === true) {
		cache.notifs.friends_added = cache.notifs.friends_added.filter(id => !friend_ids.includes(id));
	} else {
		throw("request failed");
	}
}
export async function notifs_clear_friends_removed(friend_ids:StringId[]) {
	if(!cache.user) throw("user is null");
	// filter out items which dont have notifications.
	friend_ids = friend_ids.filter(id => cache.notifs.friends_removed.includes(id));
	if(friend_ids.length <= 0) return;
	// send clear-request.
	const response_body = await api_fetch<types.notifs_clear_request, types.notifs_clear_response>(ENDPOINTS.notifs_clear, {
		user_id			: cache.user.id,
		token_hash		: cache.user.token,
		friends_removed	: friend_ids,
	});
	if(response_body.success === true) {
		cache.notifs.friends_removed = cache.notifs.friends_removed.filter(id => !friend_ids.includes(id));
	} else {
		throw("request failed");
	}
}
export async function notifs_clear_chat_activity(chat_id:StringId) {
	if(!cache.user) throw("user is null");
	// ignore if no notification.
	if(!cache.notifs.chat_activity.includes(chat_id)) return;
	// send clear-request.
	const response_body = await api_fetch<types.notifs_clear_request, types.notifs_clear_response>(ENDPOINTS.notifs_clear, {
		user_id			: cache.user.id,
		token_hash		: cache.user.token,
		chat_activity	: [chat_id],
	});
	if(response_body.success === true) {
		cache.notifs.chat_activity = cache.notifs.chat_activity.filter(id => id !== chat_id);
	} else {
		throw("request failed");
	}
}

// ==============================
// GET and SYNC functions.
// ------------------------------

/** get and cache posts. */
export async function get_blog_posts(post_ids: StringId[]) {
	// filter out items that are already cached.
	post_ids = post_ids.filter(id => !cache.blog_posts.has(id));
	if(post_ids.length <= 0) return;
	// get and cache items.
	const response = await api_fetch<types.request_get_blog_posts, types.response_get_blog_posts>(ENDPOINTS.get_blog_posts, {
		posts		:	post_ids,
	});
	if(!response.success) throw(response.message);
	if(response.posts.length > 0) for(const post of response.posts) cache.blog_posts.set(post._id, post);
}
/** get and cache posts. */
export async function get_chat_posts(post_ids: StringId[]) {
	// filter out items that are already cached.
	post_ids = post_ids.filter(id => !cache.chat_posts.has(id));
	if(post_ids.length <= 0) return;
	// get and cache items.
	if(!cache.user) throw("no user");
	const response = await api_fetch<types.request_get_chat_posts, types.response_get_chat_posts>(ENDPOINTS.get_chat_posts, {
		posts		: post_ids,
		user_id		: cache.user.id,
		token_hash	: cache.user.token,
	});
	if(!response.success) throw(response.message);
	if(response.posts.length > 0) for(const post of response.posts) cache.chat_posts.set(post._id, post);
}
/** sync infos. */
export async function get_infos(user_ids: StringId[]) {
	// filter out items that are already cached.
	user_ids = user_ids.filter(id => !cache.infos.has(id));
	if(user_ids.length <= 0) return;
	// get and cache items..
	if(!cache.user) throw("no user");
	const response = await api_fetch<types.request_sync_infos, types.response_sync_infos>(ENDPOINTS.sync_infos, {
		user_id		: cache.user.id,
		token_hash	: cache.user.token,
		infos		: user_ids,
		tss			: user_ids.map(id => cache.infos.get(id)?.updated ?? NONE_TIMESTAMP),
	});
	if(!response.success) throw(response.message);
	if(response.changed_infos.length > 0) for(const info of response.changed_infos) cache.infos.set(info._id, info);
}
/** sync blog data - for opening posts page. */
export async function sync_blog(blog_id:StringId) {
	const response = await api_fetch<types.request_sync_blogs, types.response_sync_blogs>(ENDPOINTS.sync_blogs, {
		blogs		: [blog_id],
		tss			: [cache.blogs.get(blog_id)?.updated ?? NONE_TIMESTAMP],
	});
	if(!response.success) throw("request failed");
	// update cached blogs.
	for(const blog of response.changed_blogs) cache.blogs.set(blog._id, blog);
	// get all required infos and posts.
	const blog = cache.blogs.get(blog_id);
	if(!blog) throw("no blog");
	await get_infos([blog._id]);
	await get_blog_posts(blog.post_ids);
}
/** sync chat data - for loading chats. */
export async function sync_chat(chat_id:StringId) {
	if(!cache.user) throw("no user");
	const response = await api_fetch<types.request_sync_chats, types.response_sync_chats>(ENDPOINTS.sync_chats, {
		user_id		: cache.user.id,
		token_hash	: cache.user.token,
		chats		: [chat_id],
		tss			: [cache.chats.get(chat_id)?.updated ?? NONE_TIMESTAMP],
	});
	if(!response.success) throw("request failed");
	// update cached chats.
	for(const chat of response.changed_chats) cache.chats.set(chat._id, chat);
	// get all required infos and posts.
	const chat = cache.chats.get(chat_id);
	if(!chat) throw("no chat");
	await get_infos(chat.user_ids);
	await get_chat_posts(chat.post_ids);
}
/** sync friends-list - for loading friends page. */
export async function sync_friendlist() {
	if(!cache.user) throw("no user");
	const response = await api_fetch<types.request_sync_flist, types.response_sync_flist>(ENDPOINTS.sync_flist, {
		user_id		: cache.user.id,
		token_hash	: cache.user.token,
		flist		: cache.friends.updated ?? NONE_TIMESTAMP,
	});
	if(!response.success) throw(response.message);
	if(response.changed_flist) {
		const flist = response.changed_flist;
		cache.friends = flist;
		await get_infos(flist.list.map(friend => friend.user_id));
	}
}
/** sync notifications-list. */
export async function sync_notifs() {
	if(!cache.user) throw("null user");
	const response = await api_fetch<types.request_sync_notifs, types.response_sync_notifs>(ENDPOINTS.sync_notifs, {
		user_id		: cache.user.id,
		token_hash	: cache.user.token,
		notifs		: cache.notifs.updated ?? NONE_TIMESTAMP,
	});
	if(!response.success) throw("request failed");
	if(response.changed_notifs) {
		const notifs = response.changed_notifs;
		cache.notifs = notifs;
	}
}

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
	const response_body = await api_fetch<types.account_update_with_token_request, types.account_update_with_token_response>(ENDPOINTS.account_update_t, {
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
	const response_body = await api_fetch<types.account_update_with_password_request, types.account_update_with_password_response>(ENDPOINTS.account_update_p, {
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
		blog_id		: cache.user.id,
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
	const blog_id = cache.user.id;
	// update remote item.
	const response_body = await api_fetch<types.blogs_update_post_request, types.blogs_update_post_response>(ENDPOINTS.blogs_update_post, {
		user_id		: cache.user.id,
		token_hash	: cache.user.token,
		blog_id		: blog_id,
		post_id		: post_id,
		content		: content,
	});
	if(response_body.success) {
		const { success, postinfo } = response_body;
		api_cache.cache_on_blog_update_post(blog_id, post_id, { ...postinfo, content });
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
		blog_id		: cache.user.id,
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




