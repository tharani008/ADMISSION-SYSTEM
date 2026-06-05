require('dotenv').config();
const { db } = require('./config/firebaseAdmin');

async function fixAdminRole() {
    try {
        const snapshot = await db.collection('users').where('username', '==', 'admin').get();
        if (snapshot.empty) {
            console.log('No admin user found.');
            return;
        }
        for (const doc of snapshot.docs) {
            await doc.ref.update({ role: 'super_admin' });
            console.log(`Updated role for ${doc.id} to "super_admin"`);
        }
        process.exit(0);
    } catch (error) {
        console.error('Error fixing role:', error);
        process.exit(1);
    }
}

fixAdminRole();
