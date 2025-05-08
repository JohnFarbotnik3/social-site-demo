<script lang="ts">
	import { SvelteMap } from "svelte/reactivity";
	import { onMount } from "svelte";
	import { get_date_string } from "/src/application/FormatUtil.js";
	import { state_chat } from "/src/application/state_chat.svelte.js";

	const { chat_id, ...props } = $props();
	const chat_state = state_chat;
	let value = $state("");

	// setup.
	let websocket = null;
	async function init_chat(chat_id) {
		await chat_state.unload();
		await chat_state.load(chat_id);
	}

	// init chat when id changes.
	let chat_id_prev = $state(null);
	function init_chat_on_id_change(chat_id) {
		if(chat_id_prev !== chat_id) {
			chat_id_prev = chat_id;
			init_chat(chat_id);
		}
	}
	$effect(() => { init_chat_on_id_change(chat_id); });
	onMount(() => { init_chat_on_id_change(chat_id); return () => { chat_state.unload(); }; });

	// send post.
	async function onclick_send() {
		chat_state.add_post(value);
		value = "";
	}
</script>

<div class="outer" {...props}>
	{#if chat_id}
		<div class="header">{[...state_chat.names.values()].join(", ")}</div>
		<div class="post_area">
			{#each state_chat.items as item}
				<div class="post" style={state_chat.styles.get(item.user_id)}>
					<div class="date">{get_date_string(item.updated)}</div>
					<p class="body">
						<span class="name">{state_chat.names.get(item.user_id)}</span>
						{item.content}
					</p>
				</div>
			{/each}
		</div>
		<div class="text_input_row">
			<textarea class="textarea" bind:value={value}></textarea>
			<button class="send_button" onclick={onclick_send}>Send</button>
		</div>
	{:else}
		No chat selected...
	{/if}
</div>

<style>
	.outer {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		align-items: center;
		outline: 1px solid var(--outline_clr_medium);
		outline-offset: -1px;
		max-width: 100%;
	}
	.header {
		width: 100%;
		text-align: center;
		font-weight: bold;
		outline: 1px solid var(--outline_clr_medium);
		outline-offset: -1px;
	}
	.post_area {
		background: #fff;
		/*
		width: calc(100% - 10px);
		padding: 5px;
		*/
		width: 100%;
		flex-grow: 1;
		overflow: scroll;
	}
	.text_input_row {
		background: #fff;
		width: 100%;
		display: flex;
		height: fit-content;
	}
	.textarea {
		margin: 2px;
		flex-grow: 1;
		resize: vertical;
	}
	.send_button {
		margin: 2px;
		height: 40px;
		align-self: end;
	}
	.post {
		padding: 2px;
		/*
		margin-bottom: 5px;
		outline: 1px solid #0003;
		*/

		.name {
			font-weight: bold;
			margin-right: 5px;
			background: #0001;
			border-radius: 5px;
			padding: 2px;
		}
		.body {
			margin: unset;
			margin-left: 5px;
			word-wrap: anywhere;
		}
		.date {
			font-size: 70%;
			float: right;
		}
	}
</style>
