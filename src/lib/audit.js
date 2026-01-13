import { db } from './firebase.js';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Utility to log audit events in Firestore
 * PII-safe: Only IDs and action names are logged
 */
export async function logAudit(actorId, action, resourceId) {
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
