import React, { useState, useEffect } from 'react';
import config from '../../config';

const ContentEditor = ({ userRole }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        setLoading(true);
        try {
            // Fetch from our backend API which wraps Firestore
            const response = await fetch(config.API_URL + '/api/content/terms_conditions');
            if (response.ok) {
                const data = await response.json();
                setContent(data.content);
            } else {
                console.error('Failed to fetch content');
            }
        } catch (error) {
            console.error('Error fetching content:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const response = await fetch(config.API_URL + '/api/content/terms_conditions', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Content saved successfully!' });
            } else {
                setMessage({ type: 'error', text: 'Failed to save content.' });
            }
        } catch (error) {
            console.error('Error saving content:', error);
            setMessage({ type: 'error', text: 'An error occurred while saving.' });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (window.confirm('Are you sure you want to reset to the default template? This will lose current changes.')) {
            // Default template (matching the original hardcoded one)
            const defaultContent = `<div className="space-y-6 text-sm leading-relaxed">
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
</div>`;
            setContent(defaultContent);
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Edit Terms & Conditions</h2>

            {message && (
                <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                    Content (HTML/JSX format)
                </label>
                <div className="text-xs text-gray-500 mb-2">
                    Note: Be careful with HTML tags. This content will be rendered on the Terms page.
                </div>
                <textarea
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline font-mono text-sm"
                    rows="20"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={loading || userRole !== 'super_admin'}
                />
            </div>

            <div className="flex items-center justify-between">
                <button
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                    onClick={handleReset}
                    type="button"
                    disabled={saving || loading || userRole !== 'super_admin'}
                >
                    Reset to Default
                </button>
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center disabled:opacity-50"
                    onClick={handleSave}
                    type="button"
                    disabled={saving || loading || userRole !== 'super_admin'}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default ContentEditor;
