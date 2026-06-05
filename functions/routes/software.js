const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');

// GET all software items
router.get('/', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const snapshot = await db.collection('software_items').orderBy('name', 'asc').get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add new software item
router.post('/', async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const docRef = await db.collection('software_items').add({ name: name.trim() });
        const doc = await docRef.get();
        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update software item
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const ref = db.collection('software_items').doc(id);
        const doc = await ref.get();
        if (!doc.exists) return res.status(404).json({ error: 'Not found' });
        await ref.update({ name: name.trim() });
        const updated = await ref.get();
        res.json({ id: updated.id, ...updated.data() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE software item
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        await db.collection('software_items').doc(id).delete();
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
