
// ============================================================
// base types.
// ------------------------------------------------------------

// original code from MongoDB.WithId
export declare type StringId = string;
export declare type EnhancedOmit<TRecordOrUnion, KeyUnion> = string extends keyof TRecordOrUnion ? TRecordOrUnion : TRecordOrUnion extends any ? Pick<TRecordOrUnion, Exclude<keyof TRecordOrUnion, KeyUnion>> : never;
export declare type WithStringId<TSchema> = EnhancedOmit<TSchema, '_id'> & { _id: StringId; };

// https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
export type ProjectionFlags<Type> = {
  [Property in keyof Type]?: 1 | -1;
};

// timestamp format.
export declare type TimeStamp = number;
export const NONE_TIMESTAMP = 0;
export declare type WithTimeStamp<TSchema> = EnhancedOmit<TSchema, 'updated'> & { updated: TimeStamp; };

/** a direct list of items. */
export type List<T> = {
	list: T[];
};

// WARNING: in a production setting, this type definition should not be available to the frontend.
export type User = {
	/** timestamp of most recent update. */
	updated			: TimeStamp;
	/** internal name of user (unique). */
	username		: string;
	/** user's display name. */
	nickname		: string;
	// WARNING: security - do not update timestamp when changing password.
	/** random value for generating unique password hashes. */
	password_salt	: string;
	/** output from hashing together provided password and per-user password-salt. */
	password_hash	: string;
};
export type UserPatch_t = {
	nickname		: string;
};
export type UserPatch_p = {
	username		: string;
	nickname		: string;
	password		: string;
};
export type UserInfo = {
	updated			: TimeStamp;
	username		: string;
	nickname		: string;
};

export type Token = {
	/** a random value that should be very unlikely to guess at random.*/
	hash	: string;
	/** expirey date of token. */
	date	: number;
};

export type Blog = {
	/** timestamp of most recent update. */
	updated	: TimeStamp;
	/** user_id of owner. */
	user_id	: StringId;
	/** post ids. */
	post_ids: StringId[];
};
export type BlogPost = {
	/** timestamp of most recent update. */
	updated	: TimeStamp;
	/** date created. */
	created	: TimeStamp;
	/** ID of blog this post belongs to. */
	blog_id	: StringId;
	/** ID of user who created this post. */
	user_id	: StringId;
	/** content of post. */
	content	: string;
};
export type BlogPost_data = {
	user_id	: StringId;
	blog_id	: StringId;
	content	: string;
};
export type BlogPost_response = {
	updated	: TimeStamp;
	created	: TimeStamp;
	blog_id	: StringId;
	user_id	: StringId;
};

export type Chat = {
	/** timestamp of most recent update. */
	updated		: TimeStamp;
	/** set of users who are currently members of this chat. */
	user_ids	: StringId[];
	/** set of posts belonging to this chat. */
	post_ids	: StringId[];
};
export type ChatPost = {
	/** timestamp of most recent update. */
	updated	: TimeStamp;
	/** date created. */
	created	: TimeStamp;
	/** ID of user who created this post. */
	user_id	: StringId;
	/** ID of chat this post belongs to. */
	chat_id	: StringId;
	/** content of post. */
	content	: string;
};
export type ChatPost_data = {
	user_id	: StringId;
	chat_id	: StringId;
	content	: string;
};
export type ChatPost_response = {
	updated	: TimeStamp;
	created	: TimeStamp;
	user_id	: StringId;
	chat_id	: StringId;
};


export type Friend = {
	/** user_id of friend. */
	user_id : StringId;
	/** chat_id of group-chat associated with friend. */
	chat_id	: StringId;
};
export type FriendList = {
	/** timestamp of most recent update. */
	updated	: TimeStamp;
	/** map of friends. */
	list	: Friend[];
};

export type NotifList = {
	/** timestamp of most recent update. */
	updated			: TimeStamp;
	friends_added	: StringId[];
	friends_removed	: StringId[];
	chat_activity	: StringId[];
};

// ============================================================
// API request-response types.
// ------------------------------------------------------------

export type error_response = {
	success	: false;
	message	: string;
};

export type with_token = {
	user_id		: StringId;
	token_hash	: string;
};

export type account_token_valid_request = {
	user_id		: string;
	token_hash	: string;
};
export type account_token_valid_response = {
	valid	: true | false;
};

export type account_create_request = {
	username: string;
	nickname: string;
	password: string;
};
export type account_create_response = error_response | {
	success	: true;
	id		: StringId;
	token	: string;
	nickname: string;
};

export type account_delete_request = {
	user_id	: StringId;
	password: string;
};
export type account_delete_response = error_response | {
	success	: true;
};

export type account_login_request = {
	username: string;
	password: string;
};
export type account_login_response = error_response | {
	success	: true;
	id		: StringId;
	token	: string;
	nickname: string;
};

export type account_logout_request = {
	user_id		: StringId;
	token_hash	: string;
};
export type account_logout_response = {
	success	: boolean;
	message?: string;
};

export type account_remove_request = {
	user_id		: StringId;
	password	: string;
};
export type account_remove_response = {
	success	: boolean;
	message?: string;
};

export type account_update_with_token_request = {
	user_id		: StringId;
	token_hash	: string;
	props		: Partial<UserPatch_t>;
};
export type account_update_with_token_response = {
	success	: boolean;
	message?: string;
};

export type account_update_with_password_request = {
	user_id		: StringId;
	password	: string;
	props		: Partial<UserPatch_p>;
};
export type account_update_with_password_response = {
	success	: boolean;
	message?: string;
};

export type users_search_request = {
	search_str: string;
};
export type users_search_response = {
	user_ids: StringId[];
};

export type blogs_insert_post_request = {
	user_id		: StringId;
	token_hash	: string;
	blog_id		: StringId;
	content		: string;
};
export type blogs_insert_post_response = error_response | {
	success	: true;
	postinfo: WithStringId<BlogPost_response>;
};

export type blogs_remove_post_request = {
	user_id		: StringId;
	token_hash	: string;
	blog_id		: StringId;
	post_id		: StringId;
};
export type blogs_remove_post_response = error_response | {
	success	: true;
};

export type blogs_update_post_request = {
	user_id		: StringId;
	token_hash	: string;
	blog_id		: StringId;
	post_id		: StringId;
	content		: string;
};
export type blogs_update_post_response = error_response | {
	success	: true;
	postinfo: WithStringId<BlogPost_response>;
};

export type notifs_clear_request = {
	user_id		: StringId;
	token_hash	: string;
	friends_added	?: StringId[];
	friends_removed	?: StringId[];
	chat_activity	?: StringId[];
};
export type notifs_clear_response = error_response | {
	success: true;
};

export type request_get_blog_posts	= { posts	: StringId[]; };
export type request_get_chat_posts	= { posts	: StringId[]; } & with_token;
export type request_sync_infos		= { infos	: StringId[], tss:TimeStamp[]; } & with_token;
export type request_sync_blogs		= { blogs	: StringId[], tss:TimeStamp[]; };
export type request_sync_chats		= { chats	: StringId[], tss:TimeStamp[]; } & with_token;
export type request_sync_flist		= { flist	: TimeStamp; } & with_token;
export type request_sync_notifs		= { notifs	: TimeStamp; } & with_token;

export type response_get_blog_posts	= error_response | { success: true; posts	: WithStringId<BlogPost>[]; };
export type response_get_chat_posts	= error_response | { success: true; posts	: WithStringId<ChatPost>[]; };
export type response_sync_infos		= error_response | { success: true; changed_infos	: WithStringId<UserInfo>[]; };
export type response_sync_blogs		= error_response | { success: true; changed_blogs	: WithStringId<Blog>[]; };
export type response_sync_chats		= error_response | { success: true; changed_chats	: WithStringId<Chat>[]; };
export type response_sync_flist		= error_response | { success: true; changed_flist	: null | WithStringId<FriendList>; };
export type response_sync_notifs	= error_response | { success: true; changed_notifs	: null | WithStringId<NotifList>; };

// ==============================
// websockets.
// ------------------------------

// https://www.typescriptlang.org/docs/handbook/enums.html

export enum WS_CLOSE_CODE {
	TEST = 3000,
	SERVER_ERROR,
	WRONG_DATA_TYPE,
	FAILED_TO_PARSE_MESSAGE,
	INVALID_TOKEN,
	NOT_AUTHORIZED_TO_ACCESS,
	ALREADY_COMPLETED_SETUP,
};

export enum WS_MESSAGE_TYPE {
	USER_LOGIN,
	USER_LOGIN_RESPONSE,
	CHAT_LOGIN,
	CHAT_LOGIN_RESPONSE,
	FRIEND_ADD,
	FRIEND_ADD_RESPONSE,
	FRIEND_ADD_NOTIF,
	FRIEND_REM,
	FRIEND_REM_RESPONSE,
	FRIEND_REM_NOTIF,
	CHAT_ADD_POST,
	CHAT_ADD_POST_RESPONSE,
	CHAT_ADD_POST_EVENT,
	CHAT_ACTIVITY_NOTIF,
};

export type WS_REQUEST_ID = number;

export type ws_message = {
	/** message type. */
	mtype	: WS_MESSAGE_TYPE;
};

export type ws_request<M_TYPE, PROPS> = {
	/** message type. */
	mtype		: M_TYPE;
	/** id for correlating requests and responses. */
	req_id		: WS_REQUEST_ID;
} & PROPS;

export type ws_response<M_TYPE, PROPS> = {
	/** message type. */
	mtype		: M_TYPE;
	/** id for correlating requests and responses. */
	req_id		: WS_REQUEST_ID;
	success		: false;
	message		: string;
} | ({
	/** message type. */
	mtype		: M_TYPE;
	/** id for correlating requests and responses. */
	req_id		: WS_REQUEST_ID;
	success		: true;
} & PROPS);

export type ws_user_login			= ws_request <WS_MESSAGE_TYPE.USER_LOGIN, { token_hash: string; user_id: StringId; }>;
export type ws_user_login_response	= ws_response<WS_MESSAGE_TYPE.USER_LOGIN_RESPONSE, {}>;

export type ws_chat_login			= ws_request <WS_MESSAGE_TYPE.CHAT_LOGIN, { token_hash: string; user_id: StringId; chat_id: StringId; }>;
export type ws_chat_login_response	= ws_response<WS_MESSAGE_TYPE.CHAT_LOGIN_RESPONSE, {}>;

export type ws_user_friend_add			= ws_request <WS_MESSAGE_TYPE.FRIEND_ADD, { friend_id: StringId; }>;
export type ws_user_friend_add_response	= ws_response<WS_MESSAGE_TYPE.FRIEND_ADD_RESPONSE, { friend:Friend }>;
export type ws_user_friend_add_notif	= {
	mtype		: WS_MESSAGE_TYPE.FRIEND_ADD_NOTIF;
	friend		: Friend;
};

export type ws_user_friend_rem			= ws_request <WS_MESSAGE_TYPE.FRIEND_REM, { friend_id: StringId; }>;
export type ws_user_friend_rem_response	= ws_response<WS_MESSAGE_TYPE.FRIEND_REM_RESPONSE, { friend_id:StringId; }>;
export type ws_user_friend_rem_notif	= {
	mtype		: WS_MESSAGE_TYPE.FRIEND_REM_NOTIF;
	friend_id	: StringId;
};

export type ws_chat_add_post			= ws_request <WS_MESSAGE_TYPE.CHAT_ADD_POST, { content: string; }>;
export type ws_chat_add_post_response	= ws_response<WS_MESSAGE_TYPE.CHAT_ADD_POST_RESPONSE, { post: WithStringId<ChatPost>; }>;
export type ws_chat_add_post_event		= {
	mtype	: WS_MESSAGE_TYPE.CHAT_ADD_POST_EVENT;
	post	: WithStringId<ChatPost>;
};

export type ws_chat_activity_notif		= {
	mtype		: WS_MESSAGE_TYPE.CHAT_ACTIVITY_NOTIF;
	chat_id		: StringId;
};





