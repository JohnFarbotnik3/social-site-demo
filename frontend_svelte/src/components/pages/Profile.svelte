<script>
	import { CenteredColumn, FormInput } from "/src/components/exports";
	import * as Strings from "/src/strings";
	import * as api_cache from "/src/application/api_cache.svelte.js";
	import * as api_fetch from "/src/application/api_fetch.js";

	let usn_value = $state();
	let usn_error = $state();
	let nnm_value = $state();
	let nnm_error = $state();
	let pwd_value = $state();
	let pwd_error = $state();
	let old_value = $state();
	let old_error = $state();
	let any_error = $state();
	$effect(() => { any_error = usn_error || pwd_error || nnm_error; });

	function reset_fields() {
		const user = api_cache.cache.user;
		usn_value = user?.username;
		pwd_value = user?.password;
		nnm_value = user?.nickname;
	}
	reset_fields();

	/*
		0 - display fields.
		1 - edit common fields.
		2 - edit password.
		3 - delete account.
	*/
	let edit_level = $state(0);
	let submit_error = $state("");
	function onedit_0() { edit_level = 0; submit_error = null; reset_fields(); }
	function onedit_1() { edit_level = 1; submit_error = null; }
	function onedit_2() { edit_level = 2; submit_error = null; }
	function onedit_3() { edit_level = 3; submit_error = null; }

	async function onsubmit() {
		const username = usn_value;
		const nickname = nnm_value;
		const password_new = pwd_value;
		const password_old = old_value;
		if(edit_level === 1) {
			const response = await api_fetch.account_patch_with_token({ nickname });
			if(response.success) onedit_0(); else submit_error = response.message;
		}
		if(edit_level === 2) {
			const response = await api_fetch.account_patch_with_password({ username, password:password_new }, password_old);
			if(response.success) onedit_0(); else submit_error = response.message;
		}
		if(edit_level === 3) {
			const password = pwd_value;
			const response = await api_fetch.account_delete(password);
			if(response.success) {} else submit_error = response.message;
		}
	}

	const info_usn = Strings.info_edit_username;
	const info_pwd = Strings.info_edit_password;
	const info_nnm = Strings.info_edit_nickname;
</script>

<div class="page">
	{#if edit_level === 0}
	<div class="actions_bar">
		<button onclick={onedit_1}>Edit</button>
	</div>
	<div class="inputs">
		<FormInput readonly={true} bind:value={nnm_value} bind:error={nnm_error} info={null} label="nickname" />
		<FormInput readonly={true} bind:value={usn_value} bind:error={usn_error} info={null} label="username" />
	</div>
	{/if}
	{#if edit_level === 1}
	<div class="actions_bar">
		<button onclick={onedit_0}>Back</button>
		<hr class="bar_hr">
		<button onclick={onedit_2}>Change username or password</button>
		<hr class="bar_hr">
		<button onclick={onedit_3}>Delete account</button>
	</div>
	<div class="inputs">
		<FormInput readonly={false} bind:value={nnm_value} bind:error={nnm_error} info={info_nnm} label="nickname" type="text" />
	</div>
	<button onclick={onsubmit} disabled={any_error ? true : false}>Submit changes</button>
	<div class="errmsg" hidden={!submit_error}>{submit_error}</div>
	{/if}
	{#if edit_level === 2}
	<div class="actions_bar">
		<button onclick={onedit_1}>Back</button>
	</div>
	<div class="inputs">
		<FormInput readonly={false} bind:value={old_value} bind:error={old_error} info={null}     label="old password" name="password" mustmatch={false} />
		<FormInput readonly={false} bind:value={usn_value} bind:error={usn_error} info={info_usn} label="new username" type="text" />
		<FormInput readonly={false} bind:value={pwd_value} bind:error={pwd_error} info={info_pwd} label="new password" type="password" mustmatch={true} />
	</div>
	<button onclick={onsubmit} disabled={any_error ? true : false}>Submit changes</button>
	<div class="errmsg" hidden={!submit_error}>{submit_error}</div>
	{/if}
	{#if edit_level === 3}
	<div class="actions_bar">
		<button onclick={onedit_1}>Back</button>
	</div>
	<div class="inputs">
		<FormInput readonly={false} bind:value={pwd_value} bind:error={pwd_error} info={info_pwd} label="password" type="password" mustmatch={false} />
	</div>
	<button onclick={onsubmit} disabled={any_error ? true : false}>Submit and delete</button>
	<div class="errmsg" hidden={!submit_error}>{submit_error}</div>
	{/if}
</div>

<style>
	.inputs {
		width: 200px;
	}
	.actions_bar button {
		margin-left: 1px;
		margin-right: 1px;
	}
	.errmsg {
		color: red;
	}
</style>
