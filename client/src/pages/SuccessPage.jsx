
import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import config from '../config';

const SuccessPage = () => {
    const location = useLocation();
    const [application, setApplication] = useState(location.state?.application || null);
    const [loading, setLoading] = useState(!location.state?.application);
    const [error, setError] = useState(null);

    const searchParams = new URLSearchParams(location.search || '');
    const applicationId = searchParams.get('application_id');

    useEffect(() => {
        // 1) Try sessionStorage (survives refresh)
        if (!application) {
            try {
                const raw = sessionStorage.getItem('lastApplication');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (!applicationId || parsed?.application_id === applicationId) {
                        setApplication(parsed);
                        setLoading(false);
                        return;
                    }
                }
            } catch { }
        }

        // 2) If we have an ID, fetch from API (works even if user opens /success directly)
        if (!application && applicationId) {
            (async () => {
                setLoading(true);
                setError(null);
                try {
                    const res = await fetch(`${config.API_URL}/api/applications?application_id=${encodeURIComponent(applicationId)}`);
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to fetch application');
                    setApplication(data);
                    try { sessionStorage.setItem('lastApplication', JSON.stringify(data)); } catch { }
                } catch (e) {
                    setError(e?.message || 'Failed to load application');
                } finally {
                    setLoading(false);
                }
            })();
        } else if (!application) {
            setLoading(false);
        }
    }, [application, applicationId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading application details...</p>
                </div>
            </div>
        );
    }

    if (error || !application) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold text-gray-900">No Application Found</h2>
                    {error && <p className="mt-2 text-gray-600">{error}</p>}
                    <Link to="/" className="mt-4 text-indigo-600 hover:text-indigo-500">Go Back</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg text-center">
                <div className="rounded-full bg-green-100 p-4 w-20 h-20 mx-auto flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                    Application Submitted!
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    Your application has been successfully received.
                </p>

                <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors cursor-pointer group">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Application ID (Click to View/Print)</p>
                    <Link
                        to="/print-application"
                        state={{ application }}
                        className="mt-2 text-2xl font-mono font-bold text-indigo-600 tracking-wider block group-hover:text-indigo-800"
                    >
                        {application.application_id}
                    </Link>
                </div>

                <div className="mt-6">
                    <p className="text-gray-600 mb-8">
                        Your application has been submitted successfully.
                        <br />
                        Please keep this ID for future reference.
                    </p>

                    <div className="space-x-4">
                        <Link to="/" className="inline-block px-6 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Back to Home
                        </Link>
                        <Link
                            to={`/print-application/${encodeURIComponent(application.application_id)}`}
                            className="inline-block px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Download / Print
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuccessPage;
