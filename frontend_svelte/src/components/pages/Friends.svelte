<script lang="ts">
	import GroupChat from "./GroupChat.svelte";
	import { onMount } from "svelte";
	import { goto, ROUTES } from "/src/application/routes.js";
	import * as api_cache	from "/src/application/api_cache.svelte";
	import * as api_fetch	from "/src/application/api_fetch.js";
	import * as api_ws		from "/src/application/api_ws.js";

	let value_filter = $state("");
	let friend_items = $state([]);
	let filter_items = $state([]);

	// update list when cached friends-list changes.
	async function refresh_list() {
		const friends = api_cache.get_friends();
		await api_fetch.get_infos(friends.map(friend => friend.user_id));
		friend_items = [];
		for(const friend of friends) {
			const info		= api_cache.get_friend_info(friend.user_id);
			const user_id	= friend.user_id;
			const chat_id	= friend.chat_id;
			if(!info) throw("no info");
			const username	= info.username;
			const nickname	= info.nickname;
			const new_chats	= api_cache.has_new_chats(chat_id);
			const item	= { _id:user_id, user_id, chat_id, username, nickname, new_chats };
			friend_items.push(item);
		}
	}
	$effect(() => { refresh_list(); });

	// periodically check for chat-activity notifications.
	function refresh_new_chats() {
		for(let i=0;i<friend_items.length;i++) {
			const item = friend_items[i];
			const newc = api_cache.has_new_chats(item.chat_id)
			if( newc && !item.new_chats) friend_items[i] = {...item, new_chats:newc };
			if(!newc &&  item.new_chats) friend_items[i] = {...item, new_chats:newc };
		}
	}
	onMount(() => {
		const itv = setInterval(async () => { refresh_new_chats(); }, 500);
		return () => clearInterval(itv);
	});

	// update filtered list - when "friend_items" or "value_filter" changes.
	$effect(() => {
		const lower = value_filter.toLowerCase();
		filter_items = friend_items.filter(item => (item.username.toLowerCase().includes(lower) || item.nickname.toLowerCase().includes(lower)));
	});

	// sync friends list on mount.
	onMount(async function() {
		console.log("init_flist()");
		await api_fetch.sync_friendlist();// NOTE: this may not be needed, as sync is also called when logging in.
		const [add_ids, rem_ids] = api_cache.get_friend_notifs();
		await api_fetch.notifs_clear_friends_added  (add_ids);
		await api_fetch.notifs_clear_friends_removed(rem_ids);
	});

	// show chat.
	let current_chat_id = $state<StringId|null>(null);
	async function onclick_chat(event, chat_id) {
		current_chat_id = chat_id;
	}
	// go to friend's posts page.
	function onclick_posts(event, friend_id) {
		event.stopPropagation();
		event.preventDefault();
		goto(ROUTES.posts + "?id=" + friend_id);
	}
	// remove friend.
	async function onclick_rem(event, friend_id) {
		event.stopPropagation();
		event.preventDefault();
		api_ws.ws_user_friend_rem(friend_id);
	}
</script>

<div class="filters_bar">
	<input bind:value={value_filter} placeholder="filter by username"/>
	<div class="result_count">results: {filter_items.length}</div>
</div>
<div class="columns">
	<div class="list_area">
		{#each filter_items as { _id, chat_id, username, nickname, new_chats }}
			<!-->
				a link is used as the chat button, so that it can be tabbed to and activated with keyboard (accessibility).
				see:
				https://stackoverflow.com/questions/40507427/focus-and-trigger-enter-key-on-div
				https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/button_role
			<--->
			<a
				href="#"
				class={"item_user" + (new_chats ? " btn_chat_notif" : "")}
				onclick={(event) => onclick_chat(event, chat_id)}
			>
				<div class="user_info_buttons">
					<button class="rem_friend" onclick={(event) => onclick_rem (event, _id)}>Remove</button>
					<button onclick={(event) => onclick_posts(event, _id)}>View Posts</button>
				</div>
				<div class="nickname">{nickname}</div>
				<div class="username">{username}</div>
			</a>
		{/each}
	</div>
	<div class="chat_area">
		<GroupChat chat_id={current_chat_id}></GroupChat>
	</div>
</div>

<style>
	.result_count {
		text-align: center;
		margin-left: 5px;
		align-content: center;
	}
	.columns {
		margin-top: 10px;
		display: grid;
		grid-template-columns: 240px 1fr;
		grid-gap: 5px;
		flex-grow: 1;
		overflow-y: hidden;
	}
	.chat_area {
		display: flex;
		overflow-y: scroll;
	}
	.list_area {
		overflow-y: scroll;
	}
	.nickname {
		font-weight: bold;
	}
	.user_info_buttons {
		float: right;
	}
	.btn_chat_notif {
		background: #b6ffb4;
	}
</style>
