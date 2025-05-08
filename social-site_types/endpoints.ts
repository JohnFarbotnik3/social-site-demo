
//export const hostname = "[::1]";
//export const hostname = "localhost";
//export const port_https = 5443;
const url_prefix = "";

export const ENDPOINTS = {
	ws_chat	: url_prefix + "/ws_chat",
	ws_user	: url_prefix + "/ws_user",
	// account.
	account_token_valid	: url_prefix + "/account_token_valid",
	account_create		: url_prefix + "/account_create",
	account_delete		: url_prefix + "/account_delete",
	account_login		: url_prefix + "/account_login",
	account_logout		: url_prefix + "/account_logout",
	account_remove		: url_prefix + "/account_remove",
	account_update_t	: url_prefix + "/account_update_t",
	account_update_p	: url_prefix + "/account_update_p",
	// content - GET and SYNC.
	get_blog_posts	: url_prefix + "/get_blog_posts",
	get_chat_posts	: url_prefix + "/get_chat_posts",
	sync_blogs		: url_prefix + "/sync_blogs",
	sync_infos		: url_prefix + "/sync_infos",
	sync_chats		: url_prefix + "/sync_chats",
	sync_flist		: url_prefix + "/sync_flist",
	sync_notifs		: url_prefix + "/sync_notifs",
	// search.
	users_search		: url_prefix + "/users_search",
	// blogs.
	blogs_insert_post	: url_prefix + "/blogs_insert_post",
	blogs_remove_post	: url_prefix + "/blogs_remove_post",
	blogs_update_post	: url_prefix + "/blogs_update_post",
	// notifs.
	notifs_clear		: url_prefix + "/notifs_clear",
};
