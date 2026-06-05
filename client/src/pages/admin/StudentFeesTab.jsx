import React, { useState, useEffect, useCallback } from 'react';
import config from '../../config';

// ─── Penalty Calculation Helper ───────────────────────────────────────────────
function calcPenalty(lastDate, payDate, graceDays, dailyAmount, manualOverride) {
    if (manualOverride != null && manualOverride > 0) return parseFloat(manualOverride);
    const dueDate = lastDate || payDate;
    if (!dueDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 0;
    const penaltyDays = Math.max(0, diffDays - graceDays);
    return penaltyDays * dailyAmount;
}

function daysSinceDue(lastDate, payDate) {
    const dueDate = lastDate || payDate;
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.floor((today - due) / (1000 * 60 * 60 * 24));
}

const StudentFeesTab = ({ user, initialStatusFilter = 'All', branchFilter = null }) => {
    // Data
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        setStatusFilter(initialStatusFilter);
    }, [initialStatusFilter]);

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

    // ── Fetch Applications ────
    const fetchApplications = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (user && user.role !== 'super_admin' && user.branch_id) {
                params.append('branch_id', user.branch_id);
            }
            if (user && user.role === 'super_admin' && branchFilter) {
                params.append('branch', branchFilter);
            }
            let url = `${config.API_URL}/api/applications`;
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const res = await fetch(url);
            if (!res.ok) {
                setFetchError(`HTTP ${res.status}: ${res.statusText}`);
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                setApplications(data);
                setFetchError(null);
            } else if (data && data.error) {
                setFetchError(`API Error: ${data.error}`);
            } else {
                setFetchError('Unexpected response format');
            }
        } catch (err) {
            setFetchError(`Network error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [user?.branch_id, user?.role, branchFilter]);

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
        fetchApplications();
        fetchPenaltyConfig();
    }, [fetchApplications, fetchPenaltyConfig]);

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
                setApplications(prev => prev.map(a =>
                    a.id === selectedApp.id ? { ...a, penalty_amount: value ?? 0 } : a
                ));
                setShowPenaltyModal(false);
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
                selectedApp.payment_date,
                penaltyConfig.grace_days,
                penaltyConfig.daily_penalty_amount,
                selectedApp.penalty_amount
            );
            const finalFee = (parseFloat(selectedApp.fee_total) || 0)
                - (parseFloat(selectedApp.fee_discount_amount) || 0)
                + penalty;

            const payment_status = newTotalPaid >= finalFee ? 'Paid' : 'Partial';

            // Handle due date advancement for EMI/Installments
            let nextDueDate = selectedApp.payment_last_date;
            if (payment_status === 'Partial' && ['Installment', 'EMI', 'Bajaj', 'Flashaid', 'Fibe'].includes(selectedApp.payment_type)) {
                const currentDue = new Date(selectedApp.payment_last_date || new Date());
                currentDue.setDate(currentDue.getDate() + 30);
                nextDueDate = currentDue.toISOString().split('T')[0];
            }

            const res = await fetch(`${config.API_URL}/api/applications/${selectedApp.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...selectedApp,
                    payment_amount: newTotalPaid,
                    payment_method: paymentData.method,
                    payment_transaction_id: paymentData.transaction_id,
                    payment_date: paymentData.date,
                    payment_status,
                    payment_last_date: nextDueDate
                })
            });
            if (res.ok) {
                await fetchApplications();
                setShowPaymentModal(false);
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setPaymentSubmitting(false);
        }
    };

    const openPenaltyModal = (app) => {
        setSelectedApp(app);
        setPenaltyOverride(app.penalty_amount > 0 ? String(app.penalty_amount) : '');
        setShowPenaltyModal(true);
    };

    const openPaymentModal = (app) => {
        setSelectedApp(app);
        setPaymentData({ amount: 0, method: 'Cash', transaction_id: '', date: new Date().toISOString().split('T')[0] });
        setShowPaymentModal(true);
    };

    // ── Filter ──
    const filteredApps = applications.filter(app => {
        const matchesSearch =
            (app.student_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (app.application_id?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (app.phone?.includes(searchTerm));
        const computedPenalty = calcPenalty(
            app.payment_last_date,
            app.payment_date,
            penaltyConfig.grace_days,
            penaltyConfig.daily_penalty_amount,
            app.penalty_amount > 0 ? app.penalty_amount : null
        );
        const finalFee = (parseFloat(app.fee_total) || 0) - (parseFloat(app.fee_discount_amount) || 0) + computedPenalty;
        const balance = finalFee - (parseFloat(app.payment_amount) || 0);
        const effectiveStatus = app.payment_status === 'Paid' ? 'Paid' : (balance <= 0 ? 'Paid' : (app.payment_status || 'Pending'));

        let matchesStatus = statusFilter === 'All' || effectiveStatus === statusFilter;
        if (statusFilter === 'Overdue') {
            const days = daysSinceDue(app.payment_last_date, app.payment_date);
            matchesStatus = days !== null && days > 0 && effectiveStatus !== 'Paid';
        }

        let matchesDate = true;
        if (startDate || endDate) {
            const payDateStr = app.payment_date;
            if (!payDateStr) {
                matchesDate = false; // Cannot match date if no payment date exists
            } else {
                const payDate = new Date(payDateStr);
                payDate.setHours(0, 0, 0, 0);

                if (startDate) {
                    const sDate = new Date(startDate);
                    sDate.setHours(0, 0, 0, 0);
                    if (payDate < sDate) matchesDate = false;
                }
                if (endDate) {
                    const eDate = new Date(endDate);
                    eDate.setHours(0, 0, 0, 0);
                    if (payDate > eDate) matchesDate = false;
                }
            }
        }

        return matchesSearch && matchesStatus && matchesDate;
    });

    const lateCount = applications.filter(app => {
        const days = daysSinceDue(app.payment_last_date, app.payment_date);
        return days !== null && days > 0 && days <= penaltyConfig.grace_days && app.payment_status !== 'Paid';
    }).length;

    const penaltyEligibleCount = applications.filter(app => {
        const days = daysSinceDue(app.payment_last_date, app.payment_date);
        return days !== null && days > penaltyConfig.grace_days && app.payment_status !== 'Paid';
    }).length;

    const filteredTotalFees = filteredApps.reduce((sum, app) => {
        const computedPenalty = calcPenalty(
            app.payment_last_date,
            app.payment_date,
            penaltyConfig.grace_days,
            penaltyConfig.daily_penalty_amount,
            app.penalty_amount > 0 ? app.penalty_amount : null
        );
        return sum + (parseFloat(app.fee_total) || 0) - (parseFloat(app.fee_discount_amount) || 0) + computedPenalty;
    }, 0);

    const filteredTotalPaid = filteredApps.reduce((sum, app) => sum + (parseFloat(app.payment_amount) || 0), 0);


    return (
        <div className="space-y-6">
            {/* ─── Penalty Config Panel ─────────────────────────── */}
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-amber-50 border-b border-amber-200">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="font-bold text-amber-800 text-sm">Penalty Configuration</h3>
                        <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Global</span>
                    </div>
                    {!configEditing ? (
                        user?.role === 'super_admin' && (
                            <button
                                onClick={() => { setConfigDraft(penaltyConfig); setConfigEditing(true); }}
                                className="text-xs text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Edit
                            </button>
                        )
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
                                    <p className="text-xs text-slate-500 font-medium">Overdue Summary</p>
                                    <p className="text-lg font-bold text-orange-600">{lateCount} Late + {penaltyEligibleCount} Penalized</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Filters ──────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-col xl:flex-row items-start xl:items-center gap-3 w-full sm:w-auto">
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
                            <option value="All">All Payments</option>
                            <option value="Pending">Pending</option>
                            <option value="Partial">Partial</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Paid">Paid</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-500 whitespace-nowrap hidden md:inline">Payment Date:</span>
                        <input
                            type="date"
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-600"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                        <span className="text-slate-400">to</span>
                        <input
                            type="date"
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-600"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="text-xs text-rose-500 hover:text-rose-700 font-medium px-2 py-1 bg-rose-50 hover:bg-rose-100 rounded transition-colors whitespace-nowrap"
                            >
                                Clear Dates
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-1 ml-auto whitespace-nowrap mt-3 sm:mt-0 w-full sm:w-auto">
                    <p className="text-sm text-slate-500">Showing <strong>{filteredApps.length}</strong> students</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                        <div className="bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-100 flex flex-col items-start sm:items-end shadow-sm">
                            <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Total Enrollment Fees</span>
                            <span className="text-sm font-bold text-slate-800">₹{filteredTotalFees.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 flex flex-col items-start sm:items-end shadow-sm">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Collected Revenue</span>
                            <span className="text-sm font-bold text-slate-800">₹{filteredTotalPaid.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Error Banner ─────────────────────────────────── */}
            {fetchError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-800">
                    <svg className="w-6 h-6 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="font-bold text-sm">Data Loading Error</p>
                        <p className="text-xs opacity-80">{fetchError}</p>
                    </div>
                    <button onClick={() => fetchApplications()} className="ml-auto bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">Retry</button>
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
                                const overdueDays = daysSinceDue(app.payment_last_date, app.payment_date);
                                const isOverdue = overdueDays !== null && overdueDays > 0 && app.payment_status !== 'Paid';
                                const isPenalized = isOverdue && overdueDays > penaltyConfig.grace_days;

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
                                        <td className="px-4 py-4">
                                            <div className="text-xs font-bold text-indigo-600">{app.application_id || 'N/A'}</div>
                                            <div className="text-sm font-semibold text-slate-800">{app.student_name}</div>
                                            <div className="text-xs text-slate-500">{app.course}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-xs text-slate-600 mb-1">
                                                Due: <span className="font-medium">{(app.payment_last_date || app.payment_date) ? new Date(app.payment_last_date || app.payment_date).toLocaleDateString('en-IN') : 'N/A'}</span>
                                            </div>
                                            {isOverdue && (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${isPenalized ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {overdueDays}d overdue
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="space-y-0.5 min-w-[160px]">
                                                <div className="flex justify-between text-xs text-slate-600"><span>Fee:</span><span>₹{totalFee.toFixed(2)}</span></div>
                                                {effectivePenalty > 0 && <div className="flex justify-between text-xs text-rose-600"><span>Penalty:</span><span>+₹{effectivePenalty.toFixed(2)}</span></div>}
                                                <div className="flex justify-between text-xs font-bold text-slate-800 border-t pt-1 mt-1"><span>Total:</span><span>₹{finalFee.toFixed(2)}</span></div>
                                                <div className={`flex justify-between text-xs font-bold border-t pt-1 ${balance > 0 ? 'text-rose-700' : 'text-green-600'}`}>
                                                    <span>Balance:</span><span>₹{balance.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-full ${balance <= 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {balance <= 0 ? 'Paid' : (app.payment_status || 'Pending')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                {user?.role === 'super_admin' && (
                                                    <button onClick={() => openPenaltyModal(app)} className="text-xs text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors font-medium">Override</button>
                                                )}
                                                <button onClick={() => openPaymentModal(app)} disabled={balance <= 0} className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-200 transition-colors font-medium">+ Payment</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {showPenaltyModal && selectedApp && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Penalty Override</h2>
                        <form onSubmit={handleManualPenaltyOverride}>
                            <input type="number" value={penaltyOverride} onChange={e => setPenaltyOverride(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-4 text-sm" placeholder="Penalty Amount" />
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowPenaltyModal(false)} className="px-4 py-2 bg-slate-100 rounded-lg text-sm">Cancel</button>
                                <button type="submit" disabled={penaltySubmitting} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm">{penaltySubmitting ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showPaymentModal && selectedApp && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Record Payment</h2>
                        <form onSubmit={handleAddPayment} className="space-y-4">
                            <input type="number" value={paymentData.amount} onChange={e => setPaymentData(p => ({ ...p, amount: e.target.value }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Amount" required />
                            <select value={paymentData.method} onChange={e => setPaymentData(p => ({ ...p, method: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                <option>Cash</option>
                                <option>Bank Transfer</option>
                            </select>
                            <input type="date" value={paymentData.date} onChange={e => setPaymentData(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" required />
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 bg-slate-100 rounded-lg text-sm">Cancel</button>
                                <button type="submit" disabled={paymentSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentFeesTab;
