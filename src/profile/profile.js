import { db, auth } from '../lib/firebase.js';
import { 
    doc, 
    getDoc, 
    updateDoc, 
    serverTimestamp,
    setDoc
} from "firebase/firestore";
import { logAudit } from '../lib/audit.js';
import logger from '../lib/logger.js';

export async function getProfile(userId) {
    try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        let profileData = null;
        
        if (userDoc.exists()) {
            profileData = userDoc.data();
        }

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
}

export async function updateProfile(userId, data) {
    try {
        const userRef = doc(db, "users", userId);
        const updateData = {
            ...data,
            updatedAt: serverTimestamp()
        };
        
        delete updateData.aadhaarHash;
        delete updateData.aadhaarLast4;
        delete updateData.email;

        await updateDoc(userRef, updateData);
        await logAudit(userId, 'UPDATE_PROFILE', userId);
        logger.info('Profile updated successfully', { userId });
    } catch (error) {
        logger.error('Profile update failed', error);
        throw error;
    }
}
