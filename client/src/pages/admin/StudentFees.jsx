import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../config';

// ─── Penalty Calculation Helper ───────────────────────────────────────────────
function calcPenalty(dueDate, graceDays, dailyAmount, manualOverride) {
    // If admin has set a manual override, use that
    if (manualOverride != null && manualOverride > 0) return parseFloat(manualOverride);
    if (!dueDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 0; // Not yet overdue
    const penaltyDays = Math.max(0, diffDays - graceDays);
    return penaltyDays * dailyAmount;
}

function daysSinceDue(dueDate) {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.floor((today - due) / (1000 * 60 * 60 * 24));
}

// ─── Main Component ────────────────────────────────────────────────────────────
const StudentFees = () => {
    const navigate = useNavigate();

    // Data
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Penalty Config
    const [penaltyConfig, setPenaltyConfig] = useState({ grace_days: 0, daily_penalty_amount: 50 });
    const [configLoading, setConfigLoading] = useState(true);
    const [configEditing, setConfigEditing] = useState(false);
    const [configDraft, setConfigDraft] = useState({ grace_days: 0, daily_penalty_amount: 50 });
    const [configSaving, setConfigSaving] = useState(false);

    // Manual Penalty Override Modal
    const [showPenaltyModal, setShowPenaltyModal] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [penaltyOverride, setPenaltyOverride] = useState('');
    const [penaltySubmitting, setPenaltySubmitting] = useState(false);

    // Add Payment Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState({
        amount: 0, method: 'Cash', transaction_id: '', date: new Date().toISOString().split('T')[0]
    });
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);

    const user = JSON.parse(localStorage.getItem('user'));

    // ── Fetch Applications ────
    const fetchApplications = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            // Match AdminDashboard: non-super_admin users filter by their branch
            if (user && user.role !== 'super_admin' && user.branch_id) {
                params.append('branch_id', user.branch_id);
            }
            let url = `${config.API_URL}/api/applications`;
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            console.log('Fetching applications from:', url);
            const res = await fetch(url);
            if (!res.ok) {
                console.error('Applications fetch failed:', res.status, res.statusText);
                setFetchError(`HTTP ${res.status}: ${res.statusText}`);
                return;
            }
            const data = await res.json();
            console.log(`Fetched ${Array.isArray(data) ? data.length : 'non-array'} applications`);
            if (Array.isArray(data)) {
                setApplications(data);
                setFetchError(null);
            } else if (data && data.error) {
                setFetchError(`API Error: ${data.error}`);
                setApplications([]);
            } else {
                setFetchError(`Unexpected response: ${JSON.stringify(data)}`);
                setApplications([]);
            }
        } catch (err) {
            console.error('Error fetching applications:', err);
            setFetchError(`Network error: ${err.message}`);
            setApplications([]);
        } finally {
            setLoading(false);
        }
    }, [user?.branch_id, user?.role]);

    // ── Fetch Penalty Config ──
    const fetchPenaltyConfig = useCallback(async () => {
        setConfigLoading(true);
        try {
            const res = await fetch(`${config.API_URL}/api/settings/penalty`);
            if (res.ok) {
                const data = await res.json();
                setPenaltyConfig(data);
                setConfigDraft(data);
            }
        } catch (err) {
            console.error('Penalty config fetch failed, using defaults', err);
        } finally {
            setConfigLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user) { navigate('/admin/login'); return; }
        fetchApplications();
        fetchPenaltyConfig();
    }, [navigate, fetchApplications, fetchPenaltyConfig]);

    // ── Save Penalty Config ──
    const handleSaveConfig = async () => {
        setConfigSaving(true);
        try {
            const res = await fetch(`${config.API_URL}/api/settings/penalty`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grace_days: parseInt(configDraft.grace_days, 10),
                    daily_penalty_amount: parseFloat(configDraft.daily_penalty_amount)
                })
            });
            if (res.ok) {
                const data = await res.json();
                setPenaltyConfig(data.config);
                setConfigEditing(false);
                alert('✅ Penalty configuration saved!');
            } else {
                alert('❌ Failed to save config');
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setConfigSaving(false);
        }
    };

    // ── Manual Penalty Override ──
    const handleManualPenaltyOverride = async (e) => {
        e.preventDefault();
        setPenaltySubmitting(true);
        const value = penaltyOverride === '' ? null : parseFloat(penaltyOverride);
        try {
            const res = await fetch(`${config.API_URL}/api/applications/${selectedApp.id}/penalty`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ penalty_amount: value ?? 0 })
            });
            if (res.ok) {
                // Update local state immediately
                setApplications(prev => prev.map(a =>
                    a.id === selectedApp.id ? { ...a, penalty_amount: value ?? 0 } : a
                ));
                setShowPenaltyModal(false);
            } else {
                const data = await res.json();
                alert(`Failed: ${data.error}`);
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setPenaltySubmitting(false);
        }
    };

    // ── Record Manual Payment ──
    const handleAddPayment = async (e) => {
        e.preventDefault();
        setPaymentSubmitting(true);
        try {
            const currentPaid = parseFloat(selectedApp.payment_amount) || 0;
            const newTotalPaid = currentPaid + parseFloat(paymentData.amount);
            const penalty = calcPenalty(
                selectedApp.payment_last_date,
                penaltyConfig.grace_days,
                penaltyConfig.daily_penalty_amount,
                selectedApp.penalty_amount
            );
            const finalFee = (parseFloat(selectedApp.fee_total) || 0)
                - (parseFloat(selectedApp.fee_discount_amount) || 0)
                + penalty;

            const payment_status = newTotalPaid >= finalFee ? 'Paid' : 'Partial';

            const res = await fetch(`${config.API_URL}/api/applications/${selectedApp.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...selectedApp,
                    payment_amount: newTotalPaid,
                    payment_method: paymentData.method,
                    payment_transaction_id: paymentData.transaction_id,
                    payment_date: paymentData.date,
                    payment_status
                })
            });
            if (res.ok) {
                await fetchApplications();
                setShowPaymentModal(false);
            } else {
                const data = await res.json();
                alert(`Failed: ${data.error}`);
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setPaymentSubmitting(false);
        }
    };

    const openPenaltyModal = (app) => {
        setSelectedApp(app);
        // Show current manual override value if set, else empty (meaning auto)
        setPenaltyOverride(app.penalty_amount > 0 ? String(app.penalty_amount) : '');
        setShowPenaltyModal(true);
    };

    const openPaymentModal = (app) => {
        setSelectedApp(app);
        setPaymentData({ amount: 0, method: 'Cash', transaction_id: '', date: new Date().toISOString().split('T')[0] });
        setShowPaymentModal(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/admin/login');
    };

    // ── Filter ──
    const filteredApps = applications.filter(app => {
        const matchesSearch =
            (app.student_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (app.application_id?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (app.phone?.includes(searchTerm));
        const computedPenalty = calcPenalty(
            app.payment_last_date,
            penaltyConfig.grace_days,
            penaltyConfig.daily_penalty_amount,
            app.penalty_amount > 0 ? app.penalty_amount : null
        );
        const finalFee = (parseFloat(app.fee_total) || 0) - (parseFloat(app.fee_discount_amount) || 0) + computedPenalty;
        const balance = finalFee - (parseFloat(app.payment_amount) || 0);
        const effectiveStatus = app.payment_status === 'Paid' ? 'Paid' : (balance <= 0 ? 'Paid' : (app.payment_status || 'Pending'));
        const matchesStatus = statusFilter === 'All' || effectiveStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // ── Summary Stats ──
    const overdueCount = filteredApps.filter(app => {
        const days = daysSinceDue(app.payment_last_date);
        return days !== null && days > penaltyConfig.grace_days && app.payment_status !== 'Paid';
    }).length;

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* Sidebar */}
            <div className="w-64 bg-white text-slate-600 min-h-screen flex flex-col shadow-xl hidden md:flex border-r border-slate-200 flex-shrink-0">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-indigo-600">
                            <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
                        </svg>
                        AdminPortal
                    </h1>
                </div>
                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <a href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        Dashboard
                    </a>
                    <a href="/admin/fees" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Course Fees Config
                    </a>
                    <a href="/admin/student-fees" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-50 text-indigo-700 font-medium shadow-sm ring-1 ring-indigo-200 transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                        Student Fees
                    </a>
                </nav>
                <div className="p-4 border-t border-slate-100">
                    <button onClick={handleLogout} className="w-full py-2 px-4 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-sm border-b border-slate-200 p-4 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold text-slate-800">Student Fees Dashboard</h2>
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-slate-700">{user?.username}</p>
                        <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-auto bg-slate-50">

                    {/* ─── Penalty Config Panel ─────────────────────────── */}
                    <div className="mb-6 bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-amber-50 border-b border-amber-200">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h3 className="font-bold text-amber-800 text-sm">Penalty Configuration</h3>
                                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Global</span>
                            </div>
                            {!configEditing ? (
                                <button
                                    onClick={() => { setConfigDraft(penaltyConfig); setConfigEditing(true); }}
                                    className="text-xs text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-amber-100 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Edit
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => setConfigEditing(false)} className="text-xs text-slate-500 px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                                    <button onClick={handleSaveConfig} disabled={configSaving} className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-lg font-semibold disabled:opacity-50 transition-colors">
                                        {configSaving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-4">
                            {configLoading ? (
                                <p className="text-sm text-slate-500">Loading config...</p>
                            ) : configEditing ? (
                                <div className="flex flex-wrap gap-6 items-end">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Grace Period (days after due date)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number" min="0" max="365"
                                                value={configDraft.grace_days}
                                                onChange={e => setConfigDraft(p => ({ ...p, grace_days: e.target.value }))}
                                                className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                            />
                                            <span className="text-sm text-slate-500">days</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">Penalty starts after this many days past due date</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Daily Penalty Amount</label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500 text-sm">₹</span>
                                            <input
                                                type="number" min="0"
                                                value={configDraft.daily_penalty_amount}
                                                onChange={e => setConfigDraft(p => ({ ...p, daily_penalty_amount: e.target.value }))}
                                                className="w-28 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                            />
                                            <span className="text-sm text-slate-500">per day</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">Charged for every overdue day after grace period</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Grace Period</p>
                                            <p className="text-lg font-bold text-slate-800">{penaltyConfig.grace_days} <span className="text-sm font-normal text-slate-500">days</span></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Daily Penalty</p>
                                            <p className="text-lg font-bold text-slate-800">₹{penaltyConfig.daily_penalty_amount} <span className="text-sm font-normal text-slate-500">/ day</span></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">Currently Penalized</p>
                                            <p className="text-lg font-bold text-orange-600">{overdueCount} students</p>
                                        </div>
                                    </div>
                                    <div className="ml-auto self-center bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-600">
                                        <span className="font-semibold">Formula:</span> After <strong>{penaltyConfig.grace_days}</strong> overdue days → ₹<strong>{penaltyConfig.daily_penalty_amount}</strong> × extra days
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── Filters ──────────────────────────────────────── */}
                    <div className="mb-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Search by name, ID or phone..."
                                className="w-full sm:w-72 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <select
                                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                            >
                                <option value="All">All</option>
                                <option value="Pending">Pending</option>
                                <option value="Partial">Partial</option>
                                <option value="Paid">Paid</option>
                            </select>
                        </div>
                        <p className="text-sm text-slate-500">Showing <strong>{filteredApps.length}</strong> students</p>
                    </div>

                    {/* ─── Error Banner ─────────────────────────────────── */}
                    {fetchError && (
                        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-800">
                            <svg className="w-6 h-6 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="font-bold text-sm">Data Loading Error</p>
                                <p className="text-xs opacity-80">{fetchError}</p>
                            </div>
                            <button
                                onClick={() => fetchApplications()}
                                className="ml-auto bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* ─── Table ────────────────────────────────────────── */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Due Date / Overdue</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fee Breakdown</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan="5" className="text-center py-10 text-slate-400">Loading payment data...</td></tr>
                                    ) : filteredApps.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center py-10 text-slate-400">No students found.</td></tr>
                                    ) : filteredApps.map(app => {
                                        const overdueDays = daysSinceDue(app.payment_last_date);
                                        const isOverdue = overdueDays !== null && overdueDays > 0 && app.payment_status !== 'Paid';
                                        const isPenalized = isOverdue && overdueDays > penaltyConfig.grace_days;

                                        // Use manual override if set (> 0), else auto-calculate
                                        const hasManualOverride = app.penalty_amount > 0;
                                        const autoPenalty = isPenalized
                                            ? Math.max(0, overdueDays - penaltyConfig.grace_days) * penaltyConfig.daily_penalty_amount
                                            : 0;
                                        const effectivePenalty = hasManualOverride ? parseFloat(app.penalty_amount) : autoPenalty;

                                        const totalFee = parseFloat(app.fee_total) || 0;
                                        const discount = parseFloat(app.fee_discount_amount) || 0;
                                        const finalFee = totalFee - discount + effectivePenalty;
                                        const amountPaid = parseFloat(app.payment_amount) || 0;
                                        const balance = finalFee - amountPaid;

                                        return (
                                            <tr key={app.id} className={`hover:bg-slate-50 transition-colors ${isPenalized && !hasManualOverride ? 'border-l-4 border-rose-400' : ''}`}>
                                                {/* Student */}
                                                <td className="px-4 py-4">
                                                    <div className="text-xs font-bold text-indigo-600">{app.application_id || 'N/A'}</div>
                                                    <div className="text-sm font-semibold text-slate-800">{app.student_name}</div>
                                                    <div className="text-xs text-slate-500">{app.course}</div>
                                                    <div className="text-xs text-slate-400">{app.phone}</div>
                                                </td>

                                                {/* Due Date / Overdue */}
                                                <td className="px-4 py-4">
                                                    <div className="text-xs text-slate-600 mb-1">
                                                        Due: <span className="font-medium">{app.payment_last_date ? new Date(app.payment_last_date).toLocaleDateString('en-IN') : 'N/A'}</span>
                                                    </div>
                                                    {overdueDays !== null && overdueDays > 0 && app.payment_status !== 'Paid' ? (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${isPenalized ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            {overdueDays}d overdue
                                                            {isPenalized && ` (+${overdueDays - penaltyConfig.grace_days}d penalty)`}
                                                        </span>
                                                    ) : overdueDays !== null && overdueDays <= 0 ? (
                                                        <span className="text-xs text-green-600 font-medium">On time</span>
                                                    ) : null}
                                                    {app.payment_type && (
                                                        <div className="text-xs text-slate-500 mt-1">Type: {app.payment_type}</div>
                                                    )}
                                                </td>

                                                {/* Amounts */}
                                                <td className="px-4 py-4">
                                                    <div className="space-y-0.5 min-w-[160px]">
                                                        <div className="flex justify-between text-xs text-slate-600"><span>Fee:</span><span>₹{totalFee.toFixed(2)}</span></div>
                                                        {discount > 0 && <div className="flex justify-between text-xs text-green-600"><span>Discount:</span><span>-₹{discount.toFixed(2)}</span></div>}
                                                        {effectivePenalty > 0 && (
                                                            <div className="flex justify-between text-xs text-rose-600 font-semibold">
                                                                <span>
                                                                    Penalty {hasManualOverride ? '(manual)' : `(${overdueDays - penaltyConfig.grace_days}d × ₹${penaltyConfig.daily_penalty_amount})`}:
                                                                </span>
                                                                <span>+₹{effectivePenalty.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between text-xs font-bold text-slate-800 border-t pt-1 mt-1"><span>Total:</span><span>₹{finalFee.toFixed(2)}</span></div>
                                                        <div className="flex justify-between text-xs font-semibold text-indigo-600"><span>Paid:</span><span>₹{amountPaid.toFixed(2)}</span></div>
                                                        <div className={`flex justify-between text-xs font-bold border-t pt-1 ${balance > 0 ? 'text-rose-700' : 'text-green-600'}`}>
                                                            <span>Balance:</span><span>₹{balance.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-full ${balance <= 0 ? 'bg-green-100 text-green-700' :
                                                        app.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-700' :
                                                            isPenalized ? 'bg-rose-100 text-rose-700' :
                                                                'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {balance <= 0 ? 'Paid' : isPenalized ? 'PENALTY' : (app.payment_status || 'Pending')}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => openPenaltyModal(app)}
                                                            className="text-xs text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors font-medium"
                                                            title="Set manual penalty override"
                                                        >
                                                            {hasManualOverride ? '✏️ Override' : '⚡ Override'}
                                                        </button>
                                                        <button
                                                            onClick={() => openPaymentModal(app)}
                                                            className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-200 transition-colors font-medium disabled:opacity-40"
                                                            disabled={balance <= 0}
                                                        >
                                                            {balance <= 0 ? '✅ Paid' : '+ Payment'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* ─── Manual Penalty Override Modal ──────────────────── */}
            {showPenaltyModal && selectedApp && (() => {
                const overdueDays = daysSinceDue(selectedApp.payment_last_date);
                const isOverdue = overdueDays !== null && overdueDays > 0;
                const autoPenalty = isOverdue && overdueDays > penaltyConfig.grace_days
                    ? Math.max(0, overdueDays - penaltyConfig.grace_days) * penaltyConfig.daily_penalty_amount
                    : 0;
                return (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-1">Penalty Override</h2>
                            <p className="text-xs text-slate-500 mb-4">Override the auto-calculated penalty for <strong>{selectedApp.student_name}</strong></p>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-amber-700 font-medium">Auto-calculated penalty:</span>
                                    <span className="font-bold text-amber-800">₹{autoPenalty.toFixed(2)}</span>
                                </div>
                                {isOverdue && (
                                    <div className="text-xs text-amber-600 mt-1">
                                        {overdueDays}d overdue — grace {penaltyConfig.grace_days}d — {Math.max(0, overdueDays - penaltyConfig.grace_days)}d × ₹{penaltyConfig.daily_penalty_amount}
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleManualPenaltyOverride}>
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Manual Penalty Amount (₹)
                                    </label>
                                    <input
                                        type="number" min="0"
                                        value={penaltyOverride}
                                        onChange={e => setPenaltyOverride(e.target.value)}
                                        placeholder="Leave blank to use auto-calculated"
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-400 outline-none text-sm"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">
                                        Set 0 to clear override and use automatic calculation.
                                    </p>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button type="button" onClick={() => setShowPenaltyModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Cancel</button>
                                    <button type="submit" disabled={penaltySubmitting} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                                        {penaltySubmitting ? 'Saving...' : 'Save Override'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* ─── Add Payment Modal ───────────────────────────────── */}
            {showPaymentModal && selectedApp && (() => {
                const effectivePenalty = selectedApp.penalty_amount > 0
                    ? parseFloat(selectedApp.penalty_amount)
                    : calcPenalty(selectedApp.payment_last_date, penaltyConfig.grace_days, penaltyConfig.daily_penalty_amount, null);
                const totalDue = (parseFloat(selectedApp.fee_total) || 0)
                    - (parseFloat(selectedApp.fee_discount_amount) || 0)
                    + effectivePenalty;
                const alreadyPaid = parseFloat(selectedApp.payment_amount) || 0;
                const remaining = totalDue - alreadyPaid;
                return (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">Record Manual Payment</h2>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 space-y-1 text-sm">
                                <div className="flex justify-between text-slate-600"><span>Total Due (incl. penalty):</span><strong>₹{totalDue.toFixed(2)}</strong></div>
                                <div className="flex justify-between text-indigo-600 font-medium"><span>Already Paid:</span><span>₹{alreadyPaid.toFixed(2)}</span></div>
                                <div className="flex justify-between font-bold text-slate-800 border-t pt-1"><span>Remaining:</span><span>₹{remaining.toFixed(2)}</span></div>
                            </div>
                            <form onSubmit={handleAddPayment} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (₹)</label>
                                    <input type="number" min="1" max={remaining}
                                        value={paymentData.amount}
                                        onChange={e => setPaymentData(p => ({ ...p, amount: e.target.value }))}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" required />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Method</label>
                                        <select value={paymentData.method} onChange={e => setPaymentData(p => ({ ...p, method: e.target.value }))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                                            <option>Cash</option>
                                            <option>Bank Transfer</option>
                                            <option>Cheque</option>
                                            <option>External POS</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                                        <input type="date" value={paymentData.date}
                                            onChange={e => setPaymentData(p => ({ ...p, date: e.target.value }))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Transaction ID (optional)</label>
                                    <input type="text" value={paymentData.transaction_id}
                                        onChange={e => setPaymentData(p => ({ ...p, transaction_id: e.target.value }))}
                                        placeholder="ref / cheque no. / txn ID"
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Cancel</button>
                                    <button type="submit" disabled={paymentSubmitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                                        {paymentSubmitting ? 'Processing...' : 'Record Payment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default StudentFees;
