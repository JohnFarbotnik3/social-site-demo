export class List {
}
;
export class User {
    constructor(username, nickname, password) {
        this.username = username;
        this.nickname = nickname;
        User.set_password(this, password);
    }
    static generate_salt() {
        return "SALT_" + Date.now() + "_";
    }
    static generate_hash(password, salt) {
        return salt + password;
    }
    static set_password(user, password) {
        const password_salt = this.generate_salt();
        const password_hash = this.generate_hash(password, password_salt);
        user.password_salt = password_salt;
        user.password_hash = password_hash;
    }
    static is_password_correct(user, password) {
        return this.generate_hash(password, user.password_salt) === user.password_hash;
    }
}
;
export class UserPublicInfo {
}
;
export class Token {
}
;
export class Post {
}
;
export class PostData {
}
;
export class Blog {
}
;
export class Chat {
}
;
export class Friend {
}
;
//# sourceMappingURL=Types.js.map