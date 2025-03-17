var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { tables } from "../Tables.js";
import * as Chats from "./Chats.js";
export function findOne(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        return tables === null || tables === void 0 ? void 0 : tables.user_friends.findOne({ _id: user_id });
    });
}
export function insertOne(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const flist = { _id: user_id, list: [] };
        const result = yield (tables === null || tables === void 0 ? void 0 : tables.user_friends.insertOne(flist));
        return (result === null || result === void 0 ? void 0 : result.insertedId) ? flist : null;
    });
}
export function deleteOne(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const filter = { _id: user_id };
        const result = yield (tables === null || tables === void 0 ? void 0 : tables.user_friends.deleteOne(filter));
        const success = (result === null || result === void 0 ? void 0 : result.deletedCount) === 1;
        return success;
    });
}
export function has_pair(user_id, friend_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const list = yield (tables === null || tables === void 0 ? void 0 : tables.user_friends.findOne({ _id: user_id }));
        if (list) {
            const friend = list.list.find(friend => friend.user_id.equals(friend_id));
            return Boolean(friend);
        }
        else {
            throw ("friends list not found");
        }
    });
}
export function has_chat(user_id, friend_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const list = yield (tables === null || tables === void 0 ? void 0 : tables.user_friends.findOne({ _id: user_id }));
        if (list) {
            const friend = list.list.find(friend => friend.user_id.equals(friend_id));
            return Boolean(friend === null || friend === void 0 ? void 0 : friend.chat_id);
        }
        else {
            throw ("friends list not found");
        }
    });
}
export function insert_pair(user_id, friend_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const result_a = yield (tables === null || tables === void 0 ? void 0 : tables.user_friends.updateOne({ _id: user_id }, { $push: { list: { user_id: friend_id, chat_id: null } } }));
        const result_b = yield (tables === null || tables === void 0 ? void 0 : tables.user_friends.updateOne({ _id: friend_id }, { $push: { list: { user_id: user_id, chat_id: null } } }));
        const success = (result_a === null || result_a === void 0 ? void 0 : result_a.modifiedCount) === 1 && (result_b === null || result_b === void 0 ? void 0 : result_b.modifiedCount) === 1;
        return success;
    });
}
export function remove_pair(user_id, friend_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const flist = yield (tables === null || tables === void 0 ? void 0 : tables.user_friends.findOne({ _id: user_id }));
        const friend = flist === null || flist === void 0 ? void 0 : flist.list.find(friend => friend.user_id === friend_id);
        const chat_id = friend === null || friend === void 0 ? void 0 : friend.chat_id;
        if (chat_id)
            yield Chats.deleteOne(chat_id);
        const result_a = yield (tables === null || tables === void 0 ? void 0 : tables.user_friends.updateOne({ _id: user_id }, { $pull: { list: { user_id: friend_id } } }));
        const result_b = yield (tables === null || tables === void 0 ? void 0 : tables.user_friends.updateOne({ _id: friend_id }, { $pull: { list: { user_id: user_id } } }));
        const success = (result_a === null || result_a === void 0 ? void 0 : result_a.modifiedCount) === 1 && (result_b === null || result_b === void 0 ? void 0 : result_b.modifiedCount) === 1;
        return success;
    });
}
export function create_chat(user_id, friend_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const chat = yield Chats.insertOne([user_id, friend_id]);
        if (!chat)
            throw ("failed to create chat");
        const result_a = yield (tables === null || tables === void 0 ? void 0 : tables.user_friends.updateOne({ _id: user_id }, { $pull: { list: { user_id: friend_id } } }));
        const result_b = yield (tables === null || tables === void 0 ? void 0 : tables.user_friends.updateOne({ _id: friend_id }, { $pull: { list: { user_id: user_id } } }));
        const success = (result_a === null || result_a === void 0 ? void 0 : result_a.modifiedCount) === 1 && (result_b === null || result_b === void 0 ? void 0 : result_b.modifiedCount) === 1;
        if (!success)
            return null;
        const chat_id = chat._id;
        const result_a2 = yield (tables === null || tables === void 0 ? void 0 : tables.user_friends.updateOne({ _id: user_id }, { $push: { list: { user_id: friend_id, chat_id: chat_id } } }));
        const result_b2 = yield (tables === null || tables === void 0 ? void 0 : tables.user_friends.updateOne({ _id: friend_id }, { $push: { list: { user_id: user_id, chat_id: chat_id } } }));
        const success2 = (result_a2 === null || result_a2 === void 0 ? void 0 : result_a2.modifiedCount) === 1 && (result_b2 === null || result_b2 === void 0 ? void 0 : result_b2.modifiedCount) === 1;
        if (!success2)
            return null;
        return chat._id;
    });
}
//# sourceMappingURL=Friends.js.map