import { tables } from "./tables.js";
import * as Types from "backend_api_types/types.js";
import { Request, Response } from "express";
import { ERR_TYPE, LOG_TYPE, push_log_entry } from "./logging.js";
export const BODY_INVALID_TOKEN = { success:false, message:"token is invalid" };
export const BODY_USER_NOT_FOUND = { success:false, message:"user not found" };

function respond_with_error<T>(req: Request, res: Response<T>, log_type: LOG_TYPE, t0: number, errtype: ERR_TYPE, errmsg: string): void {
	res.send({ success:false, message:errmsg } as T);
	push_log_entry(req, log_type, t0, errtype);
}

// ==============================
// account management.
// ------------------------------

function generate_salt(): string {
	return "SALT_" + Date.now() + "_";
}
function generate_hash(password:string, salt:string): string {
	return salt + password;
}
export function set_password(user:Partial<Types.User>, password:string) {
	const password_salt = generate_salt();
	const password_hash = generate_hash(password, password_salt);
	user.password_salt = password_salt;
	user.password_hash = password_hash;
}
function is_password_correct(user:Types.User, password:string): boolean {
	return generate_hash(password, user.password_salt) === user.password_hash;
}

export async function account_token_valid(req:Request, res:Response<Types.account_token_valid_response>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_ACCOUNT_TOKEN_VALID;
	const t0 = performance.now();
	// get request params.
	const { user_id, token_hash } = req.body as Types.account_token_valid_request;
	// check if token is valid.
	const valid:boolean = tables.tokens.validate(user_id, token_hash);
	res.send({ valid:valid });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}

export async function account_create(req:Request, res:Response<Types.account_create_response>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_ACCOUNT_CREATE;
	const t0 = performance.now();
	// get request params.
	const { username, nickname, password } = req.body as Types.account_create_request;
	// check if username already taken.
	const exists = await tables.users.findOne_by_username(username);
	if(exists) return respond_with_error(req, res, log_type, t0, ERR_TYPE.USERNAME_TAKEN, "username already taken");
	// create user.
	const new_user:Types.User = { updated:Date.now(), username, nickname, password_salt:null, password_hash:null };
	set_password(new_user, password);
	const user = await tables.users.insertOne(new_user);
	if(!user) return respond_with_error(req, res, log_type, t0, ERR_TYPE.TABLE_INSERT_FAILED, "failed to create user");
	// automatically login new user.
	const token = tables.tokens.generateNewToken(user._id);
	res.send({
		success	: true,
		id		: user._id,
		token	: token.hash,
		nickname: user.nickname,
	});
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}

export async function account_delete(req:Request, res:Response<Types.account_delete_response>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_ACCOUNT_DELETE;
	const t0 = performance.now();
	// get request params.
	const { user_id, password } = req.body as Types.account_delete_request;
	// check if user exists.
	const user = await tables.users.findOne(user_id);
	if(!user) return respond_with_error(req, res, log_type, t0, ERR_TYPE.USER_ID_NOT_FOUND, "user not found");
	// check if password is valid.
	const correct = is_password_correct(user, password);
	if(!correct) return respond_with_error(req, res, log_type, t0, ERR_TYPE.INCORRECT_PASSWORD, "user_id or password is incorrect");
	// automatically login new user.
	const success = await tables.users.deleteOne(user_id);
	if(!success) return respond_with_error(req, res, log_type, t0, ERR_TYPE.TABLE_REMOVE_FAILED, "operation failed");
	res.send({ success:true });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}

export async function account_login(req:Request, res:Response<Types.account_login_response>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_ACCOUNT_LOGIN;
	const t0 = performance.now();
	// get request params.
	const { username, password } = req.body as Types.account_login_request;
	// check if username exists.
	const user = await tables.users.findOne_by_username(username);
	if(!user) return respond_with_error(req, res, log_type, t0, ERR_TYPE.USERNAME_NOT_FOUND, "username or password is incorrect");
	// check if password is valid.
	const correct = is_password_correct(user, password);
	if(!correct) return respond_with_error(req, res, log_type, t0, ERR_TYPE.INCORRECT_PASSWORD, "username or password is incorrect");
	// generate token.
	const token = tables.tokens.generateNewToken(user._id);
	res.send({
		success	: true,
		id		: user._id,
		token	: token.hash,
		nickname: user.nickname,
	});
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}

export async function account_logout(req:Request, res:Response<Types.account_logout_response>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_ACCOUNT_LOGOUT;
	const t0 = performance.now();
	// get request params.
	const { user_id, token_hash } = req.body as Types.account_logout_request;
	// check if token is valid.
	const valid:boolean = tables.tokens.validate(user_id, token_hash);
	if(!valid) return respond_with_error(req, res, log_type, t0, ERR_TYPE.INVALID_TOKEN, "token is invalid");
	// clear token.
	const success = tables.tokens.delete(user_id);
	res.send({ success });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}

export async function account_remove(req:Request, res:Response<Types.account_remove_response>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_ACCOUNT_REMOVE;
	const t0 = performance.now();
	// get request params.
	const { user_id, password } = req.body as Types.account_remove_request;
	// check if user exists.
	const user = await tables.users.findOne(user_id);
	if(!user) return respond_with_error(req, res, log_type, t0, ERR_TYPE.USER_ID_NOT_FOUND, "user not found");
	// check if password is valid.
	const correct = is_password_correct(user, password);
	if(!correct) return respond_with_error(req, res, log_type, t0, ERR_TYPE.INCORRECT_PASSWORD, "password is incorrect");
	// remove user.
	const success = await tables.users.deleteOne(user_id);
	if(!success) return respond_with_error(req, res, log_type, t0, ERR_TYPE.TABLE_REMOVE_FAILED, "operation failed");
	res.send({ success:true });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}

export async function account_update_with_token(req:Request, res:Response<Types.account_update_with_token_response>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_ACCOUNT_UPDATE_T;
	const t0 = performance.now();
	// get request params.
	const { user_id, token_hash, props } = req.body as Types.account_update_with_token_request;
	// check if user exists.
	const user = await tables.users.findOne(user_id);
	if(!user) return respond_with_error(req, res, log_type, t0, ERR_TYPE.USER_ID_NOT_FOUND, "user not found");
	// check if token is valid.
	const valid:boolean = tables.tokens.validate(user_id, token_hash);
	if(!valid) return respond_with_error(req, res, log_type, t0, ERR_TYPE.INVALID_TOKEN, "token is invalid");
	// patch user data.
	const change: Partial<Types.User> = {};
	if(props.nickname && props.nickname !== user.nickname) change.nickname = props.nickname;
	const success = await tables.users.updateOne(user_id, change);
	if(!success) return respond_with_error(req, res, log_type, t0, ERR_TYPE.TABLE_UPDATE_FAILED, "operation failed");
	res.send({ success:true });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}

export async function account_update_with_password(req:Request, res:Response<Types.account_update_with_password_response>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_ACCOUNT_UPDATE_P;
	const t0 = performance.now();
	// get request params.
	const { user_id, password, props } = req.body as Types.account_update_with_password_request;
	// check if user exists.
	const user = await tables.users.findOne(user_id);
	if(!user) return respond_with_error(req, res, log_type, t0, ERR_TYPE.USER_ID_NOT_FOUND, "user not found");
	// check if password is valid.
	const correct = is_password_correct(user, password);
	if(!correct) return respond_with_error(req, res, log_type, t0, ERR_TYPE.INCORRECT_PASSWORD, "password is incorrect");
	// check if new username is taken (if found in props).
	const new_username_taken = props.username && props.username !== user.username && await tables.users.findOne_by_username(props.username);
	if(new_username_taken) return respond_with_error(req, res, log_type, t0, ERR_TYPE.USERNAME_TAKEN, "username already taken");
	// patch user data.
	const change: Partial<Types.User> = {};
	if(props.username && props.username !== user.username) change.username = props.username;
	if(props.nickname && props.nickname !== user.nickname) change.nickname = props.nickname;
	if(props.password) set_password(change, props.password);
	const success = await tables.users.updateOne_silent(user_id, change);
	if(!success) return respond_with_error(req, res, log_type, t0, ERR_TYPE.TABLE_UPDATE_FAILED, "operation failed");
	res.send({ success:true });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}

// ==============================
// users.
// ------------------------------

export async function users_search(req:Request, res:Response<Types.users_search_response>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_USER_SEARCH;
	const t0 = performance.now();
	// get request params.
	const { search_str } = req.body as Types.users_search_request;
	// return search results.
	const user_ids = await tables.users.find_public_search(search_str);
	res.send({ user_ids });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}

// ==============================
// blogs.
// ------------------------------

export async function blogs_insert_post(req:Request, res:Response<Types.blogs_insert_post_response>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_BLOGS_INSERT_POST;
	const t0 = performance.now();
	// get request params.
	const { user_id, token_hash, blog_id, content } = req.body as Types.blogs_insert_post_request;
	// check if token is valid.
	const valid:boolean = tables.tokens.validate(user_id, token_hash);
	if(!valid) return respond_with_error(req, res, log_type, t0, ERR_TYPE.INVALID_TOKEN, "token is invalid");
	// add post.
	const post = await tables.blogs.create_post(user_id, { user_id, blog_id, content });
	if(!post) return respond_with_error(req, res, log_type, t0, ERR_TYPE.TABLE_INSERT_FAILED, "operation failed");
	const postinfo:Types.WithStringId<Types.BlogPost_response> = {
		_id		: post._id,
		blog_id	: post.blog_id,
		user_id	: post.user_id,
		created	: post.created,
		updated	: post.updated,
	};
	res.send({ success:true, postinfo });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}

export async function blogs_update_post(req:Request, res:Response<Types.blogs_update_post_response>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_BLOGS_UPDATE_POST;
	const t0 = performance.now();
	// get request params.
	const { user_id, token_hash, post_id, content } = req.body as Types.blogs_update_post_request;
	// check if token is valid.
	const valid:boolean = tables.tokens.validate(user_id, token_hash);
	if(!valid) return respond_with_error(req, res, log_type, t0, ERR_TYPE.INVALID_TOKEN, "token is invalid");
	// check if post exists.
	const old_post = await tables.blogs.find_post(post_id);
	if(!old_post) return respond_with_error(req, res, log_type, t0, ERR_TYPE.ITEM_NOT_FOUND, "post not found");
	// check if user owns post.
	if(old_post.user_id !== user_id) return respond_with_error(req, res, log_type, t0, ERR_TYPE.UNAUTHORIZED_WRITE, "operation failed");
	// modify post.
	const new_post = await tables.blogs.replace_post(old_post.blog_id, post_id, content);
	if(!new_post) return respond_with_error(req, res, log_type, t0, ERR_TYPE.TABLE_UPDATE_FAILED, "operation failed");
	const postinfo:Types.WithStringId<Types.BlogPost_response> = {
		_id		: new_post._id,
		user_id	: new_post.user_id,
		blog_id	: new_post.blog_id,
		created	: new_post.created,
		updated	: new_post.updated,
	};
	res.send({ success:true, postinfo });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}

export async function blogs_remove_post(req:Request, res:Response<Types.blogs_remove_post_response>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_BLOGS_REMOVE_POST;
	const t0 = performance.now();
	// get request params.
	const { user_id, token_hash, blog_id, post_id } = req.body as Types.blogs_remove_post_request;
	// check if token is valid.
	const valid:boolean = tables.tokens.validate(user_id, token_hash);
	if(!valid) return respond_with_error(req, res, log_type, t0, ERR_TYPE.INVALID_TOKEN, "token is invalid");
	// remove post.
	const success = await tables.blogs.delete_post(blog_id, post_id);
	if(!success) return respond_with_error(req, res, log_type, t0, ERR_TYPE.TABLE_REMOVE_FAILED, "operation failed");
	res.send({ success:true });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}

// ==============================
// notifications.
// ------------------------------

export async function notifs_clear(req:Request, res:Response<Types.notifs_clear_response>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_NOTIFS_CLEAR;
	const t0 = performance.now();
	// get request params.
	const { user_id, token_hash } = req.body as Types.notifs_clear_request;
	// check if token is valid.
	const valid:boolean = tables.tokens.validate(user_id, token_hash);
	if(!valid) return respond_with_error(req, res, log_type, t0, ERR_TYPE.INVALID_TOKEN, "token is invalid");
	// clear notifs.
	const success:boolean = await tables.notifs.clear_notifs(user_id, req.body);
	if(!success) return respond_with_error(req, res, log_type, t0, ERR_TYPE.TABLE_UPDATE_FAILED, "operation failed");
	res.send({ success:true });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}

// ==============================
// get and sync.
// ------------------------------

export async function get_blog_posts(req:Request, res:Response<Types.response_get_blog_posts>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_GET_BLOG_POSTS;
	const t0 = performance.now();
	// get request params.
	const { posts } = req.body as Types.request_get_blog_posts;
	// get items.
	const items = await tables.blogs.find_posts(posts);
	res.send({ success:true, posts:items });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}
export async function get_chat_posts(req:Request, res:Response<Types.response_get_chat_posts>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_GET_CHAT_POSTS;
	const t0 = performance.now();
	// get request params.
	const { posts } = req.body as Types.request_get_chat_posts;
	// get items.
	const items = await tables.chat_posts.findMany(posts);
	res.send({ success:true, posts:items });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}

export async function sync_infos(req:Request, res:Response<Types.response_sync_infos>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_SYNC_INFOS;
	const t0 = performance.now();
	// get request params.
	const { user_id, token_hash, infos, tss } = req.body as Types.request_sync_infos;
	// check if token is valid.
	const valid:boolean = tables.tokens.validate(user_id, token_hash);
	if(!valid) respond_with_error(req, res, log_type, t0, ERR_TYPE.INVALID_TOKEN, "invalid token");
	// get items.
	const items = await tables.users.findMany_sync_public_info(infos, tss);
	res.send({ success:true, changed_infos:items });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}
export async function sync_blogs(req:Request, res:Response<Types.response_sync_blogs>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_SYNC_BLOGS;
	const t0 = performance.now();
	// get request params.
	const { blogs, tss } = req.body as Types.request_sync_blogs;
	// get items.
	const items = await tables.blogs.find_blogs_sync(blogs, tss);
	res.send({ success:true, changed_blogs:items });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}
export async function sync_chats(req:Request, res:Response<Types.response_sync_chats>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_SYNC_CHATS;
	const t0 = performance.now();
	// get request params.
	const { user_id, token_hash, chats, tss } = req.body as Types.request_sync_chats;
	// check if token is valid.
	const valid:boolean = tables.tokens.validate(user_id, token_hash);
	if(!valid) respond_with_error(req, res, log_type, t0, ERR_TYPE.INVALID_TOKEN, "invalid token");
	// get items.
	const items = await tables.chats.get_chats_with_user_sync(chats, tss, user_id);
	res.send({ success:true, changed_chats:items });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}
export async function sync_flist(req:Request, res:Response<Types.response_sync_flist>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_SYNC_FLIST;
	const t0 = performance.now();
	// get request params.
	const { user_id, token_hash, flist } = req.body as Types.request_sync_flist;
	// check if token is valid.
	const valid:boolean = tables.tokens.validate(user_id, token_hash);
	if(!valid) respond_with_error(req, res, log_type, t0, ERR_TYPE.INVALID_TOKEN, "invalid token");
	// get items.
	const item = await tables.friend_lists.findOne_sync([user_id, flist]);
	res.send({ success:true, changed_flist:item });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}
export async function sync_notifs(req:Request, res:Response<Types.response_sync_notifs>): Promise<void> {
	const log_type = LOG_TYPE.FETCH_SYNC_NOTIFS;
	const t0 = performance.now();
	// get request params.
	const { user_id, token_hash, notifs } = req.body as Types.request_sync_notifs;
	// check if token is valid.
	const valid:boolean = tables.tokens.validate(user_id, token_hash);
	if(!valid) respond_with_error(req, res, log_type, t0, ERR_TYPE.INVALID_TOKEN, "invalid token");
	// get items.
	const items = await tables.notifs.findOne_sync([user_id, notifs]);
	res.send({ success:true, changed_notifs:items });
	push_log_entry(req, log_type, t0, ERR_TYPE.SUCCESS);
}


