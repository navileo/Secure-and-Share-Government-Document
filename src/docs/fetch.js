import { db } from '../lib/firebase.js';
import { 
    collection, 
    query, 
    where, 
    getDocs,
    doc,
    getDoc
} from "firebase/firestore";
import logger from '../lib/logger.js';

/**
 * Get a specific document by ID
 */
export async function getDocument(docId) {
    try {
        const docRef = doc(db, "documents", docId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error("Document not found");
        return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
        logger.error('Fetching document failed', error);
        throw error;
    }
}

/**
 * Fetch user's documents (both owned and shared)
 */
export async function getUserDocuments(userId) {
    try {
        // 1. Fetch owned documents
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

        // 2. Fetch shared documents
        const sharedQuery = query(
            collection(db, "shares"),
            where("granteeId", "==", userId)
        );
        const sharedSnapshot = await getDocs(sharedQuery);
        
        const sharedDocsPromises = sharedSnapshot.docs.map(async (shareDoc) => {
            const shareData = shareDoc.data();
            if (shareData.expiry && shareData.expiry.toDate() < new Date()) return null;

            try {
                const d = await getDocument(shareData.docId);
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

        return [...ownedDocs, ...sharedDocs].sort((a, b) => {
            const dateA = a.createdAt?.toDate() || 0;
            const dateB = b.createdAt?.toDate() || 0;
            return dateB - dateA;
        });
    } catch (error) {
        logger.error('Fetching documents failed', error);
        throw error;
    }
}
