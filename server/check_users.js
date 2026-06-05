require('dotenv').config();
const { db } = require('./config/firebaseAdmin');

async function checkUsers() {
    try {
        const snapshot = await db.collection('users').where('username', '==', 'admin').get();
        if (snapshot.empty) {
            console.log('No user with username "admin" found.');
            return;
        }
        snapshot.forEach(doc => {
            console.log('--- ADMIN USER FOUND ---');
            console.log(JSON.stringify(doc.data(), null, 2));
        });
    } catch (error) {
        console.error('Error checking users:', error);
    }
}

checkUsers();
