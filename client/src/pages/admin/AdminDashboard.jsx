
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateApplicationPDF } from '../../utils/pdfGenerator';
const logo = '/logo.png';
import ContentEditor from './ContentEditor';
import FeesTab from './FeesTab';
import StudentFeesTab from './StudentFeesTab';
import config from '../../config';

// Map course name → admin category key
const COURSE_CATEGORY_MAP = {
    'BIM Professional': 'Civil',
    'Revit Architecture': 'Civil',
    'SketchUp': 'Civil',
    'Civil CAD': 'Civil',
    'STAAD.Pro': 'Civil',
    'AutoCAD Mechanical': 'Mechanical',
    'Creo Parametric': 'Mechanical',
    'SolidWorks Masterclass': 'Mechanical',
    'CATIA V5': 'Mechanical',
    'HyperMesh': 'Mechanical',
    'ANSYS Simulation': 'Mechanical',
    'Computational Fluid Dynamics (CFD)': 'Mechanical',
    'Wiring Harness Design': 'Mechanical',
    '3D Printing & Prototyping': 'Mechanical',
    'NX CAD (Unigraphics)': 'Mechanical',
    'ANSA Pre-processing': 'Mechanical',
    'Autodesk Inventor': 'Mechanical',
    'Web Development': 'CSE / IT',
    'Data Analytics': 'CSE / IT',
    'Python Programming': 'CSE / IT',
    'Java Programming': 'CSE / IT',
    'Full Stack Development': 'CSE / IT',
    'Software Testing': 'CSE / IT',
    'UI/UX Design': 'CSE / IT',
    'Digital Marketing (Adv)': 'CSE / IT',
    'Digital Marketing (Media)': 'CSE / IT',
    'MS Office': 'CSE / IT',
    'Tally with GST': 'CSE / IT',
    'Robotics for Kids': 'Kids',
    'Scratch Coding': 'Kids',
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        totalApplications: 0,
        overduePayments: 0,
        penaltyEligible: 0,
        totalFees: 0,
        totalPaid: 0
    });
    const [applications, setApplications] = useState([]);
    const [filterCourse, setFilterCourse] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterEmail, setFilterEmail] = useState('');
    const [filterPhone, setFilterPhone] = useState('');
    const [filterBranch, setFilterBranch] = useState('');
    const [feesFilter, setFeesFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadApplicationId, setUploadApplicationId] = useState(null);
    const fileInputRef = useRef(null);
    const [showModal, setShowModal] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const [alertFilter, setAlertFilter] = useState('all'); // 'all' or 'urgent'
    const [certificateFile, setCertificateFile] = useState(null);
    const [uploadingCertificate, setUploadingCertificate] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({});

    const [activeTab, setActiveTab] = useState('applications');
    const [users, setUsers] = useState([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isEditingUser, setIsEditingUser] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user', branch_id: '', permissions: { view: true, edit: false }, email: '' });
    const [branches, setBranches] = useState([]);
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [branchForm, setBranchForm] = useState({ id: null, name: '' });
    const [isEditingBranch, setIsEditingBranch] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Software Covered state
    const [softwareItems, setSoftwareItems] = useState([]);
    const [showSoftwareModal, setShowSoftwareModal] = useState(false);
    const [pendingStatusId, setPendingStatusId] = useState(null);
    const [selectedSoftware, setSelectedSoftware] = useState([]);
    const [newSoftwareName, setNewSoftwareName] = useState('');
    const [editingSoftwareId, setEditingSoftwareId] = useState(null);
    const [editingSoftwareName, setEditingSoftwareName] = useState('');
    const [selectedCertBranch, setSelectedCertBranch] = useState('');
    // Course-wise certificate templates
    const [courseTemplates, setCourseTemplates] = useState([]);
    const [certCategory, setCertCategory] = useState('CSE / IT');
    const [certTemplateUploading, setCertTemplateUploading] = useState(false);
    const certTemplateInputRef = useRef(null);
    // Certificate logos
    const [certLogoMain, setCertLogoMain] = useState('');
    const [certLogoBadge, setCertLogoBadge] = useState('');
    const [logoUploading, setLogoUploading] = useState({ main: false, badge: false });
    const logoMainInputRef = useRef(null);
    const logoBadgeInputRef = useRef(null);
    // Partner logos (Authorised Training Partner section)
    const [uploadField, setUploadField] = useState('certificate_url');
    const [partnerLogoUploading, setPartnerLogoUploading] = useState(false);
    const partnerLogoInputRef = useRef(null);
    // Certificate preview
    const [certPreviewLoading, setCertPreviewLoading] = useState(false);
    const [certPreviewFields, setCertPreviewFields] = useState({
        student_name: 'John Doe',
        application_id: 'ADM-2024-001',
        certificate_number: 'CERT-2024-001',
        course: 'SolidWorks Masterclass',
        course_start_date: '2024-01-15',
        course_end_date: '2024-06-15',
        software_covered: 'SolidWorks, ANSYS',
        branch: 'Main Branch'
    });
    const [logoPosition, setLogoPosition] = useState({ x: null, y: null });
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerHover, setPickerHover] = useState({ x: 0, y: 0 });

    const courses = [
        'BIM Professional', 'Web Development', 'Data Analytics', 'AutoCAD Mechanical', 'STAAD.Pro',
        'Revit Architecture', 'Tally with GST', 'Digital Marketing (Adv)', 'MS Office', 'Civil CAD',
        'Robotics for Kids', 'Python Programming', 'Scratch Coding', 'Java Programming',
        'Full Stack Development', 'Software Testing', 'Computational Fluid Dynamics (CFD)',
        'UI/UX Design', 'Wiring Harness Design', 'Creo Parametric', 'SolidWorks Masterclass',
        '3D Printing & Prototyping', 'SketchUp', 'Digital Marketing (Media)', 'HyperMesh',
        'ANSYS Simulation', 'CATIA V5', 'ANSA Pre-processing', 'NX CAD (Unigraphics)', 'Autodesk Inventor'
    ];

    useEffect(() => {
        if (user || activeTab === 'branches') {
            fetchBranches();
        }
    }, [user, activeTab]);

    const fetchBranches = async () => {
        try {
            const response = await fetch(config.API_URL + '/api/branches');
            if (response.ok) {
                const data = await response.json();
                setBranches(data);
            }
        } catch (error) {
            console.error("Failed to fetch branches", error);
        }
    };

    const canEdit = () => {
        if (!user) return false;
        if (user.role === 'super_admin' || user.role === 'franchise_owner' || user.role === 'admin') return true;
        // Check if permissions array includes 'edit'
        return Array.isArray(user.permissions) && user.permissions.includes('edit');
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/admin/login');
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [navigate]);

    useEffect(() => {
        if (!user) return;
        fetchAlerts(); // Fetch alerts on mount/user change
        if (activeTab === 'applications') fetchData();
        if (activeTab === 'certificate') { fetchCourseTemplates(); fetchCertLogos(); }
        // Fetch users and branches on mount or when tab is users
        if (user.role === 'super_admin' || user.role === 'franchise_owner') {
            if (activeTab === 'users' || activeTab === 'branches') {
                fetchUsers();
                if (branches.length === 0) {
                    console.log('Fetching branches for reference...');
                    fetchBranches();
                }
            } else {
                fetchUsers(); // Background fetch
            }
        }
        if (user.role === 'super_admin' && branches.length === 0) fetchBranches();
    }, [user, activeTab, filterStatus, filterPaymentStatus, search, filterName, filterEmail, filterPhone, filterCourse, filterBranch]); // Added new filters dependency

    // Sync logoPosition with stored DB offsets when category or templates change
    useEffect(() => {
        if (activeTab === 'certificate' && courseTemplates.length > 0) {
            const catTemplate = courseTemplates.find(t => t.category === certCategory);
            if (catTemplate) {
                setLogoPosition({
                    x: catTemplate.x_offset !== undefined ? catTemplate.x_offset : null,
                    y: catTemplate.y_offset !== undefined ? catTemplate.y_offset : null
                });
            } else {
                setLogoPosition({ x: null, y: null });
            }
        }
    }, [certCategory, courseTemplates, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Build query params
            const params = new URLSearchParams();
            if (user.role !== 'super_admin' && user.branch_id) {
                params.append('branch_id', user.branch_id);
            }
            // Super Admin branch filter
            if (user.role === 'super_admin' && filterBranch) {
                params.append('branch', filterBranch);
            }

            if (filterStatus) params.append('status', filterStatus);
            if (search) params.append('search', search);

            // New filters
            if (filterName) params.append('student_name', filterName);
            if (filterEmail) params.append('email', filterEmail);
            if (filterPhone) params.append('phone', filterPhone);
            if (filterCourse) params.append('course', filterCourse);

            const appRes = await fetch(`${config.API_URL}/api/applications?${params.toString()}`);
            const appData = await appRes.json();

            if (Array.isArray(appData)) {
                // Client-side filter by payment status
                let filteredData = appData;
                if (filterPaymentStatus) {
                    filteredData = appData.filter(app => {
                        const paymentStatus = app.payment_status || 'Pending';
                        return paymentStatus === filterPaymentStatus;
                    });
                }

                // Calculate overdue stats
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                let overdueCount = 0;
                let penaltyCount = 0;
                let totalFees = 0;
                let totalPaid = 0;

                filteredData.forEach(app => {
                    // Calculate Fees
                    const baseFee = (parseFloat(app.fee_total) || 0) - (parseFloat(app.fee_discount_amount) || 0);
                    const manualPenalty = parseFloat(app.penalty_amount) || 0;
                    totalFees += (baseFee + manualPenalty);
                    totalPaid += (parseFloat(app.payment_amount) || 0);

                    // Overdue Logic
                    const dueDateStr = app.payment_last_date || app.payment_date;
                    if (app.payment_status !== 'Paid' && app.payment_status !== 'Refunded' && dueDateStr) {
                        const due = new Date(dueDateStr);
                        due.setHours(0, 0, 0, 0);
                        const daysPassed = Math.floor((now - due) / (1000 * 60 * 60 * 24));
                        if (daysPassed > 15) {
                            penaltyCount++;
                        } else if (daysPassed > 0) {
                            overdueCount++;
                        }
                    }
                });

                setApplications(filteredData);
                setStats({
                    totalApplications: filteredData.length,
                    overduePayments: overdueCount,
                    penaltyEligible: penaltyCount,
                    totalFees: totalFees,
                    totalPaid: totalPaid
                });
            }

        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSoftware = async () => {
        try {
            const res = await fetch(`${config.API_URL}/api/software`);
            const data = await res.json();
            if (res.ok) setSoftwareItems(data);
        } catch (err) {
            console.error('Failed to fetch software items', err);
        }
    };

    const fetchCourseTemplates = async () => {
        try {
            const res = await fetch(`${config.API_URL}/api/course-templates`);
            const data = await res.json();
            if (res.ok) setCourseTemplates(data);
        } catch (err) {
            console.error('Failed to fetch course templates', err);
        }
    };

    const fetchCertLogos = async () => {
        try {
            const [r1, r2] = await Promise.all([
                fetch(`${config.API_URL}/api/content/cert_logo_main`),
                fetch(`${config.API_URL}/api/content/cert_logo_badge`),
            ]);
            if (r1.ok) { const d = await r1.json(); setCertLogoMain(d.content || ''); }
            if (r2.ok) { const d = await r2.json(); setCertLogoBadge(d.content || ''); }
        } catch (err) { console.error('Failed to fetch cert logos', err); }
    };

    const handleLogoUpload = async (e, logoKey, setLogoUrl) => {
        const file = e.target.files[0];
        if (!file) return;
        setLogoUploading(prev => ({ ...prev, [logoKey === 'cert_logo_main' ? 'main' : 'badge']: true }));
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `documents/cert-logos/${logoKey}_${Date.now()}.${fileExt}`;

            const storageRef = ref(storage, fileName);
            const snapshot = await uploadBytes(storageRef, file);
            const publicUrl = await getDownloadURL(snapshot.ref);

            const res = await fetch(`${config.API_URL}/api/content/${logoKey}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: publicUrl })
            });
            if (!res.ok) throw new Error('Failed to save logo URL');
            setLogoUrl(publicUrl);
            alert('✅ Logo updated!');
        } catch (err) {
            console.error(err);
            alert(`❌ Upload failed: ${err.message}`);
        } finally {
            setLogoUploading(prev => ({ ...prev, [logoKey === 'cert_logo_main' ? 'main' : 'badge']: false }));
        }
    };

    const handleCourseTemplateUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCertTemplateUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const safeCat = certCategory.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `documents/cert-templates/${safeCat}_${Date.now()}.${fileExt}`;

            const storageRef = ref(storage, fileName);
            const snapshot = await uploadBytes(storageRef, file);
            const publicUrl = await getDownloadURL(snapshot.ref);

            const res = await fetch(`${config.API_URL}/api/course-templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: certCategory, template_url: publicUrl, file_name: file.name })
            });
            if (!res.ok) throw new Error('Failed to save template record');
            await fetchCourseTemplates();
            alert(`✅ Template uploaded for ${certCategory}!`);
        } catch (err) {
            console.error(err);
            alert(`❌ Upload failed: ${err.message}`);
        } finally {
            setCertTemplateUploading(false);
            if (certTemplateInputRef.current) certTemplateInputRef.current.value = '';
        }
    };

    const handleDeleteCourseTemplate = async (id) => {
        if (!window.confirm('Delete this template?')) return;
        try {
            const res = await fetch(`${config.API_URL}/api/course-templates/${id}`, { method: 'DELETE' });
            if (res.ok) fetchCourseTemplates();
        } catch (err) { console.error(err); }
    };

    const handleSaveLogoPosition = async (newX, newY) => {
        // Find the background template for the CURRENT category to update its offsets
        const catTemplate = courseTemplates.find(t => t.category === certCategory);
        if (!catTemplate) {
            console.warn("No template found for this category to save offsets to.");
            return;
        }

        try {
            const res = await fetch(`${config.API_URL}/api/course-templates/${catTemplate.id}/offset`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x_offset: newX, y_offset: newY })
            });
            if (!res.ok) throw new Error('Failed to save position to database');
            await fetchCourseTemplates(); // Refresh to get updated offsets
            console.log(`✅ Saved position (X:${newX}, Y:${newY}) for ${certCategory}`);
        } catch (err) {
            console.error('Save position error:', err);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        if (newStatus === 'Completed') {
            // Fetch software list and open modal
            await fetchSoftware();
            setPendingStatusId(id);
            setSelectedSoftware([]);
            setShowSoftwareModal(true);
            return;
        }
        await applyStatusUpdate(id, newStatus, null);
    };

    const applyStatusUpdate = async (id, newStatus, softwareCovered) => {
        try {
            // Optimistically update local state
            setApplications(prev =>
                prev.map(app => app.id === id ? { ...app, status: newStatus } : app)
            );

            const body = { status: newStatus };
            if (softwareCovered !== null) body.software_covered = softwareCovered;

            const response = await fetch(`${config.API_URL}/api/applications/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                alert(`❌ Status update failed: ${errData.error || response.statusText}`);
                fetchData();
                return;
            }

            const updatedApp = (await response.json()).application;

            if (newStatus === 'Completed') {
                alert('✅ Status set to Completed! Certificate has been auto-generated and uploaded.');
            }

            // Sync the detail modal if it's open for this application
            if (showModal && selectedApplication && selectedApplication.id === id) {
                setSelectedApplication(updatedApp || { ...selectedApplication, status: newStatus });
            }

            fetchData();
            fetchAlerts();
        } catch (error) {
            console.error('Update failed', error);
            alert(`❌ Error: ${error.message || 'Could not update status. Please check your connection or server logs.'}`);
            fetchData();
        }
    };

    const handleSoftwareModalConfirm = async () => {
        const softwareCovered = selectedSoftware.join(', ');
        setShowSoftwareModal(false);
        await applyStatusUpdate(pendingStatusId, 'Completed', softwareCovered);
        setPendingStatusId(null);
        setSelectedSoftware([]);
    };

    const toggleSoftwareItem = (name) => {
        setSelectedSoftware(prev =>
            prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
        );
    };

    const handleAddSoftware = async () => {
        if (!newSoftwareName.trim()) return;
        try {
            const res = await fetch(`${config.API_URL}/api/software`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newSoftwareName.trim() })
            });
            if (res.ok) {
                setNewSoftwareName('');
                fetchSoftware();
            }
        } catch (err) { console.error(err); }
    };

    const handleEditSoftwareSave = async (id) => {
        if (!editingSoftwareName.trim()) return;
        try {
            const res = await fetch(`${config.API_URL}/api/software/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingSoftwareName.trim() })
            });
            if (res.ok) {
                setEditingSoftwareId(null);
                setEditingSoftwareName('');
                fetchSoftware();
            }
        } catch (err) { console.error(err); }
    };

    const handleDeleteSoftware = async (id) => {
        if (!window.confirm('Delete this software item?')) return;
        try {
            await fetch(`${config.API_URL}/api/software/${id}`, { method: 'DELETE' });
            fetchSoftware();
        } catch (err) { console.error(err); }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/admin/login');
    };

    const fetchAlerts = async () => {
        try {
            const params = new URLSearchParams();
            if (user.role !== 'super_admin' && user.branch_id) {
                params.append('branch_id', user.branch_id);
            }
            const response = await fetch(`${config.API_URL}/api/applications/alerts?${params.toString()}`);
            const data = await response.json();
            if (response.ok) {
                setAlerts(data);
            }
        } catch (error) {
            console.error('Failed to fetch alerts', error);
        }
    };

    const handleCertificateUpload = async (applicationId) => {
        if (!certificateFile) {
            alert('Please select a certificate file');
            return;
        }

        setUploadingCertificate(true);
        try {
            const fileExt = certificateFile.name.split('.').pop();
            const fileName = `documents/certificates/manual_${Date.now()}.${fileExt}`;

            const storageRef = ref(storage, fileName);
            const snapshot = await uploadBytes(storageRef, certificateFile);
            const publicUrl = await getDownloadURL(snapshot.ref);

            // Update application with certificate URL
            const response = await fetch(`${config.API_URL}/api/applications/${applicationId}/certificate`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ certificate_url: publicUrl })
            });

            if (response.ok) {
                alert('Certificate uploaded successfully!');
                setCertificateFile(null);
                fetchAlerts(); // Refresh alerts
                fetchData(); // Refresh applications
                closeModal();
            }
        } catch (error) {
            console.error('Certificate upload failed', error);
            alert('Failed to upload certificate');
        } finally {
            setUploadingCertificate(false);
        }
    };

    const handleCourseDatesUpdate = async (applicationId, startDate, endDate) => {
        try {
            const response = await fetch(`${config.API_URL}/api/applications/${applicationId}/course-dates`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_start_date: startDate,
                    course_end_date: endDate
                })
            });

            if (response.ok) {
                alert('Course dates updated successfully!');
                fetchData();
                fetchAlerts();
            }
        } catch (error) {
            console.error('Failed to update course dates', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${config.API_URL}/api/auth/users?admin_username=${user.username}`);
            const data = await response.json();
            if (response.ok) {
                setUsers(data);
            } else {
                console.error("Failed to fetch users:", data.error);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                admin_username: user.username,
                username: newUser.username, // for update
                new_username: newUser.username, // for create
                email: newUser.email, // Added email
                password: newUser.password, // for update
                new_password: newUser.password, // for create
                role: newUser.role, // for update
                new_role: newUser.role, // for create
                branch_id: newUser.branch_id || user.branch_id,
                permissions: Object.keys(newUser.permissions).filter(k => newUser.permissions[k])
            };

            const url = isEditingUser
                ? `${config.API_URL}/api/auth/users/${editingUserId}`
                : `${config.API_URL}/api/auth/create-user`;

            const method = isEditingUser ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (response.ok) {
                alert(isEditingUser ? 'User updated successfully' : 'User created successfully');
                setIsUserModalOpen(false);
                setIsEditingUser(false);
                setEditingUserId(null);
                setNewUser({ username: '', password: '', role: 'user', branch_id: '', permissions: { view: true, edit: false }, email: '' });
                fetchUsers();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error("Operation failed", error);
            alert("Operation failed");
        }
    };

    const handleEditUserClick = (u) => {
        setIsEditingUser(true);
        setEditingUserId(u.id);
        setNewUser({
            username: u.username,
            email: u.email || '', // Load email
            password: '', // Don't show password
            role: u.role,
            branch_id: u.branch_id || '',
            permissions: {
                view: u.permissions ? u.permissions.includes('view') : true,
                edit: u.permissions ? u.permissions.includes('edit') : false
            }
        });
        setIsUserModalOpen(true);
    };

    const handleDeleteUser = async (userId, targetUsername) => {
        if (!window.confirm(`Are you sure you want to delete user "${targetUsername}"? This cannot be undone.`)) return;
        try {
            const response = await fetch(`${config.API_URL}/api/auth/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_username: user.username })
            });
            const data = await response.json();
            if (response.ok) {
                alert('User deleted successfully');
                fetchUsers();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Failed to delete user', error);
            alert('Failed to delete user.');
        }
    };

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        if (!isEditing && selectedApplication) {
            // Initialize form data when entering edit mode
            setEditFormData({ ...selectedApplication });
        }
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditFormData({
            ...editFormData,
            [name]: value
        });
    };

    const handleDeleteApplication = async (id) => {
        if (!window.confirm("Are you sure you want to delete this application? This action cannot be undone.")) return;
        try {
            const response = await fetch(`${config.API_URL}/api/applications/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert("Application deleted successfully");
                fetchData();
                fetchAlerts();
            } else {
                const data = await response.json();
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error("Failed to delete application", error);
            alert("Failed to delete application. Please check your connection or server logs.");
        }
    };

    const handleUpdateApplication = async () => {
        if (!selectedApplication) return;

        try {
            const response = await fetch(`${config.API_URL}/api/applications/${selectedApplication.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editFormData)
            });

            if (response.ok) {
                const data = await response.json();
                alert('Application details updated successfully!');
                setIsEditing(false);
                setSelectedApplication(editFormData); // Update local view
                fetchData(); // Refresh list
                fetchAlerts(); // Refresh alerts just in case
            } else {
                const data = await response.json();
                alert(`Update failed: ${data.error}`);
            }
        } catch (error) {
            console.error('Failed to update application', error);
            alert('Failed to update application. Please try again.');
        }
    };

    const handleSaveBranch = async (e) => {
        e.preventDefault();
        try {
            const url = isEditingBranch
                ? `${config.API_URL}/api/branches/${branchForm.id}`
                : `${config.API_URL}/api/branches`;

            const method = isEditingBranch ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: branchForm.name })
            });

            if (response.ok) {
                alert(`Branch ${isEditingBranch ? 'updated' : 'created'} successfully`);
                fetchBranches();
                setIsBranchModalOpen(false);
                setBranchForm({ id: null, name: '' });
                setIsEditingBranch(false);
            } else {
                const data = await response.json();
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error("Failed to save branch", error);
        }
    };

    const handleDeleteBranch = async (id) => {
        if (!window.confirm("Are you sure you want to delete this branch?")) return;
        try {
            const response = await fetch(`${config.API_URL}/api/branches/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert("Branch deleted successfully");
                fetchBranches();
            } else {
                const data = await response.json();
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error("Failed to delete branch", error);
        }
    };

    const openBranchModal = (branch = null) => {
        if (branch) {
            setBranchForm({ id: branch.id, name: branch.name });
            setIsEditingBranch(true);
        } else {
            setBranchForm({ id: null, name: '' });
            setIsEditingBranch(false);
        }
        setIsBranchModalOpen(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedApplication(null);
    };

    const handleViewApplication = (app) => {
        setSelectedApplication(app);
        setEditFormData({ ...app }); // Initialize edit form data
        setIsEditing(false); // Ensure we are not in edit mode when opening
        setShowModal(true);
    };

    const handleExportCSV = () => {
        const headers = ['Application ID', 'Student Name', 'Phone', 'Email', 'Branch', 'Course', 'Application Status', 'Payment Status', 'Total Fee', 'Scholarship %', 'Discount Amount', 'Penalty Amount', 'Final Fee', 'Amount Paid', 'Balance Due', 'Payment Method', 'Payment Date', 'Transaction ID', 'Course Start Date', 'Course End Date', 'Submitted Date'];
        const rows = applications.map(app => {
            const totalFee = parseFloat(app.fee_total || 0);
            const discountAmount = parseFloat(app.fee_discount_amount || 0);
            const penaltyAmount = parseFloat(app.penalty_amount || 0);
            const finalFee = app.is_scholarship ? (totalFee - discountAmount + penaltyAmount).toFixed(2) : (totalFee + penaltyAmount).toFixed(2);
            const amountPaid = parseFloat(app.payment_amount || 0);
            const balanceDue = (parseFloat(finalFee) - amountPaid).toFixed(2);
            return [app.application_id || '', app.student_name || '', app.phone || '', app.email || '', app.branch || '', app.course || '', app.status || '', app.payment_status || 'Pending', totalFee.toFixed(2), app.scholarship_percent || '0', discountAmount.toFixed(2), penaltyAmount.toFixed(2), finalFee, amountPaid.toFixed(2), balanceDue, app.payment_method || 'N/A', app.payment_date ? new Date(app.payment_date).toLocaleDateString() : 'Not recorded', app.payment_transaction_id || 'N/A', app.course_start_date || 'N/A', app.course_end_date || 'N/A', app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'];
        });
        const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `applications_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPDF = (application) => {
        generateApplicationPDF(application);
    };


    const handleFileSelect = (appId, field = 'certificate_url') => {
        setUploadApplicationId(appId);
        setUploadField(field);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleDocumentUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const targetAppId = selectedApplication ? selectedApplication.id : uploadApplicationId;

        let targetAppDisplayId = '';
        if (selectedApplication) {
            targetAppDisplayId = selectedApplication.application_id;
        } else if (uploadApplicationId) {
            const app = alerts.find(a => a.id === uploadApplicationId) || applications.find(a => a.id === uploadApplicationId);
            targetAppDisplayId = app ? app.application_id : 'unknown';
        }

        if (!targetAppId) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const cleanAppId = targetAppDisplayId.replace(/[^a-zA-Z0-9]/g, '_');

            // Determine storage folder based on field
            let folder = 'documents';
            if (uploadField === 'photo_url') folder = 'photos';
            else if (uploadField === 'signature_url') folder = 'signatures';
            else if (uploadField === 'id_proof_url') folder = 'id_proofs';
            else if (uploadField.includes('marksheet')) folder = 'marksheets';
            else folder = 'certificates';

            const fileName = `${folder}/${cleanAppId}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            const storageRef = ref(storage, fileName);
            const snapshot = await uploadBytes(storageRef, file);
            const publicUrl = await getDownloadURL(snapshot.ref);

            // Use specialized endpoint for certificates, generic for others
            const url = uploadField === 'certificate_url'
                ? `${config.API_URL}/api/applications/${targetAppId}/certificate`
                : `${config.API_URL}/api/applications/${targetAppId}`;

            const body = uploadField === 'certificate_url'
                ? { certificate_url: publicUrl }
                : { [uploadField]: publicUrl };

            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update database');
            }

            alert('Document uploaded successfully!');
            fetchData();
            fetchAlerts();

            if (selectedApplication) {
                setSelectedApplication(prev => ({ ...prev, [uploadField]: publicUrl }));
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            alert(`Failed to upload document: ${error.message}`);
        } finally {
            setUploading(false);
            setUploadApplicationId(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans relative">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed md:relative inset-y-0 left-0 w-64 bg-gradient-to-br from-indigo-900 to-purple-900 text-white flex flex-col shadow-xl z-50 transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-6 border-b border-indigo-800/50 flex flex-col items-center relative">
                    {/* Close button for mobile sidebar */}
                    <button
                        className="absolute right-4 top-4 md:hidden text-indigo-300 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="bg-white p-2 rounded-xl shadow-lg mb-3">
                        <img src={logo} alt="Lasak Admin" className="h-12 w-auto object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-100">
                        LASAK EDU
                    </h1>
                    <p className="text-xs text-indigo-300 mt-1 tracking-widest uppercase">Admin Portal</p>
                </div>
                <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
                    <button
                        onClick={() => setActiveTab('applications')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'applications'
                            ? 'bg-white/10 text-white shadow-lg shadow-indigo-900/20 ring-1 ring-white/20'
                            : 'text-indigo-100/70 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M11.47 3.84a.75.75 0 011.06 0l8.632 8.632a.75.75 0 011.06 0l-8.632-8.632a.75.75 0 00-1.06 0L2.909 12.472a.75.75 0 001.06 1.06l8.632-8.632zM2.25 15a.75.75 0 01.75-.75h1.5v6.75A.75.75 0 005.25 21h4.5A.75.75 0 0010.5 21v-4.5h3v4.5A.75.75 0 0014.25 21h4.5a.75.75 0 00.75-.75V14.25h1.5a.75.75 0 010 1.5H19.5V21a2.25 2.25 0 01-2.25 2.25h-4.5A2.25 2.25 0 0110.5 21v-4.5h-3v4.5A2.25 2.25 0 015.25 23.25h-4.5A2.25 2.25 0 01.75 21v-6.75h-.75a.75.75 0 01-.75-.75z" />
                        </svg>
                        Dashboard
                    </button>



                    {user?.role === 'super_admin' && (
                        <button
                            onClick={() => setActiveTab('alerts')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'alerts'
                                ? 'bg-white/10 text-white shadow-lg shadow-indigo-900/20 ring-1 ring-white/20'
                                : 'text-indigo-100/70 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                    </svg>
                                    Certificate Alerts
                                </div>
                                {alerts.filter(a => a.days_remaining <= 5).length > 0 && (
                                    <span className="bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs font-bold">
                                        {alerts.filter(a => a.days_remaining <= 5).length}
                                    </span>
                                )}
                            </div>
                        </button>
                    )}

                    {(user.role?.toLowerCase() === 'super_admin' || user.role?.toLowerCase() === 'franchise_owner') && (
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'users'
                                ? 'bg-white/10 text-white shadow-lg shadow-indigo-900/20 ring-1 ring-white/20'
                                : 'text-indigo-100/70 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                            </svg>
                            User Management
                        </button>
                    )}

                    {user.role?.toLowerCase() === 'super_admin' && (
                        <button
                            onClick={() => setActiveTab('branches')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'branches'
                                ? 'bg-white/10 text-white shadow-lg shadow-indigo-900/20 ring-1 ring-white/20'
                                : 'text-indigo-100/70 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M3 6a3 3 0 013-3h2.25a3 3 0 013 3v2.25a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm9.75 0a3 3 0 013-3H18a3 3 0 013 3v2.25a3 3 0 01-3 3h-2.25a3 3 0 01-3-3V6zM3 15.75a3 3 0 013-3h2.25a3 3 0 013 3V18a3 3 0 01-3 3H6a3 3 0 01-3-3v-2.25zm9.75 0a3 3 0 013-3H18a3 3 0 013 3V18a3 3 0 01-3 3h-2.25a3 3 0 01-3-3v-2.25z" clipRule="evenodd" />
                            </svg>
                            Branch Management
                        </button>
                    )}

                    {(user.role?.toLowerCase() === 'super_admin' || user.role?.toLowerCase() === 'franchise_owner') && (
                        <button
                            onClick={() => setActiveTab('content')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'content'
                                ? 'bg-white/10 text-white shadow-lg shadow-indigo-900/20 ring-1 ring-white/20'
                                : 'text-indigo-100/70 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path d="M21.721 12.752a9.711 9.711 0 00-.945-5.003 12.754 12.754 0 01-4.339 2.708 18.991 18.991 0 01-.214 4.772 17.165 17.165 0 005.498-2.477zM14.634 15.55a17.324 17.324 0 00.332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 00.332 4.647 17.387 17.387 0 005.268 0zM9.772 17.119a18.963 18.963 0 004.456 0A17.182 17.182 0 0112 21.724a17.18 17.18 0 01-2.228-4.605zM7.777 15.23a18.87 18.87 0 01-.214-4.774 12.753 12.753 0 01-4.34-2.708 9.711 9.711 0 00-.944 5.004 17.165 17.165 0 005.498 2.477zM21.356 14.752a9.765 9.765 0 01-7.478 6.817 18.64 18.64 0 001.988-4.718 18.627 18.627 0 005.49-2.098zM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 001.988 4.718 9.765 9.765 0 01-7.478-6.816zM13.878 2.43a9.755 9.755 0 016.116 3.981 11.267 11.267 0 01-3.746 2.504 18.63 18.63 0 00-2.37-6.485zM12 2.275a17.184 17.184 0 012.228 4.602 18.963 18.963 0 00-4.456 0A17.184 17.184 0 0112 2.275zM10.122 2.43a18.629 18.629 0 00-2.37 6.485 11.266 11.266 0 01-3.746-2.504 9.754 9.754 0 016.116-3.981z" />
                            </svg>
                            Site Content
                        </button>
                    )}

                    {(user.role?.toLowerCase() === 'super_admin' || user.role?.toLowerCase() === 'franchise_owner') && (
                        <button
                            onClick={() => { setActiveTab('fees'); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'fees'
                                ? 'bg-white/10 text-white shadow-lg shadow-indigo-900/20 ring-1 ring-white/20'
                                : 'text-indigo-100/70 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 01-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.324.152-.691.546-1.004zM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 01-.921.42z" />
                                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.656c-.89.577-1.354 1.4-1.354 2.296 0 1.306.945 2.375 2.532 2.802l.542.146v2.853c-.381-.137-.69-.387-.899-.684a.75.75 0 10-1.26.836c.45.679.957 1.144 1.572 1.405V18a.75.75 0 001.5 0v-.814a3.836 3.836 0 001.719-.657c.89-.576 1.355-1.4 1.355-2.296 0-1.306-.944-2.375-2.532-2.802l-.542-.146v-3.07c.395.143.725.405.942.716a.75.75 0 001.238-.802c-.443-.687-.962-1.164-1.597-1.422V6z" clipRule="evenodd" />
                            </svg>
                            Fees Details
                        </button>
                    )}

                    {(user.role?.toLowerCase() === 'super_admin' || user.role?.toLowerCase() === 'franchise_owner') && (
                        <button
                            onClick={() => { setActiveTab('student-fees'); setFeesFilter('All'); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'student-fees'
                                ? 'bg-white/10 text-white shadow-lg shadow-indigo-900/20 ring-1 ring-white/20'
                                : 'text-indigo-100/70 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            Student Fees
                        </button>
                    )}

                    {(user.role?.toLowerCase() === 'super_admin' || user.role?.toLowerCase() === 'franchise_owner') && (
                        <button
                            onClick={() => { setActiveTab('software'); fetchSoftware(); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'software'
                                ? 'bg-white/10 text-white shadow-lg shadow-indigo-900/20 ring-1 ring-white/20'
                                : 'text-indigo-100/70 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3V15a3 3 0 01-3 3h-3v.257c0 .597.237 1.17.659 1.591l.621.622a.75.75 0 01-.53 1.28h-9a.75.75 0 01-.53-1.28l.621-.622a2.25 2.25 0 00.659-1.59V18h-3a3 3 0 01-3-3V5.25zm1.5 0v9.75c0 .83.67 1.5 1.5 1.5h13.5c.83 0 1.5-.67 1.5-1.5V5.25c0-.83-.67-1.5-1.5-1.5H5.25c-.83 0-1.5.67-1.5 1.5z" clipRule="evenodd" />
                            </svg>
                            Software List
                        </button>
                    )}

                    {/* Certificate Preview - visible ONLY to super_admin */}
                    {user?.role === 'super_admin' && (
                        <button
                            onClick={() => setActiveTab('certificate')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'certificate'
                                ? 'bg-white/10 text-white shadow-lg shadow-indigo-900/20 ring-1 ring-white/20'
                                : 'text-indigo-100/70 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M4.5 3.75a3 3 0 00-3 3v10.5a3 3 0 003 3h15a3 3 0 003-3V6.75a3 3 0 00-3-3h-15zm4.125 3a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zm-3.873 8.703a4.126 4.126 0 017.746 0 .75.75 0 01-.585.875 21.85 21.85 0 01-3.332.248 21.85 21.85 0 01-3.332-.248.75.75 0 01-.497-.875zM15 8.25a.75.75 0 000 1.5h3.75a.75.75 0 000-1.5H15zM14.25 12a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H15a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3.75a.75.75 0 000-1.5H15z" clipRule="evenodd" />
                            </svg>
                            Certificate Preview
                        </button>
                    )}
                </nav>

                {/* User Profile Section */}
                <div className="p-4 border-t border-indigo-800/50">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-black/20 border border-indigo-700/30">
                        <div className="w-10 h-10 rounded-full bg-indigo-700 text-indigo-100 flex items-center justify-center font-bold">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{user.username}</p>
                            <p className="text-xs text-indigo-300 truncate capitalize">{user.role}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="mt-3 w-full py-2 px-4 text-xs font-medium text-indigo-300 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="bg-white shadow-sm border-b border-slate-200 p-4 flex justify-between items-center z-30">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            className="p-2 -ml-2 md:hidden text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        </button>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 truncate">
                            {activeTab === 'applications' && 'Dashboard Overview'}
                            {activeTab === 'alerts' && 'Certificate Alerts'}
                            {activeTab === 'users' && 'User Management'}
                            {activeTab === 'branches' && 'Branch Management'}
                            {activeTab === 'content' && 'Site Content'}
                            {activeTab === 'software' && 'Software List'}
                            {activeTab === 'fees' && 'Fees Details'}
                            {activeTab === 'student-fees' && 'Student Fees Management'}
                            {activeTab === 'certificate' && 'Certificate Preview'}
                        </h2>
                    </div>
                    <div className="flex items-center space-x-4 shrink-0">
                        <div className="hidden md:block text-right">
                            <p className="text-sm font-medium text-slate-700">{user.username}</p>
                            <p className="text-xs text-slate-500 capitalize">{user.role === 'super_admin' ? 'Super Administrator' : user.role}</p>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 p-4 md:p-6 overflow-auto bg-slate-50">
                    {/* Stats */}
                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 mb-8">
                        <div
                            className="bg-white p-4 md:p-8 rounded-2xl shadow-lg border border-indigo-50 relative overflow-hidden group hover:shadow-xl transition-all duration-300 cursor-pointer"
                            onClick={() => setActiveTab('applications')}
                        >
                            <div className="absolute right-0 top-0 h-32 w-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                            <div className="relative z-10">
                                <p className="text-indigo-400 font-medium text-sm uppercase tracking-wider mb-2">Total Applications</p>
                                <p className="text-4xl font-extrabold text-slate-800">{stats.totalApplications}</p>
                            </div>
                        </div>

                        <div
                            className="bg-white p-4 md:p-8 rounded-2xl shadow-lg border border-indigo-50 relative overflow-hidden group hover:shadow-xl transition-all duration-300 cursor-pointer"
                            onClick={() => setActiveTab('student-fees')}
                        >
                            <div className="absolute right-0 top-0 h-32 w-32 bg-violet-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                            <div className="relative z-10">
                                <p className="text-violet-400 font-medium text-sm uppercase tracking-wider mb-2">Total Enrollment Fees</p>
                                <p className="text-4xl font-extrabold text-slate-800">₹{stats.totalFees.toLocaleString('en-IN')}</p>
                            </div>
                        </div>

                        <div
                            className="bg-white p-4 md:p-8 rounded-2xl shadow-lg border border-indigo-50 relative overflow-hidden group hover:shadow-xl transition-all duration-300 cursor-pointer"
                            onClick={() => setActiveTab('student-fees')}
                        >
                            <div className="absolute right-0 top-0 h-32 w-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                            <div className="relative z-10">
                                <p className="text-emerald-500 font-medium text-sm uppercase tracking-wider mb-2">Collected Revenue</p>
                                <p className="text-4xl font-extrabold text-slate-800">₹{stats.totalPaid.toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                        <div
                            className={`bg-white p-4 md:p-8 rounded-2xl shadow-lg border border-indigo-50 relative overflow-hidden group hover:shadow-xl transition-all duration-300 cursor-pointer ${activeTab === 'alerts' && alertFilter === 'all' ? 'ring-2 ring-amber-400' : ''}`}
                            onClick={() => { setActiveTab('alerts'); setAlertFilter('all'); }}
                        >
                            <div className="absolute right-0 top-0 h-32 w-32 bg-amber-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-amber-500 font-medium text-sm uppercase tracking-wider">Certificates Pending</p>
                                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-bold">{alerts.length}</span>
                                </div>
                                <p className="text-4xl font-extrabold text-slate-800">{alerts.length}</p>
                            </div>
                        </div>
                        {alerts.filter(a => a.days_remaining <= 5).length > 0 && (
                            <div
                                className={`bg-gradient-to-br from-rose-500 to-pink-600 p-4 md:p-8 rounded-2xl shadow-lg text-white relative overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 ${activeTab === 'alerts' && alertFilter === 'urgent' ? 'ring-4 ring-rose-300' : ''}`}
                                onClick={() => { setActiveTab('alerts'); setAlertFilter('urgent'); }}
                            >
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 animate-pulse">
                                            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
                                        </svg>
                                        <p className="font-bold text-sm uppercase tracking-wider">Urgent Action</p>
                                    </div>
                                    <p className="text-4xl font-extrabold">{alerts.filter(a => a.days_remaining <= 5).length}</p>
                                    <p className="text-rose-100 text-sm mt-1">Pending certificates expiring soon</p>
                                </div>
                            </div>
                        )}

                        <div
                            className={`p-4 md:p-8 rounded-2xl shadow-lg border relative overflow-hidden group hover:shadow-xl transition-all duration-300 cursor-pointer ${stats.penaltyEligible > 0 ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white border-transparent' : 'bg-white border-indigo-50'}`}
                            onClick={() => {
                                setActiveTab('student-fees');
                                setFeesFilter('Overdue');
                            }}
                        >
                            <div className={`absolute right-0 top-0 h-32 w-32 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 ${stats.penaltyEligible > 0 ? 'bg-white/10' : 'bg-orange-50'}`}></div>
                            <div className="relative z-10">
                                <p className={`font-medium text-sm uppercase tracking-wider mb-2 ${stats.penaltyEligible > 0 ? 'text-orange-100' : 'text-orange-400'}`}>Overdue Payments</p>
                                <div className="flex items-end gap-3">
                                    <p className="text-4xl font-extrabold">{stats.overduePayments + stats.penaltyEligible}</p>
                                    {stats.penaltyEligible > 0 && (
                                        <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                                            {stats.penaltyEligible} Penalty Eligible
                                        </span>
                                    )}
                                </div>
                                <p className={`text-sm mt-1 ${stats.penaltyEligible > 0 ? 'text-orange-50' : 'text-slate-500'}`}>
                                    {stats.overduePayments} Late + {stats.penaltyEligible} Penalized
                                </p>
                            </div>
                        </div>
                    </div>



                    {/* Main Content Area */}
                    <div>
                        {activeTab === 'applications' && (
                            <div className="flex flex-col">
                                {/* Urgent Alerts Section on Dashboard */}
                                {alerts.length > 0 && (
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm text-yellow-700 font-bold">
                                                        Certificates Needed to Upload
                                                    </p>
                                                    <p className="text-sm text-yellow-600">
                                                        {alerts.length} student{alerts.length > 1 ? 's are' : ' is'} nearing completion.
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setActiveTab('alerts')}
                                                className="text-sm text-indigo-600 font-semibold hover:underline bg-white px-3 py-1 rounded-md shadow-sm border border-indigo-100"
                                            >
                                                Manage Alerts →
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Application Management</h3>

                                {/* Filters & Search */}
                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-50 mb-8">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                                        {/* Name Filter */}
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Filter by Name"
                                                className="w-full pl-10 pr-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
                                                value={filterName}
                                                onChange={(e) => setFilterName(e.target.value)}
                                            />
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-400 absolute left-3 top-3.5">
                                                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                                            </svg>
                                        </div>

                                        {/* Phone Filter */}
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Filter by Phone"
                                                className="w-full pl-10 pr-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
                                                value={filterPhone}
                                                onChange={(e) => setFilterPhone(e.target.value)}
                                            />
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-400 absolute left-3 top-3.5">
                                                <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6V4.5z" clipRule="evenodd" />
                                            </svg>
                                        </div>

                                        {/* Email Filter */}
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Filter by Email"
                                                className="w-full pl-10 pr-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
                                                value={filterEmail}
                                                onChange={(e) => setFilterEmail(e.target.value)}
                                            />
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-400 absolute left-3 top-3.5">
                                                <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                                                <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                                            </svg>
                                        </div>

                                        {/* Course Filter */}
                                        <div className="relative">
                                            <select
                                                className="w-full pl-10 pr-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 appearance-none cursor-pointer"
                                                value={filterCourse}
                                                onChange={(e) => setFilterCourse(e.target.value)}
                                            >
                                                <option value="">All Courses</option>
                                                {courses.map((course, index) => (
                                                    <option key={index} value={course}>{course}</option>
                                                ))}
                                            </select>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-400 absolute left-3 top-3.5 pointer-events-none">
                                                <path d="M11.25 4.533A9.707 9.707 0 006 3.75a9.753 9.753 0 00-3.255.555.75.75 0 00-.575.69v9.862a.75.75 0 00.324.637A10.018 10.018 0 016 16.5c2.316 0 4.413-.835 6-2.208a10.018 10.018 0 016 2.208.75.75 0 00.324-.637V6a.75.75 0 00-.575-.69A9.753 9.753 0 0014.25 4.53v8.567c-1.12.813-2.18 1.83-3 2.97V4.533zM7.5 4.5v11.517c1.332-1.077 2.973-1.767 4.75-1.767s3.418.69 4.75 1.767V4.5A8.253 8.253 0 0112 5.25 8.253 8.253 0 017.5 4.5z" />
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        {/* Branch Filter (Super Admin Only) */}
                                        {user.role === 'super_admin' && (
                                            <div className="relative">
                                                <select
                                                    className="w-full pl-10 pr-4 py-2 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm shadow-sm appearance-none"
                                                    value={filterBranch}
                                                    onChange={(e) => setFilterBranch(e.target.value)}
                                                >
                                                    <option value="">All Branches</option>
                                                    {branches.map(branch => (
                                                        <option key={branch.id} value={branch.name}>{branch.name}</option>
                                                    ))}
                                                </select>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-indigo-300 absolute left-3 top-3">
                                                    <path fillRule="evenodd" d="M3 6a3 3 0 013-3h2.25a3 3 0 013 3v2.25a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm9.75 0a3 3 0 013-3H18a3 3 0 013 3v2.25a3 3 0 01-3 3h-2.25a3 3 0 01-3-3V6zM3 15.75a3 3 0 013-3h2.25a3 3 0 013 3V18a3 3 0 01-3 3H6a3 3 0 01-3-3v-2.25zm9.75 0a3 3 0 013-3H18a3 3 0 013 3V18a3 3 0 01-3 3h-2.25a3 3 0 01-3-3v-2.25z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Status Filter */}
                                        <div className="relative">
                                            <select
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm shadow-sm appearance-none"
                                                value={filterStatus}
                                                onChange={(e) => setFilterStatus(e.target.value)}
                                            >
                                                <option value="">All Statuses</option>
                                                <option value="New">New</option>
                                                <option value="Contacted">Contacted</option>
                                                <option value="Enrolled">Enrolled</option>
                                                <option value="Rejected">Rejected</option>
                                                <option value="Completed">Completed</option>
                                            </select>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-indigo-300 absolute left-3 top-3">
                                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                            </svg>
                                        </div>

                                        {/* Payment Status Filter */}
                                        <div className="relative">
                                            <select
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm shadow-sm appearance-none"
                                                value={filterPaymentStatus}
                                                onChange={(e) => setFilterPaymentStatus(e.target.value)}
                                            >
                                                <option value="">All Payments</option>
                                                <option value="Pending">Pending</option>
                                                <option value="Partial">Partial</option>
                                                <option value="Paid">Paid</option>
                                                <option value="Refunded">Refunded</option>
                                            </select>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-indigo-300 absolute left-3 top-3">
                                                <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 01-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.324.152-.691.546-1.004zM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 01-.921.42z" />
                                                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.656c-.89.577-1.354 1.4-1.354 2.296 0 1.306.945 2.375 2.532 2.802l.542.146v2.853c-.381-.137-.69-.387-.899-.684a.75.75 0 10-1.26.836c.45.679.957 1.144 1.572 1.405V18a.75.75 0 001.5 0v-.814a3.836 3.836 0 001.719-.657c.89-.576 1.355-1.4 1.355-2.296 0-1.306-.944-2.375-2.532-2.802l-.542-.146v-3.07c.395.143.725.405.942.716a.75.75 0 001.238-.802c-.443-.687-.962-1.164-1.597-1.422V6z" clipRule="evenodd" />
                                            </svg>
                                        </div>

                                        {/* General Search (matches name or phone widely) */}
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="General Search..."
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm shadow-sm"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                            />
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-indigo-300 absolute left-3 top-3">
                                                <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <button
                                        onClick={handleExportCSV}
                                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-green-200 transition-all hover:shadow-green-300"
                                        title="Export to CSV"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Export CSV
                                    </button>
                                </div>

                                {/* Applications Table */}
                                <div className="bg-white rounded-2xl shadow-lg border border-indigo-50 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-indigo-50">
                                            <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">App ID</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Cert No.</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Student</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Branch/Course</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Contact</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Payment</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-indigo-50">
                                                {loading ? (
                                                    <tr><td colSpan="8" className="text-center py-8 text-indigo-300 font-medium">Loading applications...</td></tr>
                                                ) : applications.length === 0 ? (
                                                    <tr><td colSpan="8" className="text-center py-8 text-slate-400">No applications found matching criteria</td></tr>
                                                ) : (
                                                    applications.map((app) => (
                                                        <tr key={app.id} className="hover:bg-indigo-50/30 transition-colors duration-150">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 cursor-pointer hover:text-indigo-800 hover:underline" onClick={() => handleViewApplication(app)}>{app.application_id}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">{app.certificate_number || '-'}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-xs mr-3">
                                                                        {app.student_name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div className="text-sm font-medium text-slate-900">{app.student_name}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                                <div className="font-medium text-slate-800">{app.branch}</div>
                                                                <div className="text-xs text-indigo-400">{app.course}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                                <div>{app.phone}</div>
                                                                <div className="text-xs text-slate-400">{app.email}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                                    ${app.status === 'New' ? 'bg-blue-100 text-blue-700' :
                                                                        app.status === 'Enrolled' ? 'bg-emerald-100 text-emerald-700' :
                                                                            app.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                                                                                app.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                    {app.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {(() => {
                                                                    const dueDate = app.payment_last_date || app.payment_date;
                                                                    if (app.payment_status === 'Paid' || app.payment_status === 'Refunded' || !dueDate) {
                                                                        const badgeColor = app.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                                                            app.payment_status === 'Partial' ? 'bg-amber-100 text-amber-700' :
                                                                                app.payment_status === 'Refunded' ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-600';
                                                                        return (
                                                                            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full border border-transparent ${badgeColor}`}>
                                                                                {app.payment_status || 'Pending'}
                                                                            </span>
                                                                        );
                                                                    }

                                                                    const daysPassed = (new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24);

                                                                    if (daysPassed > 15) {
                                                                        return (
                                                                            <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full bg-red-600 text-white animate-pulse shadow-md shadow-red-200">
                                                                                OVERDUE + PENALTY
                                                                            </span>
                                                                        );
                                                                    } else if (daysPassed > 1) {
                                                                        return (
                                                                            <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                                                                                OVERDUE
                                                                            </span>
                                                                        );
                                                                    } else {
                                                                        return (
                                                                            <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full bg-slate-100 text-slate-600">
                                                                                {app.payment_status || 'Pending'}
                                                                            </span>
                                                                        );
                                                                    }
                                                                })()}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                <div className="flex items-center gap-3">
                                                                    <select
                                                                        className="border border-indigo-200 rounded-lg text-xs p-1.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-700"
                                                                        value={app.status}
                                                                        onChange={(e) => handleStatusUpdate(app.id, e.target.value)}
                                                                    >
                                                                        <option value="New">New</option>
                                                                        <option value="Contacted">Contacted</option>
                                                                        <option value="Enrolled">Enrolled</option>
                                                                        <option value="Rejected">Rejected</option>
                                                                        <option value="Completed">✅ Completed</option>
                                                                    </select>
                                                                    {canEdit() && (
                                                                        <button onClick={() => handleDeleteApplication(app.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Delete Application">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                    <button onClick={() => handleDownloadPDF(app)} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Download PDF">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'alerts' && (
                            <div className="flex flex-col">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Certificate Management</h3>

                                {alerts.length > 0 ? (
                                    <>
                                        {/* Certificate Alerts Banner */}
                                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm text-yellow-700 font-semibold">
                                                        ⚠️ Certificate Uploads Needed
                                                    </p>
                                                    <p className="text-sm text-yellow-600 mt-1">
                                                        {alerts.length} student{alerts.length > 1 ? 's have' : ' has'} course{alerts.length > 1 ? 's' : ''} ending soon. Please upload their certificate{alerts.length > 1 ? 's' : ''}.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pending Certificate Uploads Section */}
                                        <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
                                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                                <h3 className="text-lg font-semibold text-gray-800">
                                                    {alertFilter === 'urgent' ? '🔥 Urgent Pending Uploads' : '📋 All Pending Uploads'}
                                                </h3>
                                                {alertFilter === 'urgent' && (
                                                    <button
                                                        onClick={() => setAlertFilter('all')}
                                                        className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                                                    >
                                                        Show All
                                                    </button>
                                                )}
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {alerts
                                                            .filter(alert => alertFilter === 'urgent' ? alert.days_remaining <= 5 : true)
                                                            .map((alert) => (
                                                                <tr key={alert.id} className={alert.is_overdue ? 'bg-red-50' : 'bg-yellow-50'}>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                        <span className="font-medium">{alert.student_name}</span><br />
                                                                        <span className="text-xs text-gray-500">{alert.application_id}</span><br />
                                                                        <span className="text-xs text-gray-500">{new Date(alert.course_end_date).toLocaleDateString()}</span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${alert.is_overdue
                                                                            ? 'bg-red-100 text-red-800'
                                                                            : 'bg-yellow-100 text-yellow-800'
                                                                            }`}>
                                                                            {alert.is_overdue
                                                                                ? 'Overdue - Upload Certificate'
                                                                                : `${alert.days_remaining}d left - Upload Certificate`}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${alert.payment_status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                                            alert.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                                                                                alert.payment_status === 'Refunded' ? 'bg-gray-100 text-gray-800' :
                                                                                    'bg-red-100 text-red-800'
                                                                            }`}>
                                                                            {alert.payment_status || 'Pending'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                        <div className="flex items-center gap-3">
                                                                            <select
                                                                                className="border border-indigo-200 rounded-lg text-xs p-1.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-700"
                                                                                value={alert.status}
                                                                                onChange={(e) => handleStatusUpdate(alert.id, e.target.value)}
                                                                            >
                                                                                <option value="New">New</option>
                                                                                <option value="Contacted">Contacted</option>
                                                                                <option value="Enrolled">Enrolled</option>
                                                                                <option value="Rejected">Rejected</option>
                                                                                <option value="Completed">✅ Completed</option>
                                                                            </select>
                                                                            {canEdit() && (
                                                                                <button
                                                                                    onClick={() => handleDeleteApplication(alert.id)}
                                                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                                                    title="Delete Application"
                                                                                >
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                    </svg>
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onClick={() => handleDownloadPDF(alert)}
                                                                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                                                                                title="Download PDF"
                                                                            >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-white p-8 rounded-lg shadow text-center border-l-4 border-green-500">
                                        <div className="flex justify-center mb-4">
                                            <span className="text-5xl">✅</span>
                                        </div>
                                        <p className="text-green-600 font-semibold text-lg">All Caught Up!</p>
                                        <p className="text-gray-500 mt-2">No pending certificate uploads for enrolled students.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'branches' && (user.role?.toLowerCase() === 'super_admin') && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800">Branch List</h3>
                                    <button
                                        onClick={() => openBranchModal()}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                                        </svg>
                                        Add Branch
                                    </button>
                                </div>
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch Name</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {branches.map((branch) => (
                                                <tr key={branch.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{branch.id}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{branch.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => openBranchModal(branch)}
                                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteBranch(branch.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {branches.length === 0 && (
                                                <tr>
                                                    <td colSpan="3" className="text-center py-4 text-gray-500">No branches found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {activeTab === 'content' && (user.role?.toLowerCase() === 'super_admin' || user.role?.toLowerCase() === 'franchise_owner') && (
                            <ContentEditor userRole={user.role} />
                        )}

                        {activeTab === 'software' && (user.role?.toLowerCase() === 'super_admin' || user.role?.toLowerCase() === 'franchise_owner') && (
                            <div className="max-w-2xl mx-auto">
                                <div className="bg-white rounded-2xl shadow-lg border border-indigo-50 overflow-hidden">
                                    <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-500">
                                            <path fillRule="evenodd" d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3V15a3 3 0 01-3 3h-3v.257c0 .597.237 1.17.659 1.591l.621.622a.75.75 0 01-.53 1.28h-9a.75.75 0 01-.53-1.28l.621-.622a2.25 2.25 0 00.659-1.59V18h-3a3 3 0 01-3-3V5.25zm1.5 0v9.75c0 .83.67 1.5 1.5 1.5h13.5c.83 0 1.5-.67 1.5-1.5V5.25c0-.83-.67-1.5-1.5-1.5H5.25c-.83 0-1.5.67-1.5 1.5z" clipRule="evenodd" />
                                        </svg>
                                        <h3 className="text-base font-bold text-indigo-800">Software / Tools List</h3>
                                        <span className="ml-auto text-xs text-indigo-400">{softwareItems.length} items</span>
                                    </div>

                                    {/* Software Items Table */}
                                    <div className="divide-y divide-indigo-50">
                                        {softwareItems.length === 0 && (
                                            <p className="text-center text-slate-400 py-8">No software items yet. Add one below.</p>
                                        )}
                                        {softwareItems.map(item => (
                                            <div key={item.id} className="flex items-center gap-3 px-6 py-3 hover:bg-indigo-50/30 transition-colors">
                                                {editingSoftwareId === item.id ? (
                                                    <>
                                                        <input
                                                            type="text"
                                                            className="flex-1 border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                                                            value={editingSoftwareName}
                                                            onChange={e => setEditingSoftwareName(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && handleEditSoftwareSave(item.id)}
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleEditSoftwareSave(item.id)}
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                                                        >Save</button>
                                                        <button
                                                            onClick={() => { setEditingSoftwareId(null); setEditingSoftwareName(''); }}
                                                            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1.5 rounded-lg"
                                                        >Cancel</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="flex-1 text-sm text-slate-700 font-medium">{item.name}</span>
                                                        {user?.role === 'super_admin' && (
                                                            <>
                                                                <button
                                                                    onClick={() => { setEditingSoftwareId(item.id); setEditingSoftwareName(item.name); }}
                                                                    className="text-indigo-500 hover:text-indigo-700 text-xs font-medium px-2 py-1 rounded hover:bg-indigo-50"
                                                                >Edit</button>
                                                                <button
                                                                    onClick={() => handleDeleteSoftware(item.id)}
                                                                    className="text-red-400 hover:text-red-600 text-xs font-medium px-2 py-1 rounded hover:bg-red-50"
                                                                >Delete</button>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add New Software */}
                                    {user?.role === 'super_admin' && (
                                        <div className="px-6 py-4 bg-slate-50 border-t border-indigo-100 flex gap-3">
                                            <input
                                                type="text"
                                                placeholder="Add new software / tool name..."
                                                className="flex-1 border border-indigo-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                                                value={newSoftwareName}
                                                onChange={e => setNewSoftwareName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddSoftware()}
                                            />
                                            <button
                                                onClick={handleAddSoftware}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-medium text-sm flex items-center gap-2 shadow-md shadow-indigo-200 transition-all"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                                </svg>
                                                Add
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'fees' && (user.role?.toLowerCase() === 'super_admin' || user.role?.toLowerCase() === 'franchise_owner') && (
                            <FeesTab userRole={user.role?.toLowerCase()} />
                        )}

                        {activeTab === 'student-fees' && (user.role?.toLowerCase() === 'super_admin' || user.role?.toLowerCase() === 'franchise_owner') && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <StudentFeesTab
                                    user={user}
                                    initialStatusFilter={feesFilter}
                                    branchFilter={user.role === 'super_admin' ? filterBranch : null}
                                />
                            </div>
                        )}

                        {activeTab === 'users' && (user.role?.toLowerCase() === 'super_admin' || user.role?.toLowerCase() === 'franchise_owner') && (
                            <div className="flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800">User Management</h3>
                                    <button
                                        onClick={() => {
                                            setIsEditingUser(false);
                                            setEditingUserId(null);
                                            setNewUser({ username: '', password: '', role: 'user', branch_id: '', permissions: { view: true, edit: false } });
                                            setIsUserModalOpen(true);
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-medium flex items-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                        Add {user.role === 'super_admin' ? 'User / Franchise' : 'User'}
                                    </button>
                                </div>

                                <div className="bg-white rounded-lg shadow overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {users.map((u) => (
                                                <tr key={u.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.username}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email || '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{u.role.replace('_', ' ')}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {u.permissions && Array.isArray(u.permissions) ? u.permissions.join(', ') : 'All'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {u.branch_id
                                                            ? (branches.find(b => b.id == u.branch_id)?.name || 'Unknown Branch')
                                                            : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <button
                                                            onClick={() => handleEditUserClick(u)}
                                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                        >
                                                            Edit
                                                        </button>
                                                        {u.username !== user.username && (
                                                            <button
                                                                onClick={() => handleDeleteUser(u.id, u.username)}
                                                                className="text-red-600 hover:text-red-900"
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {users.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-4 text-gray-500">No users found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div >

            {/* Create User Modal */}
            {
                isUserModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800">{isEditingUser ? 'Edit User' : 'Create New User'}</h3>
                                <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleCreateUser}>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-2 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                                            value={newUser.username}
                                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            className="w-full px-4 py-2 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Password {isEditingUser && <span className="text-slate-400 font-normal">(Leave blank to keep)</span>}</label>
                                        <input
                                            type="password"
                                            required={!isEditingUser}
                                            className="w-full px-4 py-2 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                        <select
                                            className="w-full px-4 py-2 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm cursor-pointer"
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                        >
                                            <option value="user">User</option>
                                            {user.role === 'super_admin' && (
                                                <>
                                                    <option value="franchise_owner">Franchise Owner</option>
                                                    <option value="super_admin">Super Admin</option>
                                                </>
                                            )}
                                        </select>
                                    </div>

                                    {newUser.role === 'user' && (
                                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                            <label className="block text-sm font-medium text-slate-700 mb-3">Permissions</label>
                                            <div className="flex space-x-6">
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                        checked={newUser.permissions.view}
                                                        onChange={(e) => setNewUser({
                                                            ...newUser,
                                                            permissions: { ...newUser.permissions, view: e.target.checked }
                                                        })}
                                                        disabled
                                                    />
                                                    <span className="ml-2 text-sm text-slate-700">View Access</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                        checked={newUser.permissions.edit}
                                                        onChange={(e) => setNewUser({
                                                            ...newUser,
                                                            permissions: { ...newUser.permissions, edit: e.target.checked }
                                                        })}
                                                    />
                                                    <span className="ml-2 text-sm text-slate-700">Edit Access</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {(user.role === 'super_admin' || user.role === 'franchise_owner') && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name</label>
                                            <select
                                                className="w-full px-4 py-2 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm cursor-pointer disabled:bg-slate-100 disabled:text-slate-500"
                                                value={user.role === 'super_admin' ? newUser.branch_id : user.branch_id}
                                                onChange={(e) => setNewUser({ ...newUser, branch_id: e.target.value })}
                                                disabled={user.role !== 'super_admin'}
                                            >
                                                <option value="">Select Branch</option>
                                                {branches.map(branch => (
                                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                                {user.role === 'super_admin'
                                                    ? "Required for Franchise Owner/User roles."
                                                    : "Fixed to your managed branch."}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-8 flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsUserModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 transition-all hover:shadow-indigo-300"
                                    >
                                        {isEditingUser ? 'Update User' : 'Create User'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Branch Modal */}
            {
                isBranchModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800">{isEditingBranch ? 'Edit Branch' : 'Add New Branch'}</h3>
                                <button onClick={() => setIsBranchModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleSaveBranch}>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                                        value={branchForm.name}
                                        onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                                        placeholder="e.g. Downtown Branch"
                                    />
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsBranchModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 transition-all hover:shadow-indigo-300"
                                    >
                                        {isEditingBranch ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }


            {/* Application Details Modal */}
            {
                showModal && selectedApplication && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
                        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div className="bg-indigo-600 text-white p-6 rounded-t-lg sticky top-0 z-10 flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold">Application Details</h2>
                                    <div className="flex flex-col sm:flex-row sm:gap-4 text-indigo-100 mt-1 text-sm">
                                        <p>App ID: <span className="font-mono font-medium text-white">{selectedApplication.application_id}</span></p>
                                        <p className="hidden sm:block">•</p>
                                        <p>Cert No: <span className="font-mono font-medium text-white">{selectedApplication.certificate_number || 'Pending'}</span></p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    {isEditing ? (
                                        <>
                                            {canEdit() && (
                                                <button
                                                    onClick={handleUpdateApplication}
                                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium shadow-sm transition-colors"
                                                >
                                                    Save
                                                </button>
                                            )}
                                            <button
                                                onClick={handleEditToggle}
                                                className="bg-white text-indigo-600 hover:bg-gray-100 px-4 py-2 rounded font-medium shadow-sm transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {canEdit() && (
                                                <button
                                                    onClick={handleEditToggle}
                                                    className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded font-medium shadow-sm border border-indigo-400 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            {canEdit() && (
                                                <button
                                                    onClick={() => {
                                                        handleDeleteApplication(selectedApplication.id);
                                                        closeModal();
                                                    }}
                                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium shadow-sm transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDownloadPDF(selectedApplication)}
                                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium shadow-sm transition-colors flex items-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Download PDF
                                            </button>
                                        </>
                                    )}
                                    <button onClick={closeModal} className="text-white hover:text-gray-200 text-3xl font-bold ml-4">&times;</button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6">
                                {/* Personal Information */}
                                {/* Personal Information */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Personal Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Student Name</p>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    name="student_name"
                                                    value={editFormData.student_name || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                />
                                            ) : (
                                                <p className="text-base font-medium text-gray-900">{selectedApplication.student_name}</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Date of Birth</p>
                                            {isEditing ? (
                                                <input
                                                    type="date"
                                                    name="dob"
                                                    value={editFormData.dob || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                />
                                            ) : (
                                                <p className="text-base font-medium text-gray-900">{selectedApplication.dob || 'N/A'}</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Gender</p>
                                            {isEditing ? (
                                                <select
                                                    name="gender"
                                                    value={editFormData.gender || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                >
                                                    <option value="">Select Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            ) : (
                                                <p className="text-base font-medium text-gray-900">{selectedApplication.gender || 'N/A'}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Contact Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Phone</p>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    name="phone"
                                                    value={editFormData.phone || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                />
                                            ) : (
                                                <p className="text-base font-medium text-gray-900">{selectedApplication.phone}</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Email</p>
                                            {isEditing ? (
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={editFormData.email || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                />
                                            ) : (
                                                <p className="text-base font-medium text-gray-900">{selectedApplication.email}</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Referral Phone 1</p>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    name="referral_phone_1"
                                                    value={editFormData.referral_phone_1 || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                />
                                            ) : (
                                                <p className="text-base font-medium text-gray-900">{selectedApplication.referral_phone_1 || 'N/A'}</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Referral Phone 2</p>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    name="referral_phone_2"
                                                    value={editFormData.referral_phone_2 || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                />
                                            ) : (
                                                <p className="text-base font-medium text-gray-900">{selectedApplication.referral_phone_2 || 'N/A'}</p>
                                            )}
                                        </div>
                                        <div className="md:col-span-2 border-t pt-4 mt-4">
                                            <h4 className="font-semibold text-lg mb-2 text-indigo-700">Fee Details (Snapshot)</h4>
                                            {(isEditing || selectedApplication.fee_total) ? (
                                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                    {isEditing ? (
                                                        // Editable mode: show input fields
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div className="col-span-2 mb-1">
                                                                <p className="text-gray-600 font-medium mb-1">Total Fee (₹)</p>
                                                                <input
                                                                    type="number"
                                                                    name="fee_total"
                                                                    value={editFormData.fee_total || ''}
                                                                    onChange={handleEditChange}
                                                                    placeholder="e.g. 25999"
                                                                    min="0"
                                                                    step="0.01"
                                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-600 font-medium mb-1">GST Amount (₹)</p>
                                                                <input
                                                                    type="number"
                                                                    name="fee_gst_amount"
                                                                    value={editFormData.fee_gst_amount || ''}
                                                                    onChange={handleEditChange}
                                                                    placeholder="e.g. 4679"
                                                                    min="0"
                                                                    step="0.01"
                                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-600 font-medium mb-1">Net Amount (auto-calculated)</p>
                                                                <p className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-slate-600">
                                                                    ₹{((parseFloat(editFormData.fee_total) || 0) - (parseFloat(editFormData.fee_discount_amount) || 0) - (parseFloat(editFormData.fee_gst_amount) || 0)).toFixed(2)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-600 font-medium mb-1">Main Branch Share (₹)</p>
                                                                <input
                                                                    type="number"
                                                                    name="fee_main_branch_amount"
                                                                    value={editFormData.fee_main_branch_amount || ''}
                                                                    onChange={handleEditChange}
                                                                    placeholder="e.g. 10659"
                                                                    min="0"
                                                                    step="0.01"
                                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-600 font-medium mb-1">Franchise Share (₹)</p>
                                                                <input
                                                                    type="number"
                                                                    name="fee_franchise_branch_amount"
                                                                    value={editFormData.fee_franchise_branch_amount || ''}
                                                                    onChange={handleEditChange}
                                                                    placeholder="e.g. 10659"
                                                                    min="0"
                                                                    step="0.01"
                                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // View mode: show static details (existing logic)
                                                        <>
                                                            {selectedApplication.is_scholarship && (
                                                                <div className="mb-4 pb-4 border-b-2 border-green-200 bg-green-50 p-3 rounded-lg">
                                                                    <div className="flex justify-between items-center text-green-700 font-semibold mb-2">
                                                                        <span className="text-lg">🎓 Scholarship Applied ({selectedApplication.scholarship_percent}%)</span>
                                                                        <span className="text-lg">- ₹{selectedApplication.fee_discount_amount}</span>
                                                                    </div>
                                                                    <div className="mt-3 pt-3 border-t border-green-300">
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <span className="text-gray-700 font-medium">Original Fee (Before Discount):</span>
                                                                            <span className="font-bold text-gray-900 text-lg">₹{selectedApplication.fee_total}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center text-green-700">
                                                                            <span className="font-medium">Scholarship Discount ({selectedApplication.scholarship_percent}%):</span>
                                                                            <span className="font-bold text-lg">- ₹{selectedApplication.fee_discount_amount}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-green-300">
                                                                            <span className="text-indigo-700 font-semibold text-lg">Final Fee (After Discount):</span>
                                                                            <span className="font-bold text-indigo-600 text-xl">₹{(parseFloat(selectedApplication.fee_total) - parseFloat(selectedApplication.fee_discount_amount)).toFixed(2)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                                {!selectedApplication.is_scholarship && (
                                                                    <div className="col-span-2 mb-2">
                                                                        <p className="text-gray-600">Total Fee:</p>
                                                                        <p className="font-bold text-gray-900 text-lg">₹{selectedApplication.fee_total}</p>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="text-gray-600">GST Amount:</p>
                                                                    <p className="text-gray-900">₹{selectedApplication.fee_gst_amount}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-600">Net Amount (After GST):</p>
                                                                    <p className="text-gray-900">₹{(parseFloat(selectedApplication.fee_total) - parseFloat(selectedApplication.fee_discount_amount || 0) - parseFloat(selectedApplication.fee_gst_amount)).toFixed(2)}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-600">Main Branch Share:</p>
                                                                    <p className="text-gray-900">₹{selectedApplication.fee_main_branch_amount}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-600">Franchise Share:</p>
                                                                    <p className="text-gray-900">₹{selectedApplication.fee_franchise_branch_amount}</p>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 italic">No fee details recorded for this application.</p>
                                            )}
                                        </div>

                                        <div className="md:col-span-2">
                                            <p className="text-sm text-gray-500">Address</p>
                                            {isEditing ? (
                                                <textarea
                                                    name="address"
                                                    value={editFormData.address || ''}
                                                    onChange={handleEditChange}
                                                    rows="3"
                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                />
                                            ) : (
                                                <p className="text-base font-medium text-gray-900">{selectedApplication.address || 'N/A'}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Information */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Academic Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Branch</p>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    name="branch"
                                                    value={editFormData.branch || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                />
                                            ) : (
                                                <p className="text-base font-medium text-gray-900">{selectedApplication.branch}</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Course</p>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    name="course"
                                                    value={editFormData.course || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                />
                                            ) : (
                                                <p className="text-base font-medium text-gray-900">{selectedApplication.course}</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">College / Company</p>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    name="college_company"
                                                    value={editFormData.college_company || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                />
                                            ) : (
                                                <p className="text-base font-medium text-gray-900">{selectedApplication.college_company || 'N/A'}</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Previous School</p>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    name="previous_school"
                                                    value={editFormData.previous_school || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                />
                                            ) : (
                                                <p className="text-base font-medium text-gray-900">{selectedApplication.previous_school || 'N/A'}</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Previous Marks</p>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    name="previous_marks"
                                                    value={editFormData.previous_marks || ''}
                                                    onChange={handleEditChange}
                                                    className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                />
                                            ) : (
                                                <p className="text-base font-medium text-gray-900">{selectedApplication.previous_marks || 'N/A'}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Documents Section */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Uploaded Documents</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Student Photo</p>
                                            {selectedApplication.photo_url ? (
                                                <div className="flex gap-2 items-center">
                                                    <a href={selectedApplication.photo_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline">
                                                        View
                                                    </a>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleFileSelect(selectedApplication.id, 'photo_url')} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600">
                                                        Re-upload
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleFileSelect(selectedApplication.id, 'photo_url')} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-200">
                                                    Upload Photo
                                                </button>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Signature</p>
                                            {selectedApplication.signature_url ? (
                                                <div className="flex gap-2 items-center">
                                                    <a href={selectedApplication.signature_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline">
                                                        View
                                                    </a>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleFileSelect(selectedApplication.id, 'signature_url')} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600">
                                                        Re-upload
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleFileSelect(selectedApplication.id, 'signature_url')} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-200">
                                                    Upload Signature
                                                </button>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">ID Proof</p>
                                            {selectedApplication.id_proof_url ? (
                                                <div className="flex gap-2 items-center">
                                                    <a href={selectedApplication.id_proof_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline">
                                                        View
                                                    </a>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleFileSelect(selectedApplication.id, 'id_proof_url')} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600">
                                                        Re-upload
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleFileSelect(selectedApplication.id, 'id_proof_url')} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-200">
                                                    Upload ID Proof
                                                </button>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Certificate</p>
                                            {selectedApplication.certificate_url ? (
                                                <div className="flex gap-2 items-center">
                                                    <a href={selectedApplication.certificate_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline">
                                                        View
                                                    </a>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleFileSelect(selectedApplication.id)} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600">
                                                        Re-upload
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <button
                                                        onClick={() => handleFileSelect(selectedApplication.id)}
                                                        className="text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1 rounded border border-indigo-200 flex items-center gap-1"
                                                        disabled={uploading}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                        {uploading ? 'Uploading...' : 'Upload Certificate'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">10th Marksheet</p>
                                            {selectedApplication.marksheet_10th_url ? (
                                                <div className="flex gap-2 items-center">
                                                    <a href={selectedApplication.marksheet_10th_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline">
                                                        View
                                                    </a>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleFileSelect(selectedApplication.id, 'marksheet_10th_url')} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600">
                                                        Re-upload
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleFileSelect(selectedApplication.id, 'marksheet_10th_url')} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-200">
                                                    Upload 10th Marksheet
                                                </button>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">12th Marksheet</p>
                                            {selectedApplication.marksheet_12th_url ? (
                                                <div className="flex gap-2 items-center">
                                                    <a href={selectedApplication.marksheet_12th_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline">
                                                        View
                                                    </a>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleFileSelect(selectedApplication.id, 'marksheet_12th_url')} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600">
                                                        Re-upload
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleFileSelect(selectedApplication.id, 'marksheet_12th_url')} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-200">
                                                    Upload 12th Marksheet
                                                </button>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Degree Marksheet</p>
                                            {selectedApplication.marksheet_degree_url ? (
                                                <div className="flex gap-2 items-center">
                                                    <a href={selectedApplication.marksheet_degree_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline">
                                                        View
                                                    </a>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleFileSelect(selectedApplication.id, 'marksheet_degree_url')} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600">
                                                        Re-upload
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleFileSelect(selectedApplication.id, 'marksheet_degree_url')} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-200">
                                                    Upload Degree Marksheet
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Application Status */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Application Status</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Status</p>
                                            <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full 
                                            ${selectedApplication.status === 'New' ? 'bg-blue-100 text-blue-800' :
                                                    selectedApplication.status === 'Enrolled' ? 'bg-green-100 text-green-800' :
                                                        selectedApplication.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {selectedApplication.status}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Submitted On</p>
                                            <p className="text-base font-medium text-gray-900">{new Date(selectedApplication.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Details */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">💳 Payment Details</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-500">Payment Status</p>
                                                {isEditing ? (
                                                    <select
                                                        name="payment_status"
                                                        value={editFormData.payment_status || 'Pending'}
                                                        onChange={handleEditChange}
                                                        className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                    >
                                                        <option value="Pending">Pending</option>
                                                        <option value="Partial">Partial</option>
                                                        <option value="Paid">Paid</option>
                                                        <option value="Refunded">Refunded</option>
                                                    </select>
                                                ) : (
                                                    (() => {
                                                        const dueDate = selectedApplication.payment_last_date || selectedApplication.payment_date;
                                                        if (selectedApplication.payment_status === 'Paid' || selectedApplication.payment_status === 'Refunded' || !dueDate) {
                                                            const badgeColor = selectedApplication.payment_status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                                selectedApplication.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                                                                    selectedApplication.payment_status === 'Refunded' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
                                                            return (
                                                                <span className={`px-3 py-1 inline-flex text-sm font-bold rounded-full ${badgeColor}`}>
                                                                    {selectedApplication.payment_status || 'Pending'}
                                                                </span>
                                                            );
                                                        }

                                                        const daysPassed = (new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24);

                                                        if (daysPassed > 15) {
                                                            return (
                                                                <span className="px-3 py-1 inline-flex text-sm font-bold rounded-full bg-red-600 text-white animate-pulse shadow-md shadow-red-200">
                                                                    OVERDUE + PENALTY
                                                                </span>
                                                            );
                                                        } else if (daysPassed > 1) {
                                                            return (
                                                                <span className="px-3 py-1 inline-flex text-sm font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                                                                    OVERDUE
                                                                </span>
                                                            );
                                                        } else {
                                                            return (
                                                                <span className="px-3 py-1 inline-flex text-sm font-bold rounded-full bg-gray-100 text-gray-800">
                                                                    {selectedApplication.payment_status || 'Pending'}
                                                                </span>
                                                            );
                                                        }
                                                    })()
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Amount Paid</p>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        name="payment_amount"
                                                        value={editFormData.payment_amount || ''}
                                                        onChange={handleEditChange}
                                                        className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                        placeholder="0.00"
                                                        step="0.01"
                                                    />
                                                ) : (
                                                    <p className="text-base font-bold text-gray-900">₹{selectedApplication.payment_amount || '0.00'}</p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm text-red-600 font-semibold mb-1">Penalty Amount</p>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        name="penalty_amount"
                                                        value={editFormData.penalty_amount || ''}
                                                        onChange={handleEditChange}
                                                        className="w-full px-3 py-2 bg-red-50/50 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm text-red-900"
                                                        placeholder="0.00"
                                                        step="0.01"
                                                    />
                                                ) : (
                                                    <p className="text-base font-bold text-red-600">₹{selectedApplication.penalty_amount || '0.00'}</p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Scheduled Date</p>
                                                {isEditing ? (
                                                    <input
                                                        type="date"
                                                        name="payment_date"
                                                        value={editFormData.payment_date ? editFormData.payment_date.split('T')[0] : ''}
                                                        onChange={handleEditChange}
                                                        className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                    />
                                                ) : (
                                                    <p className="text-base font-medium text-gray-900">
                                                        {selectedApplication.payment_date
                                                            ? new Date(selectedApplication.payment_date).toLocaleDateString()
                                                            : 'Not recorded'}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm text-indigo-600 font-semibold mb-1">Payment Last Date (Due Date)</p>
                                                {isEditing ? (
                                                    <input
                                                        type="date"
                                                        name="payment_last_date"
                                                        value={editFormData.payment_last_date ? editFormData.payment_last_date.split('T')[0] : ''}
                                                        onChange={handleEditChange}
                                                        className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                    />
                                                ) : (
                                                    <p className="text-base font-bold text-indigo-600">
                                                        {selectedApplication.payment_last_date
                                                            ? new Date(selectedApplication.payment_last_date).toLocaleDateString()
                                                            : 'Not set'}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Payment Method</p>
                                                {isEditing ? (
                                                    <select
                                                        name="payment_method"
                                                        value={editFormData.payment_method || ''}
                                                        onChange={handleEditChange}
                                                        className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                    >
                                                        <option value="">Select Method</option>
                                                        <option value="Cash">Cash</option>
                                                        <option value="Card">Card</option>
                                                        <option value="UPI">UPI</option>
                                                        <option value="Bank Transfer">Bank Transfer</option>
                                                        <option value="Cheque">Cheque</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                ) : (
                                                    <p className="text-base font-medium text-gray-900">{selectedApplication.payment_method || 'N/A'}</p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Payment Type</p>
                                                {isEditing ? (
                                                    <select
                                                        name="payment_type"
                                                        value={editFormData.payment_type || ''}
                                                        onChange={handleEditChange}
                                                        className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                    >
                                                        <option value="">Select Payment Type</option>
                                                        <option value="Full">Full</option>
                                                        <option value="Installment">Installment</option>
                                                        <option value="EMI">EMI</option>
                                                        <option value="Bajaj">Bajaj</option>
                                                        <option value="Flashaid">Flashaid</option>
                                                        <option value="Fibe">Fibe (Early Salary)</option>
                                                        <option value="Credit Card">Credit Card</option>
                                                    </select>
                                                ) : (
                                                    <p className="text-base font-medium text-gray-900">{selectedApplication.payment_type || 'N/A'}</p>
                                                )}
                                            </div>

                                            {/* Show installments/EMI months depending on Payment Type */}
                                            {((isEditing ? editFormData.payment_type : selectedApplication.payment_type) === 'Installment') || (['EMI', 'Bajaj', 'Flashaid', 'Fibe'].includes(isEditing ? editFormData.payment_type : selectedApplication.payment_type)) ? (
                                                <div>
                                                    <p className="text-sm text-gray-500">
                                                        {(isEditing ? editFormData.payment_type : selectedApplication.payment_type) === 'Installment' ? 'Number of Installments (Max 3)' : 'EMI Months'}
                                                    </p>
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            name="installments_count"
                                                            value={editFormData.installments_count || ''}
                                                            onChange={(e) => {
                                                                let val = parseInt(e.target.value, 10);
                                                                if (editFormData.payment_type === 'Installment') {
                                                                    if (val > 3) val = 3;
                                                                    if (val < 1) val = 1;
                                                                } else {
                                                                    if (val < 1) val = 1;
                                                                    if (val > 60) val = 60;
                                                                }
                                                                handleEditChange({ target: { name: 'installments_count', value: isNaN(val) ? '' : val } });
                                                            }}
                                                            min="1"
                                                            max={editFormData.payment_type === 'Installment' ? "3" : "60"}
                                                            className="w-full px-3 py-2 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                                                            placeholder={editFormData.payment_type === 'Installment' ? "Max 3" : "Months"}
                                                        />
                                                    ) : (
                                                        <p className="text-base font-medium text-gray-900">{selectedApplication.installments_count || 'N/A'}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="hidden md:block"></div>
                                            )}

                                            <div className="md:col-span-2">
                                                <p className="text-sm text-gray-500">Transaction ID / Reference</p>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        name="payment_transaction_id"
                                                        value={editFormData.payment_transaction_id || ''}
                                                        onChange={handleEditChange}
                                                        className="w-full border rounded p-1 text-gray-900"
                                                        placeholder="Enter transaction ID or reference number"
                                                    />
                                                ) : (
                                                    <p className="text-base font-medium text-gray-900">{selectedApplication.payment_transaction_id || 'N/A'}</p>
                                                )}
                                            </div>
                                            <div className="md:col-span-2">
                                                <p className="text-sm text-gray-500">Payment Notes</p>
                                                {isEditing ? (
                                                    <textarea
                                                        name="payment_notes"
                                                        value={editFormData.payment_notes || ''}
                                                        onChange={handleEditChange}
                                                        rows="2"
                                                        className="w-full border rounded p-1 text-gray-900"
                                                        placeholder="Add any payment-related notes"
                                                    />
                                                ) : (
                                                    <p className="text-base font-medium text-gray-900">{selectedApplication.payment_notes || 'No notes'}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Payment Summary */}
                                        {selectedApplication.fee_total && (
                                            <div className="mt-4 pt-4 border-t border-gray-300">
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Total Fee:</span>
                                                        <span className="font-medium">₹{selectedApplication.is_scholarship
                                                            ? (parseFloat(selectedApplication.fee_total) - parseFloat(selectedApplication.fee_discount_amount || 0)).toFixed(2)
                                                            : selectedApplication.fee_total}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Amount Paid:</span>
                                                        <span className="font-medium text-green-700">₹{selectedApplication.payment_amount || '0.00'}</span>
                                                    </div>
                                                    {selectedApplication.penalty_amount > 0 && (
                                                        <div className="flex justify-between col-span-2 text-red-600">
                                                            <span>Penalty Applied:</span>
                                                            <span className="font-medium">+ ₹{selectedApplication.penalty_amount}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between col-span-2 pt-2 border-t border-gray-200">
                                                        <span className="text-gray-700 font-semibold">Balance Due:</span>
                                                        <span className="font-bold text-red-600">
                                                            ₹{(
                                                                (selectedApplication.is_scholarship
                                                                    ? (parseFloat(selectedApplication.fee_total) - parseFloat(selectedApplication.fee_discount_amount || 0))
                                                                    : parseFloat(selectedApplication.fee_total || 0)
                                                                ) + parseFloat(selectedApplication.penalty_amount || 0) - parseFloat(selectedApplication.payment_amount || 0)
                                                            ).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Additional Notes */}
                                {selectedApplication.notes && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Additional Notes</h3>
                                        <p className="text-base text-gray-900">{selectedApplication.notes}</p>
                                    </div>
                                )}

                                {/* Certificate Upload Section */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">📜 Certificate Management</h3>

                                    {/* Course Dates */}
                                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Course Dates</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500">Start Date</p>
                                                {isEditing ? (
                                                    <input
                                                        type="date"
                                                        name="course_start_date"
                                                        value={editFormData.course_start_date || ''}
                                                        onChange={handleEditChange}
                                                        className="w-full border rounded p-1 text-sm"
                                                    />
                                                ) : (
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {selectedApplication.course_start_date
                                                            ? new Date(selectedApplication.course_start_date).toLocaleDateString()
                                                            : 'Not set'}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">End Date</p>
                                                {isEditing ? (
                                                    <input
                                                        type="date"
                                                        name="course_end_date"
                                                        value={editFormData.course_end_date || ''}
                                                        onChange={handleEditChange}
                                                        className="w-full border rounded p-1 text-sm"
                                                    />
                                                ) : (
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {selectedApplication.course_end_date
                                                            ? new Date(selectedApplication.course_end_date).toLocaleDateString()
                                                            : 'Not set'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>


                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="bg-gray-50 p-4 rounded-b-lg flex justify-end">
                                <button onClick={closeModal} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleDocumentUpload}
            />

            {/* ===== Software Covered Modal ===== */}
            {
                showSoftwareModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center gap-3">
                                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3V15a3 3 0 01-3 3h-3v.257c0 .597.237 1.17.659 1.591l.621.622a.75.75 0 01-.53 1.28h-9a.75.75 0 01-.53-1.28l.621-.622a2.25 2.25 0 00.659-1.59V18h-3a3 3 0 01-3-3V5.25zm1.5 0v9.75c0 .83.67 1.5 1.5 1.5h13.5c.83 0 1.5-.67 1.5-1.5V5.25c0-.83-.67-1.5-1.5-1.5H5.25c-.83 0-1.5.67-1.5 1.5z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-base">Software / Tools Covered</h3>
                                    <p className="text-indigo-200 text-xs">Select all software covered in this course</p>
                                </div>
                            </div>

                            {/* Checkboxes */}
                            <div className="px-6 py-4 max-h-72 overflow-y-auto">
                                {softwareItems.length === 0 ? (
                                    <p className="text-slate-400 text-sm text-center py-4">
                                        No software items configured. Go to <strong>Software List</strong> tab to add items.
                                    </p>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm text-slate-500">{selectedSoftware.length} selected</span>
                                            <div className="flex gap-3 text-xs">
                                                <button
                                                    onClick={() => setSelectedSoftware(softwareItems.map(s => s.name))}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                                                >Select All</button>
                                                <button
                                                    onClick={() => setSelectedSoftware([])}
                                                    className="text-slate-400 hover:text-slate-600"
                                                >Deselect All</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {softwareItems.map(item => (
                                                <label
                                                    key={item.id}
                                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${selectedSoftware.includes(item.name)
                                                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                                        : 'border-slate-200 hover:border-indigo-200 text-slate-600'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="accent-indigo-600"
                                                        checked={selectedSoftware.includes(item.name)}
                                                        onChange={() => toggleSoftwareItem(item.name)}
                                                    />
                                                    <span className="text-sm font-medium truncate">{item.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowSoftwareModal(false); setPendingStatusId(null); }}
                                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium rounded-lg hover:bg-slate-100 transition-colors"
                                >Cancel</button>
                                <button
                                    onClick={handleSoftwareModalConfirm}
                                    disabled={softwareItems.length > 0 && selectedSoftware.length === 0}
                                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold rounded-lg shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    ✅ Mark as Completed
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ───────── Certificate Preview Tab ───────── */}
            {
                activeTab === 'certificate' && user?.role === 'super_admin' && (() => {
                    const CATEGORIES = ['CSE / IT', 'Mechanical', 'Civil', 'Arts', 'Kids'];
                    const catTemplates = courseTemplates.filter(t => t.category === certCategory);
                    return (
                        <div className="p-6">
                            {/* ── Certificate Preview ── */}
                            <div className="mb-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-1">🎓 Preview Certificate</h3>
                                <p className="text-sm text-slate-500 mb-5">Fill in sample values to preview how the generated certificate will look.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                                    {[{ key: 'student_name', label: 'Student Name' },
                                    { key: 'application_id', label: 'Admission No.' },
                                    { key: 'certificate_number', label: 'Certificate No.' },
                                    { key: 'course', label: 'Course' },
                                    { key: 'course_start_date', label: 'Start Date', type: 'date' },
                                    { key: 'course_end_date', label: 'End Date', type: 'date' },
                                    { key: 'software_covered', label: 'Software Covered' },
                                    { key: 'branch', label: 'Branch' },
                                    ].map(({ key, label, type = 'text' }) => (
                                        <div key={key}>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-xs font-semibold text-slate-600">{label}</label>
                                                {key === 'course' && (
                                                    <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase">
                                                        Category: {COURSE_CATEGORY_MAP[certPreviewFields.course] || 'CSE / IT'}
                                                    </span>
                                                )}
                                            </div>
                                            <input
                                                type={type}
                                                value={certPreviewFields[key]}
                                                onChange={e => setCertPreviewFields(prev => ({ ...prev, [key]: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Logo placement controls */}
                                <div className="pt-4 border-t border-indigo-100">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9.069.435a.75.75 0 01.862 0l8 5.5a.75.75 0 01-.182 1.337l-1.5.5a.75.75 0 01-.483-.024L10 6.04 4.234 7.748a.75.75 0 01-.483.024l-1.5-.5A.75.75 0 012.07 5.935l7-4.5zM10 7.5l-4.5 1.5v5.25c0 .414.336.75.75.75h7.5a.75.75 0 00.75-.75V9l-4.5-1.5z" clipRule="evenodd" /></svg>
                                        Partner Logo Placement
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-3 mb-6">
                                        <div className="flex items-center gap-2 bg-white rounded-xl border border-indigo-200 px-4 py-2 shadow-sm">
                                            <span className="text-xs font-semibold text-slate-500">X Position:</span>
                                            <input type="number" value={logoPosition.x ?? ''} placeholder="auto"
                                                onChange={e => {
                                                    const val = e.target.value ? Number(e.target.value) : null;
                                                    setLogoPosition(p => ({ ...p, x: val }));
                                                    handleSaveLogoPosition(val, logoPosition.y);
                                                }}
                                                className="w-16 text-sm text-slate-700 border-none outline-none bg-transparent" />
                                        </div>
                                        <div className="flex items-center gap-2 bg-white rounded-xl border border-indigo-200 px-4 py-2 shadow-sm">
                                            <span className="text-xs font-semibold text-slate-500">Y Position:</span>
                                            <input type="number" value={logoPosition.y ?? ''} placeholder="auto"
                                                onChange={e => {
                                                    const val = e.target.value ? Number(e.target.value) : null;
                                                    setLogoPosition(p => ({ ...p, y: val }));
                                                    handleSaveLogoPosition(logoPosition.x, val);
                                                }}
                                                className="w-16 text-sm text-slate-700 border-none outline-none bg-transparent" />
                                        </div>
                                        <button
                                            onClick={() => setPickerOpen(true)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-indigo-100"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                            Pick Position visually
                                        </button>
                                        {logoPosition.x !== null && (
                                            <button onClick={() => setLogoPosition({ x: null, y: null })} className="text-xs text-red-500 hover:text-red-700 font-bold underline">Reset to centre</button>
                                        )}
                                    </div>
                                </div>

                                <button
                                    disabled={certPreviewLoading}
                                    onClick={async () => {
                                        setCertPreviewLoading(true);
                                        try {
                                            const res = await fetch(`${config.API_URL}/api/certificate/preview`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ ...certPreviewFields, logoX: logoPosition.x, logoY: logoPosition.y })
                                            });
                                            if (!res.ok) throw new Error(await res.text());
                                            const blob = await res.blob();
                                            const url = URL.createObjectURL(blob);
                                            window.open(url, '_blank');
                                        } catch (err) { alert(`❌ Preview failed: ${err.message}`); }
                                        finally { setCertPreviewLoading(false); }
                                    }}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 text-white text-base font-bold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-95"
                                >
                                    {certPreviewLoading ? (
                                        <><svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Generating PDF...</>
                                    ) : (
                                        <><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" /></svg> Generate Preview Certificate</>
                                    )}
                                </button>
                            </div>

                            {/* ── Position Picker Modal ── */}
                            {pickerOpen && (
                                <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center" onClick={() => setPickerOpen(false)}>
                                    <div className="mb-3 flex items-center gap-4">
                                        <span className="text-white font-bold text-lg">🎯 Click on the certificate to set logo position</span>
                                        <span className="bg-white/20 text-white text-sm px-3 py-1 rounded-lg font-mono">
                                            X: {pickerHover.x}  Y: {pickerHover.y}
                                        </span>
                                        <button onClick={() => setPickerOpen(false)} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-sm">✕ Close</button>
                                    </div>
                                    <div
                                        className="relative overflow-hidden rounded-xl shadow-2xl border-2 border-white/30"
                                        style={{ maxHeight: '85vh', cursor: 'crosshair' }}
                                        onClick={e => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const scaleX = 1414 / rect.width;
                                            const scaleY = 2000 / rect.height;
                                            const x = Math.round((e.clientX - rect.left) * scaleX);
                                            const y = Math.round((e.clientY - rect.top) * scaleY);
                                            setLogoPosition({ x, y });
                                            handleSaveLogoPosition(x, y);
                                            setPickerOpen(false);
                                        }}
                                        onMouseMove={e => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const scaleX = 1414 / rect.width;
                                            const scaleY = 2000 / rect.height;
                                            setPickerHover({
                                                x: Math.round((e.clientX - rect.left) * scaleX),
                                                y: Math.round((e.clientY - rect.top) * scaleY)
                                            });
                                        }}
                                    >
                                        <img
                                            src={
                                                courseTemplates.find(t => t.category === (COURSE_CATEGORY_MAP[certPreviewFields.course] || 'CSE / IT'))?.template_url
                                                || `${config.API_URL}/assets/course%20template%20(1).png`
                                            }
                                            alt="Certificate template"
                                            style={{ display: 'block', maxHeight: '85vh', width: 'auto' }}
                                            draggable={false}
                                        />
                                        {/* Crosshair overlay */}
                                        <div className="absolute inset-0 pointer-events-none" style={{
                                            backgroundImage: 'linear-gradient(rgba(99,102,241,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.15) 1px, transparent 1px)',
                                            backgroundSize: '10% 10%'
                                        }} />
                                    </div>
                                    {logoPosition.x !== null && (
                                        <div className="mt-3 bg-green-500 text-white px-4 py-2 rounded-lg font-semibold text-sm">
                                            ✅ Position set: X={logoPosition.x}, Y={logoPosition.y}
                                        </div>
                                    )}
                                </div>
                            )}

                            <hr className="border-slate-200 mb-8" />

                            {/* Hidden file input for course template */}
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                ref={certTemplateInputRef}
                                className="hidden"
                                onChange={handleCourseTemplateUpload}
                            />

                            {/* Hidden partner logo input — category-scoped */}
                            <input type="file" accept="image/*" ref={partnerLogoInputRef} className="hidden"
                                onChange={async e => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    setPartnerLogoUploading(true);
                                    try {
                                        const fileExt = file.name.split('.').pop();
                                        const fileName = `cert-logos/partner_${certCategory.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
                                        const storageRef = ref(storage, fileName);
                                        const snapshot = await uploadBytes(storageRef, file);
                                        const publicUrl = await getDownloadURL(snapshot.ref);
                                        const res = await fetch(`${config.API_URL}/api/course-templates`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ category: `_partner_${certCategory}`, template_url: publicUrl, file_name: file.name })
                                        });
                                        if (!res.ok) throw new Error('Save failed');
                                        await fetchCourseTemplates();
                                        alert('✅ Partner logo added!');
                                    } catch (err) { alert(`❌ ${err.message}`); }
                                    finally { setPartnerLogoUploading(false); if (partnerLogoInputRef.current) partnerLogoInputRef.current.value = ''; }
                                }}
                            />

                            {/* Header */}
                            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">Course-wise Certificate Templates</h3>
                                    <p className="text-sm text-slate-500">Upload a certificate template for each course category. You can add multiple templates and delete old ones.</p>
                                </div>
                                <button
                                    onClick={() => fetchCourseTemplates()}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.389zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" /></svg>
                                    Refresh
                                </button>
                            </div>

                            {/* Category tabs */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setCertCategory(cat)}
                                        className={`px-5 py-2 rounded-full text-sm font-bold border-2 transition-all ${certCategory === cat
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                                            }`}
                                    >
                                        {cat}
                                        {courseTemplates.filter(t => t.category === cat).length > 0 && (
                                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${certCategory === cat ? 'bg-white/30 text-white' : 'bg-indigo-100 text-indigo-600'
                                                }`}>
                                                {courseTemplates.filter(t => t.category === cat).length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Upload button */}
                            <div className="mb-6 flex items-center gap-3">
                                <button
                                    onClick={() => certTemplateInputRef.current?.click()}
                                    disabled={certTemplateUploading}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-200 disabled:opacity-60 transition-all"
                                >
                                    {certTemplateUploading ? (
                                        <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" /><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" /></svg>
                                    )}
                                    {certTemplateUploading ? 'Uploading...' : `Add Template for ${certCategory}`}
                                </button>
                                <p className="text-xs text-slate-400">Accepted: PNG, JPG, PDF</p>
                            </div>

                            {/* Templates grid */}
                            {catTemplates.length === 0 ? (
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    <p className="text-slate-500 font-semibold">No templates yet for <strong>{certCategory}</strong></p>
                                    <p className="text-slate-400 text-sm mt-1">Click "Add Template" above to upload one.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {catTemplates.map(tmpl => (
                                        <div key={tmpl.id} className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden group">
                                            {/* Image preview */}
                                            <div className="relative bg-slate-50 border-b border-slate-100" style={{ minHeight: 200 }}>
                                                {(tmpl.file_name || tmpl.template_url).match(/\.(png|jpe?g|gif|webp|svg)(?:\?|$)/i) ? (
                                                    <img
                                                        src={tmpl.template_url}
                                                        alt={tmpl.file_name || tmpl.category}
                                                        className="w-full object-contain"
                                                        style={{ maxHeight: 260 }}
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                        <p className="text-sm text-slate-500 font-medium">PDF Document</p>
                                                    </div>
                                                )}
                                                {/* Overlay actions on hover */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                    <a
                                                        href={tmpl.template_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="bg-white text-slate-800 text-xs font-bold px-3 py-2 rounded-lg shadow hover:bg-indigo-50 transition-colors"
                                                    >👁 View</a>
                                                    <button
                                                        onClick={() => handleDeleteCourseTemplate(tmpl.id)}
                                                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow transition-colors"
                                                    >🗑 Delete</button>
                                                </div>
                                            </div>
                                            {/* Card footer */}
                                            <div className="p-4 flex items-center justify-between">
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-semibold text-slate-700 truncate">{tmpl.file_name || 'Template'}</p>
                                                    <p className="text-xs text-slate-400">{new Date(tmpl.created_at).toLocaleDateString('en-GB')}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteCourseTemplate(tmpl.id)}
                                                    className="ml-2 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                                    title="Delete template"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── Per-category Partner Logos ── */}
                            {(() => {
                                const partnerKey = `_partner_${certCategory}`;
                                const partnerLogos = courseTemplates.filter(t => t.category === partnerKey);
                                return (
                                    <div className="mt-12 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" /></svg>
                                                </div>
                                                <div>
                                                    <h4 className="text-base font-bold text-slate-800">Authorised Training Partner Logos</h4>
                                                    <p className="text-sm text-slate-500">Logos shown on <span className="text-indigo-600 font-semibold">{certCategory}</span> certificates.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => partnerLogoInputRef.current?.click()}
                                                disabled={partnerLogoUploading}
                                                className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                                            >
                                                {partnerLogoUploading ? (
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
                                                )}
                                                Upload Logo
                                            </button>
                                        </div>

                                        <div className="p-6">
                                            {partnerLogos.length === 0 ? (
                                                <div className="py-12 flex flex-col items-center justify-center text-center">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    </div>
                                                    <p className="text-slate-500 font-medium">No partner logos for {certCategory} yet.</p>
                                                    <p className="text-slate-400 text-sm mt-1">Upload logos like SolidWorks or PTC Creo here.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                                    {partnerLogos.map(logo => (
                                                        <div key={logo.id} className="group relative bg-slate-50 rounded-2xl border border-slate-200 p-4 transition-all hover:bg-white hover:border-indigo-200 hover:shadow-lg flex flex-col items-center justify-center aspect-square gap-3">
                                                            <img src={logo.template_url} alt={logo.file_name} className="max-h-20 w-auto object-contain" />
                                                            <div className="text-center">
                                                                <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{logo.file_name || 'Partner Logo'}</p>
                                                                <p className="text-[10px] text-slate-400">{new Date(logo.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDeleteCourseTemplate(logo.id)}
                                                                className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-sm"
                                                                title="Delete logo"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" /></svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })()
            }
        </div >
    );
};

export default AdminDashboard;
