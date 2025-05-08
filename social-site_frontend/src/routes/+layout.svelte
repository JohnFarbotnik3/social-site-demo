<script lang="ts">
	import "../styles.css";
	import Navbar from "/src/components/layouts/Navbar.svelte";
	import { beforeNavigate, check_page_requires_login } from "/src/application/routes.js";
	import * as api_cache from "/src/application/api_cache.svelte.js";

	const { children } = $props();

	// automatically navigate to login page if no user logged in.
	const is_logged_in = $derived.by(() => api_cache.is_logged_in());
	const username = $derived(api_cache.cache.user?.username);
	const nickname = $derived(api_cache.cache.user?.nickname);

	check_page_requires_login();
	beforeNavigate(check_page_requires_login);
</script>

<div id="nav">
	<Navbar is_logged_in={is_logged_in} username={username} nickname={nickname}/>
</div>
<div id="body">
	{@render children()}
</div>
