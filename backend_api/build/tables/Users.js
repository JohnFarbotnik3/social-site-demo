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
import { tables } from "../Tables.js";
import { Tokens, Friends } from "./exports.js";
function generate_salt() {
    return "SALT_" + Date.now() + "_";
}
function generate_hash(password, salt) {
    return salt + password;
}
export function is_password_correct(user, password) {
    return generate_hash(password, user.password_salt) === user.password_hash;
}
export function findOne(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return tables === null || tables === void 0 ? void 0 : tables.users.findOne({ _id: id });
    });
}
export function findOne_by_username(username) {
    return __awaiter(this, void 0, void 0, function* () {
        return tables === null || tables === void 0 ? void 0 : tables.users.findOne({ username: username });
    });
}
export function find_public(ids) {
    return __awaiter(this, void 0, void 0, function* () {
        const filter = { _id: { $in: ids } };
        const options = { projection: { _id: 1, username: 1, nickname: 1 } };
        const cursor = tables === null || tables === void 0 ? void 0 : tables.users.find(filter, options);
        return cursor === null || cursor === void 0 ? void 0 : cursor.toArray();
    });
}
export function find_public_search(search_str) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        const filter = {};
        const options = { projection: { _id: 1, username: 1 } };
        const cursor = tables === null || tables === void 0 ? void 0 : tables.users.find(filter, options);
        if (cursor) {
            const ids = [];
            const str = search_str.toLowerCase();
            try {
                for (var _d = true, cursor_1 = __asyncValues(cursor), cursor_1_1; cursor_1_1 = yield cursor_1.next(), _a = cursor_1_1.done, !_a; _d = true) {
                    _c = cursor_1_1.value;
                    _d = false;
                    const doc = _c;
                    if (doc.username.toLowerCase().includes(str))
                        ids.push(doc._id);
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
export function insertOne(username, nickname, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const password_salt = generate_salt();
        const password_hash = generate_hash(password, password_salt);
        const user = { username, nickname, password_salt, password_hash };
        const result = yield (tables === null || tables === void 0 ? void 0 : tables.users.insertOne(user));
        return (result === null || result === void 0 ? void 0 : result.insertedId) ? Object.assign({ _id: result.insertedId }, user) : null;
    });
}
export function deleteOne(id) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Tokens.deleteOne(id);
        yield Friends.deleteOne(id);
        const result = yield (tables === null || tables === void 0 ? void 0 : tables.users.deleteOne({ _id: id }));
        const success = (result === null || result === void 0 ? void 0 : result.deletedCount) === 1;
        return success;
    });
}
export function updateOne(id, props, with_password) {
    return __awaiter(this, void 0, void 0, function* () {
        const obj = {};
        if (props.nickname)
            obj.nickname = props.nickname;
        if (with_password && props.password) {
            const password_salt = generate_salt();
            const password_hash = generate_hash(props.password, password_salt);
            obj.password_salt = password_salt;
            obj.password_hash = password_hash;
        }
        const result = yield (tables === null || tables === void 0 ? void 0 : tables.user_tokens.updateOne({ _id: id }, { $set: obj }));
        const success = (result === null || result === void 0 ? void 0 : result.modifiedCount) === 1;
        return success;
    });
}
//# sourceMappingURL=Users.js.map