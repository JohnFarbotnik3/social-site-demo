import {
	Collection,
	Db,
	Filter,
	FindOptions,
	ObjectId,
	OptionalUnlessRequiredId,
	UpdateFilter,
	WithId,
} from "mongodb";
import {
	Chat,
	Friend,
	StringId,
	Token,
	User,
	WithStringId,
    ProjectionFlags,
    FriendList,
    UserInfo,
	TimeStamp,
    NotifList,
    notifs_clear_request,
    Blog,
    BlogPost,
    BlogPost_data,
    ChatPost_data,
    ChatPost,
    WithTimeStamp,
} from "social-site_types/types.js";

// ==============================
// helpers.
// ------------------------------

export function toStringId<T>(item: WithId<T>): WithStringId<T> {
	return { ...item, _id:item._id.toString() };
}

export function toObjectId<T>(item: WithStringId<T>): WithId<T> {
	return { ...item, _id:new ObjectId(item._id) } as WithId<T>;
}

// ==============================
// table instances.
// ------------------------------

export class Tables {
	users		: TableUsers;
	tokens		: TableTokens;
	friend_lists: TableFriends;
	blogs		: TableBlogs;
	chat_posts	: TableChatPosts;
	chats		: TableChats;
	notifs		: TableNotifs;

	constructor(db:Db) {
		this.users			= new TableUsers	(db.collection("users"));
		this.tokens			= new TableTokens	();
		this.friend_lists	= new TableFriends	(db.collection("friends"));
		this.blogs			= new TableBlogs	(db.collection("blogs"), db.collection("blog_posts"));
		this.chat_posts		= new TableChatPosts(db.collection("chat_posts"));
		this.chats			= new TableChats	(db.collection("chats"));
		this.notifs			= new TableNotifs	(db.collection("notifs"));
	}
};

export let tables : Tables;

export function init_tables(db:Db) {
	tables = new Tables(db);
}

// ==============================
// table helper functions.
// ------------------------------

async function find_by_id_1<T>(col: Collection<T>, id: StringId): Promise<WithStringId<T> | null> {
	const filter:Filter<T> = { _id:new ObjectId(id) } as Filter<T>;
	const result = await col.findOne(filter);
	return result ? toStringId(result) : null;
}

async function find_by_id_n<T>(col: Collection<T>, ids: StringId[]): Promise<WithStringId<T>[]> {
	const filter:Filter<T> = { _id:{ $in:ids.map(id => new ObjectId(id)) } } as Filter<T>;
	const options: FindOptions<T> = {};
	const cursor = col.find(filter, options);
	const results = await cursor.toArray() as WithId<T>[];
	return results.map((item) => toStringId(item));
}

async function find_sync_1<T>(col: Collection<WithTimeStamp<T>>, id: StringId, ts: TimeStamp): Promise<WithStringId<WithTimeStamp<T>> | null> {
	const item = await find_by_id_1(col, id);
	if(item.updated !== ts) return item;
	return null;
}

async function find_sync_n<T>(col: Collection<WithTimeStamp<T>>, ids: StringId[], tss: TimeStamp[]): Promise<WithStringId<WithTimeStamp<T>>[]> {
	if(ids.length !== tss.length) return [];
	const items = await find_by_id_n(col, ids);
	const tsmap = new Map<StringId, TimeStamp>();
	for(let x=0;x<ids.length;x++) tsmap.set(ids[x], tss[x]);
	const changed_items: WithStringId<WithTimeStamp<T>>[] = [];
	for(const item of items) if(item.updated !== tsmap.get(item._id)) changed_items.push(item);
	return changed_items;
}

async function insert_1<T>(col: Collection<T>, item: T): Promise<WithStringId<T> | null> {
	const result = await col.insertOne(item as OptionalUnlessRequiredId<T>);
	return result.insertedId ? { ...item, _id:result.insertedId.toString() } as WithStringId<T> : null;
}

async function insert_with_id_1<T>(col: Collection<T>, item: WithStringId<T>): Promise<boolean> {
	const result = await col.insertOne(toObjectId(item) as OptionalUnlessRequiredId<T>);
	return result.acknowledged;
}

async function delete_1<T>(col: Collection<T>, id: StringId): Promise<boolean> {
	const filter:Filter<T> = { _id:new ObjectId(id) } as Filter<T>;
	const result = await col.deleteOne(filter);
	const success = result.deletedCount === 1;
	return success;
}

async function delete_n<T>(col: Collection<T>, ids: StringId[]): Promise<boolean> {
	const filter:Filter<T> = { _id:{ $in:ids.map(id => new ObjectId(id)) } } as Filter<T>;
	const result = await col.deleteMany(filter);
	const success = result.deletedCount === ids.length;
	return success;
}

async function update_1<T>(col: Collection<T>, id:StringId, item:Partial<T>): Promise<boolean> {
	const filter:Filter<T> = { _id:new ObjectId(id) } as Filter<T>;
	const update:UpdateFilter<T> = { $set:item };
	const result = await col.updateOne(filter, update);
	const success = result.modifiedCount === 1;
	return success;
}

async function update_with_ts_1<T>(col: Collection<WithTimeStamp<T>>, id:StringId, item:Partial<WithTimeStamp<T>>): Promise<boolean> {
	(item as WithTimeStamp<Partial<T>>).updated = Date.now();
	return update_1(col, id, item);
}

function array_remove_1<T>(list: T[], filter: T): T[] {
	const filtered = [];
	for(const item of list) if(item !== filter) filtered.push(item);
	return filtered;
}

function array_remove_n<T>(list: T[], filter: T[]): T[] {
	const filtered = [];
	for(const item of list) if(!filter.includes(item)) filtered.push(item);
	return filtered;
}


// ==============================
// table classes.
// ------------------------------

export class Table<T> {
	collection:Collection<T>;

	constructor(collection:Collection<T>) {
		this.collection = collection;
	}

	async findOne(id:StringId): Promise<WithStringId<T> | null> {
		const filter:Filter<T> = { _id:new ObjectId(id) } as Filter<T>;
		const result = await this.collection.findOne(filter);
		return result ? toStringId(result) : null;
	}
	async findMany(ids:StringId[], projection?:ProjectionFlags<WithStringId<T>>): Promise<WithStringId<T>[]> {
		const filter:Filter<T> = { _id:{ $in:ids.map(id => new ObjectId(id)) } } as Filter<T>;
		const options: FindOptions<T> = {};
		if(projection) options.projection = projection;
		const cursor = this.collection.find(filter, options);
		const result = await cursor.toArray();
		return result.map(item => toStringId(item));
	}

	async findOne_sync(pair:[StringId, TimeStamp]): Promise<WithStringId<T> | null> {
		const result = await this.findOne(pair[0]);
		return pair[1] !== (result as any).updated ? result : null;
	}
	async findMany_sync(pairs:[StringId, TimeStamp][], projection?:ProjectionFlags<WithStringId<T>>): Promise<WithStringId<T>[]> {
		const results = await this.findMany(pairs.map(([id, _]) => id), projection);
		const ts_map = new Map<StringId, TimeStamp>(pairs);
		return results.filter((result) => ts_map.get(result._id) !== (result as any).updated);
	}

	async insertOne(item:T): Promise<WithStringId<T> | null> {
		const result = await this.collection.insertOne(item as OptionalUnlessRequiredId<T>);
		return result.insertedId ? { ...item, _id:result.insertedId.toString() } as WithStringId<T> : null;
	}
	async insertOneWithId(item:WithStringId<T>): Promise<boolean> {
		const result = await this.collection.insertOne(toObjectId(item) as OptionalUnlessRequiredId<T>);
		return result.acknowledged;
	}

	/**
		NOTE: some tables may have related items that should be cleaned up before deletion.
	*/
	async deleteOne(id:StringId): Promise<boolean> {
		const filter:Filter<T> = { _id:new ObjectId(id) } as Filter<T>;
		const result = await this.collection.deleteOne(filter);
		const success = result.deletedCount === 1;
		return success;
	}
	/**
		NOTE: some tables may have related items that should be cleaned up before deletion.
		WARNING: I have not yet written "deleteMany" cleanup variants for these tables.
	*/
	async deleteMany(ids:StringId[]): Promise<boolean> {
		const filter:Filter<T> = { _id:{ $in:ids.map(id => new ObjectId(id)) } } as Filter<T>;
		const result = await this.collection.deleteMany(filter);
		const success = result.deletedCount === ids.length;
		return success;
	}

	async updateOne(id:StringId, item:Partial<T>): Promise<boolean> {
		const filter:Filter<T> = { _id:new ObjectId(id) } as Filter<T>;
		const update:UpdateFilter<T> = { $set:item };
		const result = await this.collection.updateOne(filter, update);
		const success = result.modifiedCount === 1;
		return success;
	}

	// https://www.mongodb.com/docs/manual/reference/operator/update/push/
	// https://www.mongodb.com/docs/manual/reference/operator/update/pull/
	async list_insert(id:StringId, entry:object, timestamp:boolean): Promise<boolean> {
		const filter:Filter<T> = { _id:new ObjectId(id) } as Filter<T>;
		const update:UpdateFilter<T> = { $push:entry } as UpdateFilter<T>;
		if(timestamp) update.$set = { updated:Date.now() } as T;
		const result = await this.collection.updateOne(filter, update);
		const success = result.modifiedCount === 1;
		return success;
	}
	async list_remove(id:StringId, match:object, timestamp:boolean): Promise<boolean> {
		const filter:Filter<T> = { _id:new ObjectId(id) } as Filter<T>;
		const update:UpdateFilter<T> = { $pull:match } as UpdateFilter<T>;
		if(timestamp) update.$set = { updated:Date.now() } as T;
		const result = await this.collection.updateOne(filter, update);
		const success = result.modifiedCount === 1;
		return success;
	}

	// TODO: implement Set and Map style functions...
	// TODO: add array variants, for example: set_has_keys(key: K[]): bool[]...
	//async _map_set<K, V>(id:StringId, prop:ProjectionFlags<T>, key:K, value:V) {}

};

export class TableNotifs extends Table<NotifList> {
	async on_friend_insert(user_id:StringId, friend_id:StringId): Promise<void> {
		const record = await this.findOne(user_id);
		const set = new Set(record.friends_added);
		if(set.has(friend_id)) return;
		set.add(friend_id);
		await this.updateOne(user_id, { updated:Date.now(), friends_added:[...set.keys()] });
	}
	async on_friend_remove(user_id:StringId, friend_id:StringId): Promise<void> {
		const record = await this.findOne(user_id);
		const set = new Set(record.friends_removed);
		if(set.has(friend_id)) return;
		set.add(friend_id);
		await this.updateOne(user_id, { updated:Date.now(), friends_removed:[...set.keys()] });
	}
	async on_chat_activity(user_id:StringId, chat_id:StringId): Promise<void> {
		const record = await this.findOne(user_id);
		const set = new Set(record.chat_activity);
		if(set.has(chat_id)) return;
		set.add(chat_id);
		await this.updateOne(user_id, { updated:Date.now(), chat_activity:[...set.keys()] });
	}
	async clear_notifs(user_id:StringId, request:notifs_clear_request): Promise<boolean> {
		const record = await this.findOne(user_id);
		let updates:Partial<NotifList> = {};
		if(request.friends_added) {
			const set = new Set(record.friends_added);
			for(const id of request.friends_added) set.delete(id);
			updates.friends_added = [...set.keys()];
			updates.updated = Date.now();
		}
		if(request.friends_removed) {
			const set = new Set(record.friends_removed);
			for(const id of request.friends_removed) set.delete(id);
			updates.friends_removed = [...set.keys()];
			updates.updated = Date.now();
		}
		if(request.chat_activity) {
			const set = new Set(record.chat_activity);
			for(const id of request.chat_activity) set.delete(id);
			updates.chat_activity = [...set.keys()];
			updates.updated = Date.now();
		}
		if(updates.updated) {
			const result = await this.updateOne(user_id, updates);
			return result;
		}
		return true;
	}
};

export class TableUsers extends Table<User> {

	async findMany_public_info(ids: string[]): Promise<WithStringId<UserInfo>[]> {
		return super.findMany(ids, { _id:1, updated:1, username:1, nickname:1 });
	}
	async findMany_sync_public_info(ids: StringId[], tss: TimeStamp[]): Promise<WithStringId<UserInfo>[]> {
		const users = await find_sync_n(this.collection, ids, tss);
		const infos: WithStringId<UserInfo>[] = [];
		for(const user of users) infos.push({
			_id		: user._id,
			updated	: user.updated,
			username: user.username,
			nickname: user.nickname,
		});
		return infos;
	}

	async insertOne(item: User): Promise<WithStringId<User> | null> {
		// create user.
		const user = await super.insertOne(item);
		// create friends list.
		const flist = await tables.friend_lists.insertOneWithId({ _id:user._id, updated:Date.now(), list:[] });
		// create blog.
		const blog = await tables.blogs.create_blog(user._id);
		// create notification list.
		const notifs = await tables.notifs.insertOneWithId({ _id:user._id, updated:Date.now(), friends_added:[], friends_removed:[], chat_activity:[] });
		// return result.
		return (flist && blog && notifs) ? user : null;
	}

	async deleteOne(id: StringId): Promise<boolean> {
		// cleanup tokens.
		tables.tokens.delete(id);
		// cleanup friends list.
		tables.friend_lists.deleteOne(id);
		// cleanup blog.
		tables.blogs.delete_blog(id);
		// cleanup notifications.
		tables.notifs.deleteOne(id);
		// remove user.
		return super.deleteOne(id);
	}

	async updateOne(id: StringId, item: Partial<User>): Promise<boolean> {
		item.updated = Date.now();
		return super.updateOne(id, item);
	}
	async updateOne_silent(id: StringId, item: Partial<User>): Promise<boolean> {
		return super.updateOne(id, item);
	}

	// TODO - use an index for better performance.
	// https://www.mongodb.com/docs/drivers/node/current/fundamentals/indexes/
	async findOne_by_username(username:string): Promise<WithStringId<User> | null> {
		const result = await this.collection.findOne({ username:username });
		return result ? toStringId(result) : null;
	}

	// TODO: create text-search index.
	// https://www.mongodb.com/docs/manual/core/link-text-indexes/#std-label-text-search-on-premises
	async find_public_search(search_str:string): Promise<StringId[]> {
		const cursor = this.collection.find({}, { projection:{ _id:1, username:1 }});
		if(cursor) {
			const ids:StringId[] = [];
			const str = search_str.toLowerCase();
			for await (const doc of cursor) {
				if(doc.username.toLowerCase().includes(str)) ids.push(doc._id.toString());
				if(ids.length >= 20) { cursor.close(); break; }
			}
			return ids;
		} else {
			return [];
		}
		//return tables.users.find(filter, options).sort({ username:1 }).skip(0).limit(20);
	}

};

export class TableTokens extends Map<StringId, Token> {

	generateNewToken(user_id:StringId, duration:number = 24*3600*1000): Token {
		const token: Token = {
			hash: String(Math.random()),
			date: Date.now() + duration,
		};
		this.set(user_id, token);
		return token;
	}

	validate(user_id:StringId, token_hash:string): boolean {
		if(!this.has(user_id)) return false;
		const token = this.get(user_id);
		return (Date.now() <= token.date) && (token_hash === token.hash);
	}

};

export class TableChatPosts extends Table<ChatPost> {
	async insertOne(item: ChatPost_data, created: TimeStamp = Date.now()): Promise<WithStringId<ChatPost>> {
		return super.insertOne({
			created: created,
			updated: Date.now(),
			user_id: item.user_id,
			chat_id: item.chat_id,
			content: item.content,
		});
	}
};

export class TableBlogs {

	collection_blogs: Collection<Blog>;
	collection_posts: Collection<BlogPost>;

	constructor(
		collection_blogs: Collection<Blog>,
		collection_posts: Collection<BlogPost>,
	) {
		this.collection_blogs = collection_blogs;
		this.collection_posts = collection_posts;
	}

	async find_post(post_id: StringId): Promise<WithStringId<BlogPost> | null> {
		return find_by_id_1(this.collection_posts, post_id);
	}
	async find_posts(post_ids: StringId[]): Promise<WithStringId<BlogPost>[]> {
		return find_by_id_n(this.collection_posts, post_ids);
	}
	async find_blog(blog_id: StringId): Promise<WithStringId<Blog> | null> {
		return find_by_id_1(this.collection_blogs, blog_id);
	}
	async find_blog_sync(blog_id: StringId, ts: TimeStamp): Promise<WithStringId<Blog>> {
		return find_sync_1(this.collection_blogs, blog_id, ts);
	}
	async find_blogs(blog_ids: StringId[]): Promise<WithStringId<Blog>[]> {
		return find_by_id_n(this.collection_blogs, blog_ids);
	}
	async find_blogs_sync(blog_ids: StringId[], tss: TimeStamp[]): Promise<WithStringId<Blog>[]> {
		return find_sync_n(this.collection_blogs, blog_ids, tss);
	}

	async delete_post(blog_id: StringId, post_id: StringId): Promise<boolean> {
		// remove post_ids from blog.
		const blog = await this.find_blog(blog_id);
		if(!blog) return false;
		const result_1 = await update_with_ts_1(this.collection_blogs, blog_id, { post_ids:array_remove_1(blog.post_ids, post_id) });
		if(!result_1) return false;
		// remove posts.
		const result_2 = await delete_1(this.collection_posts, post_id);
		if(!result_2) return false;
		// return success status.
		return true;
	}
	async delete_posts(blog_id: StringId, post_ids: StringId[]): Promise<boolean> {
		// remove post_ids from blog.
		const blog = await this.find_blog(blog_id);
		if(!blog) return false;
		const result_1 = await update_with_ts_1(this.collection_blogs, blog_id, { post_ids:array_remove_n(blog.post_ids, post_ids) });
		// remove posts.
		const result_2 = await delete_n(this.collection_posts, post_ids);
		// return success status.
		return result_1 && result_2;
	}
	async delete_blog(blog_id: StringId): Promise<boolean> {
		// cleanup post_ids.
		const blog = await this.find_blog(blog_id);
		if(!blog) return false;
		const result_1 = await delete_n(this.collection_posts, blog.post_ids);
		// remove blog.
		const result_2 = await delete_1(this.collection_blogs, blog_id);
		// return success status.
		return result_1 && result_2;
	}

	async create_post(blog_id: StringId, item: BlogPost_data, created: TimeStamp = Date.now()): Promise<WithStringId<BlogPost> | null> {
		// create post.
		const post: BlogPost = {
			created: created,
			updated: Date.now(),
			blog_id: blog_id,
			user_id: item.user_id,
			content: item.content,
		};
		const result_1 = await insert_1(this.collection_posts, post);
		if(!result_1) return null;
		// add post to list.
		const blog = await this.find_blog(blog_id);
		if(!blog) return null;
		blog.post_ids.push(result_1._id);
		const result_2 = await update_with_ts_1(this.collection_blogs, blog_id, { post_ids: blog.post_ids });
		if(!result_2) return null;
		// return succes status.
		return result_1;
	}
	async create_blog(user_id: StringId): Promise<WithStringId<Blog> | null> {
		const blog: WithStringId<Blog> = {
			_id		: user_id,
			updated	: Date.now(),
			user_id	: user_id,
			post_ids: [],
		};
		const success = insert_with_id_1(this.collection_blogs, blog);
		return success ? blog : null;
	}

	// NOTE: blog posts are immutable, so we replace an old post with a new post (which inherits its date-created).
	async replace_post(blog_id:StringId, post_id: StringId, content: string): Promise<WithStringId<BlogPost> | null> {
		// replace old post with new post.
		const old_post = await this.find_post(post_id);
		if(!old_post) return null;
		const new_post = await this.create_post(blog_id, { user_id: old_post.user_id, blog_id, content }, old_post.created);
		if(!new_post) return null;
		const success = await this.delete_post(blog_id, old_post._id);
		if(!success) return null;
		return new_post;
	}

};

export class TableChats extends Table<Chat> {

	async deleteOne(chat_id: StringId): Promise<boolean> {
		// cleanup posts.
		const chat = await this.findOne(chat_id);
		tables.chats.deleteMany(chat.post_ids);
		// remove from table.
		return super.deleteOne(chat_id);
	}

	async insertPost(chat_id: StringId, item: ChatPost_data): Promise<WithStringId<ChatPost>> {
		const post = await tables.chat_posts.insertOne(item);
		await this.list_insert(chat_id, { post_ids:post._id }, true);
		return post;
	}

	async is_chat_member(chat_id: StringId, user_id: StringId): Promise<boolean> {
		const chat = await this.findOne(chat_id);
		return chat.user_ids.includes(user_id);
	}
	async get_chats_with_user(chat_ids: StringId[], user_id: StringId): Promise<WithStringId<Chat>[]> {
		const chats = await this.findMany(chat_ids);
		const chats_with_user = [];
		for(const chat of chats) if(chat.user_ids.includes(user_id)) chats_with_user.push(chat);
		return chats_with_user;
	}
	async get_chats_with_user_sync(ids: StringId[], tss: TimeStamp[], user_id: StringId): Promise<WithStringId<Chat>[]> {
		const chats = await find_sync_n(this.collection, ids, tss);
		const chats_with_user = [];
		for(const chat of chats) if(chat.user_ids.includes(user_id)) chats_with_user.push(chat);
		return chats_with_user;
	}

	async get_other_participants(chat_id: StringId, user_id: StringId): Promise<StringId[]> {
		const chat = await tables.chats.findOne(chat_id);
		const other_ids = [];
		for(const id of chat.user_ids) if(id !== user_id) other_ids.push(id);
		return other_ids;
	}

};


export class TableFriends extends Table<FriendList> {

	async deleteOne(user_id: StringId): Promise<boolean> {
		const flist = await this.collection.findOne({ _id:new ObjectId(user_id) });
		// cleanup chats.
		for(const friend of flist.list) if(friend.chat_id) await tables.chats.deleteOne(friend.chat_id);
		// remove from other lists.
		for(const friend of flist.list) await this.list_remove(friend.user_id, { list:{ user_id:user_id } }, true);
		// remove from table.
		return super.deleteOne(user_id);
	}

	async get_friend(user_id:StringId, friend_id:StringId): Promise<Friend | null> {
		const flist = await this.collection.findOne({ _id:new ObjectId(user_id) });
		if(flist) for(const friend of flist.list) if(friend.user_id === friend_id) return friend;
		return null;
	}
	async has_friend(user_id:StringId, friend_id:StringId): Promise<boolean> {
		const friend = await this.get_friend(user_id, friend_id);
		return friend ? true : false;
	}
	async has_friend_chat(user_id:StringId, friend_id:StringId): Promise<boolean> {
		const friend = await this.get_friend(user_id, friend_id);
		return friend.chat_id ? true : false;
	}

	async insert_friend_pair(user_id_a:StringId, user_id_b:StringId): Promise<Friend | null> {
		// check if ids are the same.
		if(user_id_a === user_id_b) return null;
		// check if friend-pair already exists.
		if(await this.has_friend(user_id_a, user_id_b)) return null;
		// create chat.
		const chat = await tables.chats.insertOne({ updated:Date.now(), user_ids:[user_id_a, user_id_b], post_ids:[] });
		// add friend pair.
		const fa:Friend = { user_id:user_id_b, chat_id:chat._id };
		const fb:Friend = { user_id:user_id_a, chat_id:chat._id };
		const a = await this.list_insert(user_id_a, { list:fa }, true);
		const b = await this.list_insert(user_id_b, { list:fb }, true);
		if(!a) throw("A FAILED");
		if(!b) throw("B FAILED");
		return (a && b) ? fa : null;
	}
	async remove_friend_pair(user_id_a:StringId, user_id_b:StringId): Promise<boolean> {
		// check if ids are the same.
		if(user_id_a === user_id_b) return false;
		// check if friend-pair is not in list.
		if(!await this.has_friend(user_id_a, user_id_b)) return false;
		// cleanup chat (if one exists).
		const friend = await this.get_friend(user_id_a, user_id_b);
		if(friend.chat_id) await tables.chats.deleteOne(friend.chat_id);
		// remove from each-others lists.
		const a = await this.list_remove(user_id_a	, { list:{ user_id:user_id_b	} }, true);
		const b = await this.list_remove(user_id_b	, { list:{ user_id:user_id_a	} }, true);
		return a && b;
	}
};


