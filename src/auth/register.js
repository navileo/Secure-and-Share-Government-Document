import { auth, db } from '../lib/firebase.js';
import { 
    createUserWithEmailAndPassword, 
    updateProfile as updateAuthProfile,
    setPersistence,
    browserSessionPersistence
} from "firebase/auth";
import { 
    doc, 
    setDoc, 
    serverTimestamp 
} from "firebase/firestore";
import { logAudit } from '../lib/audit.js';
import logger from '../lib/logger.js';

/**
 * Register a new user with Aadhaar-linked details
 */
export async function register(email, password, fullName, aadhaar) {
    try {
        await setPersistence(auth, browserSessionPersistence);

        // 1. Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Update profile with display name
        await updateAuthProfile(user, { displayName: fullName });

        // 3. Hash Aadhaar and get last 4 digits
        const aadhaarLast4 = aadhaar.slice(-4);
        const aadhaarHash = await hashData(aadhaar);

        // 4. Store user profile in Firestore
        await setDoc(doc(db, "users", user.uid), {
            fullName,
            email,
            aadhaarLast4,
            aadhaarHash,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // 5. Log activity
        await logAudit(user.uid, 'REGISTER', user.uid);

        logger.info('User registered successfully', { email });
        return user;
    } catch (error) {
        logger.error('Registration failed', error);
        throw error;
    }
}

/**
 * Utility to hash sensitive data using SHA-256
 */
async function hashData(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
