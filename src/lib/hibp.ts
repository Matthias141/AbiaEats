'use server';

/**
 * HaveIBeenPwned password check using the k-anonymity range API.
 *
 * How it works:
 * 1. SHA-1 hash the password
 * 2. Send only the first 5 hex chars to the HIBP API
 * 3. HIBP returns all hash suffixes matching that prefix
 * 4. Check if the full hash suffix appears in the response
 *
 * The full password (or its full hash) is never sent over the network.
 * If the API is unreachable, we fail open (allow signup) — availability
 * of an external service should never block account creation.
 */

async function sha1(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export async function isPasswordBreached(password: string): Promise<{
  breached: boolean;
  count: number;
}> {
  try {
    const hash = await sha1(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': 'AbiaEats-Signup-Check' },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return { breached: false, count: 0 };
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return { breached: true, count: parseInt(countStr.trim(), 10) };
      }
    }

    return { breached: false, count: 0 };
  } catch {
    // HIBP API unreachable — fail open
    return { breached: false, count: 0 };
  }
}
