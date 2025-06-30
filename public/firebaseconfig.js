// firebaseconfig.js - Centralized Firebase config and initialization
const firebaseConfig = {
    apiKey: "AIzaSyCCysvb_q18116HdjnJ5cD-r0iSB9FAUE8",
    authDomain: "royal-photography-28563.firebaseapp.com",
    projectId: "royal-photography-28563",
    storageBucket: "royal-photography-28563.firebasestorage.app",
    messagingSenderId: "137688017512",
    appId: "1:137688017512:web:d130fd33055898c0c069dd",
    measurementId: "G-JH5FK9Q70N"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
window.auth = firebase.auth();
window.db = firebase.firestore();
