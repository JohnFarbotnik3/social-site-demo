
//export const hostname = "[::1]";
//export const hostname = "localhost";
//export const port_https = 5443;
const api_prefix = "/api";

export const ENDPOINTS = {
	ws_chat	: api_prefix + "/ws_chat",
	ws_user	: api_prefix + "/ws_user",
	// account.
	account_token_valid	: api_prefix + "/account_token_valid",
	account_create		: api_prefix + "/account_create",
	account_delete		: api_prefix + "/account_delete",
	account_login		: api_prefix + "/account_login",
	account_logout		: api_prefix + "/account_logout",
	account_remove		: api_prefix + "/account_remove",
	account_update_t	: api_prefix + "/account_update_t",
	account_update_p	: api_prefix + "/account_update_p",
	// content - GET and SYNC.
	get_blog_posts	: api_prefix + "/get_blog_posts",
	get_chat_posts	: api_prefix + "/get_chat_posts",
	sync_blogs		: api_prefix + "/sync_blogs",
	sync_infos		: api_prefix + "/sync_infos",
	sync_chats		: api_prefix + "/sync_chats",
	sync_flist		: api_prefix + "/sync_flist",
	sync_notifs		: api_prefix + "/sync_notifs",
	// search.
	users_search		: api_prefix + "/users_search",
	// blogs.
	blogs_insert_post	: api_prefix + "/blogs_insert_post",
	blogs_remove_post	: api_prefix + "/blogs_remove_post",
	blogs_update_post	: api_prefix + "/blogs_update_post",
	// notifs.
	notifs_clear		: api_prefix + "/notifs_clear",
};
