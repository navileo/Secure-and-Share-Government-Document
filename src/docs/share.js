import { db } from '../lib/firebase.js';
import { 
    collection, 
    query, 
    where, 
    getDocs,
    doc,
    setDoc,
    serverTimestamp 
} from "firebase/firestore";
import { logAudit } from '../lib/audit.js';
import logger from '../lib/logger.js';

/**
 * Share a document with another user (family member)
 */
export async function shareDocument(ownerId, docId, granteeEmail, expiryHours = 24) {
    try {
        // 1. Find grantee user by email
        const userQuery = query(collection(db, "users"), where("email", "==", granteeEmail));
        const userSnap = await getDocs(userQuery);
        
        if (userSnap.empty) {
            throw new Error("Grantee user not found. Ensure they are registered.");
        }
        
        const granteeId = userSnap.docs[0].id;
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + expiryHours);

        // 2. Create share record
        const shareId = `${docId}_${granteeId}`;
        await setDoc(doc(db, "shares", shareId), {
            docId,
            ownerId,
            granteeId,
            granteeEmail,
            expiry: expiryDate,
            createdAt: serverTimestamp()
        });

        // 3. Log activity
        await logAudit(ownerId, 'SHARE_DOC', docId);

        logger.info('Document shared successfully', { docId, granteeId });
        return shareId;
    } catch (error) {
        logger.error('Document sharing failed', error);
        throw error;
    }
}
