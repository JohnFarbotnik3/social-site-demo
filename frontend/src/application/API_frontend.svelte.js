/* NOTES:

username should be used when logging in (for security),
but email should be required when creating an account (to verify, recover, and prevent spam).
https://stackoverflow.com/questions/1303575/what-are-the-pros-and-cons-of-using-an-email-as-a-username
https://stackoverflow.com/questions/647172/what-are-the-pros-and-cons-of-using-an-email-address-as-a-user-id

*/

// TODO - move posts+chats to a local cache in this file.

const hostname = "[::1]";
const port_https = 5443;
function api_fetch(path, body) {
	//const url = `https://${hostname}:${port_https}${path}`;
	const url = `${new URL(location).origin}${path}`;
	const req = {
		method:"post",
		headers: {
			// WARNING: content type is very important, as request body is likely to be discarded without it.
			// https://stackoverflow.com/questions/9177049/express-js-req-body-undefined
			// https://developer.mozilla.org/docs/Web/API/Headers
			"Content-Type": "application/json",
		},
		body:JSON.stringify(body),
	};
	return fetch(url, req);
}

// ==============================
// account management.
// ------------------------------

export const user = $state({
	id		: null,
	token	: null,
	username: null,
	password: null,
	nickname: null,
});

export function is_logged_in() {
	return user.token ? true : false;
}

export async function account_create(username, password, nickname) {
	const response = await api_fetch("/account/create", {
		username,
		nickname,
		password,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);
	// log in user.
	if(response_body.success) {
		const { id, token, nickname } = response_body;
		user.id			= id;
		user.token		= token;
		user.username	= username;
		user.nickname	= nickname;
		return { success:response_body.success, message:null };
	} else {
		return { success:response_body.success, message:response_body.message };
	}
}

export async function account_login(username, password) {
	const response = await api_fetch("/account/login", {
		username,
		password,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);
	// log in user.
	if(response_body.success) {
		const { id, token, nickname } = response_body;
		user.id			= id;
		user.token		= token;
		user.username	= username;
		user.nickname	= nickname;
		return { success:response_body.success, message:null };
	} else {
		return { success:response_body.success, message:response_body.message };
	}
}

export async function account_logout() {
	const response = await api_fetch("/account/logout", {
		user_id		:user.id,
		token_hash	:user.token,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);
	// clear local user state regardless of whether or not logout was successful.
	for(const [key, value] of Object.entries(user)) user[key] = null;
	return { success:response_body.success, message:response_body.message };
}

export async function account_remove() {}// TODO

export async function account_patch_with_token(props) {
	const response = await api_fetch("/account/update_t", {
		user_id		:user.id,
		token_hash	:user.token,
		props		:props,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);
	// assume all provided properties have correct names, and update user state.
	if(response_body.success) for(const [key, value] of Object.entries(props)) user[key] = value;
	return { success:response_body.success, message:response_body.message };
}

export async function account_patch_with_password(props, password) {
	const response = await api_fetch("/account/update_p", {
		user_id		: user.id,
		password	: password,
		props		: props,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);
	// assume all provided properties have correct names, and update user state.
	if(response_body.success) for(const [key, value] of Object.entries(props)) user[key] = value;
	return { success:response_body.success, message:response_body.message };
}

// ==============================
// users.
// ------------------------------

export async function users_get_public_info(user_ids) {
	const response = await api_fetch("/users/public", {
		user_ids: user_ids,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);
	// return list of public user infos.
	return response_body.user_infos;
}

export async function users_search(search_str) {
	const response = await api_fetch("/users/search", {
		search_str: search_str,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);
	// return list of user ids.
	return response_body.user_ids;
}


// ==============================
// posts.
// ------------------------------

export async function posts_update(post_id, content) {
	const response = await api_fetch("/posts/update", {
		user_id		: user.id,
		token_hash	: user.token,
		post_id		: post_id,
		content		: content,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);

	return { success:response_body.success, message:response_body.message };
}
export async function posts_get(post_ids) {
	const response = await api_fetch("/posts/get", {
		post_ids	: post_ids,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);

	return response_body.posts;
}

// ==============================
// friends.
// ------------------------------

export async function friends_list() {
	const response = await api_fetch("/friends/list", {
		user_id		: user.id,
		token_hash	: user.token,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);

	if(response_body.success) {
		return { success:response_body.success, list:response_body.list };
	} else {
		return { success:response_body.success, message:response_body.message };
	}
}
export async function friends_insert(friend_id) {
	const response = await api_fetch("/friends/insert", {
		user_id		: user.id,
		token_hash	: user.token,
		friend_id	: friend_id,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);

	return { success:response_body.success, message:response_body.message };
}
export async function friends_remove(friend_id) {
	const response = await api_fetch("/friends/remove", {
		user_id		: user.id,
		token_hash	: user.token,
		friend_id	: friend_id,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);

	return { success:response_body.success, message:response_body.message };
}
export async function friends_create_chat(friend_id) {
	const response = await api_fetch("/friends/newchat", {
		user_id		: user.id,
		token_hash	: user.token,
		friend_id	: friend_id,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);

	if(response_body.success) {
		return { success:response_body.success, id:response_body.id };
	} else {
		return { success:response_body.success, message:response_body.message };
	}
}

// ==============================
// chats.
// ------------------------------

export async function chats_get(chat_id) {
	const response = await api_fetch("/chats/get", {
		user_id		: user.id,
		token_hash	: user.token,
		chat_id		: chat_id,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);

	if(response_body.success) {
		return { success:response_body.success, chat:response_body.chat };
	} else {
		return { success:response_body.success, message:response_body.message };
	}
}
export async function chats_add_post(chat_id, content) {
	const response = await api_fetch("/chats/add_post", {
		user_id		: user.id,
		token_hash	: user.token,
		chat_id		: chat_id,
		content		: content,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);

	if(response_body.success) {
		return { success:response_body.success, id:response_body.id };
	} else {
		return { success:response_body.success, message:response_body.message };
	}
}

// ==============================
// blogs.
// ------------------------------

export async function blogs_insert_post(content) {
	const response = await api_fetch("/blogs/insert", {
		user_id		: user.id,
		token_hash	: user.token,
		content		: content,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);

	if(response_body.success) {
		return { success:response_body.success, id:response_body.id };
	} else {
		return { success:response_body.success, message:response_body.message };
	}
}
export async function blogs_remove_post(post_id) {
	const response = await api_fetch("/blogs/remove", {
		user_id		: user.id,
		token_hash	: user.token,
		post_id		: post_id,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);

	return { success:response_body.success, message:response_body.message };
}
export async function blogs_list_posts(blog_id) {
	const response = await api_fetch("/blogs/list", {
		blog_id	: blog_id,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);

	return response_body.post_ids;
}

// ==============================
// notifications.
// ------------------------------

export const notifs = $state({
	/** list of chats with unread messages. */
	chat_ids: [],
});

const NOTIF_PERIOD_SLOW = 5*1000;
const NOTIF_PERIOD_FAST = 1*1000;

// date of most recent poll.
let notifs_get_chat_tprev = Date.now();
// polling period (ms).
let notifs_get_chat_period = NOTIF_PERIOD_SLOW;
// date to slow down polling.
let notifs_get_chat_backoff = Date.now();
// polling timer.
let notifs_get_chat_timer = setInterval(async () => {
	if(is_logged_in() && Date.now() > notifs_get_chat_tprev + notifs_get_chat_period) await notifs_get_chat();
}, 250);

export async function notifs_get_chat() {
	const response = await api_fetch("/notifs/get/chat", {
		user_id		: user.id,
		token_hash	: user.token,
		clear		: true,
	});
	const response_body = await response.json();
	console.log("response_body", response_body);
	// merge notifications into cache.
	const { success, chat_ids } = response_body;
	const set = new Set(notifs.chat_ids);
	for(const id of chat_ids) set.add(id);
	notifs.chat_ids = [...set.keys()];
	// update polling timer.
	const date = Date.now();
	notifs_get_chat_tprev = date;
	if(chat_ids.length > 0) {
		// speed up polling if stuff is happening.
		notifs_get_chat_period = NOTIF_PERIOD_FAST;
		notifs_get_chat_backoff = date + 30*1000;
	} else if(date > notifs_get_chat_backoff) {
		// slow down polling if stuff has not happened in a while.
		notifs_get_chat_period = NOTIF_PERIOD_SLOW;
	}
}
export function notifs_rem_chat(chat_id) {
	notifs.chat_ids = notifs.chat_ids.filter(id => id !== chat_id);
}






