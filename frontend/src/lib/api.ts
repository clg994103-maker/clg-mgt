const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
const defaultApiUrl = process.env.NODE_ENV === "production"
	? "https://clg-mgt.onrender.com"
	: "http://localhost:5000";

export const API_URL = configuredApiUrl || defaultApiUrl;
