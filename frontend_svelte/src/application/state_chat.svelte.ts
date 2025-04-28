import type { ChatPost, StringId, TimeStamp, UserInfo, WithStringId } from "backend_api_types/types";
import { SvelteMap } from "svelte/reactivity";
import * as api_cache from "./api_cache.svelte.js";
import * as api_fetch from "./api_fetch.js";
import * as api_ws from "./api_ws.js";

type ChatItem = {
	created	: TimeStamp;
	user_id	: StringId;
	content	: string;
	name	: string;
	style	: string;
};

export class State_chat {
	loaded	= $state(false);
	error	= $state<unknown>(null);
	chat_id	= $state<StringId | null>(null);
	n_users	= 0;
	names	= new SvelteMap<StringId, string>();
	styles	= new SvelteMap<StringId, string>();
	items	= $state<ChatItem[]>([]);
	websocket: api_ws.ws_socket_chat | null	= null;

	async load(chat_id: StringId): Promise<boolean> {
		try {
			// sync chat.
			await api_fetch.sync_chat(chat_id);
			await api_fetch.notifs_clear_chat_activity(chat_id);
			// add users and posts.
			const { infos, posts } = api_cache.get_chat_contents(chat_id);
			for(const info of infos) this.on_add_user(info);
			for(const post of posts) this.on_add_post(post);
			// open websocket.
			this.websocket = api_ws.ws_chat_open_socket(chat_id);
			await this.websocket.ready;
			// set loaded.
			this.loaded = true;
			return true;
		} catch(err) {
			this.error = err;
			return false;
		}
	}

	async unload() {
		if(!this.loaded) return;
		this.loaded = false;
		this.n_users = 0;
		this.names.clear();
		this.styles.clear();
		this.items = [];
		if(this.websocket) this.websocket.close();
	}

	on_add_user(userinfo: WithStringId<UserInfo>) {
		this.names	.set(userinfo._id, userinfo.nickname);
		this.styles	.set(userinfo._id, `background: hsl(${(this.n_users++)%360*-0.27*360 + 200} ${92} ${92});`);
	}

	on_add_post(post: ChatPost) {
		const name	= this.names.get(post.user_id);
		const style	= this.styles.get(post.user_id);
		if(!name) throw("no name");
		if(!style) throw("no style");
		const item:ChatItem	= {...post, name, style};
		this.items.push(item);
	}
	add_post(value: string) {
		if(!this.websocket) throw("no websocket");
		api_ws.ws_chat_add_post(this.websocket, value);
	}

	on_soft_error(message: string) { console.error("on_soft_error", message); this.error = message; }
	on_hard_error(message: string) { console.error("on_hard_error", message); this.error = message; }

};
export const state_chat = new State_chat();
