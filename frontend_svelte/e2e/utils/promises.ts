
export async function wait(millis: number) {
	const promise = new Promise<void>((res, rej) => {
		setTimeout(() => res(), millis);
	});
	return promise;
}

