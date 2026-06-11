import CryptoJS from 'crypto-js';

// The secret key used for encryption and decryption.
// In a real production app, this could be stored in environment variables,
// but for the frontend to decrypt it, it must be embedded or fetched.
const SECRET_KEY = 'vA$c1n_S3cr3t_K3y_!2024';

/**
 * Encrypts data to a Base64 encoded AES string.
 * This is used primarily by the API route before sending the response to the client.
 */
export const encryptData = (data: any): string => {
  const jsonStr = JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonStr, SECRET_KEY).toString();
};

/**
 * Decrypts a Base64 encoded AES string back to its original JSON object.
 * This is used by the frontend components.
 */
export const decryptData = (ciphertext: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr) {
      throw new Error("Decryption returned empty string (likely wrong key).");
    }
    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error("Failed to decrypt data:", error);
    return null;
  }
};

// Fixed 32-byte key and 16-byte IV for deterministic URL encryption (required to prevent SSR hydration errors)
const URL_KEY = CryptoJS.enc.Utf8.parse('vA$c1n_S3cr3t_K3y_!2024_00000000');
const URL_IV = CryptoJS.enc.Utf8.parse('vA$c1n_IV_!2024_');

/**
 * Encrypts a URL to a URL-safe Base64 encoded AES string.
 * This MUST be deterministic to avoid React hydration errors.
 */
export const encryptUrl = (url: string): string => {
  const encrypted = CryptoJS.AES.encrypt(url, URL_KEY, { iv: URL_IV }).toString();
  // Make it URL-safe: replace +, /, and remove =
  return encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Decrypts a URL-safe Base64 encoded AES string back to the original URL.
 */
export const decryptUrl = (encryptedUrl: string): string => {
  try {
    // Restore Base64 formatting
    let base64 = encryptedUrl.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const bytes = CryptoJS.AES.decrypt(base64, URL_KEY, { iv: URL_IV });
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    return '';
  }
};

