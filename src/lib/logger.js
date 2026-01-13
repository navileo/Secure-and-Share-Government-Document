import log from 'loglevel';

// Set default log level
log.setLevel(log.levels.INFO);

// Custom logger to ensure PII safety (like Aadhaar)
const logger = {
    info: (message, data = {}) => {
        log.info(`[INFO] ${message}`, sanitize(data));
    },
    error: (message, error = {}) => {
        log.error(`[ERROR] ${message}`, sanitize(error));
    },
    warn: (message, data = {}) => {
        log.warn(`[WARN] ${message}`, sanitize(data));
    },
    debug: (message, data = {}) => {
        log.debug(`[DEBUG] ${message}`, sanitize(data));
    }
};

// Simple sanitization to avoid logging sensitive data like full Aadhaar
function sanitize(data) {
    if (!data) return data;
    
    // If it's an error object, extract its key properties
    if (data instanceof Error) {
        return {
            name: data.name,
            message: data.message,
            code: data.code,
            stack: data.stack
        };
    }

    const sanitized = { ...data };
    
    // List of keys to redact or mask
    const sensitiveKeys = ['aadhaar', 'password', 'otp', 'token'];
    
    Object.keys(sanitized).forEach(key => {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            if (typeof sanitized[key] === 'string' && sanitized[key].length > 4) {
                // Mask everything but last 4
                sanitized[key] = `****${sanitized[key].slice(-4)}`;
            } else {
                sanitized[key] = '****';
            }
        }
    });
    
    return sanitized;
}

export default logger;
