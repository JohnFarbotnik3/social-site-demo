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
	Post,
	PostData,
	Blog as Blog,
	StringId,
	Token,
	User,
	WithStringId,
    List,
} from "./Types.js";

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
	/** Map<user_id, User> */
	users	: TableUsers;
	/** Map<user_id, Token> */
	tokens	: TableTokens;
	/** Map<user_id, FriendList> */
	friends	: TableFriends;
	/** Map<post_id, Post> */
	posts	: TablePosts;
	/** Map<user_id, PostList> */
	blogs	: TableBlogs;
	/** Map<chat_id, Chat> */
	chats	: TableChats;
	/** Map<user_id, Set<chat_id>> */
	notifs_chat	: TableSet<StringId>;

	constructor(db:Db) {
		this.users		= new TableUsers	(db.collection("users"));
		this.tokens		= new TableTokens	(db.collection("tokens"));
		this.friends	= new TableFriends	(db.collection("friends"));
		this.posts		= new TablePosts	(db.collection("posts"));
		this.blogs		= new TableBlogs	(db.collection("blogs"));
		this.chats		= new TableChats	(db.collection("chats"));
		this.notifs_chat	= new TableSet<StringId>	(db.collection("notifs_chat"));
	}
};

export let tables : Tables;

export function init_tables(db:Db) {
	tables = new Tables(db);
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
	async findMany(ids:string[], projection?:any): Promise<WithStringId<T>[]> {
		const filter:Filter<T> = { _id:{ $in:ids.map(id => new ObjectId(id)) } } as Filter<T>;
		const options: FindOptions<T> = {};
		if(projection) options.projection = { _id:1, ...projection };
		const cursor = this.collection.find(filter, options);
		const result = await cursor.toArray();
		return result.map(item => toStringId(item));
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
	async listInsert(id:StringId, entry:object): Promise<boolean> {
		const filter:Filter<T> = { _id:new ObjectId(id) } as Filter<T>;
		const update:UpdateFilter<T> = { $push:entry } as UpdateFilter<T>;
		const result = await this.collection.updateOne(filter, update);
		const success = result.modifiedCount === 1;
		return success;
	}
	async listRemove(id:StringId, match:object): Promise<boolean> {
		const filter:Filter<T> = { _id:new ObjectId(id) } as Filter<T>;
		const update:UpdateFilter<T> = { $pull:match } as UpdateFilter<T>;
		const result = await this.collection.updateOne(filter, update);
		const success = result.modifiedCount === 1;
		return success;
	}
};

export class TableSet<K> extends Table<List<K>> {

	async set_add(id:StringId, key:K): Promise<boolean> {
		const record = await super.findOne(id);
		const set = new Set<K>(record.list);
		if(set.has(key)) {
			return false;
		} else {
			set.add(key);
			return super.updateOne(id, { list:[...set.keys()] });
		}
	}

	async set_delete(id:StringId, key:K): Promise<boolean> {
		const record = await super.findOne(id);
		const set = new Set<K>(record.list);
		if(!set.has(key)) {
			return false;
		} else {
			set.delete(key);
			return super.updateOne(id, { list:[...set.keys()] });
		}
	}

	async set_clear(id:StringId): Promise<boolean> {
		const record = await super.findOne(id);
		if(record.list.length <= 0) {
			return false;
		} else {
			return super.updateOne(id, { list:[] });
		}
	}

	async set_keys(id:StringId): Promise<K[]> {
		const record = await this.findOne(id);
		return record.list;
	}

};

// TODO: create map table-variant.

export class TableUsers extends Table<User> {

	async insertOne(item: User): Promise<WithStringId<User> | null> {
		// create user.
		const user = await super.insertOne(item);
		// create friends list.
		const flist = await tables.friends.insertOneWithId({ _id:user._id, list:[] });
		// create blog.
		const blog = await tables.blogs.insertOneWithId({ _id:user._id, post_ids:[] });
		// create notification lists.
		const notifs_chat = await tables.notifs_chat.insertOneWithId({ _id:user._id, list:[] });
		// return result.
		return (flist && blog && notifs_chat) ? user : null;
	}

	async deleteOne(id: StringId): Promise<boolean> {
		// cleanup tokens.
		tables.tokens.deleteOne(id);
		// cleanup friends list.
		tables.friends.deleteOne(id);
		// cleanup blog.
		tables.blogs.deleteOne(id);
		// cleanup notifications.
		tables.notifs_chat.deleteOne(id);
		// remove user.
		return super.deleteOne(id);
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

export class TableTokens extends Table<Token> {

	async generateNewToken(user_id:StringId, duration:number = 24*3600*1000): Promise<WithStringId<Token> | null> {
		const token: Token = {
			hash: String(Math.random()),
			date: Date.now() + duration,
		};
		const result = await this.collection.replaceOne({ _id:new ObjectId(user_id) }, token, { upsert:true });
		return result?.acknowledged ? { _id:user_id, ...token } : null;
	}

	async validate(user_id:StringId, token_hash:string): Promise<boolean> {
		const token = await this.collection.findOne({ _id:new ObjectId(user_id) });
		if(!token) return false;
		return (Date.now() <= token.date) && (token_hash === token.hash);
	}

};

export class TablePosts extends Table<Post> {

	async insertOne(item:PostData ): Promise<WithStringId<Post>> {
		return super.insertOne({
			user_id:item.user_id,
			created:Date.now(),
			updated:Date.now(),
			content:item.content,
		});
	}

	async updateOne(id:StringId, item:Partial<Post>): Promise<boolean> {
		item.updated = Date.now();
		return super.updateOne(id, item);
	}

};

export class TableBlogs extends Table<Blog> {

	async deleteOne(id:StringId): Promise<boolean> {
		// cleanup posts.
		const blog = await this.findOne(id);
		tables.posts.deleteMany(blog.post_ids);
		// remove from table.
		return super.deleteOne(id);
	}

	async insertPost(id:StringId, item:PostData): Promise<WithStringId<Post> | null> {
		// create post.
		const post = await tables.posts.insertOne(item);
		// add to post_id to list.
		const success = await this.listInsert(id, { post_ids:post._id });
		return success ? post : null;
	}

	async deletePost(id:StringId, post_id:StringId): Promise<boolean> {
		// remove post.
		const a = await tables.posts.deleteOne(post_id);
		// add to post_id to list.
		const b = await this.listRemove(id, { post_ids:post_id });
		return a && b;
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

	async insertPost(chat_id: StringId, item: PostData): Promise<WithStringId<Post>> {
		// create post.
		const post = await tables.posts.insertOne(item);
		// add to post_id to chat.
		await this.listInsert(chat_id, { post_ids:post._id });
		// notify other chat participants.
		const chat = await this.findOne(chat_id);
		for(const user_id of chat.user_ids) if(user_id !== item.user_id) await tables.notifs_chat.set_add(user_id, chat_id);
		// return new post.
		return post;
	}

};

export class TableFriends extends Table<List<Friend>> {

	async deleteOne(user_id: StringId): Promise<boolean> {
		const flist = await this.collection.findOne({ _id:new ObjectId(user_id) });
		// cleanup chats.
		for(const friend of flist.list) if(friend.chat_id) await tables.chats.deleteOne(friend.chat_id);
		// remove from other lists.
		for(const friend of flist.list) await this.listRemove(friend.user_id, { list:{ user_id:user_id } });
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
	async insert_friend_pair(user_id:StringId, friend_id:StringId, chat_id?:StringId): Promise<boolean> {
		const a = await this.listInsert(user_id		, { list:{ user_id:friend_id, chat_id:chat_id ?? null } });
		const b = await this.listInsert(friend_id	, { list:{ user_id:user_id	, chat_id:chat_id ?? null } });
		if(!a) throw("A FAILED");
		if(!b) throw("B FAILED");
		return a && b;
	}
	async remove_friend_pair(user_id:StringId, friend_id:StringId): Promise<boolean> {
		// cleanup chat (if one exists).
		const friend = await this.get_friend(user_id, friend_id);
		if(friend.chat_id) await tables.chats.deleteOne(friend.chat_id);
		// remove from each-others lists.
		const a = await this.listRemove(user_id		, { list:{ user_id:friend_id	} });
		const b = await this.listRemove(friend_id	, { list:{ user_id:user_id		} });
		return a && b;
	}
	async create_friend_chat(user_id:StringId, friend_id:StringId): Promise<WithStringId<Chat> | null> {
		// create chat.
		const chat = await tables.chats.insertOne({ user_ids:[user_id, friend_id], post_ids:[] });
		// replace friend entry in each-others lists.
		const a = await this.remove_friend_pair(user_id, friend_id);
		const b = await this.insert_friend_pair(user_id, friend_id, chat._id);
		return a && b ? chat : null;
	}

};


