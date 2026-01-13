import { db, auth } from '../lib/firebase.js';
import { 
    doc, 
    getDoc, 
    updateDoc, 
    serverTimestamp,
    setDoc
} from "firebase/firestore";
import logger from '../lib/logger.js';

export const profileService = {
    /**
     * Get user profile details
     */
    getProfile: async (userId) => {
        try {
            const userRef = doc(db, "users", userId);
            const userDoc = await getDoc(userRef);
            let profileData = null;
            
            if (userDoc.exists()) {
                profileData = userDoc.data();
            }

            // If profile doesn't exist OR it contains placeholder data, try to recover from Auth
            if (!profileData || profileData.fullName === 'New User' || profileData.email === 'Update your email') {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    logger.warn('Profile missing or contains placeholders, recovering from Auth session', { userId });
                    
                    const recoveredProfile = {
                        fullName: profileData?.fullName !== 'New User' ? (profileData?.fullName || currentUser.displayName || currentUser.email.split('@')[0]) : (currentUser.displayName || currentUser.email.split('@')[0]),
                        email: currentUser.email,
                        aadhaarLast4: profileData?.aadhaarLast4 || '0000',
                        createdAt: profileData?.createdAt || serverTimestamp(),
                        updatedAt: serverTimestamp()
                    };
                    
                    await setDoc(userRef, recoveredProfile, { merge: true });
                    return recoveredProfile;
                }
            }
            
            if (profileData) return profileData;
            throw new Error("User profile not found and could not be recovered");
        } catch (error) {
            logger.error('Fetching profile failed', error);
            throw error;
        }
    },

    /**
     * Update user profile
     */
    updateProfile: async (userId, data) => {
        try {
            const userRef = doc(db, "users", userId);
            const updateData = {
                ...data,
                updatedAt: serverTimestamp()
            };
            
            // Remove sensitive fields if they accidentally passed in
            delete updateData.aadhaarHash;
            delete updateData.aadhaarLast4;
            delete updateData.email;

            await updateDoc(userRef, updateData);

            // Log activity
            await logAudit(userId, 'UPDATE_PROFILE', userId);

            logger.info('Profile updated successfully', { userId });
        } catch (error) {
            logger.error('Profile update failed', error);
            throw error;
        }
    }
};

/**
 * Utility to log audit events in Firestore
 */
async function logAudit(actorId, action, resourceId) {
    try {
        const logRef = doc(db, "auditLogs", `${Date.now()}_${actorId}`);
        await setDoc(logRef, {
            actorId,
            action,
            resourceId,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error('Audit logging failed', error);
    }
}
