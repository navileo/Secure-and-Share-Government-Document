/**
 * Validation utilities for the application
 */
export const validators = {
    isValidEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    isValidAadhaar: (aadhaar) => {
        return /^\d{12}$/.test(aadhaar);
    },
    isStrongPassword: (password) => {
        return password.length >= 8;
    }
};

/**
 * PII-safe data hashing
 */
export async function hashData(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
