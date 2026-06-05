const supabase = require('./config/supabaseClient');

const missingCourses = [
    // CSE / IT - missing & new courses
    { course_name: 'Data Analytics', category: 'CSE / IT', total_fee: 69999 },
    { course_name: 'Software Testing', category: 'CSE / IT', total_fee: 69999 },
    { course_name: 'Full Stack Development', category: 'CSE / IT', total_fee: 69999 },
    { course_name: 'MERN Stack Development', category: 'CSE / IT', total_fee: 69999 },
    { course_name: 'UI/UX Design', category: 'CSE / IT', total_fee: 20999 },
    { course_name: 'Cyber Security', category: 'CSE / IT', total_fee: 49999 },
    { course_name: 'AWS Cloud Computing', category: 'CSE / IT', total_fee: 39999 },
    { course_name: 'Java Programming', category: 'CSE / IT', total_fee: 25999 },
    { course_name: 'Python Programming', category: 'CSE / IT', total_fee: 18999 },
    { course_name: 'Web Development', category: 'CSE / IT', total_fee: 36999 },

    // Mechanical
    { course_name: 'Creo Parametric', category: 'Mechanical', total_fee: 24999 },
    { course_name: 'SolidWorks Masterclass', category: 'Mechanical', total_fee: 24999 },
    { course_name: 'CATIA V5', category: 'Mechanical', total_fee: 19999 },
    { course_name: 'ANSYS Simulation', category: 'Mechanical', total_fee: 19999 },
    { course_name: 'AutoCAD Mechanical', category: 'Mechanical', total_fee: 6999 },
    { course_name: 'HyperMesh', category: 'Mechanical', total_fee: 21000 },
    { course_name: 'NX CAD (Unigraphics)', category: 'Mechanical', total_fee: 19999 },
    { course_name: 'Autodesk Inventor', category: 'Mechanical', total_fee: 19999 },
    { course_name: 'Wiring Harness Design', category: 'Mechanical', total_fee: 19999 },
    { course_name: 'Computational Fluid Dynamics (CFD)', category: 'Mechanical', total_fee: 13999 },
    { course_name: 'ANSA Pre-processing', category: 'Mechanical', total_fee: 17999 },
    { course_name: '3D Printing & Prototyping', category: 'Mechanical', total_fee: 14999 },

    // Civil
    { course_name: 'SketchUp', category: 'Civil', total_fee: 17999 },
    { course_name: 'Civil CAD', category: 'Civil', total_fee: 7499 },
    { course_name: 'BIM Professional', category: 'Civil', total_fee: 34999 },
    { course_name: 'STAAD.Pro', category: 'Civil', total_fee: 17999 },
    { course_name: 'Revit Architecture', category: 'Civil', total_fee: 19999 },

    // Arts / Others
    { course_name: 'Digital Marketing (Media)', category: 'Arts', total_fee: 29999 },
    { course_name: 'Tally with GST', category: 'Arts', total_fee: 7999 },
    { course_name: 'Digital Marketing (Adv)', category: 'Arts', total_fee: 29999 },
    { course_name: 'MS Office', category: 'Arts', total_fee: 8999 },

    // Kids
    { course_name: 'Scratch Coding', category: 'Kids', total_fee: 4000 },
    { course_name: 'Robotics for Kids', category: 'Kids', total_fee: 5000 },
];

const addMissingCourses = async () => {
    console.log(`Adding/updating ${missingCourses.length} courses...`);

    const coursesWithDefaults = missingCourses.map(course => ({
        ...course,
        gst_percent: 18,
        main_branch_percent: 60,
        franchise_branch_percent: 40
    }));

    const { data, error } = await supabase
        .from('course_fees')
        .upsert(coursesWithDefaults, { onConflict: 'course_name' })
        .select();

    if (error) {
        console.error('Error adding courses:', error);
    } else {
        console.log(`✅ Successfully added/updated ${data.length} courses:`);
        data.forEach(c => console.log(`   - [${c.category}] ${c.course_name} - ₹${c.total_fee}`));
    }
};

addMissingCourses();
