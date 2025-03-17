<script>
	import { API } from "/src/application/exports";
	import { base_goto } from "/src/application/NavigationUtil";

	// load posts when arriving at page.
	let posts = $state([]);
	let editable = $state(false);
	async function load_posts() {
		let user_id = new URLSearchParams(location.search).get("id");
		// load another user's posts.
		if(user_id) {
			editable = false;
			const post_ids = await API.blogs_list_posts(user_id);
			if(post_ids) posts = await API.posts_get(post_ids);
		}
		// load this user's posts (if logged in).
		if(!user_id && API.is_logged_in()) {
			editable = true;
			const user_id = API.user.id;
			const post_ids = await API.blogs_list_posts(user_id);
			if(post_ids) posts = await API.posts_get(post_ids);
		}
		// route away if on "my posts" page yet not logged in.
		if(!user_id && !API.is_logged_in()) {
			console.log("tried to view 'my posts' when not logged in ... navigating ...");
			base_goto("/login");
		}
	}
	load_posts();

	// post editor.
	let editor_shown = $state(false);
	let editor_post  = $state(null);// null if adding, post_id if editing.
	let editor_value = $state("");
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
		if(editor_post) {
			const post = editor_post;
			const { success, message } = await API.posts_update(post._id, content);
			if(success) {
				// manually update local copy of post.
				post.content = content;
				post.updated = Date.now();
				editor_shown = false;
			}
		} else {
			const { success, message, id } = await API.blogs_insert_post(content);
			editor_value = "";
			if(success) {
				// manually create local copy of post (rather then fetching new post, reduces traffic).
				const post = {
					_id		: id,
					user_id	: API.user.id,
					content	: content,
					created	: Date.now(),
					updated	: Date.now(),
				};
				posts.push(post);
				editor_shown = false;
			}
		}
	}
	async function editor_remove() {
		const post = editor_post;
		const { success, message } = await API.blogs_remove_post(post._id);
		if(success) {
			// remove post from local list.
			posts.splice(posts.findIndex(p => p._id === post._id), 1);
			editor_shown = false;
		}
	}
</script>

<div class="page">
	{#if !editor_shown}
		<div class="actions_bar">
			{#if editable}<button onclick={() => show_editor()}>Add post</button>{/if}
		</div>
		<div class="posts_area">
			{#each posts as post}
				<div class="post">
					{#if editable}<button class="edit" onclick={() => show_editor(post)}>Edit</button>{/if}
					<div class="body">{post.content}</div>
					<div class="date">{new Date(post.updated)}</div>
				</div>
			{/each}
		</div>
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
	.page {
		display: flex;
		flex-direction: column;
	}
	.actions_bar {
		background: #eee;
		display: flex;
		flex-direction: row;
		flex-grow: 0;
		justify-content: center;
		padding: 5px;
	}
	.posts_area {
		background: #eee;
		flex-grow: 1;
	}
	.post {
		margin: 5px;
		outline: 1px solid #0003;
		.body {
			margin: 5px;
		}
		.date {
			font-size: 80%;
		}
		.edit {
			float: right;
		}
	}
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
