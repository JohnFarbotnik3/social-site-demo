<script>
	import { API } from "/src/application/exports";
	import { GroupChat } from "/src/components/exports";
	import { base_link } from "/src/application/NavigationUtil";

	let friend_chats = $state([]);
	function friend_chats_get(friend_id) {
		return friend_chats.find(friend => friend.user_id === friend_id)?.chat_id;
	}
	function friend_chats_set(friend_id, chat_id) {
		return friend_chats.find(friend => friend.user_id === friend_id).chat_id = chat_id;
	}
	function has_new_chats(friend_id) {
		const chat_id = friend_chats_get(friend_id);
		return API.notifs.chat_ids.includes(chat_id);
	}

	let mode = $state(0);
	let value_filter = $state("");
	let value_search = $state("");
	let friend_user_infos = $state([]);
	let filter_user_infos = $state([]);
	let search_user_infos = $state([]);
	$inspect(friend_user_infos);
	$inspect(filter_user_infos);
	$inspect(search_user_infos);
	async function get_search_user_infos() {
		const user_ids = await API.users_search(value_search);
		if(user_ids.length > 0)
				search_user_infos = await API.users_get_public_info(user_ids);
		else	search_user_infos = [];
	}
	async function get_friend_user_infos() {
		const { success, message, list } = await API.friends_list();
		if(success) {
			const user_ids = list.map(friend => friend.user_id);
			if(user_ids.length > 0)
					friend_user_infos = await API.users_get_public_info(user_ids);
			else	friend_user_infos = [];
			friend_chats = list;
		}
	}
	// init friends list on-load.
	get_friend_user_infos();

	let debounce_timer = null;
	function debounce(func) {
		if(debounce_timer) clearTimeout(debounce_timer);
		debounce_timer = setTimeout(() => { func(); debounce_timer = null; }, 500);
	}

	// update filtered list.
	$effect(() => {
		console.log("value_filter", value_filter);
		if(!value_filter) { filter_user_infos = friend_user_infos; return; }
		const lower = value_filter.toLowerCase();
		filter_user_infos = friend_user_infos.filter(user => user.username.toLowerCase().includes(lower) | user.nickname.toLowerCase().includes(lower));
	});
	// update search list.
	$effect(() => {
		console.log("value_search", value_search);
		if(value_search.length > 0) debounce(get_search_user_infos);
		else search_user_infos = [];
	});

	function can_add_friend(id) {
		return (id !== API.user.id && !friend_user_infos.find(user => user._id === id)) ? true : false;
	}
	async function onclick_add(event, id) {
		event.stopPropagation();
		event.preventDefault();
		const response = await API.friends_insert(id);
		// update local lists.
		const friend_info = search_user_infos.find(user => user._id === id);
		friend_user_infos.push(friend_info);
		friend_chats.push({ user_id:friend_info._id, chat_id:null });
	}
	async function onclick_rem(event, id) {
		event.stopPropagation();
		event.preventDefault();
		const response = await API.friends_remove(id);
		// update local lists.
		friend_user_infos.splice(friend_user_infos.findIndex(user => user._id === id), 1);
		friend_chats.splice(friend_chats.findIndex(friend => friend.user_id === id), 1);
	}

	// ==============================
	// chat
	// ------------------------------

	let chat_id = $state(null);
	async function onclick_chat(event, friend_id) {
		event.stopPropagation();
		event.preventDefault();
		const cid = friend_chats_get(friend_id);
		if(cid) {
			// show chat.
			chat_id = cid;
		} else {
			// create chat.
			const { success, message, id } = await API.friends_create_chat(friend_id);
			if(success) {
				chat_id = id;
				friend_chats_set(friend_id, id);// add to local list.
			}
		}
	}
	async function close_chat() {
		chat_id = null;
	}

</script>

<div class="page">
	<div class="actions_bar">
		{#if mode===0}
			<input bind:value={value_filter} placeholder="filter by username"/>
			<button onclick={() => {mode = 1;}}>Add Friends</button>
		{/if}
		{#if mode===1}
			<input bind:value={value_search} placeholder="search by username" />
			<button onclick={() => {mode = 0;}}>Back</button>
		{/if}
	</div>
	<div class="list_area">
		{#if mode === 0}
		<div class="result_count">results: {filter_user_infos.length}</div>
		{#each filter_user_infos as { _id, username, nickname }}
			<a href={base_link(`/posts?id=${_id}`)}>
				<div class="user_info">
					<button class="rem_friend" onclick={(event) => onclick_rem (event, _id)}>Remove friend</button>
					<button
						class={"btn_chat" + (has_new_chats(_id) ? " btn_chat_notif" : "")}
						onclick={(event) => onclick_chat(event, _id)}
					>
						{friend_chats_get(_id) ? "Chat" : "New Chat"}
					</button>
					<div class="nickname">{nickname}</div>
					<div class="username">{username}</div>
				</div>
			</a>
		{/each}
		{/if}
		{#if mode === 1}
		<div class="result_count">results: {search_user_infos.length}</div>
		{#each search_user_infos as { _id, username, nickname }}
			<a href={base_link(`/posts?id=${_id}`)}>
				<div class="user_info">
					{#if can_add_friend(_id)}<button class="add_friend" onclick={(event) => onclick_add(event, _id)}>Add friend</button>{/if}
					<div class="nickname">{nickname}</div>
					<div class="username">{username}</div>
				</div>
			</a>
		{/each}
		{/if}
	</div>
	{#if chat_id !== null}
	<div class="chat_area">
		<GroupChat chat_id={chat_id} onclick_close={close_chat}></GroupChat>
	</div>
	{/if}
</div>

<style>
	a {
		text-decoration: none;
		color: unset;
	}
	.page {
		display: flex;
		flex-direction: column;
	}
	.chat_area {
		position: absolute;
		top: 20vh;
		bottom: 20vh;
		left: 10vw;
		right: 10vw;
		display: flex;
	}
	.actions_bar {
		background: #eef;
		display: flex;
		flex-direction: row;
		flex-grow: 0;
		justify-content: center;
		padding: 5px;
		input {
			margin-right: 20px;
		}
	}
	.result_count {
		text-align: center;
	}
	.list_area {
		flex-grow: 1;
	}
	.user_info {
		padding: 2px;
		outline: 1px solid black;
		outline-offset: -1px;
		cursor: pointer;
	}
	.user_info:hover {
		background: #ddf;
	}
	.username {}
	.nickname {
		font-weight: bold;
	}
	.add_friend {
		float: right;
	}
	.rem_friend {
		float: right;
	}
	.btn_chat {
		float: right;
	}
	.btn_chat_notif {
		background: lime;
	}
</style>
