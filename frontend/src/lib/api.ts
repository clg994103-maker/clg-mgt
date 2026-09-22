import { auth } from "../firebase/config";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
const defaultApiUrl = process.env.NODE_ENV === "production"
	? "https://clg-mgt.onrender.com"
	: "http://localhost:5000";

export const API_URL = configuredApiUrl || defaultApiUrl;

export async function apiFetch(path: string, options: RequestInit = {}) {
	try {
		const headers = new Headers(options.headers);
		const user = auth.currentUser;
		if (user) headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
		return await fetch(`${API_URL}${path}`, { ...options, headers });
	} catch (reason) {
		if (process.env.NODE_ENV === "development") console.error("API request failed:", reason);
		throw new Error("Unable to connect to the Campus Events server. Please try again.");
	}
}
