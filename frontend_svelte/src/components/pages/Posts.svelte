<script>
	import { onMount } from "svelte";
	import * as api_cache from "/src/application/api_cache.svelte.js";
	import * as api_fetch from "/src/application/api_fetch.js";
	import { get_date_string } from "/src/application/FormatUtil.js";

	const { blog_id } = $props();
	let author		= $state(null);
	let posts		= $state([]);
	let loaded		= $state(false);
	let editable	= $state(false);
	let blog_id_prev	= $state(null);
	$inspect(posts);
	$inspect(author);
	$inspect(loaded);

	async function load(blog_id) {
		// check same blog_id.
		if(blog_id === blog_id_prev) return;
		blog_id_prev = blog_id;
		// sync, and get contents.
		loaded = false;
		await api_fetch.sync_blog(blog_id);
		const { blog, info, posts:_posts } = api_cache.get_blog_contents(blog_id);
		author = info;
		posts = _posts;
		editable = api_cache.is_my_user_id(blog_id);
		loaded = true;
	}
	onMount(() => { load(blog_id); });
	$effect(() => { load(blog_id); });

	// add, update, remove.
	function on_add_post(post) {
		posts.push(post);
	}
	function on_upd_post(post) {
		const ind = posts.findIndex(p => p._id === editor_post._id);
		posts[ind] = post;
	}
	function on_rem_post(post_id) {
		posts.splice(posts.findIndex(p => p._id === post_id), 1);
	}

	// ==============================
	// post editor.
	// ------------------------------

	let editor_shown	= $state(false);
	let editor_post		= $state(null);
	let editor_value	= $state("");
	function show_editor(post = null) {
		editor_shown = true;
		editor_post = post;
		editor_value = post ? post.content : "";
		console.log("show_editor", post);
	}
	function hide_editor() {
		editor_shown = false;
	}
	async function editor_submit() {
		const content = editor_value;
		// update post.
		if(editor_post) {
			const { success, message, postinfo } = await api_fetch.blogs_update_post(editor_post._id, content);
			if(success) {
				hide_editor();
				const post = { ...postinfo, content };
				on_upd_post(post);
			}
		}
		// create new post.
		else {
			const { success, message, postinfo } = await api_fetch.blogs_insert_post(content);
			if(success) {
				hide_editor();
				const post = { ...postinfo, content };
				on_add_post(post);
			}
		}
	}
	async function editor_remove() {
		const post = editor_post;
		const { success, message } = await api_fetch.blogs_remove_post(post._id);
		if(success) {
			on_rem_post(post._id);
			hide_editor();
		}
	}
</script>

<div class="page">
	{#if !editor_shown}
		{#if editable}
			<div class="actions_bar">
				<button onclick={() => show_editor()}>Add post</button>
			</div>
		{:else}
			<div class="author">
				<div class="author_nickname">{author?.nickname}</div>
				<div class="author_username">@{author?.username}</div>
			</div>
		{/if}
		{#if loaded}
		<div class="posts_area">
			{#each posts as post}
				<div class="post">
					{#if editable}<button class="edit" onclick={() => show_editor(post)}>Edit</button>{/if}
					<div class="body">{post.content}</div>
					<div class="date">{get_date_string(post.updated)}</div>
				</div>
			{/each}
			{#if posts.length === 0}
				<div style="text-align: center;">{author?.nickname ?? "[nickname]"} has not posted yet...</div>
			{/if}
		</div>
		{:else}
			loading...
		{/if}
	{:else}
		<div class="actions_bar">
			<button onclick={hide_editor}>Back</button>
		</div>
		<div class="editor_area">
			<textarea class="editor_textarea" bind:value={editor_value}></textarea>
			<div class="editor_buttons">
				<button onclick={editor_submit}>Submit</button>
				{#if editor_post}<button onclick={editor_remove}>Remove</button>{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.posts_area {}
	.post {
		outline: 1px solid var(--outline_clr_soft);
		outline-offset: -1px;
		margin: var(--post_margin);
		padding: var(--post_padding);

		.body {}
		.date {
			font-size: 80%;
		}
		.edit {
			float: right;
		}
	}
	.author {
		background: #fee;
		padding: 2px;
	}
	.author_nickname {
		font-weight: bold;
	}
	.author_username {}
	.editor_area {
		background: #eee;
		flex-grow: 1;
		display: flex;
		flex-direction: column;
	}
	.editor_textarea {
		margin: 5px;
		height: 100px;
	}
	.editor_buttons {
		margin: 5px;
		display: flex;
		justify-content: end;
	}
</style>
