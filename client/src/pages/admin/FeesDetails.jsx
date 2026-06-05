import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../config';

const COURSE_DATA = [
    // Kids
    { name: 'Scratch Coding', category: 'Kids' },
    { name: 'Robotics for Kids', category: 'Kids' },

    // CSE / IT
    { name: 'Java Programming', category: 'CSE / IT' },
    { name: 'Full Stack Development', category: 'CSE / IT' },
    { name: 'Software Testing', category: 'CSE / IT' },
    { name: 'UI/UX Design', category: 'CSE / IT' },
    { name: 'Web Development', category: 'CSE / IT' },
    { name: 'Data Analytics', category: 'CSE / IT' },
    { name: 'Python Programming', category: 'CSE / IT' },

    // Mechanical
    { name: 'Computational Fluid Dynamics (CFD)', category: 'Mechanical' },
    { name: 'Wiring Harness Design', category: 'Mechanical' },
    { name: 'Creo Parametric', category: 'Mechanical' },
    { name: 'SolidWorks Masterclass', category: 'Mechanical' },
    { name: '3D Printing & Prototyping', category: 'Mechanical' },
    { name: 'HyperMesh', category: 'Mechanical' },
    { name: 'ANSYS Simulation', category: 'Mechanical' },
    { name: 'CATIA V5', category: 'Mechanical' },
    { name: 'ANSA Pre-processing', category: 'Mechanical' },
    { name: 'NX CAD (Unigraphics)', category: 'Mechanical' },
    { name: 'Autodesk Inventor', category: 'Mechanical' },
    { name: 'AutoCAD Mechanical', category: 'Mechanical' },

    // Civil
    { name: 'SketchUp', category: 'Civil' },
    { name: 'Civil CAD', category: 'Civil' },
    { name: 'BIM Professional', category: 'Civil' },
    { name: 'STAAD.Pro', category: 'Civil' },
    { name: 'Revit Architecture', category: 'Civil' },

    // Arts / Others
    { name: 'Digital Marketing (Media)', category: 'Arts' },
    { name: 'Tally with GST', category: 'Arts' },
    { name: 'Digital Marketing (Adv)', category: 'Arts' },
    { name: 'MS Office', category: 'Arts' }
];

const FeesDetails = () => {
    const navigate = useNavigate();
    const [fees, setFees] = useState([]);
    const [filteredFees, setFilteredFees] = useState([]);
    const [filterCategory, setFilterCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        course_name: '',
        category: '',
        total_fee: 0,
        gst_percent: 0,
        main_branch_percent: 0,
        franchise_branch_percent: 0
    });
    const [error, setError] = useState(null);
    const [isCustomCourse, setIsCustomCourse] = useState(false);

    // Calculated fields for preview
    const calculateAmounts = (data) => {
        const total = parseFloat(data.total_fee) || 0;
        const gstPercent = parseFloat(data.gst_percent) || 0;
        const mainPercent = parseFloat(data.main_branch_percent) || 0;
        const franchisePercent = parseFloat(data.franchise_branch_percent) || 0;

        const gst = (total * gstPercent) / 100;
        const netAmount = total - gst;

        const main = (netAmount * mainPercent) / 100;
        const franchise = (netAmount * franchisePercent) / 100;

        return { total, gst, main, franchise, netAmount };
    };

    const calculated = calculateAmounts(formData);
    const splitTotal = (parseFloat(formData.main_branch_percent) || 0) +
        (parseFloat(formData.franchise_branch_percent) || 0);

    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (!user) {
            navigate('/admin/login');
            return;
        }
        fetchFees();
    }, [navigate]);

    const fetchFees = async () => {
        setLoading(true);
        try {
            const response = await fetch(config.API_URL + '/api/fees');
            if (response.ok) {
                const data = await response.json();
                setFees(data);
                setFilteredFees(data);
            } else {
                console.error('Failed to fetch fees');
            }
        } catch (error) {
            console.error('Error fetching fees:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (filterCategory) {
            setFilteredFees(fees.filter(fee => fee.category === filterCategory));
        } else {
            setFilteredFees(fees);
        }
    }, [filterCategory, fees]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'course_name' && value === '__new__') {
            setIsCustomCourse(true);
            setFormData({ ...formData, course_name: '' });
        } else {
            setFormData({
                ...formData,
                [name]: value
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (Math.abs(splitTotal - 100) > 0.1) {
            setError('Main and Franchise percentages must sum to 100% (of the net amount)');
            return;
        }

        try {
            const url = isEditing
                ? `${config.API_URL}/api/fees/${editId}`
                : config.API_URL + '/api/fees';

            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                alert(isEditing ? 'Fee updated successfully!' : 'Fee added successfully!');
                closeModal();
                fetchFees();
            } else {
                setError(data.error || 'Operation failed');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEdit = (fee) => {
        setFormData({
            course_name: fee.course_name,
            category: fee.category || '',
            total_fee: fee.total_fee,
            gst_percent: fee.gst_percent,
            main_branch_percent: fee.main_branch_percent,
            franchise_branch_percent: fee.franchise_branch_percent
        });
        setEditId(fee.id);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this fee structure?')) return;

        try {
            const response = await fetch(`${config.API_URL}/api/fees/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchFees();
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const openAddModal = () => {
        setFormData({
            course_name: '',
            category: '',
            total_fee: 0,
            gst_percent: 0,
            main_branch_percent: 0,
            franchise_branch_percent: 0
        });
        setIsEditing(false);
        setShowModal(true);
        setError(null);
        setIsCustomCourse(false);
    };

    const closeModal = () => {
        setShowModal(false);
        setError(null);
        setIsCustomCourse(false);
    };

    // Calculate display values for table
    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/admin/login');
    };

    const getRowDisplay = (fee) => {
        const total = parseFloat(fee.total_fee);
        const gst = (total * fee.gst_percent) / 100;
        const net = total - gst;
        const main = (net * fee.main_branch_percent) / 100;
        const fran = (net * fee.franchise_branch_percent) / 100;
        return { gst, main, fran };
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* Sidebar */}
            <div className="w-64 bg-white text-slate-600 min-h-screen flex flex-col shadow-xl hidden md:flex border-r border-slate-200">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-blue-600">
                            <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
                        </svg>
                        AdminPortal
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <a href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-400 group-hover:text-slate-600">
                            <path d="M11.47 3.84a.75.75 0 011.06 0l8.632 8.632a.75.75 0 011.06 0l-8.632-8.632a.75.75 0 00-1.06 0L2.909 12.472a.75.75 0 001.06 1.06l8.632-8.632zM2.25 15a.75.75 0 01.75-.75h1.5v6.75A.75.75 0 005.25 21h4.5A.75.75 0 0010.5 21v-4.5h3v4.5A.75.75 0 0014.25 21h4.5a.75.75 0 00.75-.75V14.25h1.5a.75.75 0 010 1.5H19.5V21a2.25 2.25 0 01-2.25 2.25h-4.5A2.25 2.25 0 0110.5 21v-4.5h-3v4.5A2.25 2.25 0 015.25 23.25h-4.5A2.25 2.25 0 01.75 21v-6.75h-.75a.75.75 0 01-.75-.75z" />
                        </svg>
                        Dashboard
                    </a>
                    <a href="/admin/fees" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-700 font-medium shadow-sm ring-1 ring-blue-200 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 01-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.324.152-.691.546-1.004zM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 01-.921.42z" />
                            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.656c-.89.577-1.354 1.4-1.354 2.296 0 1.306.945 2.375 2.532 2.802l.542.146v2.853c-.381-.137-.69-.387-.899-.684a.75.75 0 10-1.26.836c.45.679.957 1.144 1.572 1.405V18a.75.75 0 001.5 0v-.814a3.836 3.836 0 001.719-.657c.89-.576 1.355-1.4 1.355-2.296 0-1.306-.944-2.375-2.532-2.802l-.542-.146v-3.07c.395.143.725.405.942.716a.75.75 0 001.238-.802c-.443-.687-.962-1.164-1.597-1.422V6z" clipRule="evenodd" />
                        </svg>
                        Fees Details
                    </a>
                    <a href="/admin/student-fees" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Student Fees
                    </a>
                </nav>

                {/* User Profile Section */}
                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                            {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-slate-700 truncate">{user?.username || 'User'}</p>
                            <p className="text-xs text-slate-500 truncate capitalize">{user?.role || 'Role'}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="mt-3 w-full py-2 px-4 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden text-slate-900">
                <header className="bg-white shadow-sm border-b border-slate-200 p-4 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold text-slate-800">Fees Management</h2>
                    <div className="flex items-center space-x-4">
                        <div className="hidden md:block text-right">
                            <p className="text-sm font-medium text-slate-700">{user?.username || 'User'}</p>
                            <p className="text-xs text-slate-500 capitalize">{user?.role || 'Role'}</p>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-auto bg-slate-50">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-slate-800">Course Fee Structures</h3>
                        {user?.role === 'super_admin' && (
                            <button
                                onClick={openAddModal}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center shadow-sm"
                            >
                                <span className="mr-2">+</span> Add New Fee
                            </button>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="mb-6">
                        <select
                            className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {[...new Set(COURSE_DATA.map(c => c.category))].sort().map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Fees Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Fee</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breakdown</th>
                                    {user?.role === 'super_admin' && (
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-4 text-slate-500">Loading...</td></tr>
                                ) : filteredFees.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-4 text-slate-500">No fee structures found</td></tr>
                                ) : (
                                    filteredFees.map((fee) => {
                                        const display = getRowDisplay(fee);
                                        return (
                                            <tr key={fee.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{fee.course_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{fee.category || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">₹{fee.total_fee}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    <div className="flex flex-col space-y-1 text-xs">
                                                        <span className="text-blue-700 font-medium">GST ({fee.gst_percent}%): ₹{display.gst.toFixed(0)}</span>
                                                        <span className="text-green-700 font-medium">Main ({fee.main_branch_percent}% of net): ₹{display.main.toFixed(0)}</span>
                                                        <span className="text-purple-700 font-medium">Fran ({fee.franchise_branch_percent}% of net): ₹{display.fran.toFixed(0)}</span>
                                                    </div>
                                                </td>
                                                {user?.role === 'super_admin' && (
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button onClick={() => handleEdit(fee)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                                                        <button onClick={() => handleDelete(fee.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
                        <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit Fee Structure' : 'Add New Fee Structure'}</h2>

                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="md:col-span-2 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={(e) => {
                                                setFormData({ ...formData, category: e.target.value, course_name: '' });
                                            }}
                                            className="w-full border rounded p-2"
                                            required
                                        >
                                            <option value="">Select Category</option>
                                            {[...new Set(COURSE_DATA.map(c => c.category))].sort().map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {formData.category && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                                            {!isCustomCourse ? (
                                                <select
                                                    name="course_name"
                                                    value={formData.course_name}
                                                    onChange={handleInputChange}
                                                    className="w-full border rounded p-2"
                                                    required
                                                >
                                                    <option value="">Select Course</option>
                                                    {COURSE_DATA
                                                        .filter(c => c.category === formData.category)
                                                        .map(c => (
                                                            <option key={c.name} value={c.name}>{c.name}</option>
                                                        ))}
                                                    <option value="__new__">+ Add New Course</option>
                                                </select>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        name="course_name"
                                                        value={formData.course_name}
                                                        onChange={handleInputChange}
                                                        placeholder="Enter new course name"
                                                        className="flex-1 border rounded p-2"
                                                        required
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setIsCustomCourse(false); setFormData(f => ({ ...f, course_name: '' })); }}
                                                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border rounded"
                                                    >Back</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Fee (₹)</label>
                                    <input
                                        type="number"
                                        name="total_fee"
                                        value={formData.total_fee}
                                        onChange={handleInputChange}
                                        className="w-full border rounded p-2"
                                        required
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">GST Percentage (% of Total)</label>
                                    <input
                                        type="number"
                                        name="gst_percent"
                                        value={formData.gst_percent}
                                        onChange={handleInputChange}
                                        className="w-full border rounded p-2"
                                        required
                                        min="0"
                                        max="100"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Main Branch (% of Net)</label>
                                    <input
                                        type="number"
                                        name="main_branch_percent"
                                        value={formData.main_branch_percent}
                                        onChange={handleInputChange}
                                        className="w-full border rounded p-2"
                                        required
                                        min="0"
                                        max="100"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Franchise Branch (% of Net)</label>
                                    <input
                                        type="number"
                                        name="franchise_branch_percent"
                                        value={formData.franchise_branch_percent}
                                        onChange={handleInputChange}
                                        className="w-full border rounded p-2"
                                        required
                                        min="0"
                                        max="100"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            {/* Live Calculation Preview */}
                            <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
                                <h4 className="font-semibold mb-2">Breakdown Preview</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex justify-between"><span>Total:</span> <span className="font-bold">₹{calculated.total.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-blue-600"><span>GST ({formData.gst_percent}%):</span> <span>₹{calculated.gst.toFixed(2)}</span></div>
                                    <div className="flex justify-between border-t pt-1"><span>Net Amount:</span> <span className="font-semibold">₹{calculated.netAmount.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-green-600"><span>Main ({formData.main_branch_percent}% of net):</span> <span>₹{calculated.main.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-purple-600"><span>Franchise ({formData.franchise_branch_percent}% of net):</span> <span>₹{calculated.franchise.toFixed(2)}</span></div>
                                </div>
                                <div className={`mt-2 text-sm font-bold text-right ${Math.abs(splitTotal - 100) < 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                                    Split Total: {splitTotal.toFixed(2)}% (Target: 100%)
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                            <div className="flex justify-end space-x-3">
                                <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                                    {isEditing ? 'Update Fee' : 'Add Fee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeesDetails;
