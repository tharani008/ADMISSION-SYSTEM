const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');

// GET all course templates
router.get('/', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const snapshot = await db.collection('course_templates').orderBy('category', 'asc').get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST - add a new course template record
router.post('/', async (req, res) => {
    const { category, template_url, file_name, x_offset, y_offset } = req.body;
    if (!category || !template_url) {
        return res.status(400).json({ error: 'category and template_url are required' });
    }
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const payload = {
            category,
            template_url,
            file_name: file_name || '',
            x_offset: x_offset || null,
            y_offset: y_offset || null,
            created_at: new Date().toISOString()
        };
        const docRef = await db.collection('course_templates').add(payload);
        const doc = await docRef.get();
        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT - update coordinates for a template
router.put('/:id/offset', async (req, res) => {
    const { id } = req.params;
    const { x_offset, y_offset } = req.body;
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const ref = db.collection('course_templates').doc(id);
        await ref.update({ x_offset, y_offset });
        const doc = await ref.get();
        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE - remove a course template
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        await db.collection('course_templates').doc(id).delete();
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
