
export function isCharAlpha(c: string): boolean {
	return ("a" <= c && c <= "z") || ("A" <= c && c <= "A");
}

export function isCharNumeric(c: string): boolean {
	return ("0" <= c && c <= "9");
}

export function isCharAlphaNumeric(c: string): boolean {
	return	("a" <= c && c <= "z") || ("A" <= c && c <= "Z") || ("0" <= c && c <= "9");
}
