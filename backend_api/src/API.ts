import {
    ResponseBodyAccountLogin,
	ResponseBodyWithMessage,
    BODY_INVALID_TOKEN,
    BODY_USER_NOT_FOUND,
    ResponseBodyPostsList,
    ResponseBodyPostsGet,
    ReponseBodyUsersSearch,
    ReponseBodyUsersGetPublicInfo,
    ResponseBodyFriendsList,
    ResponseBodyChatsGet,
    ResponseBodyWithMessageOrId,
    ResponseBodyNotifsChat,
} from "./API_types.js";
import { tables } from "./Tables.js";
import { StringId, User } from "./Types.js";

// ==============================
// account management.
// ------------------------------

export class RequestBodyAccountCreate {
	username: string;
	nickname: string;
	password: string;
};
export async function account_create(body: RequestBodyAccountCreate) : Promise<ResponseBodyWithMessage | ResponseBodyAccountLogin> {
	const prefix = "account_create";
	console.log(prefix);
	// get request params.
	const { username, nickname, password } = body;
	// check if username already taken.
	const exists = await tables.users.findOne_by_username(username);
	if(exists) {
		console.log(prefix, "username already taken", username);
		return { success:false, message:"username already taken" };
	}
	// create user.
	const user = await tables.users.insertOne(new User(username, nickname, password));
	if(!user) {
		console.log(prefix, "failed to create user", username);
		return { success:false, message:"failed to create user" };
	}
	console.log(prefix, "created account", username, user._id);
	// automatically login new user.
	const result = await account_login({ username, password });
	return result;
}

export class RequestBodyAccountLogin {
	username: string;
	password: string;
};
export async function account_login(body: RequestBodyAccountLogin) : Promise<ResponseBodyWithMessage | ResponseBodyAccountLogin> {
	const prefix = "account_login";
	// get request params.
	const { username, password } = body;
	// check if username exists.
	const user = await tables.users.findOne_by_username(username);
	if(!user) {
		console.log(prefix, "username not found", username);
		return { success:false, message:"username or password is incorrect" };
	}
	// check if password is valid.
	const correct = User.is_password_correct(user, password);
	if(!correct) {
		console.log(prefix, "password not valid", username);
		return { success:false, message:"username or password is incorrect" };
	}
	// generate token.
	const token = await tables.tokens.generateNewToken(user._id);
	if(!token) {
		console.log(prefix, "failed to generate token", user._id, username);
		return { success:false, message:"login failed" };
	} else {
		console.log(prefix, "generated new token", token);
		return {
			success	: true,
			id		: user._id,
			token	: token.hash,
			nickname: user.nickname,
		};
	}
}

export class RequestBodyAccountLogout {
	user_id		: StringId;
	token_hash	: string;
};
export async function account_logout(body: RequestBodyAccountLogout) : Promise<ResponseBodyWithMessage> {
	const prefix = "account_logout";
	console.log(prefix);
	// get request params.
	const { user_id, token_hash } = body;
	// check if token is valid.
	const valid:boolean = await tables.tokens.validate(user_id, token_hash);
	if(!valid) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return BODY_INVALID_TOKEN;
	}
	// clear token.
	const success = await tables.tokens.deleteOne(user_id);
	return { success };
}

export class RequestBodyAccountRemove {
	user_id		: StringId;
	password	: string;
};
export async function account_remove(body: RequestBodyAccountRemove) : Promise<ResponseBodyWithMessage> {
	const prefix = "account_remove";
	console.log(prefix);
	// get request params.
	const { user_id, password } = body;
	// check if user exists.
	const user = await tables.users.findOne(user_id);
	if(!user) {
		console.log(prefix, "user not found", user_id);
		return BODY_USER_NOT_FOUND;
	}
	// check if password is valid.
	const correct = User.is_password_correct(user, password);
	if(!correct) {
		console.log(prefix, "password is incorrect", user_id);
		return { success:false, message:"password is incorrect" };
	}
	// remove user.
	const success = await tables.users.deleteOne(user_id);
	if(success) {
		console.log(prefix, "user removed", user_id);
		return { success:true };
	} else {
		console.log(prefix, "failed to remove user", user_id);
		return { success:false, message:"failed to remove user" };
	}
}

export class RequestBodyAccountUpdateT {
	user_id		: StringId;
	token_hash	: string;
	props		: any;
};
export async function account_update_with_token(body: RequestBodyAccountUpdateT) : Promise<ResponseBodyWithMessage> {
	const prefix = "account_patch_with_token";
	console.log(prefix);
	// get request params.
	const { user_id, token_hash, props } = body;
	// check if user exists.
	const user = await tables.users.findOne(user_id);
	if(!user) {
		console.log(prefix, "user not found", user_id);
		return BODY_USER_NOT_FOUND;
	}
	// check if token is valid.
	const valid:boolean = await tables.tokens.validate(user_id, token_hash);
	if(!valid) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return BODY_INVALID_TOKEN;
	}
	// check if new username is taken (if found in props).
	if(props.username && props.username !== user.username && await tables.users.findOne_by_username(props.username)) {
		console.log(prefix, "username already taken", user_id, props.username);
		return { success:false, message:"username already taken" };
	}
	// patch user data.
	const change: Partial<User> = {};
	if(props.username && props.username !== user.username) change.username = props.username;
	if(props.nickname && props.nickname !== user.nickname) change.nickname = props.nickname;
	const success = await tables.users.updateOne(user_id, change);
	if(success) {
		console.log(prefix, "updated account", user_id);
		return { success:true };
	} else {
		console.log(prefix, "failed to update account", user_id);
		return { success:false };
	}
}

export class RequestBodyAccountUpdateP {
	user_id		: StringId;
	password	: string;
	props		: any;
};
export async function account_update_with_password(body: RequestBodyAccountUpdateP) : Promise<ResponseBodyWithMessage> {
	const prefix = "account_patch_with_password";
	console.log(prefix);
	// get request params.
	const { user_id, password, props } = body;
	// check if user exists.
	const user = await tables.users.findOne(user_id);
	if(!user) {
		console.log(prefix, "user not found", user_id);
		return BODY_USER_NOT_FOUND;
	}
	// check if new username is taken (if found in props).
	if(props.username && props.username !== user.username && await tables.users.findOne_by_username(props.username)) {
		console.log(prefix, "username already taken", user_id, props.username);
		return { success:false, message:"username already taken" };
	}
	// patch user data.
	const change: Partial<User> = {};
	if(props.username && props.username !== user.username) change.username = props.username;
	if(props.nickname && props.nickname !== user.nickname) change.nickname = props.nickname;
	if(props.password) User.set_password(change, password);
	const success = await tables.users.updateOne(user_id, change);
	if(success) {
		console.log(prefix, "updated account", user_id);
		return { success:true };
	} else {
		console.log(prefix, "failed to update account", user_id);
		return { success:false };
	}
}

// ==============================
// users.
// ------------------------------

export class RequestBodyUsersGetPublicInfo {
	user_ids: StringId[];
};
export async function users_get_public_info(body: RequestBodyUsersGetPublicInfo) : Promise<ReponseBodyUsersGetPublicInfo> {
	const prefix = "users_get_public_info";
	console.log(prefix);
	// get request params.
	const { user_ids } = body;
	// return public info of users.
	const user_infos = await tables.users.findMany(user_ids, { username:1, nickname:1 });
	return { user_infos };
}

export class RequestBodyUsersSearch {
	search_str: string;
};
export async function users_search(body: RequestBodyUsersSearch) : Promise<ReponseBodyUsersSearch> {
	const prefix = "users_search";
	console.log(prefix);
	// get request params.
	const { search_str } = body;
	// return search results.
	const user_ids = await tables.users.find_public_search(search_str);
	return { user_ids };
}

// ==============================
// posts.
// ------------------------------

export class RequestBodyPostsUpdate {
	user_id		: StringId;
	token_hash	: string;
	post_id		: StringId;
	content		: string;
};
export async function posts_update(body: RequestBodyPostsUpdate) : Promise<ResponseBodyWithMessage> {
	const prefix = "posts_update";
	console.log(prefix);
	// get request params.
	const { user_id, token_hash, post_id, content } = body;
	// check if token is valid.
	const valid:boolean = await tables.tokens.validate(user_id, token_hash);
	if(!valid) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return { success:false, message:"token is invalid" };
	}
	// check if post exists.
	const post = await tables.posts.findOne(post_id);
	if(!post) {
		console.log(prefix, "post not found", user_id, post_id);
		return { success:false, message:"post not found" };
	}
	// modify post.
	const success = await tables.posts.updateOne(post_id, { content });
	if(success) {
		console.log(prefix, "updated post", user_id, post_id);
		return { success:true };
	} else {
		console.log(prefix, "failed to update post", user_id, post_id);
		return { success:false };
	}
}

export class RequestBodyPostsGet {
	post_ids: StringId[];
};
export async function posts_get(body: RequestBodyPostsGet) : Promise<ResponseBodyPostsGet> {
	const prefix = "posts_get";
	console.log(prefix);
	// get request params.
	const { post_ids } = body;
	// return posts.
	console.log("getting posts", post_ids.length);
	const posts = await tables.posts.findMany(post_ids);
	return { posts };
}

// ==============================
// friends.
// ------------------------------

export class RequestBodyFriendsList {
	user_id		: StringId;
	token_hash	: string;
};
export async function friends_list(body: RequestBodyFriendsList) : Promise<ResponseBodyWithMessage | ResponseBodyFriendsList> {
	const prefix = "friends_list";
	console.log(prefix);
	// get request params.
	const { user_id, token_hash } = body;
	// check if token is valid.
	const valid:boolean = await tables.tokens.validate(user_id, token_hash);
	if(!valid) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return { success:false, message:"token is invalid" };
	}
	// return friends list.
	const flist = await tables.friends.findOne(user_id);
	if(flist) {
		return { success:true, list:flist.list };
	} else {
		console.log(prefix, "failed to get friends list", user_id);
		return { success:false };
	}
}

export class RequestBodyFriendsAdd {
	user_id			: StringId;
	token_hash		: string;
	friend_id		: StringId;
};
export async function friends_insert(body: RequestBodyFriendsAdd) : Promise<ResponseBodyWithMessage> {
	const prefix = "friends_insert";
	console.log(prefix);
	// get request params.
	const { user_id, token_hash, friend_id } = body;
	// check if token is valid.
	const valid:boolean = await tables.tokens.validate(user_id, token_hash);
	if(!valid) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return { success:false, message:"token is invalid" };
	}
	// check if friend exists.
	const friend_user = await tables.users.findOne(friend_id);
	if(!friend_user) {
		console.log(prefix, "friend not found", user_id, friend_id);
		return { success:false, message:"friend not found" };
	}
	// check if friend is already in list.
	const has_friend = await tables.friends.has_friend(user_id, friend_id);
	if(has_friend) {
		console.log(prefix, "friend already added", user_id, friend_id);
		return { success:false, message:"friend already added" };
	}
	// add friend pair.
	const success = await tables.friends.insert_friend_pair(user_id, friend_id);
	return { success:success };
}

export class RequestBodyFriendsRemove {
	user_id			: StringId;
	token_hash		: string;
	friend_id		: StringId;
};
export async function friends_remove(body: RequestBodyFriendsRemove) : Promise<ResponseBodyWithMessage> {
	const prefix = "friends_remove";
	console.log(prefix);
	// get request params.
	const { user_id, token_hash, friend_id } = body;
	// check if token is valid.
	const valid:boolean = await tables.tokens.validate(user_id, token_hash);
	if(!valid) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return { success:false, message:"token is invalid" };
	}
	// check if friend is not in list.
	const has_friend = await tables.friends.has_friend(user_id, friend_id);
	if(!has_friend) {
		console.log(prefix, "friend already removed", user_id, friend_id);
		return { success:false, message:"friend already removed" };
	}
	// remove friend pair.
	const success = await tables.friends.remove_friend_pair(user_id, friend_id);
	return { success };
}

export class RequestBodyFriendsCreateChat {
	user_id		: StringId;
	token_hash	: string;
	friend_id	: StringId;
};
export async function friends_create_chat(body: RequestBodyFriendsRemove) : Promise<ResponseBodyWithMessageOrId> {
	const prefix = "friends_remove";
	console.log(prefix);
	// get request params.
	const { user_id, token_hash, friend_id } = body;
	// check if token is valid.
	const valid:boolean = await tables.tokens.validate(user_id, token_hash);
	if(!valid) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return { success:false, message:"token is invalid" };
	}
	// check if friend is not in list.
	const has_friend:boolean = await tables.friends.has_friend(user_id, friend_id);
	if(!has_friend) {
		console.log(prefix, "friend not found", user_id, friend_id);
		return { success:false, message:"friend not found" };
	}
	// check if chat already exists.
	const has_chat:boolean = await tables.friends.has_friend_chat(user_id, friend_id);
	if(has_chat) {
		console.log(prefix, "chat already exists", user_id, friend_id);
		return { success:false, message:"chat already exists" };
	}
	// create chat.
	const chat = await tables.friends.create_friend_chat(user_id, friend_id);
	if(chat) {
		console.log(prefix, "created chat", user_id, friend_id);
		return { success:true, id:chat._id };
	} else {
		console.log(prefix, "failed to create chat", user_id, friend_id);
		return { success:false, message:"failed to create chat" };
	}
}

// ==============================
// chats.
// ------------------------------

export class RequestBodyChatsGet {
	user_id		: StringId;
	token_hash	: string;
	chat_id		: StringId;
};
export async function chats_get(body: RequestBodyChatsGet) : Promise<ResponseBodyWithMessage | ResponseBodyChatsGet> {
	const prefix = "chats_get";
	console.log(prefix);
	// get request params.
	const { user_id, token_hash, chat_id } = body;
	// check if token is valid.
	const valid:boolean = await tables.tokens.validate(user_id, token_hash);
	if(!valid) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return { success:false, message:"token is invalid" };
	}
	// return chat.
	const chat = await tables.chats.findOne(chat_id);
	if(chat) {
		return { success:true, chat };
	} else {
		console.log(prefix, "chat not found", user_id, chat_id);
		return { success:false, message:"chat not found" };
	}
}

export class RequestBodyChatsAddPost {
	user_id		: StringId;
	token_hash	: string;
	chat_id		: StringId;
	content		: string;
};
export async function chats_add_post(body: RequestBodyChatsAddPost) : Promise<ResponseBodyWithMessageOrId> {
	const prefix = "chats_add_post";
	console.log(prefix);
	// get request params.
	const { user_id, token_hash, chat_id, content } = body;
	// check if token is valid.
	const valid:boolean = await tables.tokens.validate(user_id, token_hash);
	if(!valid) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return { success:false, message:"token is invalid" };
	}
	// add post to chat.
	const post = await tables.chats.insertPost(chat_id, { user_id, content });
	if(post) {
		console.log(prefix, "added post", user_id, chat_id, post._id);
		return { success:true, id:post._id };
	} else {
		console.log(prefix, "failed to add post", user_id, chat_id, post._id);
		return { success:false, message:"failed to add post" };
	}
}

// ==============================
// blogs.
// ------------------------------

export class RequestBodyBlogsInsertPost {
	user_id		: StringId;
	token_hash	: string;
	content		: string;
};
export async function blogs_insert_post(body: RequestBodyBlogsInsertPost) : Promise<ResponseBodyWithMessageOrId> {
	const prefix = "posts_create";
	console.log(prefix, body);
	// get request params.
	const { user_id, token_hash, content } = body;
	// check if token is valid.
	const valid:boolean = await tables.tokens.validate(user_id, token_hash);
	if(!valid) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return { success:false, message:"token is invalid" };
	}
	// add post.
	const post = await tables.blogs.insertPost(user_id, { user_id, content });
	if(post) {
		console.log(prefix, "added post", user_id, post._id);
		return { success:true, id:post._id };
	} else {
		console.log(prefix, "failed to add post", user_id);
		return { success:false, message:"failed to add post" };
	}
}

export class RequestBodyBlogsRemovePost {
	user_id		: StringId;
	token_hash	: string;
	post_id		: StringId;
};
export async function blogs_remove_post(body: RequestBodyBlogsRemovePost) : Promise<ResponseBodyWithMessage> {
	const prefix = "posts_delete";
	console.log(prefix);
	// get request params.
	const { user_id, token_hash, post_id } = body;
	// check if token is valid.
	const valid:boolean = await tables.tokens.validate(user_id, token_hash);
	if(!valid) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return { success:false, message:"token is invalid" };
	}
	// remove post.
	const success = await tables.blogs.deletePost(user_id, post_id);
	if(success) {
		console.log(prefix, "removed post", user_id, post_id);
		return { success:true };
	} else {
		console.log(prefix, "failed to remove post", user_id, post_id);
		return { success:false };
	}
}

export class RequestBodyBlogsGet {
	blog_id	: StringId;
};
export async function blogs_list_posts(body: RequestBodyBlogsGet) : Promise<ResponseBodyPostsList> {
	const prefix = "posts_list";
	console.log(prefix, body);
	// get request params.
	const { blog_id } = body;
	// return list of post-ids by user.
	const blog = await tables.blogs.findOne(blog_id);
	return { post_ids:blog.post_ids };
}

// ==============================
// notifications.
// ------------------------------

export class RequestBodyNotifsChat {
	user_id		: StringId;
	token_hash	: string;
	clear		: boolean;
};
export async function notifs_get_chat(body: RequestBodyNotifsChat) : Promise<ResponseBodyWithMessage | ResponseBodyNotifsChat> {
	const prefix = "posts_list";
	console.log(prefix);
	// get request params.
	const { user_id, token_hash, clear } = body;
	// check if token is valid.
	const valid:boolean = await tables.tokens.validate(user_id, token_hash);
	if(!valid) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return { success:false, message:"token is invalid" };
	}
	// return (and clear) list of friends with unread chats.
	const chat_ids = await tables.notifs_chat.set_keys(user_id);
	if(clear) await tables.notifs_chat.set_clear(user_id);
	return { success:true, chat_ids:chat_ids };
}
