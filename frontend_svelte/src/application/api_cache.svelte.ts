import { SvelteMap } from "svelte/reactivity";
import {
    type Blog,
	type BlogPost,
	type Chat,
	type ChatPost,
	type Friend,
	type FriendList,
	type NotifList,
	type StringId,
	type UserInfo,
	type WithStringId,
	NONE_TIMESTAMP,
} from "backend_api_types/types.js";

/*
	the primary objective of this cache is to reduce traffic
	by avoiding transmission of resources that the frontend has already recieved in the past.

	using notifications, websocket-messages, and locally produced content to manually update local cache-state
	would allow approaching the theoretical minimum amount of data transmitted / requests made;
	the only issue is that complexity sharply increases the closer we get to said theoretical minimum.
*/

export type LocalUser = {
	id		: StringId,
	token	: string,
	username: string,
	nickname: string,
};

type Cache = {
	user		: LocalUser | null,
	blogs		: SvelteMap<StringId, WithStringId<Blog>>;
	blog_posts	: SvelteMap<StringId, WithStringId<BlogPost>>;
	chats		: SvelteMap<StringId, WithStringId<Chat>>;
	chat_posts	: SvelteMap<StringId, WithStringId<ChatPost>>;
	infos		: SvelteMap<StringId, WithStringId<UserInfo>>;
	friends		: FriendList;
	notifs		: NotifList;
};
export const cache = $state<Cache>({
	user		: null,
	blogs		: new SvelteMap(),
	blog_posts	: new SvelteMap(),
	chats		: new SvelteMap(),
	chat_posts	: new SvelteMap(),
	infos		: new SvelteMap(),
	friends		: { updated:NONE_TIMESTAMP, list:[] },
	notifs		: { updated:NONE_TIMESTAMP, friends_added:[], friends_removed:[], chat_activity:[] },
});

// User - LocalStorage + cache operations.
// TODO: investigate if this is an easy target for browser extensions (and perhaps XSS) to steal user tokens.
const local_user_storage_key = "local_user";
export function local_user_set(user:LocalUser) {
	cache.user = user;
	localStorage.setItem(local_user_storage_key, JSON.stringify(user));
}
export function local_user_get(): LocalUser | null {
	const item = localStorage.getItem(local_user_storage_key);
	return item ? JSON.parse(item) : null;
}
export function local_user_patch(props:Partial<LocalUser>) {
	if(!cache.user) throw("user is null");
	if(props.id			) cache.user.id			= props.id;
	if(props.token		) cache.user.token		= props.token;
	if(props.username	) cache.user.username	= props.username;
	if(props.nickname	) cache.user.nickname	= props.nickname;
	localStorage.setItem(local_user_storage_key, JSON.stringify(cache.user));
}
export function local_user_clear() {
	cache.user = null;
	localStorage.removeItem(local_user_storage_key);
}

// helpers: some content is cleared when logging out.
export function cache_on_logout() {
	// clear some caches which shouldnt persist (for local security).
	cache.chats.clear();
	cache.chat_posts.clear();
	cache.friends	= { updated:NONE_TIMESTAMP, list:[] };
	cache.notifs	= { updated:NONE_TIMESTAMP, friends_added:[], friends_removed:[], chat_activity:[] };
}

// helpers: blog - insert, remove, update.
export function cache_on_blog_insert_post(blog_id:StringId, post:WithStringId<BlogPost>) {
	const blog = cache.blogs.get(blog_id);
	if(!blog) throw("no blog");
	blog.post_ids.push(post._id);
	cache.blogs.set(blog_id, {...blog});
	cache.blog_posts.set(post._id, post);
}
export function cache_on_blog_update_post(blog_id:StringId, old_post_id:StringId, new_post:WithStringId<BlogPost>) {
	// replace old post with new post.
	cache.blog_posts.delete(old_post_id);
	cache.blog_posts.set(new_post._id, new_post);
	// update blog post-list.
	const blog = cache.blogs.get(blog_id);
	if(!blog) throw("no blog");
	const id_set = new Set(blog.post_ids);
	id_set.delete(old_post_id);
	id_set.add(new_post._id);
	blog.post_ids = [...id_set.keys()];
	cache.blogs.set(blog_id, {...blog});
}
export function cache_on_blog_remove_post(blog_id:StringId, post_id:StringId) {
	const blog = cache.blogs.get(blog_id);
	if(!blog) throw("no blog");
	blog.post_ids = blog.post_ids.filter((id: StringId) => id !== post_id);
	cache.blogs.set(blog_id, {...blog});
	cache.blog_posts.delete(post_id);
}

// helpers: get.
export function is_logged_in() {
	return cache.user ? true : false;
}
export function get_friends(): Friend[] {
	return cache.friends.list;
}
export function get_friend_info(friend_id: StringId): UserInfo | undefined {
	return cache.infos.get(friend_id);
}
export function can_add_friend(friend_id: StringId) {
	if(!cache.user) throw("no user");
	const is_me = friend_id === cache.user.id;
	const already_friend = cache.friends.list.find((friend: Friend) => friend.user_id === friend_id);
	return !is_me && !already_friend;
}
export function has_new_chats(chat_id: StringId) {
	return cache.notifs.chat_activity.includes(chat_id);
}
export function get_friend_notifs() {
	const add_ids = cache.notifs.friends_added;
	const rem_ids = cache.notifs.friends_removed;
	return [add_ids, rem_ids];
}
export function get_chat_contents(chat_id: StringId) {
	const chat = cache.chats.get(chat_id);
	if(!chat) throw("chat is " + JSON.stringify(chat));
	const infos: WithStringId<UserInfo>[] = [];
	const posts: WithStringId<ChatPost>[] = [];
	for(const id of chat.user_ids) { const info = cache.infos		.get(id); if(info) infos.push(info); else throw("no info: "+JSON.stringify({ id, info })); }
	for(const id of chat.post_ids) { const post = cache.chat_posts	.get(id); if(post) posts.push(post); else throw("no post: "+JSON.stringify({ id, post })); }
	return { infos, posts };
}
export function get_blog_contents(user_id: StringId) {
	const blog		= cache.blogs.get(user_id);
	const info		= cache.infos.get(user_id);
	const posts		= blog?.post_ids.map((id: StringId) => cache.blog_posts.get(id)) ?? [];
	return { blog, info, posts };
}
export function is_my_user_id(user_id: StringId) {
	return user_id === cache.user?.id;
}


