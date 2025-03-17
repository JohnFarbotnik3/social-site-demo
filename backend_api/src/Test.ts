import * as API from "./API.js";
import {
	ResponseBodyAccountLogin,
	ResponseBodyFriendsList,
	ResponseBodyWithMessage,
} from "./API_types.js";
import { tables } from "./Tables.js";

export function compare_map_keys(map_test: Map<any, any>, map_data: Map<any, any>) {
	for(const key of map_test.keys()) if(!map_data.has(key)) throw("map_data is missing key: "+JSON.stringify(key));
	for(const key of map_data.keys()) if(!map_test.has(key)) throw("map_test is missing key: "+JSON.stringify(key));
}
export function compare_map_values(map_test: Map<any, any>, map_data: Map<any, any>, name:any) {
	for(const key of map_test.keys()) {
		const value_test = map_test.get(key)[name];
		const value_data = map_data.get(key)[name];
		if(value_test !== value_data) throw("map properties do not match: "+JSON.stringify({ name, value_data:value_data??null, value_test:value_test??null }));
	}
}
export function compare_map_lists(map_test: Map<any, any>, map_data: Map<any, any>) {
	for(const key of map_test.keys()) {
		const list_test = new Set(map_test.get(key));
		const list_data = new Set(map_data.get(key));
		for(const k of list_test.keys()) if(!list_data.has(k)) throw("list_data is missing item: "+JSON.stringify({ key, item:k, list_test:[...list_test.keys()], list_data:[...list_data.keys()] }));
		for(const k of list_data.keys()) if(!list_test.has(k)) throw("list_test is missing item: "+JSON.stringify({ key, item:k, list_test:[...list_test.keys()], list_data:[...list_data.keys()] }));
	}
}

export async function test() {
	// create test users.
	console.log("CREATING TEST USERS");
	const usermap = new Map<string, { id:string, username:string, password:string, nickname:string }>();
	const namemap = new Map<string, { id:string, username:string, password:string, nickname:string }>();
	const test_users = [
		{ username:"alice123"	, password:"123aabbcc____", nickname:"Alice"	},
		{ username:"bob555"		, password:"456ddeeff____", nickname:"Big Bob"	},
		{ username:"carl7200"	, password:"789gghhii____", nickname:"Carl"		},
		{ username:"daniel30"	, password:"789gghhii____", nickname:"Daniel"	},
	];
	for(const user of test_users) {
		const res = await API.account_create(user);
		if(!res.success) throw((res as ResponseBodyWithMessage).message);
		else console.log("created account", res);
		const id = (res as ResponseBodyAccountLogin).id;
		if(!id) throw("id not found");
		usermap.set(id, { id, ...user });
		namemap.set(user.username, { id, ...user });
	}

	// add test user-posts.
	console.log("ADDING TEST POSTS");
	const test_posts = [
		{ username:"alice123", contents: [
			"alice plants trees",
			"alice eats bread",
			"alice throws apples",
			"alice spreads flowers",
			"alice uses enchanted mage staff",
			"alice doesnt use punctuation unless head of electrodynamic-magecraft department says she must",
		]},
		{ username:"bob555", contents: [
			"Hi, I'm Bob. I'm head of the electrodynamic-magecraft department.",
			"Tomorrow night, I will be giving a lecture in the main auditorium about the self-supressing overunity of mana, and how mana gains its flavour from entering the interaction cross-section of standard model particles.",
			"Unlike Alice, I'm quite fond of punctuation ... and not casting dangerous exchange-particle augmentation spells in the middle of important lectures.",
		]},
	];
	for(const data of test_posts) {
		// login as user.
		const { username, contents } = data;
		const password = namemap.get(username)?.password ?? "";
		const response_login = await API.account_login({ username, password });
		if(!response_login.success) throw((response_login as ResponseBodyWithMessage).message);
		const { id, token } = response_login as ResponseBodyAccountLogin;
		// add posts.
		for(const content of contents) {
			const response = await API.blogs_insert_post({ user_id:id, token_hash:token, content:content });
			if(!response.success) throw("failed to create post: "+content);
		}
	}

	// add test friends.
	console.log("ADDING TEST FRIENDS");
	const test_friends = [
		{ username:"alice123", friends:["bob555", "daniel30"] },
		{ username:"daniel30", friends:["bob555", "carl7200"] },
	];
	for(const data of test_friends) {
		// login as user.
		const { username, friends } = data;
		const password = namemap.get(username)?.password ?? "";
		const response_login = await API.account_login({ username, password });
		if(!response_login.success) throw((response_login as ResponseBodyWithMessage).message);
		const { id, token } = response_login as ResponseBodyAccountLogin;
		// add friends.
		for(const friend_usn of friends) {
			const friend_id = namemap.get(friend_usn)?.id;
			if(!friend_id) throw("friend id not found");
			const res = await API.friends_insert({
				user_id: id,
				friend_id: friend_id,
				token_hash: token,
			});
			if(!res.success) throw(res.message);
		}
	}

	// add test chats.
	console.log("ADDING TEST CHATS");
	const test_chats = [
		{ username:"alice123", friendname:"daniel30", contents:[
			"alice test message 1",
		] },
		{ username:"daniel30", friendname:"alice123", contents:[
			"daniel test message 2",
		] },
		{ username:"alice123", friendname:"daniel30", contents:[
			"alice test message 3",
			"alice test message 4",
			"alice test message 5",
		] },
		{ username:"daniel30", friendname:"alice123", contents:[
			"daniel test message 6",
			"daniel test message 7",
			"daniel test message 8",
		] },
		{ username:"alice123", friendname:"daniel30", contents:[
			"alice test message 9",
		] },
	];
	for(const data of test_chats) {
		// login as user.
		const { username, friendname, contents } = data;
		const password = namemap.get(username)?.password ?? "";
		const response_login = await API.account_login({ username, password });
		if(!response_login.success) throw((response_login as ResponseBodyWithMessage).message);
		const { id, token } = response_login as ResponseBodyAccountLogin;
		// get chat id, or create new chat if it doesnt already exist.
		const friend_id = namemap.get(friendname)?.id;
		if(!friend_id) throw("friend id not found");
		const res_flist = await API.friends_list({ user_id:id, token_hash:token });
		if(!res_flist.success) throw((res_flist as ResponseBodyWithMessage).message);
		const flist = (res_flist as ResponseBodyFriendsList).list;
		const friend_item = flist.find(friend => friend.user_id === friend_id);
		if(!friend_item) throw("failed to find friend in list");
		let chat_id = friend_item.chat_id;
		if(!chat_id) {
			const res = await API.friends_create_chat({ user_id:id, friend_id:friend_id, token_hash:token });
			if(!res.success) throw(res.message);
			chat_id = res.id;
		}
		for(const content of contents) {
			const res = await API.chats_add_post({
				user_id: id,
				chat_id: chat_id,
				token_hash: token,
				content: content,
			});
			if(!res.success) throw(res.message);
			console.log("added chat message", res.id);
		}
	}
	// compare test data to tables (to verify contents are correct).
	console.log("TEST: users");
	{
		const map_test = new Map();
		const map_data = new Map();
		const cursor = tables.users.collection.find();
		for await (const user of cursor) map_data.set(user.username, user);
		for(const user of test_users) map_test.set(user.username, user);
		compare_map_keys(map_test, map_data);
		compare_map_values(map_test, map_data, "username");
		compare_map_values(map_test, map_data, "nickname");
	}
	// TODO - test friends lists properly!
	console.log("TEST: friends");
	console.log(JSON.stringify(test_friends));
	console.log(JSON.stringify(await tables.friends.collection.find().toArray()));
	/*
	console.log("TEST: friends");
	{
		const map_test = new Map();
		const map_data = new Map();
		const cursor = tables.user_friends.find();
		for await (const flist of cursor) map_data.set(flist._id.toString(), flist.list.map(({ user_id, chat_id }) => user_id.toString()));
		for(const group of test_friends) {
			const { username, friends } = group;
			map_test.set(namemap.get(username).id, friends.map(usn => namemap.get(usn).id));
		}
		//compare_map_keys(map_test, map_data);
		compare_map_lists(map_test, map_data);
	}
	*/
	console.log("TEST: posts");
	{
		const map_test = new Map();
		const map_data = new Map();
		const cursor = tables.posts.collection.find();
		for await (const post of cursor) map_data.set(post.content, { id:post.user_id.toString(), content:post.content });
		for(const group of test_posts) {
			const { username, contents } = group;
			for(const content of contents) map_test.set(content, { id:namemap.get(username).id, content:content });
		}
		for(const group of test_chats) {
			const { username, contents } = group;
			for(const content of contents) map_test.set(content, { id:namemap.get(username).id, content:content });
		}
		compare_map_keys(map_test, map_data);
		compare_map_values(map_test, map_data, "id");
	}
	console.log("TEST: notifs");
	// NOTE - this doesnt actually test correctness, it just logs accumulated notifs.
	{
		for(const [user_id, user] of usermap.entries()) {
			// login as user.
			const { username, password } = user;
			const response_login = await API.account_login({ username, password });
			if(!response_login.success) throw((response_login as ResponseBodyWithMessage).message);
			const { token } = response_login as ResponseBodyAccountLogin;
			// get notifs.
			const reponse_notifs = await API.notifs_get_chat({ user_id, token_hash:token, clear:false }) as any;
			console.log("notifs_fchat: ", user_id, reponse_notifs);
		}
	}
	console.log("TEST COMPLETE");
	console.log("============================================================");
}
