
export function get_padded_number(num:number, digits:number): string {
	const sub = num.toString();
	return new Array(digits - sub.length).fill("0").join("") + sub;
}

export function get_date_string(timestamp:number): string {
	const date = new Date(timestamp);
	const s_date = date.toISOString();
	const s_time = date.toISOString().split("T")[1].split(".")[0];
	return ((Date.now() - timestamp) < 24*3600*1000) ? s_time : s_date;
}
