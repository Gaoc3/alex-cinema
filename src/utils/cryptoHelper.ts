import CryptoJS from 'crypto-js';

// The secret key used for encryption and decryption of API response payloads.
// This is separate from the URL encryption (which uses server-only keys).
const SECRET_KEY = 'vA$c1n_S3cr3t_K3y_!2024';

/**
 * Encrypts data to a Base64 encoded AES string.
 * Used by the API route before sending JSON responses to the client.
 */
export const encryptData = (data: any): string => {
  const jsonStr = JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonStr, SECRET_KEY).toString();
};

/**
 * Decrypts a Base64 encoded AES string back to its original JSON object.
 * Used by frontend components to read API responses.
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
