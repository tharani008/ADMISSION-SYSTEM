const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');

// GET / - List all branches
router.get('/', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const snapshot = await db.collection('branches').orderBy('name', 'asc').get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST / - Create a new branch
router.post('/', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Branch name is required' });

        const docRef = await db.collection('branches').add({ name });
        const doc = await docRef.get();
        res.status(201).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /:id - Update a branch
router.put('/:id', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const { id } = req.params;
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Branch name is required' });

        const branchRef = db.collection('branches').doc(id);
        const doc = await branchRef.get();
        if (!doc.exists) return res.status(404).json({ error: 'Branch not found' });

        await branchRef.update({ name });
        const updatedDoc = await branchRef.get();
        res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /:id - Delete a branch
router.delete('/:id', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const { id } = req.params;
        await db.collection('branches').doc(id).delete();
        res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
