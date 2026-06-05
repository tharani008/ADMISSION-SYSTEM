const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');

// Get content by key
router.get('/:key', async (req, res) => {
    const { key } = req.params;
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const doc = await db.collection('app_content').doc(key).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Content not found' });
        }
        res.json(doc.data());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update content by key
router.put('/:key', async (req, res) => {
    const { key } = req.params;
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const data = { content, updated_at: new Date().toISOString() };
        await db.collection('app_content').doc(key).set(data, { merge: true });
        res.json({ key, ...data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
