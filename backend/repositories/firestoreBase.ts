import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  limit 
} from 'firebase/firestore';
import { firestoreDb, isFirebaseActive, handleFirestoreError, OperationType } from '../config/firebase.js';

export async function getFirestoreCollection(collectionName: string): Promise<any[]> {
  if (!isFirebaseActive || !firestoreDb) return [];
  try {
    const colRef = collection(firestoreDb, collectionName);
    const snapshot = await getDocs(colRef);
    const docs: any[] = [];
    snapshot.forEach((d) => {
      docs.push({ ...d.data(), id: d.id });
    });
    return docs;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, collectionName);
  }
}

export async function setFirestoreDoc(collectionName: string, docId: string, data: any): Promise<boolean> {
  if (!isFirebaseActive || !firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, collectionName, docId);
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

export async function deleteFirestoreDoc(collectionName: string, docId: string): Promise<boolean> {
  if (!isFirebaseActive || !firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, collectionName, docId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${docId}`);
  }
}
