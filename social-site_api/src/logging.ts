import { Request } from "express";
import { Socket_api } from "./api_ws.js";
import { StringId } from "social-site_types/types.js";
import * as fs from "node:fs";

export enum LOG_TYPE {
	FETCH_ACCOUNT_TOKEN_VALID,
	FETCH_ACCOUNT_CREATE,
	FETCH_ACCOUNT_DELETE,
	FETCH_ACCOUNT_LOGIN,
	FETCH_ACCOUNT_LOGOUT,
	FETCH_ACCOUNT_REMOVE,
	FETCH_ACCOUNT_UPDATE_T,
	FETCH_ACCOUNT_UPDATE_P,
	FETCH_USER_SEARCH,
	FETCH_BLOGS_INSERT_POST,
	FETCH_BLOGS_UPDATE_POST,
	FETCH_BLOGS_REMOVE_POST,
	FETCH_NOTIFS_CLEAR,
	FETCH_GET_BLOGS,
	FETCH_GET_BLOG_POSTS,
	FETCH_GET_CHATS,
	FETCH_GET_CHAT_POSTS,
	FETCH_GET_INFOS,
	FETCH_GET_FLIST,
	FETCH_GET_NOTIFS,
	FETCH_SYNC_BLOGS,
	FETCH_SYNC_POSTS,
	FETCH_SYNC_CHATS,
	FETCH_SYNC_INFOS,
	FETCH_SYNC_FLIST,
	FETCH_SYNC_NOTIFS,
	WS_USER,
	WS_USER_ONOPEN,
	WS_USER_ONCLOSE,
	WS_USER_ONERROR,
	WS_USER_LOGIN,
	WS_USER_FRIEND_ADD,
	WS_USER_FRIEND_REM,
	WS_CHAT,
	WS_CHAT_ONOPEN,
	WS_CHAT_ONCLOSE,
	WS_CHAT_ONERROR,
	WS_CHAT_LOGIN,
	WS_CHAT_ADD_POST,
};

export enum ERR_TYPE {
	SUCCESS,
	TABLE_INSERT_FAILED,
	TABLE_UPDATE_FAILED,
	TABLE_REMOVE_FAILED,
	USERNAME_TAKEN,
	USERNAME_NOT_FOUND,
	USER_ID_NOT_FOUND,
	ITEM_NOT_FOUND,
	INCORRECT_PASSWORD,
	INVALID_TOKEN,
	UNAUTHORIZED_READ,
	UNAUTHORIZED_WRITE,
	WS_ERROR,
	WS_FAILED_TO_PARSE_MESSAGE_TYPE,
	WS_FAILED_TO_PARSE_MESSAGE_JSON,
	WS_ALREADY_LOGGED_IN,
};


const enum_entries_log = [...Object.entries(LOG_TYPE)].filter(([k,_v]) => Number(k) >= 0).map(([k,v]) => [Number(k), v]) as [number, string][];
const enum_entries_err = [...Object.entries(ERR_TYPE)].filter(([k,_v]) => Number(k) >= 0).map(([k,v]) => [Number(k), v]) as [number, string][];
const map_entries_log = new Map(enum_entries_log);
const map_entries_err = new Map(enum_entries_err);

export type LogEntry = {
	/** which function was called. */
	log_type: LOG_TYPE;
	/** error type, or NONE if request was successful. */
	err_type: ERR_TYPE;
	/** ip address of user. */
	ip		: string | undefined;
	/** user_id (if available). */
	user_id	: StringId | null;
	/** arrival date of request. */
	date	: number;
	/** time taken to complete request (in nano-seconds). */
	dt		: number;
	/** size of request (in bytes). */
	sz_req	: number;
	/** size of response (in bytes). */
	sz_res	: number;
};

let log_entries	: LogEntry[] = [];


async function write_file(path: string, data: string | NodeJS.ArrayBufferView) {
	return new Promise((resolve, _reject) => {
		// https://nodejs.org/en/learn/manipulating-files/writing-files-with-nodejs
		fs.writeFile(path, data, (err) => {
			if(err)	{
				console.error(err);
				resolve(false);
			} else {
				console.log(`emitted log file: ${path}`);
				resolve(true);
			}
		});
	});
}

function get_log_dir() {
	return process.env["DIR_API_LOGS"] ?? "./logs";
}

let enum_log_written: boolean = false;
let traffic_log_period: number = 24 * 3600 * 1000;// start new log every 24h.
let traffic_log_date: number = 0;
let traffic_log_path: string = null;
export function append_to_traffic_log(log: LogEntry) {
	if(!traffic_log_date || (traffic_log_date + traffic_log_period < Date.now())) {
		// get new log path.
		const date = new Date();
		const fdir = get_log_dir();
		const dstr = date.toISOString();
		traffic_log_date = date.valueOf();
		traffic_log_path = `${fdir}/api_log_traffic_${dstr}.txt`;
		// write enums to a log for cross-referencing with traffic logs.
		if(!enum_log_written) {
			enum_log_written = true;
			const enum_log_path = `${fdir}/api_log_enums_${dstr}.txt`;
			const enumstr = JSON.stringify({
				log_types	: enum_entries_log,
				err_types	: enum_entries_err,
			});
			write_file(enum_log_path, enumstr);
		}
	}
	const data = JSON.stringify({
		...log,
		err_type: map_entries_err.get(log.err_type),
		log_type: map_entries_log.get(log.log_type),
	}) + "\n";
	fs.appendFileSync(traffic_log_path, data);
}

export function push_log_entry(req: Request, log_type: LOG_TYPE, t0: number, err_type: ERR_TYPE) {
	const log: LogEntry = {
		log_type: log_type,
		err_type: err_type,
		ip		: req.ip,
		user_id	: null,
		date	: Date.now(),
		dt		: Math.round((performance.now() - t0) * 1000000),
		// NOTE: for some reason getting request length from express is non-trivial.
		// (and adding middleware would make performance even worse; whereas in C++ thats less of a problem.)
		// https://stackoverflow.com/questions/32295689/how-to-get-byte-size-of-request
		sz_req	: 0,
		sz_res	: 0,
	};
	log_entries.push(log);
	append_to_traffic_log(log);
}

export function push_log_entry_ws(socket:Socket_api, log_type: LOG_TYPE, t0: number, err_type: ERR_TYPE) {
	const log: LogEntry = {
		log_type: log_type,
		err_type: err_type,
		ip		: socket.ip,
		user_id	: null,
		date	: Date.now(),
		dt		: Math.round((performance.now() - t0) * 1000000),
		sz_req	: 0,
		sz_res	: 0,
	};
	log_entries.push(log);
	append_to_traffic_log(log);
}

// extra logs with performance & leaderboard info.
export async function emit_logs() {
	const fdir = get_log_dir();
	const date_str = new Date().toISOString();
	// performance - time taken per function.
	{
		// name, N, dt (min, max, avg, median, cumulative).
		const counts = new Map<number, number>();
		const dt_sum = new Map<number, number>();
		const dt_min = new Map<number, number>();
		const dt_max = new Map<number, number>();
		for(const [key, _name] of enum_entries_log) {
			counts	.set(key, 0);
			dt_sum	.set(key, 0);
			dt_min	.set(key, 0x7fffffff);
			dt_max	.set(key, 0);
		}
		for(const { log_type, dt } of log_entries) {
			counts.set(log_type, counts.get(log_type) + 1);
			dt_sum.set(log_type, dt_sum.get(log_type) + dt);
			dt_min.set(log_type, Math.min(dt_min.get(log_type), dt));
			dt_max.set(log_type, Math.max(dt_max.get(log_type), dt));
		}
		const log = [];
		for(const [key, name] of enum_entries_log) {
			log.push({
				name	: name,
				count	: counts.get(key),
				dt_avg_us	: Math.round(dt_sum.get(key) * 1e-3 / counts.get(key)),
				dt_min_us	: Math.round(dt_min.get(key) * 1e-3),
				dt_max_us	: Math.round(dt_max.get(key) * 1e-3),
				dt_sum_sec	: dt_sum.get(key) * 1e-9,
			});
		}
		// emphasize functions that most processor-time is spent on.
		/* NOTE:
			if operations are scheduled asynchronously and end up waiting to be resolved later in the event loop,
			this can cause very large (and incorrect) cumulative processing-times.

			however, this may still indicate that they are preferred candidates for optimization,
			which is what the performance log is intended to draw attention to.
		*/
		log.sort((a,b) => b.dt_sum_sec - a.dt_sum_sec);
		// write log file.
		const path = `${fdir}/api_log_performance_${date_str}.txt`;
		const data = JSON.stringify(log);
		await write_file(path, data);
	}
	// leaderboard - most active users/ip-addresses.
	{
		const counts = new Map<string, number>();
		const dt_sum = new Map<string, number>();
		for(const { ip, dt } of log_entries) {
			counts.set(ip, (counts.get(ip) ?? 0) + 1);
			dt_sum.set(ip, (dt_sum.get(ip) ?? 0) + dt);
		}
		const sorted_counts = [...counts.entries()].sort((a,b) => b[1]-a[1]);
		const sorted_dt_sum = [...dt_sum.entries()].sort((a,b) => b[1]-a[1]);
		const log = {
			num_requests	: sorted_counts,
			cumulative_dt	: sorted_dt_sum,
		};
		// write log file.
		const path = `${fdir}/api_log_leaderboard_${date_str}.txt`;
		const data = JSON.stringify(log);
		await write_file(path, data);
	}
	// clear logs.
	log_entries = [];
}

/* NOTE | accessing logs from commandline:

https://docs.docker.com/reference/cli/docker/container/exec/
> open interactive terminal in container while it is running:
docker exec -it "social-site-demo-backend_api-1" sh


https://forums.docker.com/t/how-to-extract-file-from-image/96987
https://docs.docker.com/reference/cli/docker/container/cp/
> copy files from logs directory to host shared memory directory:
docker cp "social-site-demo-backend_api-1":"/workdir/logs" "/dev/shm/logs_$(date +%Y-%m-%d-%H-%M-%S)"


> clear log files (while container is running).
docker exec -it "social-site-demo-backend_api-1" rm -rf "/workdir/logs"


https://serverfault.com/questions/892656/docker-volume-rm-force-has-no-impact
> clear log files.
docker volume ls
docker volume inspect --format '{{ .Mountpoint }}' "social-site-demo_backend_api_logs"
sudo rm -rf "/var/lib/docker/volumes/social-site-demo_backend_api_logs"
sudp systemctl restart docker


*/


