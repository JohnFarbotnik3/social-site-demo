<script>
	import { API } from "/src/application/exports";
	import { onMount } from "svelte";

	const { chat_id, onclick_close, ...props } = $props();

	const user_id = API.user.id;
	let names = $state(new Map());
	let posts = $state([]);
	let value = $state("");

	async function fetch_chat_data() {
		const { success, message, chat } = await API.chats_get(chat_id);
		console.log("chat", chat);
		if(success) {
			const user_infos = await API.users_get_public_info(chat.user_ids);
			names = new Map(user_infos.map(user => ([user.id, user.nickname])));
			posts = await API.posts_get(chat.post_ids);
		}
	}

	// fetch posts when chat_id changes.
	$effect(() => fetch_chat_data());

	async function onclick_send() {
		const { success, message, id } = await API.chats_add_post(chat_id, value);
		if(success) {
			// manually add to local list of posts (reduces traffic).
			posts.push({ _id:id, user_id, content:value, created:Date.now(), updated:Date.now() });
		}
	}

	// check notifications for new chat messages from friend.
	// https://svelte.dev/docs/svelte/lifecycle-hooks
	onMount(() => {
		const interval = setInterval(() => {
			if(API.notifs.chat_ids.includes(chat_id)) {
				fetch_chat_data().then(() => API.notifs_rem_chat(chat_id));
			}
		}, 100);

		return () => clearInterval(interval);
	});
	// TODO
</script>

<div class="outer" {...props}>
	<button id="close" onclick={onclick_close}>Close</button>
	<div class="post_area">
		{#each posts as post}
			<div class={"post" + (post.user_id === user_id ? " post_me" : "")}>
				<div class="name">{names.get(post.user_id)}</div>
				<p class="body">{post.content}</p>
				<div class="date">{new Date(post.updated)}</div>
			</div>
		{/each}
	</div>
	<div class="text_area">
		<textarea bind:value={value}></textarea>
		<button onclick={onclick_send}>Send</button>
	</div>
</div>

<style>
	.outer {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		align-items: center;
		padding: 5px;
		background: #eadfdf;
		outline: 1px solid black;
		border-radius: 5px;
	}
	#close {
		position: absolute;
		right: 0px;
		top: 0px;
		border: unset;
		border-radius: 2px;
		outline: 1px solid black;
	}
	.post_area {
		background: #fff;
		width: calc(100% - 10px);
		padding: 5px;
		flex-grow: 1;
		overflow: scroll;
	}
	.text_area {
		background: #fff;
		width: 100%;
		height: 25%;
		display: flex;

		textarea {
			flex-grow: 1;
			resize: none;
		}
		button {
			margin: 2px;
		}
	}
	.post {
		margin-bottom: 5px;
		padding: 2px;
		outline: 1px solid #0003;
	}
	.post_me {
		background: #eee;
	}
	.name {
		font-weight: bold;
	}
	.body {
		margin: unset;
		margin-left: 5px;
	}
	.date {
		font-size: 50%;
	}
</style>
