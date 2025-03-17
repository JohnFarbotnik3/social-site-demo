var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import * as API from "./API.js";
import { tables } from "./Tables.js";
export function compare_map_keys(map_test, map_data) {
    for (const key of map_test.keys())
        if (!map_data.has(key))
            throw ("map_data is missing key: " + JSON.stringify(key));
    for (const key of map_data.keys())
        if (!map_test.has(key))
            throw ("map_test is missing key: " + JSON.stringify(key));
}
export function compare_map_values(map_test, map_data, name) {
    for (const key of map_test.keys()) {
        const value_test = map_test.get(key)[name];
        const value_data = map_data.get(key)[name];
        if (value_test !== value_data)
            throw ("map properties do not match: " + JSON.stringify({ name, value_data: value_data !== null && value_data !== void 0 ? value_data : null, value_test: value_test !== null && value_test !== void 0 ? value_test : null }));
    }
}
export function compare_map_lists(map_test, map_data) {
    for (const key of map_test.keys()) {
        const list_test = new Set(map_test.get(key));
        const list_data = new Set(map_data.get(key));
        for (const k of list_test.keys())
            if (!list_data.has(k))
                throw ("list_data is missing item: " + JSON.stringify({ key, item: k, list_test: [...list_test.keys()], list_data: [...list_data.keys()] }));
        for (const k of list_data.keys())
            if (!list_test.has(k))
                throw ("list_test is missing item: " + JSON.stringify({ key, item: k, list_test: [...list_test.keys()], list_data: [...list_data.keys()] }));
    }
}
export function test() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c, _d, e_2, _e, _f;
        var _g, _h, _j, _k, _l, _m, _o, _p;
        console.log("CREATING TEST USERS");
        const usermap = new Map();
        const namemap = new Map();
        const test_users = [
            { username: "alice123", password: "123aabbcc____", nickname: "Alice" },
            { username: "bob555", password: "456ddeeff____", nickname: "Big Bob" },
            { username: "carl7200", password: "789gghhii____", nickname: "Carl" },
            { username: "daniel30", password: "789gghhii____", nickname: "Daniel" },
        ];
        for (const user of test_users) {
            const res = yield API.account_create(user);
            if (!res.success)
                throw (res.message);
            else
                console.log("created account", res);
            const id = res.id;
            if (!id)
                throw ("id not found");
            usermap.set(id, Object.assign({ id }, user));
            namemap.set(user.username, Object.assign({ id }, user));
        }
        console.log("ADDING TEST POSTS");
        const test_posts = [
            { username: "alice123", contents: [
                    "alice plants trees",
                    "alice eats bread",
                    "alice throws apples",
                    "alice spreads flowers",
                    "alice uses enchanted mage staff",
                    "alice doesnt use punctuation unless head of electrodynamic-magecraft department says she must",
                ] },
            { username: "bob555", contents: [
                    "Hi, I'm Bob. I'm head of the electrodynamic-magecraft department.",
                    "Tomorrow night, I will be giving a lecture in the main auditorium about the self-supressing overunity of mana, and how mana gains its flavour from entering the interaction cross-section of standard model particles.",
                    "Unlike Alice, I'm quite fond of punctuation ... and not casting dangerous exchange-particle augmentation spells in the middle of important lectures.",
                ] },
        ];
        for (const data of test_posts) {
            const { username, contents } = data;
            const password = (_h = (_g = namemap.get(username)) === null || _g === void 0 ? void 0 : _g.password) !== null && _h !== void 0 ? _h : "";
            const response_login = yield API.account_login({ username, password });
            if (!response_login.success)
                throw (response_login.message);
            const { id, token } = response_login;
            for (const content of contents) {
                const response = yield API.blogs_insert_post({ user_id: id, token_hash: token, content: content });
                if (!response.success)
                    throw ("failed to create post: " + content);
            }
        }
        console.log("ADDING TEST FRIENDS");
        const test_friends = [
            { username: "alice123", friends: ["bob555", "daniel30"] },
            { username: "daniel30", friends: ["bob555", "carl7200"] },
        ];
        for (const data of test_friends) {
            const { username, friends } = data;
            const password = (_k = (_j = namemap.get(username)) === null || _j === void 0 ? void 0 : _j.password) !== null && _k !== void 0 ? _k : "";
            const response_login = yield API.account_login({ username, password });
            if (!response_login.success)
                throw (response_login.message);
            const { id, token } = response_login;
            for (const friend_usn of friends) {
                const friend_id = (_l = namemap.get(friend_usn)) === null || _l === void 0 ? void 0 : _l.id;
                if (!friend_id)
                    throw ("friend id not found");
                const res = yield API.friends_insert({
                    user_id: id,
                    friend_id: friend_id,
                    token_hash: token,
                });
                if (!res.success)
                    throw (res.message);
            }
        }
        console.log("ADDING TEST CHATS");
        const test_chats = [
            { username: "alice123", friendname: "daniel30", contents: [
                    "alice test message 1",
                ] },
            { username: "daniel30", friendname: "alice123", contents: [
                    "daniel test message 2",
                ] },
            { username: "alice123", friendname: "daniel30", contents: [
                    "alice test message 3",
                    "alice test message 4",
                    "alice test message 5",
                ] },
            { username: "daniel30", friendname: "alice123", contents: [
                    "daniel test message 6",
                    "daniel test message 7",
                    "daniel test message 8",
                ] },
            { username: "alice123", friendname: "daniel30", contents: [
                    "alice test message 9",
                ] },
        ];
        for (const data of test_chats) {
            const { username, friendname, contents } = data;
            const password = (_o = (_m = namemap.get(username)) === null || _m === void 0 ? void 0 : _m.password) !== null && _o !== void 0 ? _o : "";
            const response_login = yield API.account_login({ username, password });
            if (!response_login.success)
                throw (response_login.message);
            const { id, token } = response_login;
            const friend_id = (_p = namemap.get(friendname)) === null || _p === void 0 ? void 0 : _p.id;
            if (!friend_id)
                throw ("friend id not found");
            const res_flist = yield API.friends_list({ user_id: id, token_hash: token });
            if (!res_flist.success)
                throw (res_flist.message);
            const flist = res_flist.list;
            const friend_item = flist.find(friend => friend.user_id === friend_id);
            if (!friend_item)
                throw ("failed to find friend in list");
            let chat_id = friend_item.chat_id;
            if (!chat_id) {
                const res = yield API.friends_create_chat({ user_id: id, friend_id: friend_id, token_hash: token });
                if (!res.success)
                    throw (res.message);
                chat_id = res.id;
            }
            for (const content of contents) {
                const res = yield API.chats_add_post({
                    user_id: id,
                    chat_id: chat_id,
                    token_hash: token,
                    content: content,
                });
                if (!res.success)
                    throw (res.message);
                console.log("added chat message", res.id);
            }
        }
        console.log("TEST: users");
        {
            const map_test = new Map();
            const map_data = new Map();
            const cursor = tables.users.collection.find();
            try {
                for (var _q = true, cursor_1 = __asyncValues(cursor), cursor_1_1; cursor_1_1 = yield cursor_1.next(), _a = cursor_1_1.done, !_a; _q = true) {
                    _c = cursor_1_1.value;
                    _q = false;
                    const user = _c;
                    map_data.set(user.username, user);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_q && !_a && (_b = cursor_1.return)) yield _b.call(cursor_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            for (const user of test_users)
                map_test.set(user.username, user);
            compare_map_keys(map_test, map_data);
            compare_map_values(map_test, map_data, "username");
            compare_map_values(map_test, map_data, "nickname");
        }
        console.log("TEST: friends");
        console.log(JSON.stringify(test_friends));
        console.log(JSON.stringify(yield tables.friends.collection.find().toArray()));
        console.log("TEST: posts");
        {
            const map_test = new Map();
            const map_data = new Map();
            const cursor = tables.posts.collection.find();
            try {
                for (var _r = true, cursor_2 = __asyncValues(cursor), cursor_2_1; cursor_2_1 = yield cursor_2.next(), _d = cursor_2_1.done, !_d; _r = true) {
                    _f = cursor_2_1.value;
                    _r = false;
                    const post = _f;
                    map_data.set(post.content, { id: post.user_id.toString(), content: post.content });
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_r && !_d && (_e = cursor_2.return)) yield _e.call(cursor_2);
                }
                finally { if (e_2) throw e_2.error; }
            }
            for (const group of test_posts) {
                const { username, contents } = group;
                for (const content of contents)
                    map_test.set(content, { id: namemap.get(username).id, content: content });
            }
            for (const group of test_chats) {
                const { username, contents } = group;
                for (const content of contents)
                    map_test.set(content, { id: namemap.get(username).id, content: content });
            }
            compare_map_keys(map_test, map_data);
            compare_map_values(map_test, map_data, "id");
        }
        console.log("TEST: notifs");
        {
            for (const [user_id, user] of usermap.entries()) {
                const { username, password } = user;
                const response_login = yield API.account_login({ username, password });
                if (!response_login.success)
                    throw (response_login.message);
                const { token } = response_login;
                const reponse_notifs = yield API.notifs_get_chat({ user_id, token_hash: token, clear: false });
                console.log("notifs_fchat: ", user_id, reponse_notifs);
            }
        }
        console.log("TEST COMPLETE");
        console.log("============================================================");
    });
}
//# sourceMappingURL=Test.js.map