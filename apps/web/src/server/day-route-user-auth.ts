type SiteUserResponse = { id?: string };

function backendApiBase(): string {
  const configured =
    process.env.DAIBILET_API_INTERNAL_URL || process.env.DAIBILET_API_URL || process.env.DAIBILET_API_BASE_URL;
  return (configured || 'http://127.0.0.1:4000').trim().replace(/\/$/, '');
}

/** Ask the existing buyer-auth service to validate the bearer token. */
export async function resolveDayRouteSiteUserId(request: Request): Promise<string | null> {
  const authorization = request.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) return null;
  try {
    const response = await fetch(`${backendApiBase()}/api/user/auth/me`, {
      headers: { authorization },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const user = (await response.json()) as SiteUserResponse;
    return typeof user.id === 'string' && user.id ? user.id : null;
  } catch {
    return null;
  }
}
