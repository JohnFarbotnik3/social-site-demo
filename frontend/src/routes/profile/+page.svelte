<script>
	import { base_goto } from "/src/application/NavigationUtil";
	import { API } from "/src/application/exports";
	import { ContainerColumn, FormInput } from "/src/components/exports";
	import * as Strings from "/src/strings";

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
		usn_value = API.user.username;
		pwd_value = API.user.password;
		nnm_value = API.user.nickname;
	}
	reset_fields();

	/*
		0 - display fields.
		1 - edit common fields.
		2 - edit password.
	*/
	let edit_level = $state(0);
	let submit_error = $state("");
	function onedit_0() { edit_level = 0; submit_error = null; reset_fields(); }
	function onedit_1() { edit_level = 1; submit_error = null; }
	function onedit_2() { edit_level = 2; submit_error = null; }

	async function onsubmit() {
		const username = usn_value;
		const nickname = nnm_value;
		const password_new = pwd_value;
		const password_old = old_value;
		if(edit_level === 1) {
			const response = await API.account_patch_with_token({ username, nickname });
			if(response.success) onedit_0(); else submit_error = response.message;
		}
		if(edit_level === 2) {
			const response = await API.account_patch_with_password({ password:password_new }, password_old);
			if(response.success) onedit_0(); else submit_error = response.message;
		}
	}

	const info_usn = Strings.info_edit_username;
	const info_pwd = Strings.info_edit_password;
	const info_nnm = Strings.info_edit_nickname;

	async function onlogout() {
		base_goto("/");
		const response = await API.account_logout();
	}
</script>

<ContainerColumn style="width:200px;">
	<div class="action_buttons">
		<button class="logout_button" onclick={onlogout}>Log out</button>
	</div>
	{#if edit_level === 0}
	<div class="action_buttons">
		<button onclick={onedit_1}>Edit</button>
	</div>
	<FormInput readonly={true} bind:value={nnm_value} bind:error={nnm_error} info={null} label="nickname" />
	<FormInput readonly={true} bind:value={usn_value} bind:error={usn_error} info={null} label="username" />
	{/if}
	{#if edit_level === 1}
	<div class="action_buttons">
		<button onclick={onedit_0}>Cancel</button>
	</div>
	<FormInput readonly={false} bind:value={nnm_value} bind:error={nnm_error} info={info_nnm} label="nickname" type="text" />
	<FormInput readonly={false} bind:value={usn_value} bind:error={usn_error} info={info_usn} label="username" type="text" />
	<div class="action_buttons">
		<button onclick={onsubmit} disabled={any_error ? true : false}>Submit</button>
		<button onclick={onedit_2}>Change password</button>
	</div>
	<div class="errmsg" hidden={!submit_error}>{submit_error}</div>
	{/if}
	{#if edit_level === 2}
	<div class="action_buttons">
		<button onclick={onedit_1}>Back</button>
	</div>
	<FormInput readonly={false} bind:value={old_value} bind:error={old_error} info={null}     label="old password" name="password" mustmatch={false} />
	<FormInput readonly={false} bind:value={pwd_value} bind:error={pwd_error} info={info_pwd} label="new password" type="password" mustmatch={true} />
	<div class="action_buttons">
		<button onclick={onsubmit} disabled={any_error ? true : false}>Submit</button>
	</div>
	<div class="errmsg" hidden={!submit_error}>{submit_error}</div>
	{/if}
</ContainerColumn>

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
	.logout_button {
		background: #fbb;
		border: 1px solid gray;
		border-radius: 5px;
		padding: 2px;
	}
	.logout_button:hover {
		background: #caa;
	}
</style>
