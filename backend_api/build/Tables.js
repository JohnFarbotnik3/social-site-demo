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
import { ObjectId, } from "mongodb";
export function toStringId(item) {
    return Object.assign(Object.assign({}, item), { _id: item._id.toString() });
}
export function toObjectId(item) {
    return Object.assign(Object.assign({}, item), { _id: new ObjectId(item._id) });
}
export class Tables {
    constructor(db) {
        this.users = new TableUsers(db.collection("users"));
        this.tokens = new TableTokens(db.collection("tokens"));
        this.friends = new TableFriends(db.collection("friends"));
        this.posts = new TablePosts(db.collection("posts"));
        this.blogs = new TableBlogs(db.collection("blogs"));
        this.chats = new TableChats(db.collection("chats"));
        this.notifs_chat = new TableSet(db.collection("notifs_chat"));
    }
}
;
export let tables;
export function init_tables(db) {
    tables = new Tables(db);
}
export class Table {
    constructor(collection) {
        this.collection = collection;
    }
    findOne(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = { _id: new ObjectId(id) };
            const result = yield this.collection.findOne(filter);
            return result ? toStringId(result) : null;
        });
    }
    findMany(ids, projection) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = { _id: { $in: ids.map(id => new ObjectId(id)) } };
            const options = {};
            if (projection)
                options.projection = Object.assign({ _id: 1 }, projection);
            const cursor = this.collection.find(filter, options);
            const result = yield cursor.toArray();
            return result.map(item => toStringId(item));
        });
    }
    insertOne(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.collection.insertOne(item);
            return result.insertedId ? Object.assign(Object.assign({}, item), { _id: result.insertedId.toString() }) : null;
        });
    }
    insertOneWithId(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.collection.insertOne(toObjectId(item));
            return result.acknowledged;
        });
    }
    deleteOne(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = { _id: new ObjectId(id) };
            const result = yield this.collection.deleteOne(filter);
            const success = result.deletedCount === 1;
            return success;
        });
    }
    deleteMany(ids) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = { _id: { $in: ids.map(id => new ObjectId(id)) } };
            const result = yield this.collection.deleteMany(filter);
            const success = result.deletedCount === ids.length;
            return success;
        });
    }
    updateOne(id, item) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = { _id: new ObjectId(id) };
            const update = { $set: item };
            const result = yield this.collection.updateOne(filter, update);
            const success = result.modifiedCount === 1;
            return success;
        });
    }
    listInsert(id, entry) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = { _id: new ObjectId(id) };
            const update = { $push: entry };
            const result = yield this.collection.updateOne(filter, update);
            const success = result.modifiedCount === 1;
            return success;
        });
    }
    listRemove(id, match) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = { _id: new ObjectId(id) };
            const update = { $pull: match };
            const result = yield this.collection.updateOne(filter, update);
            const success = result.modifiedCount === 1;
            return success;
        });
    }
}
;
export class TableSet extends Table {
    set_add(id, key) {
        const _super = Object.create(null, {
            findOne: { get: () => super.findOne },
            updateOne: { get: () => super.updateOne }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const record = yield _super.findOne.call(this, id);
            const set = new Set(record.list);
            if (set.has(key)) {
                return false;
            }
            else {
                set.add(key);
                return _super.updateOne.call(this, id, { list: [...set.keys()] });
            }
        });
    }
    set_delete(id, key) {
        const _super = Object.create(null, {
            findOne: { get: () => super.findOne },
            updateOne: { get: () => super.updateOne }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const record = yield _super.findOne.call(this, id);
            const set = new Set(record.list);
            if (!set.has(key)) {
                return false;
            }
            else {
                set.delete(key);
                return _super.updateOne.call(this, id, { list: [...set.keys()] });
            }
        });
    }
    set_clear(id) {
        const _super = Object.create(null, {
            findOne: { get: () => super.findOne },
            updateOne: { get: () => super.updateOne }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const record = yield _super.findOne.call(this, id);
            if (record.list.length <= 0) {
                return false;
            }
            else {
                return _super.updateOne.call(this, id, { list: [] });
            }
        });
    }
    set_keys(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const record = yield this.findOne(id);
            return record.list;
        });
    }
}
;
export class TableUsers extends Table {
    insertOne(item) {
        const _super = Object.create(null, {
            insertOne: { get: () => super.insertOne }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield _super.insertOne.call(this, item);
            const flist = yield tables.friends.insertOneWithId({ _id: user._id, list: [] });
            const blog = yield tables.blogs.insertOneWithId({ _id: user._id, post_ids: [] });
            const notifs_chat = yield tables.notifs_chat.insertOneWithId({ _id: user._id, list: [] });
            return (flist && blog && notifs_chat) ? user : null;
        });
    }
    deleteOne(id) {
        const _super = Object.create(null, {
            deleteOne: { get: () => super.deleteOne }
        });
        return __awaiter(this, void 0, void 0, function* () {
            tables.tokens.deleteOne(id);
            tables.friends.deleteOne(id);
            tables.blogs.deleteOne(id);
            tables.notifs_chat.deleteOne(id);
            return _super.deleteOne.call(this, id);
        });
    }
    findOne_by_username(username) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.collection.findOne({ username: username });
            return result ? toStringId(result) : null;
        });
    }
    find_public_search(search_str) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            const cursor = this.collection.find({}, { projection: { _id: 1, username: 1 } });
            if (cursor) {
                const ids = [];
                const str = search_str.toLowerCase();
                try {
                    for (var _d = true, cursor_1 = __asyncValues(cursor), cursor_1_1; cursor_1_1 = yield cursor_1.next(), _a = cursor_1_1.done, !_a; _d = true) {
                        _c = cursor_1_1.value;
                        _d = false;
                        const doc = _c;
                        if (doc.username.toLowerCase().includes(str))
                            ids.push(doc._id.toString());
                        if (ids.length >= 20) {
                            cursor.close();
                            break;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = cursor_1.return)) yield _b.call(cursor_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return ids;
            }
            else {
                return [];
            }
        });
    }
}
;
export class TableTokens extends Table {
    generateNewToken(user_id_1) {
        return __awaiter(this, arguments, void 0, function* (user_id, duration = 24 * 3600 * 1000) {
            const token = {
                hash: String(Math.random()),
                date: Date.now() + duration,
            };
            const result = yield this.collection.replaceOne({ _id: new ObjectId(user_id) }, token, { upsert: true });
            return (result === null || result === void 0 ? void 0 : result.acknowledged) ? Object.assign({ _id: user_id }, token) : null;
        });
    }
    validate(user_id, token_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield this.collection.findOne({ _id: new ObjectId(user_id) });
            if (!token)
                return false;
            return (Date.now() <= token.date) && (token_hash === token.hash);
        });
    }
}
;
export class TablePosts extends Table {
    insertOne(item) {
        const _super = Object.create(null, {
            insertOne: { get: () => super.insertOne }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return _super.insertOne.call(this, {
                user_id: item.user_id,
                created: Date.now(),
                updated: Date.now(),
                content: item.content,
            });
        });
    }
    updateOne(id, item) {
        const _super = Object.create(null, {
            updateOne: { get: () => super.updateOne }
        });
        return __awaiter(this, void 0, void 0, function* () {
            item.updated = Date.now();
            return _super.updateOne.call(this, id, item);
        });
    }
}
;
export class TableBlogs extends Table {
    deleteOne(id) {
        const _super = Object.create(null, {
            deleteOne: { get: () => super.deleteOne }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const blog = yield this.findOne(id);
            tables.posts.deleteMany(blog.post_ids);
            return _super.deleteOne.call(this, id);
        });
    }
    insertPost(id, item) {
        return __awaiter(this, void 0, void 0, function* () {
            const post = yield tables.posts.insertOne(item);
            const success = yield this.listInsert(id, { post_ids: post._id });
            return success ? post : null;
        });
    }
    deletePost(id, post_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const a = yield tables.posts.deleteOne(post_id);
            const b = yield this.listRemove(id, { post_ids: post_id });
            return a && b;
        });
    }
}
;
export class TableChats extends Table {
    deleteOne(chat_id) {
        const _super = Object.create(null, {
            deleteOne: { get: () => super.deleteOne }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const chat = yield this.findOne(chat_id);
            tables.chats.deleteMany(chat.post_ids);
            return _super.deleteOne.call(this, chat_id);
        });
    }
    insertPost(chat_id, item) {
        return __awaiter(this, void 0, void 0, function* () {
            const post = yield tables.posts.insertOne(item);
            yield this.listInsert(chat_id, { post_ids: post._id });
            const chat = yield this.findOne(chat_id);
            for (const user_id of chat.user_ids)
                if (user_id !== item.user_id)
                    yield tables.notifs_chat.set_add(user_id, chat_id);
            return post;
        });
    }
}
;
export class TableFriends extends Table {
    deleteOne(user_id) {
        const _super = Object.create(null, {
            deleteOne: { get: () => super.deleteOne }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const flist = yield this.collection.findOne({ _id: new ObjectId(user_id) });
            for (const friend of flist.list)
                if (friend.chat_id)
                    yield tables.chats.deleteOne(friend.chat_id);
            for (const friend of flist.list)
                yield this.listRemove(friend.user_id, { list: { user_id: user_id } });
            return _super.deleteOne.call(this, user_id);
        });
    }
    get_friend(user_id, friend_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const flist = yield this.collection.findOne({ _id: new ObjectId(user_id) });
            if (flist)
                for (const friend of flist.list)
                    if (friend.user_id === friend_id)
                        return friend;
            return null;
        });
    }
    has_friend(user_id, friend_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const friend = yield this.get_friend(user_id, friend_id);
            return friend ? true : false;
        });
    }
    has_friend_chat(user_id, friend_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const friend = yield this.get_friend(user_id, friend_id);
            return friend.chat_id ? true : false;
        });
    }
    insert_friend_pair(user_id, friend_id, chat_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const a = yield this.listInsert(user_id, { list: { user_id: friend_id, chat_id: chat_id !== null && chat_id !== void 0 ? chat_id : null } });
            const b = yield this.listInsert(friend_id, { list: { user_id: user_id, chat_id: chat_id !== null && chat_id !== void 0 ? chat_id : null } });
            if (!a)
                throw ("A FAILED");
            if (!b)
                throw ("B FAILED");
            return a && b;
        });
    }
    remove_friend_pair(user_id, friend_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const friend = yield this.get_friend(user_id, friend_id);
            if (friend.chat_id)
                yield tables.chats.deleteOne(friend.chat_id);
            const a = yield this.listRemove(user_id, { list: { user_id: friend_id } });
            const b = yield this.listRemove(friend_id, { list: { user_id: user_id } });
            return a && b;
        });
    }
    create_friend_chat(user_id, friend_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const chat = yield tables.chats.insertOne({ user_ids: [user_id, friend_id], post_ids: [] });
            const a = yield this.remove_friend_pair(user_id, friend_id);
            const b = yield this.insert_friend_pair(user_id, friend_id, chat._id);
            return a && b ? chat : null;
        });
    }
}
;
//# sourceMappingURL=Tables.js.map