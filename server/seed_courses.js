const supabase = require('./config/supabaseClient');

const courses = [
    // Kids
    { course_name: 'Scratch Coding', total_fee: 4000, category: 'Kids' },
    { course_name: 'Robotics for Kids', total_fee: 5000, category: 'Kids' },

    // CSE / IT
    { course_name: 'Java Programming', total_fee: 25999, category: 'CSE / IT' },
    { course_name: 'Full Stack Development', total_fee: 69999, category: 'CSE / IT' },
    { course_name: 'Software Testing', total_fee: 69999, category: 'CSE / IT' },
    { course_name: 'UI/UX Design', total_fee: 20999, category: 'CSE / IT' },
    { course_name: 'Web Development', total_fee: 36999, category: 'CSE / IT' },
    { course_name: 'Data Analytics', total_fee: 69999, category: 'CSE / IT' },
    { course_name: 'Python Programming', total_fee: 18999, category: 'CSE / IT' },

    // Mechanical
    { course_name: 'Computational Fluid Dynamics (CFD)', total_fee: 13999, category: 'Mechanical' },
    { course_name: 'Wiring Harness Design', total_fee: 19999, category: 'Mechanical' },
    { course_name: 'Creo Parametric', total_fee: 24999, category: 'Mechanical' },
    { course_name: 'SolidWorks Masterclass', total_fee: 24999, category: 'Mechanical' },
    { course_name: '3D Printing & Prototyping', total_fee: 14999, category: 'Mechanical' },
    { course_name: 'HyperMesh', total_fee: 21000, category: 'Mechanical' },
    { course_name: 'ANSYS Simulation', total_fee: 19999, category: 'Mechanical' },
    { course_name: 'CATIA V5', total_fee: 19999, category: 'Mechanical' },
    { course_name: 'ANSA Pre-processing', total_fee: 17999, category: 'Mechanical' },
    { course_name: 'NX CAD (Unigraphics)', total_fee: 19999, category: 'Mechanical' },
    { course_name: 'Autodesk Inventor', total_fee: 19999, category: 'Mechanical' },
    { course_name: 'AutoCAD Mechanical', total_fee: 6999, category: 'Mechanical' },

    // Civil
    { course_name: 'SketchUp', total_fee: 17999, category: 'Civil' },
    { course_name: 'Civil CAD', total_fee: 7499, category: 'Civil' },
    { course_name: 'BIM Professional', total_fee: 34999, category: 'Civil' },
    { course_name: 'STAAD.Pro', total_fee: 17999, category: 'Civil' },
    { course_name: 'Revit Architecture', total_fee: 19999, category: 'Civil' },

    // Arts / Others
    { course_name: 'Digital Marketing (Media)', total_fee: 29999, category: 'Arts' },
    { course_name: 'Tally with GST', total_fee: 7999, category: 'Arts' },
    { course_name: 'Digital Marketing (Adv)', total_fee: 29999, category: 'Arts' },
    { course_name: 'MS Office', total_fee: 8999, category: 'Arts' }
];

const seedCourses = async () => {
    console.log(`Seeding ${courses.length} courses...`);

    const coursesWithDefaults = courses.map(course => ({
        ...course,
        gst_percent: 18,
        main_branch_percent: 60,
        franchise_branch_percent: 40
    }));

    // Update existing records with new category if they match on course_name
    const { data, error } = await supabase
        .from('course_fees')
        .upsert(coursesWithDefaults, { onConflict: 'course_name' })
        .select();

    if (error) {
        console.error('Error seeding courses:', error);
    } else {
        console.log('Successfully seeded courses:', data.length);
    }
};

seedCourses();
