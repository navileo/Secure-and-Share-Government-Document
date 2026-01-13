import logger from '../lib/logger.js';

/**
 * OTP system with random generation and expiration
 */
let currentOTP = null;
let otpExpiry = null;
const OTP_EXPIRY_MS = 20000; // 20 seconds

export async function sendOTP(identifier) {
    // Generate a random 6-digit number
    currentOTP = Math.floor(100000 + Math.random() * 900000).toString();
    otpExpiry = Date.now() + OTP_EXPIRY_MS;
    
    logger.info('Generated random OTP', { identifier, otp: currentOTP, expiresAt: new Date(otpExpiry).toLocaleTimeString() });
    
    // In a real app, this would be sent via SMS/Email
    return currentOTP;
}

export async function verifyOTP(otp) {
    logger.info('Verifying random OTP...');
    
    if (!currentOTP || !otpExpiry) {
        throw new Error('No active OTP found. Please request a new one.');
    }

    const now = Date.now();
    if (now > otpExpiry) {
        currentOTP = null;
        otpExpiry = null;
        throw new Error('OTP has expired (20s limit). Please try again.');
    }

    if (otp !== currentOTP) {
        throw new Error('Invalid OTP. Please check the code and try again.');
    }
    
    // Valid OTP
    currentOTP = null; // Clear after successful verification
    otpExpiry = null;
    return true;
}
