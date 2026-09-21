// src/services/storageService.js
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';

export const uploadFile = (file, path, onProgress) => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
};

export const uploadImage = (file, folder, onProgress) => {
  const filename = `${Date.now()}_${file.name}`;
  return uploadFile(file, `${folder}/${filename}`, onProgress);
};

export const uploadPDF = (file, onProgress) => {
  const filename = `${Date.now()}_${file.name}`;
  return uploadFile(file, `documents/${filename}`, onProgress);
};

export const deleteFile = async (url) => {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn('Could not delete file:', err.message);
  }
};
