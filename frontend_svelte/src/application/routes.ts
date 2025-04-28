
import { beforeNavigate, goto } from '$app/navigation';
import { base } from '$app/paths';
import { is_logged_in } from './api_cache.svelte';

export { beforeNavigate, goto, base };

export const ROUTES = {
	root	: base+"/",
	login	: base+"/login",
	posts	: base+"/posts",
	profile	: base+"/profile",
	friends	: base+"/friends",
	search	: base+"/search",
};

export function check_page_requires_login() {
	// list of unrestricted paths.
	const arr = [
		ROUTES.root,
		ROUTES.login,
		ROUTES.posts,
	];
	if(!is_logged_in() && !arr.includes(location.pathname)) goto(ROUTES.login);
}
