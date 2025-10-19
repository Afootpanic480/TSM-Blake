// Firebase Configuration
// Replace these values with your actual Firebase project credentials
  const firebaseConfig = {
    apiKey: "AIzaSyAaTXVp9ACFkg6kia8k4kamM4jUXQMacwk",
    authDomain: "school-messenger-e725b.firebaseapp.com",
    databaseURL: "https://school-messenger-e725b-default-rtdb.firebaseio.com",
    projectId: "school-messenger-e725b",
    storageBucket: "school-messenger-e725b.firebasestorage.app",
    messagingSenderId: "324751539319",
    appId: "1:324751539319:web:a843c4b4082beddb405a72",
    measurementId: "G-Q9XRQ8LCNQ"
  };

// Initialize Firebase
let app;
let auth;
let database;
let storage;

try {
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  database = firebase.database();
  storage = firebase.storage();
  
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

// Export Firebase instances
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDatabase = database;
window.firebaseStorage = storage;
