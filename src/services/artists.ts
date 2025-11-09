
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export interface Artist {
  id?: string;
  name: string;
  genre: string;
  bio: string;
}

const artistsCollection = collection(db, 'artists');

export const getArtists = async (): Promise<Artist[]> => {
  const snapshot = await getDocs(artistsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Artist));
};

export const addArtist = async (artist: Omit<Artist, 'id'>) => {
  return await addDoc(artistsCollection, artist);
};

export const updateArtist = async (id: string, artist: Partial<Omit<Artist, 'id'>>) => {
  const artistDoc = doc(db, 'artists', id);
  return await updateDoc(artistDoc, artist);
};

export const deleteArtist = async (id: string) => {
  const artistDoc = doc(db, 'artists', id);
  return await deleteDoc(artistDoc);
};
