
// https://donchev.is/post/docker-containers-slow-shutdown/
// https://stackoverflow.com/questions/50356032/whats-the-docker-compose-equivalent-of-docker-run-init
// https://docs.docker.com/reference/compose-file/services/#init
// https://docs.docker.com/compose/support-and-feedback/faq/
// https://github.com/moby/moby/issues/3766
// https://github.com/moby/moby/pull/3240
// https://stackoverflow.com/questions/21831493/my-nodejs-script-is-not-exiting-on-its-own-after-successful-execution
// https://stackoverflow.com/questions/36354445/nodejs-child-process-exit-before-stdio-streams-close
/**
	a function for forcefully shutting down a process if there isnt pending activity in the event loop.

	I often saw only 2 sockets open during testing - which looked like stdout (fd:1) and stderr (fd:2), (both with "_isStdio: true")
	so my assumption is that it is safe (enough) to just exit the process forcefully,
	since for some reason node doesnt exit on its own when launched as part of a "docker-compose up" call.
*/
export function try_exit_process() {
	// set interval to check when it process is (probably) safe to exit.
	const itv = setInterval(() => {
		// https://stackoverflow.com/questions/21831493/my-nodejs-script-is-not-exiting-on-its-own-after-successful-execution
		const requests = (process as any)._getActiveRequests();
		const handles  = (process as any)._getActiveHandles();
		if(
			handles.length === 2 && requests.length === 0
			&& [1,2].includes(handles[0]?.fd ?? 0)
			&& [1,2].includes(handles[1]?.fd ?? 0)
			&& handles[0]?._isStdio === true
			&& handles[0]?._isStdio === true
		) {
			clearInterval(itv);
			console.log("only stdout and stderr sockets leftover, exiting");
			console.log(requests);
			console.log(handles);
			setTimeout(() => process.exit(), 100);
		}
	}, 50);
	// log if it takes a long time for requests and handles to close.
	setTimeout(() => {
		const requests = (process as any)._getActiveRequests();
		const handles  = (process as any)._getActiveHandles();
		console.log("LEFTOVER HANDLES AND REQUESTS");
		console.log(requests);
		console.log(handles);
	}, 1000);
}
