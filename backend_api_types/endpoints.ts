
//export const hostname = "[::1]";
export const hostname = "localhost";
export const port_https = 5443;

export const ENDPOINTS = {
	ws_chat	: "/ws_chat",
	ws_user	: "/ws_user",
	// account.
	account_token_valid	: "/account_token_valid",
	account_create		: "/account_create",
	account_delete		: "/account_delete",
	account_login		: "/account_login",
	account_logout		: "/account_logout",
	account_remove		: "/account_remove",
	account_update_t	: "/account_update_t",
	account_update_p	: "/account_update_p",
	// content - GET and SYNC.
	get_blog_posts	: "/get_blog_posts",
	get_chat_posts	: "/get_chat_posts",
	sync_blogs		: "/sync_blogs",
	sync_infos		: "/sync_infos",
	sync_chats		: "/sync_chats",
	sync_flist		: "/sync_flist",
	sync_notifs		: "/sync_notifs",
	// search.
	users_search		: "/users_search",
	// blogs.
	blogs_insert_post	: "/blogs_insert_post",
	blogs_remove_post	: "/blogs_remove_post",
	blogs_update_post	: "/blogs_update_post",
	// notifs.
	notifs_clear		: "/notifs_clear",
};
