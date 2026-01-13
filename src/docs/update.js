import { db } from '../lib/firebase.js';
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { logAudit } from '../lib/audit.js';
import logger from '../lib/logger.js';

/**
 * Update document metadata
 */
export async function updateDocumentMetadata(userId, docId, data) {
    try {
        const docRef = doc(db, "documents", docId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });

        await logAudit(userId, 'UPDATE_DOC', docId);
        logger.info('Document metadata updated', { docId });
    } catch (error) {
        logger.error('Document update failed', error);
        throw error;
    }
}
