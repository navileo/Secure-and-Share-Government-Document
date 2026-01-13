import { db } from '../lib/firebase.js';
import { 
    doc, 
    updateDoc, 
    serverTimestamp 
} from "firebase/firestore";
import { logAudit } from '../lib/audit.js';
import logger from '../lib/logger.js';

/**
 * Soft delete a document
 */
export async function deleteDocument(userId, docId) {
    try {
        const docRef = doc(db, "documents", docId);
        await updateDoc(docRef, {
            isDeleted: true,
            updatedAt: serverTimestamp()
        });

        // Log activity
        await logAudit(userId, 'DELETE_DOC', docId);

        logger.info('Document soft-deleted', { docId });
    } catch (error) {
        logger.error('Document deletion failed', error);
        throw error;
    }
}
