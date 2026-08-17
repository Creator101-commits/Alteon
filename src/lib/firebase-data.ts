import { doc, getDoc, getFirestore, setDoc, updateDoc } from "firebase/firestore";
import { app } from "./firebase";

const db = getFirestore(app);

export const setUserRecord = (uid: string, data: any, merge = false) =>
  merge ? setDoc(doc(db, "users", uid), data, { merge: true }) : setDoc(doc(db, "users", uid), data);

export const getUserRecord = async (uid: string) => {
  const userDoc = await getDoc(doc(db, "users", uid));
  return userDoc.exists() ? userDoc.data() : null;
};

export const updateUserRecord = (uid: string, data: any) =>
  updateDoc(doc(db, "users", uid), data);
