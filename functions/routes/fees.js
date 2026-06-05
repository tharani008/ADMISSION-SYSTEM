const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');

// Get all course fees
router.get('/', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const snapshot = await db.collection('course_fees').orderBy('course_name', 'asc').get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add new course fee
router.post('/', async (req, res) => {
    const { course_name, total_fee, gst_percent, main_branch_percent, franchise_branch_percent, category } = req.body;

    // Validate Percentages
    const splitTotal = Number(main_branch_percent) + Number(franchise_branch_percent);

    if (Number(gst_percent) > 100 || Number(gst_percent) < 0) {
        return res.status(400).json({ error: 'GST percentage must be between 0 and 100' });
    }

    if (Math.abs(splitTotal - 100) > 0.01) {
        return res.status(400).json({ error: 'Main and Franchise branch percentages must sum to 100% (of the remaining amount)' });
    }

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const feeData = { course_name, total_fee, gst_percent, main_branch_percent, franchise_branch_percent, category };
        const docRef = await db.collection('course_fees').add(feeData);
        const doc = await docRef.get();
        res.status(201).json({ id: doc.id, ...doc.data() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update course fee
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { total_fee, gst_percent, main_branch_percent, franchise_branch_percent, category } = req.body;

    const splitTotal = Number(main_branch_percent) + Number(franchise_branch_percent);

    if (Number(gst_percent) > 100 || Number(gst_percent) < 0) {
        return res.status(400).json({ error: 'GST percentage must be between 0 and 100' });
    }

    if (Math.abs(splitTotal - 100) > 0.01) {
        return res.status(400).json({ error: 'Main and Franchise branch percentages must sum to 100% (of the remaining amount)' });
    }

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const feeRef = db.collection('course_fees').doc(id);
        const doc = await feeRef.get();
        if (!doc.exists) return res.status(404).json({ error: 'Course fee not found' });

        await feeRef.update({ total_fee, gst_percent, main_branch_percent, franchise_branch_percent, category });
        const updatedDoc = await feeRef.get();
        res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete course fee
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        await db.collection('course_fees').doc(id).delete();
        res.json({ message: 'Course fee deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Calculate Scholarship (logic unchanged as it uses an external util)
router.post('/calculate-scholarship', async (req, res) => {
    const { course, marks_10th, marks_12th, marks_ug } = req.body;

    if (!course || marks_10th === undefined || marks_12th === undefined) {
        return res.status(400).json({ error: 'Course name, 10th marks, and 12th marks are required' });
    }

    try {
        const scholarshipRules = require('../utils/scholarshipRules');

        const result = scholarshipRules.calculateScholarship(
            course,
            Number(marks_10th),
            Number(marks_12th),
            marks_ug ? Number(marks_ug) : null
        );

        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;

