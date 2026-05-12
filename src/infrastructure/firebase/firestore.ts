import { type Firestore, getFirestore } from 'firebase/firestore';
import { firebaseApp } from './firebaseApp';

export const firestore: Firestore = getFirestore(firebaseApp);
