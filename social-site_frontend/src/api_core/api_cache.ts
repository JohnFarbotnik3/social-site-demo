import { NONE_TIMESTAMP, type Blog, type BlogPost, type Chat, type ChatPost, type Friend, type NotifList, type StringId, type TimeStamp, type Token, type UserInfo, type WithStringId } from "backend_api_types/types";

export type LocalUser = {
	id		: StringId,
	token	: string,
	username: string,
	nickname: string,
};

export class API_cache {

	// login info.
	user_id		: StringId | null = null;
	token		: Token | null = null;

	is_logged_in() {
		return (this.user_id !== null) && (this.token !== null);
	}

	// cached content.
	user_infos	: Map<StringId, WithStringId<UserInfo>>	= new Map();
	blogs		: Map<StringId, WithStringId<Blog>>		= new Map();
	blog_posts	: Map<StringId, WithStringId<BlogPost>>	= new Map();
	chats		: Map<StringId, WithStringId<Chat>>		= new Map();
	chat_posts	: Map<StringId, WithStringId<ChatPost>>	= new Map();
	friends		: Map<StringId, Friend>	= new Map();
	friends_ts	: TimeStamp				= NONE_TIMESTAMP;
	notifs		: NotifList		= { updated:NONE_TIMESTAMP, friends_added:[], friends_removed:[], chat_activity:[] };

	// backing storage.
	// TODO

	// callbacks for cache changes.
	// TODO
};


