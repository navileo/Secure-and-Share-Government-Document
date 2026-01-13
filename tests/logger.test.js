import logger from '../src/lib/logger.js';
import log from 'loglevel';

// Mock loglevel
jest.mock('loglevel', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    levels: { INFO: 2 },
    setLevel: jest.fn()
}));

describe('Logger Utility', () => {
    it('should sanitize Aadhaar number in logs', () => {
        const sensitiveData = { aadhaar: '123456789012', name: 'John Doe' };
        logger.info('User info', sensitiveData);
        
        expect(log.info).toHaveBeenCalledWith(
            expect.stringContaining('[INFO] User info'),
            expect.objectContaining({
                aadhaar: '****9012',
                name: 'John Doe'
            })
        );
    });

    it('should sanitize OTP in logs', () => {
        const sensitiveData = { otp: '123456' };
        logger.warn('Login attempt', sensitiveData);
        
        expect(log.warn).toHaveBeenCalledWith(
            expect.stringContaining('[WARN] Login attempt'),
            expect.objectContaining({
                otp: '****3456'
            })
        );
    });
});
