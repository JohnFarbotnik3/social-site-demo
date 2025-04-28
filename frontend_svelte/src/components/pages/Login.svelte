<script>
	import { goto, ROUTES } from "/src/application/routes.js";
	import * as api_fetch from "/src/application/api_fetch.js";
	import { CenteredColumn, FormInput } from "/src/components/exports";
	import * as Strings from "/src/strings";

	let usn_value = $state();
	let usn_error = $state();
	let pwd_value = $state();
	let pwd_error = $state();
	let nnm_value = $state();
	let nnm_error = $state();
	let any_error = $state();
	$effect(() => { any_error = usn_error || pwd_error || nnm_error; });

	let submit_error = $state("");
	async function onlogin() {
		const username = usn_value;
		const password = pwd_value;
		const { success, message } = await api_fetch.account_login(username, password);
		if(success) goto(ROUTES.profile); else submit_error = message;
	}

	let signup_mode = $state(false);
	function oncreate() {
		signup_mode = true;
	}
	function onback() {
		signup_mode = false;
	}
	async function onsubmit() {
		const username = usn_value;
		const password = pwd_value;
		const nickname = nnm_value;
		const { success, message } = await api_fetch.account_create(username, password, nickname);
		if(success) goto(ROUTES.profile); else submit_error = message;
	}

	const show_info = $derived(signup_mode);
	const info_usn = $derived(show_info ? Strings.info_edit_username : "");
	const info_pwd = $derived(show_info ? Strings.info_edit_password : "");
	const info_nnm = $derived(show_info ? Strings.info_edit_nickname : "");
</script>

<CenteredColumn style="width:200px;">
	{#if signup_mode}
	<FormInput readonly={false} bind:value={usn_value} bind:error={usn_error} info={info_usn} label="username" name="username" />
	<FormInput readonly={false} bind:value={pwd_value} bind:error={pwd_error} info={info_pwd} label="password" name="password" mustmatch={false} />
	<FormInput readonly={false} bind:value={nnm_value} bind:error={nnm_error} info={info_nnm} label="nickname" />
	<div class="action_buttons">
		<button onclick={onsubmit} disabled={any_error ? true : false}>Submit</button>
		<button onclick={onback}>Back</button>
	</div>
	{:else}
	<FormInput readonly={false} bind:value={usn_value} bind:error={usn_error} info={info_usn} label="username" name="username" />
	<FormInput readonly={false} bind:value={pwd_value} bind:error={pwd_error} info={info_pwd} label="password" name="password" mustmatch={false} />
	<div class="action_buttons">
		<button onclick={onlogin} disabled={any_error ? true : false}>Log in</button>
		<button onclick={oncreate}>Sign up</button>
	</div>
	{/if}
	<div class="errmsg" hidden={!submit_error}>{submit_error}</div>
</CenteredColumn>

<style>
	.action_buttons {
		display: flex;
		flex-direction: column;

		button {
			margin: 5px;
		}
	}
	.errmsg {
		color: red;
	}
</style>
