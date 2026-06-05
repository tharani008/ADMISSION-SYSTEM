const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');

// GET /api/settings/penalty — Returns current penalty configuration
router.get('/penalty', async (req, res) => {
    try {
        if (!db) return res.json({ grace_days: 0, daily_penalty_amount: 50 });
        const doc = await db.collection('app_settings').doc('penalty_config').get();
        if (!doc.exists) {
            return res.json({ grace_days: 0, daily_penalty_amount: 50 });
        }
        res.json(doc.data().value);
    } catch (err) {
        res.json({ grace_days: 0, daily_penalty_amount: 50 });
    }
});

// PUT /api/settings/penalty — Update penalty configuration
router.put('/penalty', async (req, res) => {
    const { grace_days, daily_penalty_amount } = req.body;

    if (grace_days === undefined || daily_penalty_amount === undefined) {
        return res.status(400).json({ error: 'grace_days and daily_penalty_amount are required' });
    }

    const config = {
        grace_days: parseInt(grace_days, 10),
        daily_penalty_amount: parseFloat(daily_penalty_amount)
    };

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        await db.collection('app_settings').doc('penalty_config').set({
            key: 'penalty_config',
            value: config,
            updated_at: new Date().toISOString()
        });
        res.json({ message: 'Penalty config saved', config });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
