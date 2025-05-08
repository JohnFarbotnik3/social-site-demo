import { API_URL_PREFIX } from "../../env.build";

export const url_prefix	= API_URL_PREFIX ?? "";
export const path_fetch	= window.location.host + url_prefix;
export const path_ws	= window.location.host + url_prefix;
