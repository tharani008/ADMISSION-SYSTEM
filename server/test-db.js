require('dotenv').config();
const { db } = require('./config/firebaseAdmin');

async function testConnection() {
    try {
        if (!db) {
            console.error('Database not initialized');
            process.exit(1);
        }
        const snapshot = await db.collection('branches').limit(1).get();
        console.log('Successfully connected to Firestore. Found', snapshot.size, 'branches.');
        process.exit(0);
    } catch (err) {
        console.error('Firestore connection error:', err.message);
        process.exit(1);
    }
}

testConnection();
