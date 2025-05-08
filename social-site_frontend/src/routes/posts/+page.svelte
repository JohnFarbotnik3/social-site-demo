<script>
	import { page } from "$app/stores";
	import * as api_cache from "/src/application/api_cache.svelte.js";
	import Posts from "/src/components/pages/Posts.svelte";

	const blog_id = $derived($page.url.searchParams.get("id") ?? api_cache.cache.user?.id);
</script>

{#if blog_id}
<Posts blog_id={blog_id}>
</Posts>
{/if}
