import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import config from '../config';

const TermsAndConditions = () => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const response = await fetch(config.API_URL + '/api/content/terms_conditions');
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.content) {
                        setContent(data.content);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch terms:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, []);

    // Default content as fallback
    const defaultContent = (
        <div className="space-y-6 text-sm leading-relaxed">
            <section>
                <h3 className="font-bold text-base mb-2">1. Fee Structure & Payment:</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>The student agrees to pay the total course fee as specified.</li>
                    <li>All installment payments must be cleared by the specified date of every month.</li>
                    <li>Late payments may result in a temporary suspension of lab access.</li>
                </ul>
            </section>

            <section>
                <h3 className="font-bold text-base mb-2">2. No-Refund Policy:</h3>
                <p className="mb-2"><strong>Please read and initial the following:</strong></p>
                <p>I, the undersigned, understand that the registration and tuition fees paid to Lasak Edu are strictly non-refundable and non-transferable under any circumstances.</p>
                <p className="mt-2 text-gray-600 italic">This includes, but is not limited to:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Withdrawal from the course before or after the start date.</li>
                    <li>Inability to attend classes due to medical issues.</li>
                    <li>Dismissal from the institute due to misconduct.</li>
                </ul>
            </section>

            <section>
                <h3 className="font-bold text-base mb-2">3. Attendance & Certification:</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>A minimum of 80% attendance is required to be eligible for the course completion certificate.</li>
                    <li>Students are responsible for catching up on any missed material. The institute is not obligated to hold extra sessions for individual absences.</li>
                </ul>
            </section>

            <section>
                <h3 className="font-bold text-base mb-2">4. Lab & Software Usage:</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Students must use the CADD software and hardware with care. Any intentional damage to equipment will be the financial responsibility of the student.</li>
                    <li>Unauthorized copying of software or course materials is strictly prohibited.</li>
                </ul>
            </section>

            <section>
                <h3 className="font-bold text-base mb-2">5. Consent & Declaration:</h3>
                <p>I hereby declare that I have read the above terms and conditions, specifically the No-Refund Policy, and I agree to abide by them throughout my tenure at Lasak Edu.</p>
            </section>
        </div>
    );

    return (
        <div className="min-h-screen bg-indigo-50 py-16 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800">
            {/* Header: Centered Large Title above the card */}
            <div className="max-w-4xl mx-auto text-center mb-10">
                <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">Terms & Conditions</h1>
                <p className="mt-4 text-indigo-600 font-medium">Please read these terms carefully before proceeding.</p>
            </div>

            {/* Content Card: White box with content */}
            <div className="max-w-4xl mx-auto bg-white p-12 sm:p-16 shadow-2xl rounded-2xl text-base leading-relaxed text-slate-700">

                {/* School Branding - subtle inside */}
                <div className="mb-8 border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">LASAK EDU</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Open For All Learning Needs</p>
                </div>

                <div className="space-y-12 text-justify leading-loose font-medium text-slate-700">
                    {/* Section 1 */}
                    <section>
                        <h3 className="font-black text-3xl mb-6 text-slate-900 tracking-tight">1. Fee Structure & Payment</h3>
                        <ul className="list-disc pl-6 space-y-3 marker:text-slate-900">
                            <li>The student agrees to pay the total course fee as specified in the enrollment agreement.</li>
                            <li>All installment payments must be cleared by the specified due date of every month to avoid penalties.</li>
                            <li>Late payments may result in a temporary suspension of lab access and other facility privileges.</li>
                        </ul>
                    </section>

                    {/* Section 2 */}
                    <section>
                        <h3 className="font-black text-3xl mb-6 text-slate-900 tracking-tight">2. No-Refund Policy</h3>
                        <div className="bg-slate-50 p-8 rounded-xl border-l-8 border-slate-900">
                            <p className="font-bold mb-4 text-slate-900 text-lg">Please read and acknowledge the following:</p>
                            <p className="mb-4">I, the undersigned, understand and agree that the registration and tuition fees paid to Lasak Edu are strictly non-refundable and non-transferable under any circumstances once paid.</p>
                            <p className="text-base text-slate-700 italic font-semibold mb-3">This policy applies to situations including, but not limited to:</p>
                            <ul className="list-disc pl-6 space-y-2 marker:text-slate-500">
                                <li>Voluntary withdrawal from the course before or after the start date.</li>
                                <li>Inability to attend classes due to personal or medical issues.</li>
                                <li>Dismissal from the institute due to misconduct or violation of rules.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 3 */}
                    <section>
                        <h3 className="font-black text-3xl mb-6 text-slate-900 tracking-tight">3. Attendance & Certification</h3>
                        <ul className="list-disc pl-6 space-y-3 marker:text-slate-900">
                            <li>A minimum of 80% attendance is mandatory to be eligible for the final assessment and course completion certificate.</li>
                            <li>Students are solely responsible for catching up on any missed material. The institute is not obligated to conduct extra sessions for individual absences.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section>
                        <h3 className="font-black text-3xl mb-6 text-slate-900 tracking-tight">4. Lab & Software Usage</h3>
                        <ul className="list-disc pl-6 space-y-3 marker:text-slate-900">
                            <li>Students must use the CADD software and hardware with utmost care. Any intentional damage to equipment will be the sole financial responsibility of the student.</li>
                            <li>Unauthorized copying, distribution, or installation of software or course materials is strictly prohibited and may lead to legal action.</li>
                        </ul>
                    </section>

                    {/* Section 5 */}
                    <section>
                        <h3 className="font-black text-3xl mb-6 text-slate-900 tracking-tight">5. Consent & Declaration</h3>
                        <p className="leading-loose">
                            I hereby declare that I have carefully read and understood the above terms and conditions, specifically the No-Refund Policy, and I unconditionally agree to abide by them throughout my tenure at Lasak Edu.
                        </p>
                    </section>
                </div>
            </div>

            {/* Footer / Back Button - Outside the card */}
            <div className="mt-12 text-center text-slate-500">
                <Link
                    to="/"
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-semibold transition-colors group"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform">
                        <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
                    </svg>
                    Back to Admission Form
                </Link>
                <p className="mt-8 text-xs opacity-60">© {new Date().getFullYear()} Lasak Edu. All Rights Reserved.</p>
            </div>
        </div>
    );
};

export default TermsAndConditions;
