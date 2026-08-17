/* AZAAD Free Password Security Control
 *
 * Checks a candidate password against Have I Been Pwned's free Pwned Passwords
 * range API using k-anonymity. The full password and full SHA-1 hash never leave
 * the browser; only the first five SHA-1 characters are sent.
 *
 * Intended for signup/password-change flows. Do not call this on every login.
 */

export async function isLeakedPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new TypeError('Password is required');
  }

  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(
    `https://api.pwnedpasswords.com/range/${prefix}`,
    {
      headers: {
        'Add-Padding': 'true'
      },
      cache: 'no-store'
    }
  );

  if (!response.ok) {
    throw new Error(`Password security service returned ${response.status}`);
  }

  const body = await response.text();
  const match = body
    .split(/\r?\n/)
    .map((line) => line.split(':'))
    .find(([returnedSuffix]) => returnedSuffix === suffix);

  return {
    leaked: Boolean(match),
    occurrenceCount: match ? Number(match[1]) || 0 : 0
  };
}

export async function assertSafePassword(password) {
  const result = await isLeakedPassword(password);
  if (result.leaked) {
    const error = new Error('PASSWORD_COMPROMISED');
    error.code = 'PASSWORD_COMPROMISED';
    error.occurrenceCount = result.occurrenceCount;
    throw error;
  }
  return result;
}
