import React, { useState, useEffect } from 'react';
import config from '../../config';

const COURSE_DATA = [
    { name: 'Scratch Coding', category: 'Kids' },
    { name: 'Robotics for Kids', category: 'Kids' },
    { name: 'Java Programming', category: 'CSE / IT' },
    { name: 'Full Stack Development', category: 'CSE / IT' },
    { name: 'Software Testing', category: 'CSE / IT' },
    { name: 'UI/UX Design', category: 'CSE / IT' },
    { name: 'Web Development', category: 'CSE / IT' },
    { name: 'Data Analytics', category: 'CSE / IT' },
    { name: 'Python Programming', category: 'CSE / IT' },
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
    { name: 'SketchUp', category: 'Civil' },
    { name: 'Civil CAD', category: 'Civil' },
    { name: 'BIM Professional', category: 'Civil' },
    { name: 'STAAD.Pro', category: 'Civil' },
    { name: 'Revit Architecture', category: 'Civil' },
    { name: 'Digital Marketing (Media)', category: 'Arts' },
    { name: 'Tally with GST', category: 'Arts' },
    { name: 'Digital Marketing (Adv)', category: 'Arts' },
    { name: 'MS Office', category: 'Arts' }
];

const FeesTab = ({ userRole }) => {
    const [fees, setFees] = useState([]);
    const [filteredFees, setFilteredFees] = useState([]);
    const [filterCategory, setFilterCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        course_name: '',
        category: '',
        total_fee: 0,
        gst_percent: 0,
        main_branch_percent: 0,
        franchise_branch_percent: 0
    });
    const [isCustomCourse, setIsCustomCourse] = useState(false);

    const calculateAmounts = (data) => {
        const total = parseFloat(data.total_fee) || 0;
        const gstPercent = parseFloat(data.gst_percent) || 0;
        const mainPercent = parseFloat(data.main_branch_percent) || 0;
        const franchisePercent = parseFloat(data.franchise_branch_percent) || 0;
        const gst = (total * gstPercent) / 100;
        const netAmount = total - gst;
        return { total, gst, main: (netAmount * mainPercent) / 100, franchise: (netAmount * franchisePercent) / 100, netAmount };
    };

    const calculated = calculateAmounts(formData);
    const splitTotal = (parseFloat(formData.main_branch_percent) || 0) + (parseFloat(formData.franchise_branch_percent) || 0);

    useEffect(() => { fetchFees(); }, []);

    useEffect(() => {
        setFilteredFees(filterCategory ? fees.filter(f => f.category === filterCategory) : fees);
    }, [filterCategory, fees]);

    const fetchFees = async () => {
        setLoading(true);
        try {
            const res = await fetch(config.API_URL + '/api/fees');
            if (res.ok) {
                const data = await res.json();
                setFees(data);
                setFilteredFees(data);
            }
        } catch (err) {
            console.error('Error fetching fees:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        if (e.target.name === 'course_name' && e.target.value === '__new__') {
            setIsCustomCourse(true);
            setFormData({ ...formData, course_name: '' });
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (Math.abs(splitTotal - 100) > 0.1) {
            setError('Main and Franchise percentages must sum to 100% (of net amount)');
            return;
        }
        try {
            const url = isEditing ? `${config.API_URL}/api/fees/${editId}` : `${config.API_URL}/api/fees`;
            const res = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                alert(isEditing ? 'Fee updated!' : 'Fee added!');
                closeModal();
                fetchFees();
            } else {
                setError(data.error || 'Operation failed');
            }
        } catch (err) { setError(err.message); }
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
        if (!window.confirm('Delete this fee structure?')) return;
        try {
            const res = await fetch(`${config.API_URL}/api/fees/${id}`, { method: 'DELETE' });
            if (res.ok) fetchFees();
            else alert('Failed to delete');
        } catch (err) { console.error(err); }
    };

    const openAddModal = () => {
        setFormData({ course_name: '', category: '', total_fee: 0, gst_percent: 0, main_branch_percent: 0, franchise_branch_percent: 0 });
        setIsCustomCourse(false);
        setIsEditing(false);
        setShowModal(true);
        setError(null);
    };

    const closeModal = () => { setShowModal(false); setError(null); setIsCustomCourse(false); };

    const getRowDisplay = (fee) => {
        const total = parseFloat(fee.total_fee);
        const gst = (total * fee.gst_percent) / 100;
        const net = total - gst;
        return { gst, main: (net * fee.main_branch_percent) / 100, fran: (net * fee.franchise_branch_percent) / 100 };
    };

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-800">Course Fee Structures</h3>
                    <select
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        {[...new Set(COURSE_DATA.map(c => c.category))].sort().map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                {userRole === 'super_admin' && (
                    <button
                        onClick={openAddModal}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add New Fee
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Fee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breakdown</th>
                            {userRole === 'super_admin' && (
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="5" className="text-center py-8 text-slate-400">Loading...</td></tr>
                        ) : filteredFees.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-8 text-slate-400">No fee structures found</td></tr>
                        ) : (
                            filteredFees.map((fee) => {
                                const d = getRowDisplay(fee);
                                return (
                                    <tr key={fee.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{fee.course_name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{fee.category || '-'}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-800">₹{Number(fee.total_fee).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="flex flex-col gap-0.5 text-xs">
                                                <span className="text-blue-700 font-medium">GST ({fee.gst_percent}%): ₹{d.gst.toFixed(0)}</span>
                                                <span className="text-green-700 font-medium">Main ({fee.main_branch_percent}% of net): ₹{d.main.toFixed(0)}</span>
                                                <span className="text-purple-700 font-medium">Fran ({fee.franchise_branch_percent}% of net): ₹{d.fran.toFixed(0)}</span>
                                            </div>
                                        </td>
                                        {userRole === 'super_admin' && (
                                            <td className="px-6 py-4 text-right text-sm font-medium">
                                                <button onClick={() => handleEdit(fee)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                                                <button onClick={() => handleDelete(fee.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">{isEditing ? 'Edit Fee Structure' : 'Add New Fee Structure'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="md:col-span-2 space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value, course_name: '' })}
                                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
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
                                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                                                    required
                                                >
                                                    <option value="">Select Course</option>
                                                    {COURSE_DATA.filter(c => c.category === formData.category).map(c => (
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
                                                        className="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                                                        required
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setIsCustomCourse(false); setFormData(f => ({ ...f, course_name: '' })); }}
                                                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-300 rounded-lg"
                                                    >Back</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {[
                                    { label: 'Total Fee (₹)', name: 'total_fee' },
                                    { label: 'GST Percentage (% of Total)', name: 'gst_percent' },
                                    { label: 'Main Branch (% of Net)', name: 'main_branch_percent' },
                                    { label: 'Franchise Branch (% of Net)', name: 'franchise_branch_percent' }
                                ].map(field => (
                                    <div key={field.name}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                                        <input
                                            type="number"
                                            name={field.name}
                                            value={formData[field.name]}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                                            required
                                            min="0"
                                            max={field.name === 'total_fee' ? undefined : "100"}
                                            step="0.01"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Preview */}
                            <div className="bg-indigo-50 p-4 rounded-xl mb-4 border border-indigo-100">
                                <h4 className="font-semibold text-indigo-800 mb-2 text-sm">Breakdown Preview</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                                    <div className="flex justify-between"><span>Total:</span><span className="font-bold">₹{calculated.total.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-blue-700"><span>GST ({formData.gst_percent}%):</span><span>₹{calculated.gst.toFixed(2)}</span></div>
                                    <div className="flex justify-between border-t pt-1"><span>Net Amount:</span><span className="font-semibold">₹{calculated.netAmount.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-green-700"><span>Main ({formData.main_branch_percent}% of net):</span><span>₹{calculated.main.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-purple-700"><span>Franchise ({formData.franchise_branch_percent}% of net):</span><span>₹{calculated.franchise.toFixed(2)}</span></div>
                                </div>
                                <div className={`mt-2 text-sm font-bold text-right ${Math.abs(splitTotal - 100) < 0.1 ? 'text-green-600' : 'text-red-500'}`}>
                                    Split Total: {splitTotal.toFixed(2)}% (Target: 100%)
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-100 text-slate-700 rounded-lg hover:bg-gray-200 text-sm font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
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

export default FeesTab;
