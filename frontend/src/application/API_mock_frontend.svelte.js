/* NOTES:

username should be used when logging in (for security),
but email should be required when creating an account (to verify, recover, and prevent spam).
https://stackoverflow.com/questions/1303575/what-are-the-pros-and-cons-of-using-an-email-as-a-username
https://stackoverflow.com/questions/647172/what-are-the-pros-and-cons-of-using-an-email-address-as-a-user-id

*/

import * as backend from "./API_mock_backend";

function fetch_mock(body, options) {
	return new Promise((res, rej) => {
		const response = new Response(body, options);
		setTimeout(() => res(response), 100 * Math.random() * Math.random());
	});
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

export async function account_login(username, password) {
	const response = await fetch_mock(JSON.stringify(backend.account_login(username, password)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const [success, message] = body;
	if(success) {
		const { id, token, username, nickname } = message;
		user.id			= id;
		user.token		= token;
		user.username	= username;
		user.nickname	= nickname;
		return [success, "login successful"];
	} else {
		return [success, message];
	}
}

export async function account_logout() {
	const response = await fetch_mock(JSON.stringify(backend.account_logout(user.id, user.token.hash)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const [success, message] = body;
	// clear local user state regardless of whether or not logout was successful.
	for(const [key, value] of Object.entries(user)) user[key] = null;
	return [success, message];
}

export async function account_create(username, password, nickname) {
	const response = await fetch_mock(JSON.stringify(backend.account_create(username, password, nickname)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const [success, message] = body;
	if(success)	return account_login(username, password);
	else		return [success, message];
}

export async function account_remove() {}// TODO

// some user data can be changed using a token.
export async function account_patch_with_token(obj) {
	const response = await fetch_mock(JSON.stringify(backend.account_patch_with_token(user.id, obj, user.token.hash)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const [success, message] = body;
	// assume all provided properties have correct names, and update user state.
	if(success) for(const [key, value] of Object.entries(obj)) user[key] = value;
	return [success, message];
}

// user data with security implications requires the users current password to be entered.
export async function account_patch_with_password(obj, password) {
	const response = await fetch_mock(JSON.stringify(backend.account_patch_with_password(user.id, obj, password)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const [success, message] = body;
	// assume all provided properties have correct names, and update user state.
	if(success) for(const [key, value] of Object.entries(obj)) user[key] = value;
	return [success, message];
}

// ==============================
// table functions.
// ------------------------------

export async function posts_create(post_body) {
	const response = await fetch_mock(JSON.stringify(backend.posts_create(user.id, user.token.hash, post_body)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const [success, message] = body;
	return [success, message];
}
export async function posts_remove(post_id) {
	const response = await fetch_mock(JSON.stringify(backend.posts_remove(user.id, user.token.hash, post_id)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const [success, message] = body;
	return [success, message];
}
export async function posts_modify(post_id, post_body) {
	const response = await fetch_mock(JSON.stringify(backend.posts_modify(user.id, user.token.hash, post_id, post_body)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const [success, message] = body;
	return [success, message];
}
export async function posts_list(user_id) {
	const response = await fetch_mock(JSON.stringify(backend.posts_list(user_id)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const [success, message] = body;
	return [success, message];
}
export async function posts_get(post_ids) {
	const response = await fetch_mock(JSON.stringify(backend.posts_get(post_ids)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const posts = body;
	return posts;
}

export async function users_search(search_str) {
	const response = await fetch_mock(JSON.stringify(backend.users_search(search_str)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const list = body;
	return list;
}
export async function users_get_public_info(user_ids) {
	const response = await fetch_mock(JSON.stringify(backend.users_get_public_info(user_ids)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const list = body;
	return list;
}

export async function friends_list	() {
	const user_id = user.id;
	const token_hash = user.token.hash;
	const response = await fetch_mock(JSON.stringify(backend.friends_list(user_id, token_hash)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const [success, message] = body;
	return [success, message];
}
export async function friends_add	(friend_id) {
	const user_id = user.id;
	const token_hash = user.token.hash;
	const response = await fetch_mock(JSON.stringify(backend.friends_add(user_id, token_hash, friend_id)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const [success, message] = body;
	return [success, message];
}
export async function friends_remove(friend_id) {
	const user_id = user.id;
	const token_hash = user.token.hash;
	const response = await fetch_mock(JSON.stringify(backend.friends_remove(user_id, token_hash, friend_id)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const [success, message] = body;
	return [success, message];
}

export async function chats_get(chat_id) {
	const user_id = user.id;
	const token_hash = user.token.hash;
	const response = await fetch_mock(JSON.stringify(backend.chats_get(user_id, token_hash, chat_id)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const [success, message] = body;
	return [success, message];
}
export async function chats_add_post(chat_id, data) {
	const user_id = user.id;
	const token_hash = user.token.hash;
	const response = await fetch_mock(JSON.stringify(backend.chats_add_post(user_id, token_hash, chat_id, data)));
	console.log("response", response);
	const body = await response.json();
	console.log("body", body);
	const [success, message] = body;
	return [success, message];
}






