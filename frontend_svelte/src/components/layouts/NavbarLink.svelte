<script>
	import { afterNavigate } from '$app/navigation';

	const { href, children, exact, ...props } = $props();

	let path = $state(location);
	let active = $state(is_current_path());
	afterNavigate(() => {
		path = location;
		active = is_current_path();
	});

	function is_current_path() {
		//window["a"] = href;
		//window["b"] = path;
		if(exact || exact === undefined) return href === path.pathname + path.search;
		else return href.split("?")[0] === path.pathname;
	}
</script>

<a href={href} class={active ? "active" : ""} {...props}>
	{@render children()}
</a>

<style>
	a {
		background: var(--navbar_bg_button_0);
		font-size: var(--navbar_btn_font_size);
		padding: var(--navbar_btn_padding);
		text-decoration: unset;
		color: unset;
		border-radius: 5px;
		outline: 1px solid var(--outline_clr_medium);
		outline-offset: -1px;
	}
	.active {
		background: var(--navbar_bg_button_1);
		cursor: default;
	}
</style>
