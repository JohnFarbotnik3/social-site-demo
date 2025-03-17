
export function isCharAlpha(c) {
	return ("a" <= c & c <= "z") | ("A" <= c & c <= "A");
}

export function isCharNumeric(c) {
	return ("0" <= c & c <= "9");
}

export function isCharAlphaNumeric(c) {
	return	("a" <= c & c <= "z") | ("A" <= c & c <= "Z") | ("0" <= c & c <= "9");
}
