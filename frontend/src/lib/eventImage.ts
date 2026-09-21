import { API_URL } from "./api";

export function getEventImageUrl(value: string | null | undefined) {
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  const normalized = value.replace(/^\/+/, "");
  return `${API_URL}/${normalized.includes("/") ? normalized : `uploads/${normalized}`}`;
}