import { auth } from '../lib/firebase.js';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    setPersistence,
    browserSessionPersistence
} from "firebase/auth";
import { logAudit } from '../lib/audit.js';
import logger from '../lib/logger.js';

/**
 * Login user
 */
export async function login(email, password) {
    try {
        await setPersistence(auth, browserSessionPersistence);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await logAudit(userCredential.user.uid, 'LOGIN', userCredential.user.uid);
        logger.info('User logged in', { email });
        return userCredential.user;
    } catch (error) {
        logger.error('Login failed', error);
        throw error;
    }
}

/**
 * Logout user
 */
export async function logout() {
    try {
        const userId = auth.currentUser?.uid;
        await signOut(auth);
        if (userId) await logAudit(userId, 'LOGOUT', userId);
        logger.info('User logged out');
    } catch (error) {
        logger.error('Logout failed', error);
        throw error;
    }
}
