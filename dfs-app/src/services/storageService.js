// src/services/storageService.js
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '../firebase/config';

/**
 * Maps Firebase Storage error codes to human-readable messages.
 */
function friendlyStorageError(error) {
  const code = error?.code || '';
  const messages = {
    'storage/unauthorized':
      'Permission denied. Make sure you are logged in and Storage rules allow writes.',
    'storage/canceled': 'Upload was cancelled.',
    'storage/unknown':
      'An unknown storage error occurred. Check that Firebase Storage is enabled in your project and that your storageBucket in .env is correct (format: your-project-id.appspot.com).',
    'storage/object-not-found': 'File not found in storage.',
    'storage/bucket-not-found':
      'Storage bucket not found. Check VITE_FIREBASE_STORAGE_BUCKET in your .env file.',
    'storage/project-not-found':
      'Firebase project not found. Check your Firebase config.',
    'storage/quota-exceeded': 'Storage quota exceeded.',
    'storage/unauthenticated':
      'You must be logged in to upload files.',
    'storage/retry-limit-exceeded':
      'Upload failed after too many retries. Check your internet connection.',
    'storage/invalid-checksum': 'File checksum mismatch. Please try again.',
    'storage/invalid-url': 'Invalid file URL.',
    'storage/no-default-bucket':
      'No default Storage bucket configured. Set VITE_FIREBASE_STORAGE_BUCKET in your .env file.',
    'storage/cannot-slice-blob':
      'Could not process the file. Please try a different file.',
    'storage/server-file-wrong-size':
      'File size mismatch during upload. Please try again.',
  };
  return messages[code] || `Upload error (${code || 'unknown'}): ${error?.message || 'Please try again.'}`;
}

/**
 * Core upload function with progress tracking and detailed error messages.
 */
export const uploadFile = (file, path, onProgress) => {
  return new Promise((resolve, reject) => {
    // Guard: ensure storage is initialised
    if (!storage) {
      reject(new Error('Firebase Storage is not initialised. Check your .env configuration.'));
      return;
    }

    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(Math.round(pct));
      },
      (error) => {
        // Surface a friendly message
        const msg = friendlyStorageError(error);
        console.error('[Storage] Upload failed:', error.code, error.message);
        reject(new Error(msg));
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(new Error(friendlyStorageError(err)));
        }
      }
    );
  });
};

/**
 * Upload an image file into a named folder.
 */
export const uploadImage = (file, folder, onProgress) => {
  // Sanitise filename — remove spaces & special chars
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}_${safeName}`;
  return uploadFile(file, path, onProgress);
};

/**
 * Upload a PDF document.
 */
export const uploadPDF = (file, onProgress) => {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `documents/${Date.now()}_${safeName}`;
  return uploadFile(file, path, onProgress);
};

/**
 * Delete a file by its full download URL.
 * Fails silently — deletion errors should never block the UI.
 */
export const deleteFile = async (downloadUrl) => {
  try {
    const fileRef = ref(storage, downloadUrl);
    await deleteObject(fileRef);
  } catch (err) {
    // Log but never throw — old files may already be deleted
    console.warn('[Storage] Could not delete file:', err?.code, err?.message);
  }
};
