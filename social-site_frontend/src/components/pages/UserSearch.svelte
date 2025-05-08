<script>
	import { ROUTES } from "/src/application/routes.js";
	import * as api_cache from "/src/application/api_cache.svelte.js";
	import * as api_fetch from "/src/application/api_fetch.js";
	import * as api_ws from "/src/application/api_ws.js";

	let search_value = $state("");
	let search_infos = $state([]);
	async function get_search_infos() {
		search_infos = await api_fetch.user_search(search_value);
	}

	// update search list.
	let debounce_timer = null;
	function debounce(func) {
		if(debounce_timer) clearTimeout(debounce_timer);
		debounce_timer = setTimeout(() => { func(); debounce_timer = null; }, 500);
	}
	$effect(() => {
		if(search_value.length > 0) debounce(get_search_infos);
		else search_infos = [];
	});

	// add friend.
	function can_add_friend(id) {
		return api_cache.can_add_friend(id);
	}
	async function onclick_add(event, id) {
		//event.stopPropagation();
		//event.preventDefault();
		const response = await api_ws.ws_user_friend_add(id);
	}
</script>

<div class="page">
	<div class="filters_bar">
		<input bind:value={search_value} placeholder="search by username" />
		<div class="result_count">results: {search_infos.length}</div>
	</div>
	<div class="list_area">
		{#each search_infos as { _id, username, nickname }}
			<div class="item_user">
				{#if can_add_friend(_id)}<button class="add_friend" onclick={(event) => onclick_add(event, _id)}>Add friend</button>{/if}
				<a href={ROUTES.posts + "?id=" + _id}>
					<div class="nickname">{nickname}</div>
					<div class="username">{username}</div>
				</a>
			</div>
		{/each}
	</div>
</div>

<style>
	.result_count {
		text-align: center;
		margin-left: 5px;
		align-content: center;
	}
	.list_area {
		margin-top: 10px;
		flex-grow: 1;
	}
	.username {}
	.nickname {
		font-weight: bold;
	}
	.add_friend {
		float: right;
	}
</style>
