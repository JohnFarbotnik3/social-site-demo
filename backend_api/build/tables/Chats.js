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
import * as Posts from "../tables/Posts.js";
export function findOne(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return tables === null || tables === void 0 ? void 0 : tables.chats.findOne({ _id: id });
    });
}
export function insertOne(user_ids) {
    return __awaiter(this, void 0, void 0, function* () {
        const chat = { user_ids: user_ids, post_ids: [] };
        const result = yield (tables === null || tables === void 0 ? void 0 : tables.chats.insertOne(chat));
        return (result === null || result === void 0 ? void 0 : result.insertedId) ? Object.assign({ _id: result.insertedId }, chat) : null;
    });
}
export function deleteOne(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const chat = yield findOne(id);
        yield Posts.deleteMany(chat.post_ids);
        const filter = { _id: id };
        const result = yield (tables === null || tables === void 0 ? void 0 : tables.chats.deleteOne(filter));
        const success = (result === null || result === void 0 ? void 0 : result.deletedCount) === 1;
        return success;
    });
}
export function updateOne_insert_post_id(chat_id, post_id) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        return ((_a = (yield (tables === null || tables === void 0 ? void 0 : tables.chats.updateOne({ _id: chat_id }, { $push: { post_ids: post_id } })))) === null || _a === void 0 ? void 0 : _a.modifiedCount) === 1;
    });
}
export function updateOne_remove_post_id(chat_id, post_id) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        return ((_a = (yield (tables === null || tables === void 0 ? void 0 : tables.chats.updateOne({ _id: chat_id }, { $pull: { post_ids: post_id } })))) === null || _a === void 0 ? void 0 : _a.modifiedCount) === 1;
    });
}
export function updateOne_insert_user_id(chat_id, user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        return ((_a = (yield (tables === null || tables === void 0 ? void 0 : tables.chats.updateOne({ _id: chat_id }, { $push: { user_ids: user_id } })))) === null || _a === void 0 ? void 0 : _a.modifiedCount) === 1;
    });
}
export function updateOne_remove_user_id(chat_id, user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        return ((_a = (yield (tables === null || tables === void 0 ? void 0 : tables.chats.updateOne({ _id: chat_id }, { $pull: { user_ids: user_id } })))) === null || _a === void 0 ? void 0 : _a.modifiedCount) === 1;
    });
}
//# sourceMappingURL=Chats.js.map