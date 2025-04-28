<script>
	import { DropdownMenu } from "/src/components/exports";
	import NavbarLink from "./NavbarLink.svelte";
	import * as api_fetch from "/src/application/api_fetch.js";
	import { goto, ROUTES } from "/src/application/routes.js";

	const { is_logged_in, username, nickname } = $props();

	async function onclick_logout() {
		const response = await api_fetch.account_logout();
		goto(ROUTES.root);
	}
</script>

{#snippet dropdown_button(onclick)}
	<button class="dd_button" onclick={onclick}>
		{nickname}
	</button>
{/snippet}

{#snippet dropdown_content()}
	<div class="dd_content">
		<div style="text-align: center;">{username}</div>
		<button onclick={onclick_logout}>Log out</button>
	</div>
{/snippet}

<nav>
	<NavbarLink href={ROUTES.root}>Home page</NavbarLink>
	<span class="spacer"></span>
	{#if is_logged_in}
		<NavbarLink href={ROUTES.profile}>Profile</NavbarLink>
		<NavbarLink href={ROUTES.posts}>My Posts</NavbarLink>
		<NavbarLink href={ROUTES.friends}>Friends</NavbarLink>
		<NavbarLink href={ROUTES.search}>Search</NavbarLink>
		<span class="spacer"></span>
		<DropdownMenu button={dropdown_button} content={dropdown_content}></DropdownMenu>
	{:else}
		<NavbarLink href={ROUTES.login}>Sign in</NavbarLink>
	{/if}
</nav>

<style>
	nav {
		background: var(--navbar_bg);
		display: flex;
		align-items: center;
		padding: 2px;
		height: 30px;
	}
	.spacer {
		flex-grow: 1;
	}
	.dd_button {
		background: #fff7;
		color: #0068c4;
		font-size: var(--navbar_btn_font_size);
		padding: var(--navbar_btn_padding);
		border-radius: 5px;
		outline: 1px solid #777;
		border: none;
		justify-content: center;
		align-items: center;
		font-weight: bold;
	}
	.dd_content {
		display: flex;
		flex-direction: column;
		width: fit-content;
		background: #fff;
		outline: 1px solid #bbb;
		padding: 2px;

		button {
			border: none;
			border-radius: 3px;
			margin: 2px;
			outline: 1px solid var(--outline_clr_medium)
		}
	}
</style>
