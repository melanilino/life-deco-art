import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export { signInWithEmailAndPassword, onAuthStateChanged, signOut };

export async function uploadImage(pathPrefix, file) {
  const path = `${pathPrefix}/${Date.now()}_${file.name}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return await getDownloadURL(r);
}

export async function getPageContent(pageId) {
  const ref = doc(db, "content", pageId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : {};
}

export async function savePageContent(pageId, data) {
  const ref = doc(db, "content", pageId);
  await setDoc(ref, data, { merge: true });
}
