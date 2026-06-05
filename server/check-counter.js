require('dotenv').config();
const { db } = require('./config/firebaseAdmin');

async function checkCounter() {
    try {
        if (!db) return console.error('DB not init');
        const counterRef = db.collection('counters').doc('applications');
        const doc = await counterRef.get();
        if (doc.exists) {
            console.log('Counter exists:', doc.data());
        } else {
            console.log('Counter DO NOT exist, checking applications count...');
            const snapshot = await db.collection('applications').get();
            console.log('Applications count:', snapshot.size);
        }
        process.exit(0);
    } catch (err) {
        console.error('Error checking counter:', err.message);
        process.exit(1);
    }
}

checkCounter();
