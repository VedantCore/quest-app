import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey) {
      // Remove surrounding quotes if present
      privateKey = privateKey.trim();
      if (
        (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
        (privateKey.startsWith("'") && privateKey.endsWith("'"))
      ) {
        privateKey = privateKey.slice(1, -1);
      }

      // Replace escaped newlines with actual newlines
      // Handle both \\n (double escaped) and \n (single escaped)
      privateKey = privateKey.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');

      // Ensure the key has proper formatting
      if (
        !privateKey.includes('\n') &&
        privateKey.includes('-----BEGIN PRIVATE KEY-----')
      ) {
        console.error('Private key appears to be missing newline characters');
      }
    }

    if (!process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      console.error('Missing Firebase Admin credentials');
      console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
      console.log('Private Key exists:', !!privateKey);
      console.log(
        'Private Key preview:',
        privateKey ? privateKey.substring(0, 50) + '...' : 'null'
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });

    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase admin initialization error:', error.message);
    console.error('Full error:', error);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
