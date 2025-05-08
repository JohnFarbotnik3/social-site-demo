<script>
	import * as StringUtil from "/src/application/StringUtil.js";
	let { name, type, label, info, value=$bindable(), error=$bindable(), extra, readonly, mustmatch, ...props } = $props();

	// true if element has been interacted with.
	let touched = $state(false);

	// password match field.
	let pwd_match_vis = $state(false);
	let pwd_match_val = $state();

	// default name-types.
	if(name === "username"	) type = "text";
	if(name === "password"	) type = "password";
	if(name === "email"		) type = "email";

	// validators.
	function func_text(value) {
		if(!value)				return `field is required`;
		return null;
	}
	function func_email(value) {
		if(!value)					return `email is required`;
		if(!value.includes("@"))	return `email format is invalid`;
		if(!value.includes("."))	return `email format is invalid`;
		return null;
	}
	function func_password(value) {
		if(!value)					return `password is required`;
		if(value.length < 12)		return `password too short`;

		let ltr = 0;
		for(const c of value) ltr += StringUtil.isCharAlpha(c) ? 1 : 0;
		if(ltr < 1) return `password must contain at least one letter`;

		let num = 0;
		for(const c of value) num += StringUtil.isCharNumeric(c) ? 1 : 0;
		if(num < 1) return `password must contain at least one number`;

		let spc = 0;
		for(const c of value) spc += StringUtil.isCharAlphaNumeric(c) ? 0 : 1;
		if(spc < 1) return `password must contain at least one special character`;

		if(pwd_match_vis && value !== pwd_match_val) return `password does not match`;

		return null;
	}
	let error_func = null;
	if(type === "text")		error_func = func_text;
	if(type === "email")	error_func = func_email;
	if(type === "password")	error_func = func_password;

	// update state.
	$effect(() => {
		// show password match field.
		//const autofilled = document.activeElement.tagName !== "INPUT";
		if(mustmatch && !pwd_match_vis) {
			pwd_match_vis = true;
			pwd_match_val = value;
		}
		// update error state.
		if(error_func) error = error_func(value, extra);
	});

</script>

<fieldset>
	<label class="label">
		{label}
		{#if info}<span class="info" title={info}>?</span>{/if}
		{#if readonly}
		<div class="readonly">{value ?? "(empty)"}</div>
		{:else}
		<input
			type={type}
			name={name}
			bind:value={value}
			class={(error && touched) ? "invalid" : "valid"}
			readonly={readonly ? true : false}
			onblur={() => { touched = true; }}
			{...props}
		/>
		{/if}
	</label>
	<label class="label" style={pwd_match_vis ? "" : "display:none;"}>
		enter password again
		<input type={type} bind:value={pwd_match_val} class={error ? "invalid" : "valid"}/>
	</label>
	<div class="error" style={readonly ? "display:none;" : (error && touched) ? "" : "visibility:hidden"}>{error}</div>
</fieldset>

<style>
	fieldset {
		border: unset;
		padding: 2px;
		margin: 5px 0px 5px 0px;
		outline: 1px solid var(--outline_clr_soft);
	}
	.label {
		margin-bottom: 2px;
	}
	.info {
		float: right;
		outline: 1px solid #999;
		outline-offset: -2px;
		border-radius: 50%;
		width: 24px;
		height: 24px;
		text-align: center;
	}
	.error {
		min-height: 20px;
		font-size: 80%;
		margin-left: 2px;
		color: #930;
	}
	input {
		border: 1px solid black;
		border-radius: 3px;
		margin: 2px;
		margin-top: 0px;
	}
	input:focus.valid {
		outline: 2px solid #75cd83;
	}
	input.invalid {
		outline: 2px solid #ff9aab;
	}
	.readonly {
		background: #fff;
		padding-left: 2px;
		padding-right: 2px;
	}
</style>
