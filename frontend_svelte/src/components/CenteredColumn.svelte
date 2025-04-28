<script>
	const { children, ...props } = $props();
</script>

<div class="outer">
	<div class="inner" {...props}>
		{@render children()}
	</div>
</div>

<style>
	.outer {
		display			: flex;
		flex-direction	: column;
		width			: 100%;
		height			: 100%;
		align-items		: center;
		justify-content	: center;
	}
	.inner {
		background		: #8af08754;
		padding			: 20px;
		border-radius	: 5px;
	}
</style>
