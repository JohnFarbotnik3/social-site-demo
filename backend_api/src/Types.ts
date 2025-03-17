
// original code from MongoDB.WithId
export declare type StringId = string;
export declare type EnhancedOmit<TRecordOrUnion, KeyUnion> = string extends keyof TRecordOrUnion ? TRecordOrUnion : TRecordOrUnion extends any ? Pick<TRecordOrUnion, Exclude<keyof TRecordOrUnion, KeyUnion>> : never;
export declare type WithStringId<TSchema> = EnhancedOmit<TSchema, '_id'> & { _id: StringId; };

/** a direct list of items. */
export class List<T> {
	list: T[];
};

export class User {
	/** internal name of user (unique). */
	username		: string;
	/** user's display name. */
	nickname		: string;
	/** random value for generating unique password hashes. */
	password_salt	: string;
	/** output from hashing together provided password and per-user password-salt. */
	password_hash	: string;

	constructor(username:string, nickname:string, password:string) {
		this.username = username;
		this.nickname = nickname;
		User.set_password(this, password);
	}

	static generate_salt(): string {
		return "SALT_" + Date.now() + "_";
	}
	static generate_hash(password:string, salt:string): string {
		return salt + password;
	}
	static set_password(user:Partial<User>, password:string) {
		const password_salt = this.generate_salt();
		const password_hash = this.generate_hash(password, password_salt);
		user.password_salt = password_salt;
		user.password_hash = password_hash;
	}
	static is_password_correct(user:User, password:string): boolean {
		return this.generate_hash(password, user.password_salt) === user.password_hash;
	}
};

export class UserPublicInfo {
	username		: string;
	nickname		: string;
};

export class Token {
	/** a random value that should be very unlikely to guess at random.*/
	hash	: string;
	/** expirey date of token. */
	date	: number;
};

export class Post {
	/** ID of user who created this post. */
	user_id	: StringId;
	/** date created. */
	created	: number;
	/** date last modified. */
	updated	: number;
	/** content of post. */
	content	: string;
};
export class PostData {
	user_id	: StringId;
	content	: string;
};

export class Blog {
	post_ids: StringId[];
};

export class Chat {
	/** list of users who are currently members of this chat. */
	user_ids	: StringId[];
	/** list of posts belonging to this chat. */
	post_ids	: StringId[];
};

export class Friend {
	user_id: StringId;
	/** chat_id of group chat associated with friend. */
	chat_id: StringId | null;
};



