import { db } from '../lib/firebase.js';
import { 
    collection, 
    addDoc, 
    serverTimestamp 
} from "firebase/firestore";
import { logAudit } from '../lib/audit.js';
import logger from '../lib/logger.js';

/**
 * Upload a document (Stored as Base64 in Firestore to keep it FREE)
 */
export async function uploadDocument(userId, file, metadata = {}) {
    try {
        // Check file size (Firestore limit is 1MB per document)
        if (file.size > 1000000) {
            throw new Error('File too large for free tier. Please upload files under 1MB.');
        }

        // 1. Convert file to Base64 string
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });

        // 2. Save document metadata AND file data to Firestore
        const docData = {
            name: file.name,
            type: file.type,
            size: file.size,
            ownerId: userId,
            fileData: base64Data,
            isDeleted: false,
            category: metadata.category || 'other',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, "documents"), docData);

        // 3. Log activity
        await logAudit(userId, 'UPLOAD_DOC', docRef.id);

        logger.info('Document uploaded to Firestore', { docId: docRef.id, fileName: file.name });
        return { id: docRef.id, ...docData };
    } catch (error) {
        logger.error('Document upload failed', error);
        throw error;
    }
}
