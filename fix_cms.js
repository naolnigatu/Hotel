import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  const docRef = doc(db, 'settings', 'cms_home');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data().data;
    if (data.heroImageUrl && data.heroImageUrl.includes('1542314831-c6a4d1409e1f')) {
      await updateDoc(docRef, {
        'data.heroImageUrl': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=2850'
      });
      console.log('Fixed heroImageUrl in DB.');
    }
  }
  
  const aboutRef = doc(db, 'settings', 'cms_about');
  const aboutSnap = await getDoc(aboutRef);
  if (aboutSnap.exists()) {
    const data = aboutSnap.data().data;
    if (data.imageUrl && data.imageUrl.includes('1551882547-ff40c0d5b5df')) {
      await updateDoc(aboutRef, {
        'data.imageUrl': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1000'
      });
      console.log('Fixed imageUrl in DB.');
    }
  }

  process.exit(0);
}
main();
