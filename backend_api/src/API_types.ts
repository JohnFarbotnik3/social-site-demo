import {
    Chat,
    Friend,
	Post,
	StringId,
	UserPublicInfo,
	WithStringId,
} from "./Types.js";

export class ResponseBodyWithMessage {
	success	: boolean;
	message?: string;
};
export class ResponseBodyWithMessageOrId {
	success	: boolean;
	message?: string;
	id?		: StringId;
};
export class ResponseBodyAccountLogin {
	success	: boolean;
	id		: StringId;
	token	: string;
	nickname: string;
};
export class ResponseBodyPostsList {
	post_ids: StringId[];
}
export class ResponseBodyPostsGet {
	posts	: WithStringId<Post>[];
}
export class ReponseBodyUsersGetPublicInfo {
	user_infos	: WithStringId<UserPublicInfo>[];
};
export class ReponseBodyUsersSearch {
	user_ids: StringId[];
};
export class ResponseBodyFriendsList {
	success	: boolean;
	list	: Friend[];
};
export class ResponseBodyChatsGet {
	success	: boolean;
	chat	: WithStringId<Chat>;
};

export class ResponseBodyNotifsChat {
	success	: boolean;
	chat_ids: StringId[];
};

export const BODY_INVALID_TOKEN = { success:false, message:"token is invalid" };
export const BODY_USER_NOT_FOUND = { success:false, message:"user not found" };
