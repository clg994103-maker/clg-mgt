export function safeReturnTo(value: string | null | undefined, fallback = "/student") {
  return value?.startsWith("/") ? value : fallback;
}

export function loginRedirect(returnTo: string, action?: string) {
  const params = new URLSearchParams({ returnTo });
  if (action) params.set("action", action);
  return `/student/login?${params.toString()}`;
}
