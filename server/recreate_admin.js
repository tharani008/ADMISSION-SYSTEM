require('dotenv').config();
const { db } = require('./config/firebaseAdmin');

async function recreateAdmin() {
    try {
        const snapshot = await db.collection('users').where('username', '==', 'admin').get();
        for (const doc of snapshot.docs) {
            await doc.ref.delete();
            console.log('Deleted existing admin user.');
        }

        const adminUser = {
            username: 'admin',
            password_hash: 'admin123',
            role: 'superadmin',
            branch_id: 'ALL',
            created_at: new Date().toISOString()
        };

        await db.collection('users').add(adminUser);
        console.log('Successfully recreated admin user.');
        process.exit(0);
    } catch (error) {
        console.error('Error recreating admin:', error);
        process.exit(1);
    }
}

recreateAdmin();
