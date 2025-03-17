<script>
	import { afterNavigate } from '$app/navigation';

	const { href, children } = $props();

	let path = $state(location.pathname);
	afterNavigate(() => path = location.pathname);
</script>

<a href={href} class={href === path ? "active" : ""}>
	{@render children()}
</a>

<style>
	a {
		background: #00e095;
		padding: 2px;
		margin: 2px;
		text-decoration: unset;
		color: unset;
		border-radius: 5px;
	}
	.active {
		cursor: default;
		outline: 2px solid #00972d;
	}
</style>
