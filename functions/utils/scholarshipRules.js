/**
 * Scholarship Rules and Calculation Utilities
 * 
 * This module contains the business logic for calculating scholarship eligibility
 * based on academic performance and course category.
 */

// Course to Category Mapping
const COURSE_CATEGORIES = {
    // IT Category
    'BIM Professional': 'IT',
    'Web Development': 'IT',
    'Data Analytics': 'IT',
    'Digital Marketing (Adv)': 'IT',
    'MS Office': 'IT',
    'Python Programming': 'IT',
    'Scratch Coding': 'IT',
    'Java Programming': 'IT',
    'Full Stack Development': 'IT',
    'Software Testing': 'IT',
    'UI/UX Design': 'IT',
    'Digital Marketing (Media)': 'IT',

    // Mechanical Category
    'AutoCAD Mechanical': 'Mechanical',
    'Computational Fluid Dynamics (CFD)': 'Mechanical',
    'Wiring Harness Design': 'Mechanical',
    'Creo Parametric': 'Mechanical',
    'SolidWorks Masterclass': 'Mechanical',
    '3D Printing & Prototyping': 'Mechanical',
    'HyperMesh': 'Mechanical',
    'ANSYS Simulation': 'Mechanical',
    'CATIA V5': 'Mechanical',
    'ANSA Pre-processing': 'Mechanical',
    'NX CAD (Unigraphics)': 'Mechanical',
    'Autodesk Inventor': 'Mechanical',

    // Civil Category
    'STAAD.Pro': 'Civil',
    'Revit Architecture': 'Civil',
    'Civil CAD': 'Civil',
    'SketchUp': 'Civil',

    // Other/General (no specific scholarship rules, use default)
    'Tally with GST': 'General',
    'Robotics for Kids': 'General'
};

// Scholarship Rules by Category
// Format: { category: [ { minPercent, maxPercent, discount }, ... ] }
const SCHOLARSHIP_RULES = {
    'IT': [
        { minPercent: 85, maxPercent: 100, discount: 45 },
        { minPercent: 65, maxPercent: 85, discount: 20 },
        { minPercent: 50, maxPercent: 65, discount: 15 }
    ],
    'Mechanical': [
        { minPercent: 85, maxPercent: 100, discount: 30 },
        { minPercent: 65, maxPercent: 85, discount: 20 },
        { minPercent: 50, maxPercent: 60, discount: 10 }
    ],
    'Civil': [
        { minPercent: 85, maxPercent: 100, discount: 25 },
        { minPercent: 65, maxPercent: 85, discount: 12 },
        { minPercent: 50, maxPercent: 65, discount: 7 }
    ],
    'General': [
        // Default rules for courses without specific category
        { minPercent: 85, maxPercent: 100, discount: 20 },
        { minPercent: 65, maxPercent: 85, discount: 10 },
        { minPercent: 50, maxPercent: 65, discount: 5 }
    ]
};

/**
 * Get the category for a given course
 * @param {string} courseName - Name of the course
 * @returns {string} - Category name (IT, Mechanical, Civil, or General)
 */
function getCourseCategory(courseName) {
    return COURSE_CATEGORIES[courseName] || 'General';
}

/**
 * Calculate average of academic marks
 * @param {number} marks10th - 10th standard percentage
 * @param {number} marks12th - 12th standard percentage
 * @param {number|null} marksUG - UG percentage (optional)
 * @returns {number} - Average percentage rounded to 2 decimal places
 */
function calculateAverage(marks10th, marks12th, marksUG = null) {
    const marks = [marks10th, marks12th];

    // Include UG marks if provided and valid
    if (marksUG !== null && marksUG !== undefined && marksUG > 0) {
        marks.push(marksUG);
    }

    const sum = marks.reduce((acc, mark) => acc + Number(mark), 0);
    const average = sum / marks.length;

    return Math.round(average * 100) / 100; // Round to 2 decimal places
}

/**
 * Get scholarship percentage based on category and average marks
 * @param {string} category - Course category
 * @param {number} average - Average percentage
 * @returns {number} - Scholarship discount percentage
 */
function getScholarshipPercent(category, average) {
    const rules = SCHOLARSHIP_RULES[category] || SCHOLARSHIP_RULES['General'];

    // Find matching rule
    for (const rule of rules) {
        if (average >= rule.minPercent && average <= rule.maxPercent) {
            return rule.discount;
        }
    }

    // No scholarship if marks don't meet minimum criteria
    return 0;
}

/**
 * Calculate complete scholarship details
 * @param {string} courseName - Name of the course
 * @param {number} marks10th - 10th standard percentage
 * @param {number} marks12th - 12th standard percentage
 * @param {number|null} marksUG - UG percentage (optional)
 * @returns {object} - Scholarship calculation result
 */
function calculateScholarship(courseName, marks10th, marks12th, marksUG = null) {
    // Validate inputs
    if (!courseName || marks10th === undefined || marks12th === undefined) {
        throw new Error('Course name, 10th marks, and 12th marks are required');
    }

    if (marks10th < 0 || marks10th > 100 || marks12th < 0 || marks12th > 100) {
        throw new Error('Marks must be between 0 and 100');
    }

    if (marksUG !== null && marksUG !== undefined && (marksUG < 0 || marksUG > 100)) {
        throw new Error('UG marks must be between 0 and 100');
    }

    // Get category
    const category = getCourseCategory(courseName);

    // Calculate average
    const average = calculateAverage(marks10th, marks12th, marksUG);

    // Get scholarship percentage
    const scholarshipPercent = getScholarshipPercent(category, average);

    return {
        category,
        average,
        scholarshipPercent,
        isEligible: scholarshipPercent > 0
    };
}

/**
 * Calculate fee breakdown with scholarship applied
 * @param {number} baseFee - Original course fee
 * @param {number} scholarshipPercent - Scholarship discount percentage
 * @param {number} gstPercent - GST percentage
 * @param {number} mainBranchPercent - Main branch share percentage
 * @param {number} franchiseBranchPercent - Franchise branch share percentage
 * @returns {object} - Complete fee breakdown
 */
function calculateFeeWithScholarship(baseFee, scholarshipPercent, gstPercent, mainBranchPercent, franchiseBranchPercent) {
    const discountAmount = (baseFee * scholarshipPercent) / 100;
    const feeAfterDiscount = baseFee - discountAmount;
    const gstAmount = (feeAfterDiscount * gstPercent) / 100;
    const netAmount = feeAfterDiscount - gstAmount;
    const mainBranchAmount = (netAmount * mainBranchPercent) / 100;
    const franchiseBranchAmount = (netAmount * franchiseBranchPercent) / 100;

    return {
        baseFee: Number(baseFee.toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        feeAfterDiscount: Number(feeAfterDiscount.toFixed(2)),
        gstAmount: Number(gstAmount.toFixed(2)),
        netAmount: Number(netAmount.toFixed(2)),
        mainBranchAmount: Number(mainBranchAmount.toFixed(2)),
        franchiseBranchAmount: Number(franchiseBranchAmount.toFixed(2))
    };
}

module.exports = {
    COURSE_CATEGORIES,
    SCHOLARSHIP_RULES,
    getCourseCategory,
    calculateAverage,
    getScholarshipPercent,
    calculateScholarship,
    calculateFeeWithScholarship
};
