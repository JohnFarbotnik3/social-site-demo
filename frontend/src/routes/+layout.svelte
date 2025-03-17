<script>
	import Navbar from "./Navbar.svelte";
	import { API } from "../application/exports";
	import { base_goto, base_link, beforeNavigate } from "/src/application/NavigationUtil";
	const { children } = $props();

	// list of routes that do not require a user.
	const routes = [
		"/",
		"/login",
		"/posts",
	].map(path => base_link(path));

	// automatically navigate to login page if no user logged in.
	const is_logged_in = $derived(API.user.token);
	const display_name = $derived(API.user?.nickname);
	function goto_login_page() {
		if(!is_logged_in && !routes.includes(location.pathname)) base_goto("/login");
	}
	goto_login_page();
	beforeNavigate(goto_login_page);
</script>

<div id="nav">
	<Navbar
		is_logged_in={is_logged_in}
		display_name={display_name}
	/>
</div>
<div id="body">
	{@render children()}
</div>

<style>
	#nav {
		padding: 0px;
	}
	#body {
		padding: 10px;
	}
</style>
