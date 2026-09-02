const REQUIRED_ENV = [
  'DATABASE_URL',
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'AZAAD_IDENTITY_PROVIDER'
];

export function runtimeContract() {
  const configured = Object.fromEntries(
    REQUIRED_ENV.map((name) => [name, Boolean(String(process.env[name] || '').trim())])
  );

  const identityProvider = String(process.env.AZAAD_IDENTITY_PROVIDER || '').trim().toLowerCase();

  return {
    database: configured.DATABASE_URL,
    storage: configured.APPWRITE_ENDPOINT && configured.APPWRITE_PROJECT_ID && configured.APPWRITE_API_KEY,
    identity: configured.AZAAD_IDENTITY_PROVIDER && identityProvider === 'appwrite',
    supabaseRuntimeAllowed: false,
    configured
  };
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}
