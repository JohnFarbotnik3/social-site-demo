var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { BODY_INVALID_TOKEN, BODY_USER_NOT_FOUND, } from "./API_types.js";
import { tables } from "./Tables.js";
import { User } from "./Types.js";
export class RequestBodyAccountCreate {
}
;
export function account_create(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "account_create";
        console.log(prefix);
        const { username, nickname, password } = body;
        const exists = yield tables.users.findOne_by_username(username);
        if (exists) {
            console.log(prefix, "username already taken", username);
            return { success: false, message: "username already taken" };
        }
        const user = yield tables.users.insertOne(new User(username, nickname, password));
        if (!user) {
            console.log(prefix, "failed to create user", username);
            return { success: false, message: "failed to create user" };
        }
        console.log(prefix, "created account", username, user._id);
        const result = yield account_login({ username, password });
        return result;
    });
}
export class RequestBodyAccountLogin {
}
;
export function account_login(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "account_login";
        const { username, password } = body;
        const user = yield tables.users.findOne_by_username(username);
        if (!user) {
            console.log(prefix, "username not found", username);
            return { success: false, message: "username or password is incorrect" };
        }
        const correct = User.is_password_correct(user, password);
        if (!correct) {
            console.log(prefix, "password not valid", username);
            return { success: false, message: "username or password is incorrect" };
        }
        const token = yield tables.tokens.generateNewToken(user._id);
        if (!token) {
            console.log(prefix, "failed to generate token", user._id, username);
            return { success: false, message: "login failed" };
        }
        else {
            console.log(prefix, "generated new token", token);
            return {
                success: true,
                id: user._id,
                token: token.hash,
                nickname: user.nickname,
            };
        }
    });
}
export class RequestBodyAccountLogout {
}
;
export function account_logout(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "account_logout";
        console.log(prefix);
        const { user_id, token_hash } = body;
        const valid = yield tables.tokens.validate(user_id, token_hash);
        if (!valid) {
            console.log(prefix, "token is invalid", user_id, token_hash);
            return BODY_INVALID_TOKEN;
        }
        const success = yield tables.tokens.deleteOne(user_id);
        return { success };
    });
}
export class RequestBodyAccountRemove {
}
;
export function account_remove(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "account_remove";
        console.log(prefix);
        const { user_id, password } = body;
        const user = yield tables.users.findOne(user_id);
        if (!user) {
            console.log(prefix, "user not found", user_id);
            return BODY_USER_NOT_FOUND;
        }
        const correct = User.is_password_correct(user, password);
        if (!correct) {
            console.log(prefix, "password is incorrect", user_id);
            return { success: false, message: "password is incorrect" };
        }
        const success = yield tables.users.deleteOne(user_id);
        if (success) {
            console.log(prefix, "user removed", user_id);
            return { success: true };
        }
        else {
            console.log(prefix, "failed to remove user", user_id);
            return { success: false, message: "failed to remove user" };
        }
    });
}
export class RequestBodyAccountUpdateT {
}
;
export function account_update_with_token(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "account_patch_with_token";
        console.log(prefix);
        const { user_id, token_hash, props } = body;
        const user = yield tables.users.findOne(user_id);
        if (!user) {
            console.log(prefix, "user not found", user_id);
            return BODY_USER_NOT_FOUND;
        }
        const valid = yield tables.tokens.validate(user_id, token_hash);
        if (!valid) {
            console.log(prefix, "token is invalid", user_id, token_hash);
            return BODY_INVALID_TOKEN;
        }
        if (props.username && props.username !== user.username && (yield tables.users.findOne_by_username(props.username))) {
            console.log(prefix, "username already taken", user_id, props.username);
            return { success: false, message: "username already taken" };
        }
        const change = {};
        if (props.username && props.username !== user.username)
            change.username = props.username;
        if (props.nickname && props.nickname !== user.nickname)
            change.nickname = props.nickname;
        const success = yield tables.users.updateOne(user_id, change);
        if (success) {
            console.log(prefix, "updated account", user_id);
            return { success: true };
        }
        else {
            console.log(prefix, "failed to update account", user_id);
            return { success: false };
        }
    });
}
export class RequestBodyAccountUpdateP {
}
;
export function account_update_with_password(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "account_patch_with_password";
        console.log(prefix);
        const { user_id, password, props } = body;
        const user = yield tables.users.findOne(user_id);
        if (!user) {
            console.log(prefix, "user not found", user_id);
            return BODY_USER_NOT_FOUND;
        }
        if (props.username && props.username !== user.username && (yield tables.users.findOne_by_username(props.username))) {
            console.log(prefix, "username already taken", user_id, props.username);
            return { success: false, message: "username already taken" };
        }
        const change = {};
        if (props.username && props.username !== user.username)
            change.username = props.username;
        if (props.nickname && props.nickname !== user.nickname)
            change.nickname = props.nickname;
        if (props.password)
            User.set_password(change, password);
        const success = yield tables.users.updateOne(user_id, change);
        if (success) {
            console.log(prefix, "updated account", user_id);
            return { success: true };
        }
        else {
            console.log(prefix, "failed to update account", user_id);
            return { success: false };
        }
    });
}
export class RequestBodyUsersGetPublicInfo {
}
;
export function users_get_public_info(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "users_get_public_info";
        console.log(prefix);
        const { user_ids } = body;
        const user_infos = yield tables.users.findMany(user_ids, { username: 1, nickname: 1 });
        return { user_infos };
    });
}
export class RequestBodyUsersSearch {
}
;
export function users_search(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "users_search";
        console.log(prefix);
        const { search_str } = body;
        const user_ids = yield tables.users.find_public_search(search_str);
        return { user_ids };
    });
}
export class RequestBodyPostsUpdate {
}
;
export function posts_update(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "posts_update";
        console.log(prefix);
        const { user_id, token_hash, post_id, content } = body;
        const valid = yield tables.tokens.validate(user_id, token_hash);
        if (!valid) {
            console.log(prefix, "token is invalid", user_id, token_hash);
            return { success: false, message: "token is invalid" };
        }
        const post = yield tables.posts.findOne(post_id);
        if (!post) {
            console.log(prefix, "post not found", user_id, post_id);
            return { success: false, message: "post not found" };
        }
        const success = yield tables.posts.updateOne(post_id, { content });
        if (success) {
            console.log(prefix, "updated post", user_id, post_id);
            return { success: true };
        }
        else {
            console.log(prefix, "failed to update post", user_id, post_id);
            return { success: false };
        }
    });
}
export class RequestBodyPostsGet {
}
;
export function posts_get(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "posts_get";
        console.log(prefix);
        const { post_ids } = body;
        console.log("getting posts", post_ids.length);
        const posts = yield tables.posts.findMany(post_ids);
        return { posts };
    });
}
export class RequestBodyFriendsList {
}
;
export function friends_list(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "friends_list";
        console.log(prefix);
        const { user_id, token_hash } = body;
        const valid = yield tables.tokens.validate(user_id, token_hash);
        if (!valid) {
            console.log(prefix, "token is invalid", user_id, token_hash);
            return { success: false, message: "token is invalid" };
        }
        const flist = yield tables.friends.findOne(user_id);
        if (flist) {
            return { success: true, list: flist.list };
        }
        else {
            console.log(prefix, "failed to get friends list", user_id);
            return { success: false };
        }
    });
}
export class RequestBodyFriendsAdd {
}
;
export function friends_insert(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "friends_insert";
        console.log(prefix);
        const { user_id, token_hash, friend_id } = body;
        const valid = yield tables.tokens.validate(user_id, token_hash);
        if (!valid) {
            console.log(prefix, "token is invalid", user_id, token_hash);
            return { success: false, message: "token is invalid" };
        }
        const friend_user = yield tables.users.findOne(friend_id);
        if (!friend_user) {
            console.log(prefix, "friend not found", user_id, friend_id);
            return { success: false, message: "friend not found" };
        }
        const has_friend = yield tables.friends.has_friend(user_id, friend_id);
        if (has_friend) {
            console.log(prefix, "friend already added", user_id, friend_id);
            return { success: false, message: "friend already added" };
        }
        const success = yield tables.friends.insert_friend_pair(user_id, friend_id);
        return { success: success };
    });
}
export class RequestBodyFriendsRemove {
}
;
export function friends_remove(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "friends_remove";
        console.log(prefix);
        const { user_id, token_hash, friend_id } = body;
        const valid = yield tables.tokens.validate(user_id, token_hash);
        if (!valid) {
            console.log(prefix, "token is invalid", user_id, token_hash);
            return { success: false, message: "token is invalid" };
        }
        const has_friend = yield tables.friends.has_friend(user_id, friend_id);
        if (!has_friend) {
            console.log(prefix, "friend already removed", user_id, friend_id);
            return { success: false, message: "friend already removed" };
        }
        const success = yield tables.friends.remove_friend_pair(user_id, friend_id);
        return { success };
    });
}
export class RequestBodyFriendsCreateChat {
}
;
export function friends_create_chat(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "friends_remove";
        console.log(prefix);
        const { user_id, token_hash, friend_id } = body;
        const valid = yield tables.tokens.validate(user_id, token_hash);
        if (!valid) {
            console.log(prefix, "token is invalid", user_id, token_hash);
            return { success: false, message: "token is invalid" };
        }
        const has_friend = yield tables.friends.has_friend(user_id, friend_id);
        if (!has_friend) {
            console.log(prefix, "friend not found", user_id, friend_id);
            return { success: false, message: "friend not found" };
        }
        const has_chat = yield tables.friends.has_friend_chat(user_id, friend_id);
        if (has_chat) {
            console.log(prefix, "chat already exists", user_id, friend_id);
            return { success: false, message: "chat already exists" };
        }
        const chat = yield tables.friends.create_friend_chat(user_id, friend_id);
        if (chat) {
            console.log(prefix, "created chat", user_id, friend_id);
            return { success: true, id: chat._id };
        }
        else {
            console.log(prefix, "failed to create chat", user_id, friend_id);
            return { success: false, message: "failed to create chat" };
        }
    });
}
export class RequestBodyChatsGet {
}
;
export function chats_get(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "chats_get";
        console.log(prefix);
        const { user_id, token_hash, chat_id } = body;
        const valid = yield tables.tokens.validate(user_id, token_hash);
        if (!valid) {
            console.log(prefix, "token is invalid", user_id, token_hash);
            return { success: false, message: "token is invalid" };
        }
        const chat = yield tables.chats.findOne(chat_id);
        if (chat) {
            return { success: true, chat };
        }
        else {
            console.log(prefix, "chat not found", user_id, chat_id);
            return { success: false, message: "chat not found" };
        }
    });
}
export class RequestBodyChatsAddPost {
}
;
export function chats_add_post(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "chats_add_post";
        console.log(prefix);
        const { user_id, token_hash, chat_id, content } = body;
        const valid = yield tables.tokens.validate(user_id, token_hash);
        if (!valid) {
            console.log(prefix, "token is invalid", user_id, token_hash);
            return { success: false, message: "token is invalid" };
        }
        const post = yield tables.chats.insertPost(chat_id, { user_id, content });
        if (post) {
            console.log(prefix, "added post", user_id, chat_id, post._id);
            return { success: true, id: post._id };
        }
        else {
            console.log(prefix, "failed to add post", user_id, chat_id, post._id);
            return { success: false, message: "failed to add post" };
        }
    });
}
export class RequestBodyBlogsInsertPost {
}
;
export function blogs_insert_post(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "posts_create";
        console.log(prefix, body);
        const { user_id, token_hash, content } = body;
        const valid = yield tables.tokens.validate(user_id, token_hash);
        if (!valid) {
            console.log(prefix, "token is invalid", user_id, token_hash);
            return { success: false, message: "token is invalid" };
        }
        const post = yield tables.blogs.insertPost(user_id, { user_id, content });
        if (post) {
            console.log(prefix, "added post", user_id, post._id);
            return { success: true, id: post._id };
        }
        else {
            console.log(prefix, "failed to add post", user_id);
            return { success: false, message: "failed to add post" };
        }
    });
}
export class RequestBodyBlogsRemovePost {
}
;
export function blogs_remove_post(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "posts_delete";
        console.log(prefix);
        const { user_id, token_hash, post_id } = body;
        const valid = yield tables.tokens.validate(user_id, token_hash);
        if (!valid) {
            console.log(prefix, "token is invalid", user_id, token_hash);
            return { success: false, message: "token is invalid" };
        }
        const success = yield tables.blogs.deletePost(user_id, post_id);
        if (success) {
            console.log(prefix, "removed post", user_id, post_id);
            return { success: true };
        }
        else {
            console.log(prefix, "failed to remove post", user_id, post_id);
            return { success: false };
        }
    });
}
export class RequestBodyBlogsGet {
}
;
export function blogs_list_posts(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "posts_list";
        console.log(prefix, body);
        const { blog_id } = body;
        const blog = yield tables.blogs.findOne(blog_id);
        return { post_ids: blog.post_ids };
    });
}
export class RequestBodyNotifsChat {
}
;
export function notifs_get_chat(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = "posts_list";
        console.log(prefix);
        const { user_id, token_hash, clear } = body;
        const valid = yield tables.tokens.validate(user_id, token_hash);
        if (!valid) {
            console.log(prefix, "token is invalid", user_id, token_hash);
            return { success: false, message: "token is invalid" };
        }
        const chat_ids = yield tables.notifs_chat.set_keys(user_id);
        if (clear)
            yield tables.notifs_chat.set_clear(user_id);
        return { success: true, chat_ids: chat_ids };
    });
}
//# sourceMappingURL=API.js.map