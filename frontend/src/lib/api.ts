const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
export const API_URL = configuredApiUrl ?? (typeof window === "undefined"
	? "http://localhost:5000"
	: `${window.location.protocol}//${window.location.hostname}:5000`);
