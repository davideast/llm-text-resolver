// A utility to convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Check if we are in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * Calculates the SHA-256 hash of a string in a universal way.
 * @param text The text to hash.
 * @returns A promise that resolves to the hex-encoded hash.
 */
export async function sha256(text: string): Promise<string> {
  if (isBrowser && window.crypto?.subtle) {
    // Browser environment
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return bufferToHex(hashBuffer);
  } else {
    // Node.js environment
    const crypto = await import('node:crypto');
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}
