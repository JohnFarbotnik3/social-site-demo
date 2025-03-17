
// ============================================================
// API tables.
// ------------------------------------------------------------

// basic user data.
export class User {
	constructor(_id, username, nickname, password_salt, password_hash) {
		this._id			= _id;
		this.username		= username;
		this.nickname		= nickname;
		this.password_salt	= password_salt;
		this.password_hash	= password_hash;
	}
};
export class Users {
	// Map<user_id, User>
	static table = new Map();
	static NEXT_ID = 0;

	// ==============================
	// table operations.
	// ------------------------------

	static has(id) {
		return this.table.has(id);
	}
	static get(id) {
		return this.table.get(id);
	}
	static create(username, nickname, password) {
		const password_salt = "SALT_";
		const password_hash = this.compute_hash(password, password_salt);
		const user = new User(this.NEXT_ID++, username, nickname, password_salt, password_hash);
		this.table.set(user._id, user);
		// create related lists.
		FriendLists.create(user._id);
		FriendChats.create(user._id);
		return user;
	}
	static delete(id) {
		// cleanup related lists.
		Tokens.delete(id);
		FriendLists.delete(id);
		FriendChats.delete(id);
		this.table.delete(id);
	}
	static update(id, props, with_password) {
		const user = this.table.get(id);
		if(props.username) user.username = props.username;
		if(props.nickname) user.nickname = props.nickname;
		if(with_password) {
			if(props.password) {
				user.password_salt = "NEW_SALT_";
				user.password_hash = this.compute_hash(props.password, user.password_salt);
			}
		}
		this.table.set(id, user);
		return user;
	}

	// ==============================
	// extra functions.
	// ------------------------------

	// WARNING: in production, an index should be used for this.
	static get_by_username(username) {
		for(const [id, user] of this.table.entries()) if(user.username === username) return user;
		return null;
	}
	static compute_hash(password, user_salt) {
		return user_salt + password;
	}
	static validate_password(user, password) {
		return this.compute_hash(password, user.password_salt) === user.password_hash;
	}
	static get_public_info(id) {
		const user = this.table.get(id);
		if(!user) return null;
		return {
			id:			user._id,
			username:	user.username,
			nickname:	user.nickname,
		};
	}
	static search(str) {
		// only check equality when search string is short.
		if(str.length <= 2) {
			const user = this.get_by_username(str);
			if(user)	return [user._id];
			else		return [];
		}
		// search for all usernames containing substring.
		const list = [];
		for(const [id, user] of table_users.entries()) {
			if(user.username.includes(search_str)) list.push(id);
			// NOTE: in mongoDB, early exit requires closing cursor to free resources.
			if(list.length > 20) break;
		}
		return list;
	}


};

// tokens are used for accessing user data.
export class Token {
	constructor(_id, duration) {
		this._id	= _id;
		this.hash	= String(Math.random());
		this.date	= Date.now() + duration;
	}
};
export class Tokens {
	// Map<user_id, Token>
	static table = new Map();

	// ==============================
	// table operations.
	// ------------------------------

	static get(user_id) {
		return this.table.get(user_id);
	}
	static delete(user_id) {
		this.table.delete(user_id);
	}

	// ==============================
	// extra functions.
	// ------------------------------

	static validate_token(user_id, token_hash) {
		const token = this.table.get(user_id);
		return token && (Date.now() <= token.date) && (token_hash === token.hash);
	}

	static generate_new_token(user_id) {
		const token = new Token(user_id, 3600*24);
		this.table.set(user_id, token);
		return token;
	}

};

// posts can be added to user-pages, as well as chats.
export class Post {
	constructor(_id, user_id, body) {
		this._id		= _id;
		this.user_id	= user_id;
		this.body		= body;
		this.created	= Date.now();
		this.modified	= Date.now();
	}
};
export class Posts {
	// Map<post_id, Post>
	static table = new Map();
	static NEXT_ID = 0;

	// ==============================
	// table operations.
	// ------------------------------

	static has(id) {
		return this.table.has(id);
	}
	static get(id) {
		return this.table.get(id);
	}
	static delete(id) {
		return this.table.delete(id);
	}
	static create(user_id, body) {
		const post = new Post(this.NEXT_ID++, user_id, body);
		this.table.set(post._id, post);
		return post;
	}
	static update(id, body) {
		const post = this.table.get(id);
		post.body = body;
		post.modified = Date.now();
		this.table.set(id, post);
		return post;
	}
	static get_multiple(ids) {
		const posts = [];
		for(const id of ids) posts.push(this.table.get(id) ?? null);
		return posts;
	}
	static delete_multiple(ids) {
		// TODO
	}

	// ==============================
	// extra functions.
	// ------------------------------

	// WARNING: in production, an index (or per-user list) should be used for this.
	static list_by_user_id(user_id) {
		const post_ids = [];
		for(const [k,v] of this.table.entries()) {
			if(v.user_id === user_id) post_ids.push(k);
		}
		return post_ids;
	}

};

// each chat has a list of posts, and a list of members.
export class Chat {
	constructor(id, users) {
		this._id	= id;
		this.users	= users;	// user_id[]
		this.posts	= [];		// post_id[]
	}
};
export class Chats {
	// Map<chat_id, Chat>
	static table = new Map();
	static NEXT_ID = 0;

	// ==============================
	// table operations.
	// ------------------------------

	static has(id) {
		return this.table.has(id);
	}
	static get(id) {
		return this.table.get(id);
	}
	static create(users) {
		const chat = new Chat(this.NEXT_ID++, users);
		this.table.set(chat._id, chat);
		return chat;
	}
	static delete(id) {
		const chat = this.table.get(id);
		Posts.delete_multiple(chat.posts);
		// TODO: remove chat from user chat-lists once implemented.
		return this.table.delete(id);
	}

	// ==============================
	// extra functions.
	// ------------------------------

	static add_post(chat_id, post_id) {
		const chat = this.table.get(chat_id);
		if(!chat) return false;
		chat.posts.push(post_id);
		this.table.set(chat_id, chat);
		return true;
	}

};

// each user has a list of friends.
export class FriendLists {
	// Map<user_id, Set<friend_id>>
	static table = new Map();

	// ==============================
	// table operations.
	// ------------------------------

	static has(id) {
		return this.table.has(id);
	}
	static get(id) {
		return this.table.get(id).keys;
	}
	static create(user_id) {
		const list = { _id:user_id, keys:[] };
		this.table.set(list._id, list);
		return list;
	}
	static delete(user_id) {
		const keys = this.table.get(id).keys;
		for(const friend_id of keys) this.pair_remove(user_id, friend_id);
		this.table.delete(user_id);
	}

	// ==============================
	// extra functions.
	// ------------------------------

	// check if friend-pair exists.
	static pair_has(id_a, id_b) {
		return this.table.get(id_a)?.keys.includes(id_b);
	}
	static pair_insert(id_a, id_b) {
		const record_a = this.table.get(id_a);
		const record_b = this.table.get(id_b);
		// check if one of users is missing.
		if(!record_a || !record_b) return false;
		// check if pair already added.
		if(record_a.keys.includes(id_b)) return false;
		if(record_b.keys.includes(id_a)) return false;
		// mutually add pair.
		record_a.keys.push(id_b);
		record_b.keys.push(id_a);
		this.table.set(id_a, record_a);
		this.table.set(id_b, record_b);
	}
	static pair_remove(id_a, id_b) {
		const record_a = this.table.get(id_a);
		const record_b = this.table.get(id_b);
		// check if one of users is missing.
		if(!record_a || !record_b) return false;
		// check if pair already removed.
		if(!record_a.keys.includes(id_b)) return false;
		if(!record_b.keys.includes(id_a)) return false;
		// mutually remove pair.
		record_a.keys = record_a.keys.filter(id => id !== id_b);
		record_b.keys = record_b.keys.filter(id => id !== id_a);
		this.table.set(id_a, record_a);
		this.table.set(id_b, record_b);
	}

};

// each user has a list of chats with *some* of their friends.
// NOTE: a better implementation would just use the generic group-chats infrastructure;
//			with the added detail that a friend-chat list maps a particular friend_id
//			to a particular group-chat (with 2 members).
export class FriendChats {
	// Map<user_id, Map<friend_id, chat_id>>
	static table = new Map();

	// ==============================
	// table operations.
	// ------------------------------

	static has(id) {
		return this.table.has(id);
	}
	static get(id) {
		return this.table.get(id).entries;
	}
	static create(user_id) {
		const list = { _id:user_id, entries:[] };
		this.table.set(list._id, list);
		return list;
	}
	static delete(user_id) {
		const entries = this.table.get(id).entries;
		for(const [friend_id, chat_id] of entries) this.pair_remove(user_id, friend_id);
		this.table.delete(user_id);
	}

	// ==============================
	// extra functions.
	// ------------------------------

	static pair_insert(id_a, id_b) {
		const record_a = this.table.get(id_a);
		const record_b = this.table.get(id_b);
		// check if one of users is missing.
		if(!record_a || !record_b) return false;
		// check if pair already added.
		if(record_a.entries.find(ent => ent[0]===id_b)) return false;
		if(record_b.entries.find(ent => ent[0]===id_a)) return false;
		// create chat.
		const chat = Chats.create([id_a, id_b]);
		// mutually add pair.
		record_a.entries.push([id_b, chat._id]);
		record_b.entries.push([id_a, chat._id]);
		this.table.set(id_a, record_a);
		this.table.set(id_b, record_b);
	}
	static pair_remove(id_a, id_b) {
		const record_a = this.table.get(id_a);
		const record_b = this.table.get(id_b);
		// check if one of users is missing.
		if(!record_a || !record_b) return false;
		// check if pair already removed.
		if(!record_a.entries.find(ent => ent[0]===id_b)) return false;
		if(!record_b.entries.find(ent => ent[0]===id_a)) return false;
		// mutually remove pair.
		record_a.entries = record_a.entries.filter(ent => ent[0] !== id_b);
		record_b.entries = record_b.entries.filter(ent => ent[0] !== id_a);
		this.table.set(id_a, record_a);
		this.table.set(id_b, record_b);
	}

};

// ============================================================
// API functions.
// ------------------------------------------------------------

// ==============================
// account management.
// ------------------------------

export function account_login(username, password) {
	const prefix = "account_login";
	console.log(prefix, username, password);
	// check if username exists.
	const user = Users.get_by_username(username);
	if(!user) {
		console.log(prefix, "username not found", username);
		return [false, "username or password is incorrect"];
	}
	// check if password is valid.
	if(!Users.validate_password(user, password)) {
		console.log(prefix, "password not valid", username, password);
		return [false, "username or password is incorrect"];
	}
	// generate token.
	const token = Tokens.generate_new_token(user._id);
	console.log(prefix, "generated new token", token);
	// return token and partial user data.
	return [true, {
			token	: token,
			id		: user._id,
			username: user.username,
			nickname: user.nickname,
		}
	];
}

export function account_logout(user_id, token_hash) {
	const prefix = "account_logout";
	console.log(prefix, user_id);
	// check if token is valid.
	if(!Tokens.validate_token(user_id, token_hash)) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return [false, "token is invalid"];
	}
	// clear token.
	Tokens.delete(user_id);
	return [true, null];
}

export function account_create(username, password, nickname) {
	const prefix = "account_create";
	console.log(prefix, username, password, nickname);
	// check if username already taken.
	if(Users.get_by_username(username)) {
		console.log(prefix, "username already taken", username);
		return [false, "username already taken"];
	}
	// create user.
	const user = Users.create(username, nickname, password);
	const user_id = user._id;
	console.log(prefix, "created account", user_id, username);
	return [true, null];
}

export function account_remove(user_id, password) {
	const prefix = "account_remove";
	console.log(prefix, user_id);
	// check if user exists.
	const user = Users.get(user_id);
	if(!user) {
		console.log(prefix, "user not found", user_id);
		return [false, "user not found"];
	}
	// check if password is valid.
	if(!Users.validate_password(user, password)) {
		console.log(prefix, "password is incorrect", user_id);
		return [false, "password is incorrect"];
	}
	// remove user.
	Users.delete(user_id);
	console.log(prefix, "user removed", user_id);
	return [true, null];
}

export function account_patch_with_token(user_id, props, token_hash) {
	const prefix = "account_patch_with_token";
	console.log(prefix, user_id, props);
	// check if user exists.
	const user = Users.get(user_id);
	if(!user) {
		console.log(prefix, "user not found", user_id);
		return [false, "user not found"];
	}
	// check if token is valid.
	if(!Tokens.validate_token(user_id, token_hash)) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return [false, "token is invalid"];
	}
	// patch user data.
	Users.update(user_id, props, false);
	return [true, null];
}

export function account_patch_with_password(user_id, props, password) {
	const prefix = "account_patch_with_password";
	console.log(prefix, user_id);// NOTE: do not log props, as they may contain password.
	// check if user exists.
	const user = Users.get(user_id);
	if(!user) {
		console.log(prefix, "user not found", user_id);
		return [false, "user not found"];
	}
	// check if password is valid.
	if(!Users.validate_password(user, password)) {
		console.log(prefix, "password is incorrect", user_id);
		return [false, "password is incorrect"];
	}
	// patch user data.
	Users.update(user_id, props, true);
	return [true, null];
}

// ==============================
// table functions.
// ------------------------------

export function posts_create(user_id, token_hash, body) {
	const prefix = "posts_create";
	console.log(prefix, user_id);
	// check if token is valid.
	if(!Tokens.validate_token(user_id, token_hash)) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return [false, "token is invalid"];
	}
	// add post.
	const post = Posts.create(user_id, body);
	console.log(prefix, "added post", user_id, post._id);
	return [true, post._id];
}
export function posts_remove(user_id, token_hash, post_id) {
	const prefix = "posts_remove";
	console.log(prefix, user_id, post_id);
	// check if token is valid.
	if(!Tokens.validate_token(user_id, token_hash)) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return [false, "token is invalid"];
	}
	// check if post exists.
	if(!Posts.has(post_id)) {
		console.log(prefix, "post not found", user_id, post_id);
		return [false, "post not found"];
	}
	// remove post.
	Posts.delete(post_id);
	console.log("[posts_remove] removed post", user_id, post_id);
	return [true, null];
}
export function posts_modify(user_id, token_hash, post_id, body) {
	const prefix = "posts_modify";
	console.log(prefix, user_id, post_id);
	// check if token is valid.
	if(!Tokens.validate_token(user_id, token_hash)) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return [false, "token is invalid"];
	}
	// check if post exists.
	if(!Posts.has(post_id)) {
		console.log(prefix, "post not found", user_id, post_id);
		return [false, "post not found"];
	}
	// modify post.
	Posts.update(post_id, body);
	console.log(prefix, "modified post", user_id, post_id);
	return [true, null];
}
export function posts_list(user_id) {
	const prefix = "posts_list";
	console.log(prefix, user_id);
	// check if user exists.
	if(!Users.has(user_id)) {
		console.log(prefix, "user not found", user_id);
		return [false, "user not found"];
	}
	// return list of post-ids by user.
	const post_ids = Posts.list_by_user_id(user_id);
	return [true, post_ids];
}
export function posts_get(post_ids) {
	const posts = Posts.get_multiple(post_ids);
	return posts;
}

export function users_search(search_str) {
	const prefix = "users_search";
	console.log(prefix, search_str);
	const list = Users.search(search_str);
	return list;
}
export function users_get_public_info(user_ids) {
	const prefix = "posts_list";
	console.log(prefix, user_ids);
	// return public user info of each user.
	const list = [];
	for(const id of user_ids) list.push(Users.get_public_info(id))
	return list;
}

export function friends_list		(user_id, token_hash) {
	const prefix = "friends_list";
	console.log(prefix, user_id);
	// check if token is valid.
	if(!Tokens.validate_token(user_id, token_hash)) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return [false, "token is invalid"];
	}
	// return friends list.
	const users = FriendLists.get(user_id);
	const chats = FriendChats.get(user_id);
	return [true, { users, chats }];
}
export function friends_add			(user_id, token_hash, friend_id) {
	const prefix = "friends_add";
	console.log(prefix, user_id);
	// check if token is valid.
	if(!Tokens.validate_token(user_id, token_hash)) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return [false, "token is invalid"];
	}
	// check if friend exists.
	if(!Users.has(friend_id)) {
		console.log(prefix, "friend not found", user_id, friend_id);
		return [false, "friend not found"];
	}
	// check if friend is already in list.
	if(FriendLists.pair_has(user_id, friend_id)) {
		console.log(prefix, "friend already added", user_id, friend_id);
		return [false, "friend already added"];
	}
	// add friend pair.
	FriendLists.pair_insert(user_id, friend_id);
	FriendChats.pair_insert(user_id, friend_id);
	return [true, null];
}
export function friends_remove		(user_id, token_hash, friend_id) {
	const prefix = "friends_remove";
	console.log(prefix, user_id);
	// check if token is valid.
	if(!Tokens.validate_token(user_id, token_hash)) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return [false, "token is invalid"];
	}
	// check if friend is not in list.
	if(!FriendLists.pair_has(user_id, friend_id)) {
		console.log(prefix, "friend not in list", user_id, friend_id);
		return [false, "friend not in list"];
	}
	// remove from lists.
	FriendLists.pair_remove(user_id, friend_id);
	FriendChats.pair_remove(user_id, friend_id);
	return [true, null];
}

export function chats_get(user_id, token_hash, chat_id) {
	const prefix = "friends_list";
	console.log(prefix, user_id);
	// check if token is valid.
	if(!Tokens.validate_token(user_id, token_hash)) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return [false, "token is invalid"];
	}
	// return chat.
	const chat = Chats.get(chat_id);
	return [true, chat];
}
export function chats_add_post(user_id, token_hash, chat_id, body) {
	const prefix = "friends_list";
	console.log(prefix, user_id);
	// check if token is valid.
	if(!Tokens.validate_token(user_id, token_hash)) {
		console.log(prefix, "token is invalid", user_id, token_hash);
		return [false, "token is invalid"];
	}
	// add post to chat.
	const post = Posts.create(user_id, body);
	const success = Chats.add_post(chat_id, post._id);
	console.log(prefix, "added post to chat", success, post._id);
	return [success, post._id];
}


// ==============================
// test data.
// ------------------------------

// users.
account_create("alice123"	, "123aabbcc____", "Alice"	);
account_create("bob555"		, "456ddeeff____", "Big Bob");
account_create("carl7200"	, "789gghhii____", "Carl"	);
account_create("daniel30"	, "789gghhii____", "Daniel"	);

// posts.
{
	let user = Users.get_by_username("alice123");
	let token = Tokens.generate_new_token(user._id);
	posts_create(user._id, token.hash, "alice plants trees");
	posts_create(user._id, token.hash, "alice eats bread");
	posts_create(user._id, token.hash, "alice throws apples");
	posts_create(user._id, token.hash, "alice spreads flowers");
	posts_create(user._id, token.hash, "alice uses enchanted mage staff");
	posts_create(user._id, token.hash, "alice doesnt use punctuation unless head of electrodynamic-magecraft department says she must");
}
{
	let user = Users.get_by_username("bob555");
	let token = Tokens.generate_new_token(user._id);
	posts_create(user._id, token.hash, "Hi, I'm Bob. I'm head of the electrodynamic-magecraft department.");
	posts_create(user._id, token.hash, "Tomorrow night, I will be giving a lecture in the main auditorium about the self-supressing overunity of mana, and how mana gains its flavour from entering the interaction cross-section of standard model particles.");
	posts_create(user._id, token.hash, "Unlike Alice, I'm quite fond of punctuation ... and not casting dangerous exchange-particle augmentation spells in the middle of important lectures.");
}

// friends.
{
	let user = Users.get_by_username("alice123");
	let token = Tokens.generate_new_token(user._id);
	friends_add(user._id, token.hash, Users.get_by_username("bob555")._id);
	friends_add(user._id, token.hash, Users.get_by_username("daniel30")._id);
}
{
	let user = Users.get_by_username("daniel30");
	let token = Tokens.generate_new_token(user._id);
	friends_add(user._id, token.hash, Users.get_by_username("bob555")._id);
	friends_add(user._id, token.hash, Users.get_by_username("carl7200")._id);
}

// chats.
{
	const user			= Users.get_by_username("alice123");
	const token			= Tokens.generate_new_token(user._id);
	const friend_user	= Users.get_by_username("daniel30");
	const friend_token	= Tokens.generate_new_token(friend_user._id);
	const [success, { users, chats }] = friends_list(user._id, token.hash);
	console.log("chats", chats);
	const chatmap = new Map(chats);
	const chat_id = chatmap.get(friend_user._id);
	console.log("chat_id", chat_id);
	chats_add_post(user._id, token.hash, chat_id, "alice test message");
	chats_add_post(friend_user._id, friend_token.hash, chat_id, "daniel test message");
	chats_add_post(user._id, token.hash, chat_id, "alice test message 2");
	chats_add_post(user._id, token.hash, chat_id, "alice test message 3");
	chats_add_post(user._id, token.hash, chat_id, "alice test message 4");
	chats_add_post(friend_user._id, friend_token.hash, chat_id, "daniel test message 5");
	chats_add_post(friend_user._id, friend_token.hash, chat_id, "daniel test message 6");
	chats_add_post(friend_user._id, friend_token.hash, chat_id, "daniel test message 7");
}


