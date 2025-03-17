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
export function generateNewToken(user_id_1) {
    return __awaiter(this, arguments, void 0, function* (user_id, duration = 3600 * 24) {
        const token = {
            hash: String(Math.random()),
            date: Date.now() + duration,
        };
        const result = yield (tables === null || tables === void 0 ? void 0 : tables.user_tokens.replaceOne({ _id: user_id }, token, { upsert: true }));
        return (result === null || result === void 0 ? void 0 : result.acknowledged) ? Object.assign({ _id: user_id }, token) : null;
    });
}
export function deleteOne(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const filter = { _id: user_id };
        const result = yield (tables === null || tables === void 0 ? void 0 : tables.user_tokens.deleteOne(filter));
        const success = (result === null || result === void 0 ? void 0 : result.deletedCount) === 1;
        return success;
    });
}
export function validate(user_id, token_hash) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = yield (tables === null || tables === void 0 ? void 0 : tables.user_tokens.findOne({ _id: user_id }));
        if (!token)
            return false;
        return (Date.now() <= token.date) && (token_hash === token.hash);
    });
}
//# sourceMappingURL=Tokens.js.map