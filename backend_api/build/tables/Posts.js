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
export function insertOne(user_id, content) {
    return __awaiter(this, void 0, void 0, function* () {
        const post = { user_id, created: Date.now(), updated: Date.now(), content };
        const result = yield (tables === null || tables === void 0 ? void 0 : tables.posts.insertOne(post));
        return (result === null || result === void 0 ? void 0 : result.insertedId) ? Object.assign({ _id: result.insertedId }, post) : null;
    });
}
export function deleteOne(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield (tables === null || tables === void 0 ? void 0 : tables.posts.deleteOne({ _id: id }));
        const success = (result === null || result === void 0 ? void 0 : result.deletedCount) === 1;
        return success;
    });
}
export function deleteMany(ids) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield (tables === null || tables === void 0 ? void 0 : tables.posts.deleteMany({ _id: { $in: ids } }));
        const success = (result === null || result === void 0 ? void 0 : result.deletedCount) === ids.length;
        return success;
    });
}
export function findOne(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return tables === null || tables === void 0 ? void 0 : tables.posts.findOne({ _id: id });
    });
}
export function find(ids) {
    return __awaiter(this, void 0, void 0, function* () {
        const cursor = tables === null || tables === void 0 ? void 0 : tables.posts.find({ _id: { $in: ids } });
        return yield (cursor === null || cursor === void 0 ? void 0 : cursor.toArray());
    });
}
export function find_by_user_id(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const cursor = tables === null || tables === void 0 ? void 0 : tables.posts.find({ user_id: user_id }, { projection: { _id: 1, user_id: 1 } });
        if (cursor) {
            const ids = (yield cursor.toArray()).map(post => post._id);
            return ids;
        }
        else {
            return [];
        }
    });
}
export function updateOne(id, content) {
    return __awaiter(this, void 0, void 0, function* () {
        const obj = { content: content, updated: Date.now() };
        const result = yield (tables === null || tables === void 0 ? void 0 : tables.posts.updateOne({ _id: id }, { $set: obj }));
        const success = (result === null || result === void 0 ? void 0 : result.modifiedCount) === 1;
        return success;
    });
}
//# sourceMappingURL=Posts.js.map