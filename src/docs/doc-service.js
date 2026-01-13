import { 
    db, 
    storage 
} from '../lib/firebase.js';
import { 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "firebase/storage";
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    query, 
    where, 
    getDocs,
    serverTimestamp,
    setDoc
} from "firebase/firestore";
import logger from '../lib/logger.js';

export const docService = {
    /**
     * Upload a document (Stored as Base64 in Firestore to keep it FREE)
     */
    upload: async (userId, file, metadata = {}) => {
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
                fileData: base64Data, // Storing file directly in DB
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
    },

    /**
     * Fetch user's documents (both owned and shared with them)
     */
    getUserDocuments: async (userId) => {
        try {
            // 1. Fetch documents OWNED by the user
            const ownedQuery = query(
                collection(db, "documents"), 
                where("ownerId", "==", userId),
                where("isDeleted", "==", false)
            );
            const ownedSnapshot = await getDocs(ownedQuery);
            const ownedDocs = ownedSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                isShared: false 
            }));

            // 2. Fetch documents SHARED with the user
            const sharedQuery = query(
                collection(db, "shares"),
                where("granteeId", "==", userId)
            );
            const sharedSnapshot = await getDocs(sharedQuery);
            
            const sharedDocsPromises = sharedSnapshot.docs.map(async (shareDoc) => {
                const shareData = shareDoc.data();
                
                // Check if share has expired
                if (shareData.expiry && shareData.expiry.toDate() < new Date()) {
                    return null;
                }

                try {
                    const d = await docService.getDocument(shareData.docId);
                    // Only return if not deleted by owner
                    if (d && !d.isDeleted) {
                        return { 
                            ...d, 
                            isShared: true, 
                            sharedBy: shareData.ownerId,
                            shareId: shareDoc.id 
                        };
                    }
                } catch (e) {
                    return null;
                }
                return null;
            });

            const sharedDocs = (await Promise.all(sharedDocsPromises)).filter(d => d !== null);

            // Combine both lists
            return [...ownedDocs, ...sharedDocs].sort((a, b) => {
                const dateA = a.createdAt?.toDate() || 0;
                const dateB = b.createdAt?.toDate() || 0;
                return dateB - dateA;
            });
        } catch (error) {
            logger.error('Fetching documents failed', error);
            throw error;
        }
    },

    /**
     * Soft delete a document
     */
    delete: async (userId, docId) => {
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
    },

    /**
     * Share a document with another user (family member)
     */
    share: async (ownerId, docId, granteeEmail, expiryHours = 24) => {
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
    },

    /**
     * Get a specific document by ID
     */
    getDocument: async (docId) => {
        try {
            const docRef = doc(db, "documents", docId);
            const docSnap = await getDocs(query(collection(db, "documents"), where("__name__", "==", docId)));
            if (docSnap.empty) throw new Error("Document not found");
            return { id: docSnap.docs[0].id, ...docSnap.docs[0].data() };
        } catch (error) {
            logger.error('Fetching document failed', error);
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
