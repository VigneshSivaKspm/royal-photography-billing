// auth.js for Royal Photography Billing Portal
// Firebase config and initialization are handled in firebaseconfig.js
// Use global auth from firebaseconfig.js


const loginForm = document.getElementById('loginForm');
const mainMenu = document.getElementById('main-menu');
const authSection = document.getElementById('auth-section');
const logoutBtn = document.getElementById('logoutBtn');

loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showMainMenu();
    } catch (err) {
        alert(err.message);
    }
});


function showMainMenu() {
    authSection.style.display = 'none';
    mainMenu.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = '';
}


logoutBtn.addEventListener('click', async function() {
    await auth.signOut();
    mainMenu.style.display = 'none';
    authSection.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
});

// Auto-login if already signed in
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        showMainMenu();
    } else {
        mainMenu.style.display = 'none';
        authSection.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
});
