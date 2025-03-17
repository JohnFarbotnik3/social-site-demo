<script>
	import { base_link } from "/src/application/NavigationUtil";
	import NavbarLink from "./NavbarLink.svelte";
	const { is_logged_in, display_name } = $props();
</script>

<nav>
	<NavbarLink href={base_link("/")}>Front page</NavbarLink>
	<span class="spacer"></span>
	{#if is_logged_in}
		<NavbarLink href={base_link("/posts")}>My Posts</NavbarLink>
		<NavbarLink href={base_link("/friends")}>Friends</NavbarLink>
		<span class="spacer"></span>
		<span id="name">{display_name}</span>
		<NavbarLink href={base_link("/profile")}>Profile</NavbarLink>
	{:else}
		<NavbarLink href={base_link("/login")}>Sign in</NavbarLink>
	{/if}
</nav>

<style>
	nav {
		background: #c6efc6;
		display: flex;
		align-items: center;
		padding: 2px;
	}
	.spacer {
		flex-grow: 1;
	}
	#name {
		background: #fff7;
		color: #0068c4;
		padding: 2px;
		margin: 2px;
		border-radius: 5px;
	}
</style>
