
// https://stackoverflow.com/questions/26150232/how-can-i-access-promise-resolution-callbacks-outside-the-promise-constructor-ca
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers
export type DeferredPromise<T> = Promise<T> & {
	resolve	: (value: any) => void;
	reject	: (reason: any) => void;
};
export function getDeferredPromise<T>(): DeferredPromise<T> {
	const { promise, resolve, reject } = Promise.withResolvers<true>();
	Object.assign(promise, {resolve, reject});
	return promise as DeferredPromise<T>;
}
