
import React, { useRef, useState, useEffect } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
const logo = '/logo.png';
import config from '../config';

const ApplicationPrint = () => {
    const location = useLocation();
    const params = useParams();
    // When using a wildcard route like /print-application/*, the parameter name is "*"
    // If the URL is /print-application/APP/MAI/2026/4546, params["*"] will be "APP/MAI/2026/4546"
    // If the URL is encoded /print-application/APP%2FMAI%2F2026%2F4546, params["*"] might be encoded or decoded depending on router

    // Fallback: try to get ID from standard param or wildcard
    const applicationIdRaw = params.applicationId || params["*"];
    const applicationId = applicationIdRaw ? decodeURIComponent(applicationIdRaw) : null;

    const [application, setApplication] = useState(location.state?.application || null);
    const [loading, setLoading] = useState(!location.state?.application);
    const [error, setError] = useState(null);
    const printRef = useRef();

    useEffect(() => {
        if (!application && applicationId) {
            const fetchApplication = async () => {
                try {
                    // Decode the ID in case it's double encoded, though React Router usually handles one level
                    // If the URL is /print-application/APP%2FMAI%2F2026%2F4546
                    // applicationId will be APP/MAI/2026/4546
                    const decodedId = decodeURIComponent(applicationId);

                    const response = await fetch(`${config.API_URL}/api/applications?application_id=${encodeURIComponent(decodedId)}`);
                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to fetch application');
                    }

                    if (data) {
                        setApplication(data);
                    } else {
                        setError('Application not found');
                    }
                } catch (err) {
                    console.error('Error fetching application:', err);
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };

            fetchApplication();
        }
    }, [applicationId, application]);

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
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Application Not Found</h2>
                    <p className="mt-2 text-gray-600">The application ID "{applicationId}" could not be found.</p>
                    <Link to="/" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">Go Home</Link>
                </div>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8 print:bg-white print:p-0">
            {/* No-Print Header */}
            <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
                <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">&larr; Back to Home</Link>
                <button
                    onClick={handlePrint}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 shadow-sm"
                >
                    Print / Save as PDF
                </button>
            </div>

            {/* Printable Area */}
            <div ref={printRef} className="max-w-4xl mx-auto bg-white p-12 shadow-lg rounded-xl print:shadow-none print:w-full">
                {/* Header */}
                <div className="border-b-2 border-gray-800 pb-6 mb-8 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="Lasak Edu Logo" className="h-16 object-contain" />
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 uppercase tracking-wider">LASAK EDU</h1>
                            <p className="text-sm text-gray-600 mt-1 uppercase tracking-widest">Open For All Learning Needs</p>
                            <p className="text-xs text-gray-500 mt-2">11A, STV Nagar, Nava India Signal, Peelamedu, Coimbatore - 641004</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="border-2 border-dashed border-gray-300 w-32 h-40 flex items-center justify-center bg-gray-50 relative overflow-hidden">
                            {application.photo_url ? (
                                <img src={application.photo_url} alt="Student Photo" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs text-gray-400">Student Photo</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Application Details */}
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 uppercase">Application Details</h2>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <p className="text-gray-500 mb-1">Application ID</p>
                            <p className="font-mono font-bold text-lg text-gray-900">{application.application_id}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 mb-1">Date</p>
                            <p className="font-medium text-gray-900">{new Date(application.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* Student Information */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 uppercase">Student Information</h2>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                        <div className="col-span-2">
                            <p className="text-gray-500 ">Student Name</p>
                            <p className="font-bold text-lg text-gray-900 border-b border-gray-100 pb-1">{application.student_name}</p>
                        </div>


                        <div>
                            <p className="text-gray-500">Phone Number</p>
                            <p className="font-medium text-gray-900 border-b border-gray-100 pb-1">{application.phone}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Email Address</p>
                            <p className="font-medium text-gray-900 border-b border-gray-100 pb-1">{application.email}</p>
                        </div>

                        <div>
                            <p className="text-gray-500">Referral Phone 1</p>
                            <p className="font-medium text-gray-900 border-b border-gray-100 pb-1">{application.referral_phone_1 || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Referral Phone 2</p>
                            <p className="font-medium text-gray-900 border-b border-gray-100 pb-1">{application.referral_phone_2 || 'N/A'}</p>
                        </div>

                        <div>
                            <p className="text-gray-500">Date of Birth</p>
                            <p className="font-medium text-gray-900 border-b border-gray-100 pb-1">{application.dob}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Gender</p>
                            <p className="font-medium text-gray-900 border-b border-gray-100 pb-1">{application.gender}</p>
                        </div>

                        <div className="col-span-2">
                            <p className="text-gray-500">Address</p>
                            <p className="font-medium text-gray-900 border-b border-gray-100 pb-1">{application.address}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-gray-500">College / Company</p>
                            <p className="font-medium text-gray-900 border-b border-gray-100 pb-1">{application.college_company || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Previous School/College</p>
                            <p className="font-medium text-gray-900 border-b border-gray-100 pb-1">{application.previous_school || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Previous Marks/CGPA</p>
                            <p className="font-medium text-gray-900 border-b border-gray-100 pb-1">{application.previous_marks || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Course Details */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 uppercase">Course Details</h2>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <p className="text-gray-500 mb-1">Applied Course</p>
                            <p className="font-bold text-lg text-indigo-900">{application.course}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 mb-1">Payment Type</p>
                            <p className="font-medium text-indigo-700 font-bold">{application.payment_type || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Declaration & Signature */}
                <div className="mt-12 pt-8 border-t-2 border-gray-200">
                    <div className="flex justify-between items-end">
                        <div className="w-1/2">
                            <h3 className="font-bold text-gray-800 mb-2">Declaration</h3>
                            <p className="text-xs text-gray-500 leading-relaxed italic">
                                I hereby declare that I have read the terms and conditions, specifically the No-Refund Policy, and I agree to abide by them.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="h-16 mb-2 flex items-end justify-center">
                                {application.signature_url ? (
                                    <img src={application.signature_url} alt="Signature" className="h-12 object-contain" />
                                ) : (
                                    <span className="text-xs text-gray-300">No Digital Signature</span>
                                )}
                            </div>
                            <p className="text-xs font-bold text-gray-900 uppercase border-t border-gray-400 pt-1 w-40 inline-block">Student Signature</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-xs text-gray-400">
                    <p>Generated by Lasak Edu Admission System</p>
                </div>
            </div>
        </div>
    );
};

export default ApplicationPrint;
