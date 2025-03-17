
import { beforeNavigate, goto } from '$app/navigation';
import * as Naviation from '$app/navigation';
import { base } from '$app/paths';

export { beforeNavigate, base };

export function base_link(path) {
	return base + path;
}

export function base_goto(path) {
	goto(base + path);
}
