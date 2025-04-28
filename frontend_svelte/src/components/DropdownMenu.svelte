<script>
	import { onMount } from "svelte";
	import { afterNavigate } from '$app/navigation';

	const { button, content, ...props } = $props();

	let elem_content = $state();
	let show_content = $state(false);

	function clicked_outside_of_content_listener(event) {
		// check if one of the parent elements is the content container.
		let target = event.target;
		let outside = true;// true if clicked outside of content.
		while(target) {
			if(target === elem_content) { outside = false; break; }
			target = target.parentElement;
		}
		if(outside) hide_content_func();
	}
	function show_content_func() {
		show_content = true;
		window.addEventListener("click", clicked_outside_of_content_listener);
	}
	function hide_content_func() {
		show_content = false;
		window.removeEventListener("click", clicked_outside_of_content_listener);
	}
	onMount(() => {
		return () => hide_content_func();
	});
	afterNavigate(() => {
		hide_content_func();
	});

	function onclick(event) {
		// add click listener when content is shown.
		if(!show_content) {
			event.stopPropagation();// prevents automatically triggering listener.
			show_content_func();
		} else {
			hide_content_func();
		}
		// return early if not showing content.
		if(!show_content) return;
		// get button dimensions.
		const elem = event.target;
		const { x, y, width, height, top, right, bottom, left } = elem.getBoundingClientRect();
		const body_rect = document.body.getBoundingClientRect();
		console.log(elem);
		// spawn content near button.
		// TODO: create different position modes. current mode: UNDER_RIGHT_ALIGNED
		elem_content.style = `
			position:absolute;
			top: ${bottom + 8}px;
			right: ${body_rect.right - right}px;
		`;
	}
</script>

{#if button}
	{@render button(onclick)}
{:else}
	ICON
{/if}
<div bind:this={elem_content} >
	{#if show_content && content}
		{@render content()}
	{/if}
</div>
