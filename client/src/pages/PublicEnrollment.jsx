import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PublicEnrollment.css';
import config from '../config';

function PublicEnrollment() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        student_name: '',
        dob: '',
        gender: '',
        phone: '',
        email: '',
        address: '',
        aadhar_number: '',
        pan_number: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const payload = {
            ...formData,
            branch: 'Main',
            course: 'General Enrollment', // Default course mapping
            status: 'New',
            payment_mode: 'Online' // Default fallback
        };

        try {
            const response = await fetch(config.API_URL + '/api/applications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const contentType = response.headers.get('content-type') || '';
            const rawText = await response.text();
            const data = contentType.includes('application/json')
                ? JSON.parse(rawText || '{}')
                : { error: rawText };

            if (!response.ok) {
                const message = contentType.includes('application/json')
                    ? (data.error || 'Submission failed')
                    : 'API returned HTML/text instead of JSON. Check production API base URL.';
                throw new Error(message);
            }

            alert('Application Submitted Successfully!');
            setFormData({
                student_name: '', dob: '', gender: '', phone: '', email: '',
                address: '', aadhar_number: '', pan_number: ''
            });
            // Optionally redirect
            // navigate('/success', { state: { application: data.application } });

        } catch (err) {
            console.error('Submission failed:', err);
            setError(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pe-app-container">
            <div className="pe-form-wrapper">
                <header className="pe-form-header">
                    <h1>Enrollment Application</h1>
                    <p>Please fill out the form below to enroll at Lasak.</p>
                </header>

                {error && (
                    <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '0.375rem', marginBottom: '1.5rem', border: '1px solid #f87171' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="pe-enrollment-form">
                    {/* Section 1: Personal Information */}
                    <section className="pe-form-section">
                        <div className="pe-section-header">
                            <span className="pe-step-number">1</span>
                            <h2>Personal Information</h2>
                        </div>

                        <div className="pe-form-row full-width">
                            <div className="pe-form-group">
                                <label>Full Name <span className="pe-required">*</span></label>
                                <input
                                    type="text"
                                    name="student_name"
                                    className="pe-input"
                                    placeholder="Enter your full name"
                                    value={formData.student_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="pe-form-row split">
                            <div className="pe-form-group">
                                <label>Date of Birth <span className="pe-required">*</span></label>
                                <input
                                    type="date"
                                    name="dob"
                                    className="pe-input"
                                    value={formData.dob}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="pe-form-group">
                                <label>Gender <span className="pe-required">*</span></label>
                                <div className="pe-select-wrapper">
                                    <select name="gender" className="pe-select" value={formData.gender} onChange={handleChange} required>
                                        <option value="" disabled>Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Contact Details */}
                    <section className="pe-form-section">
                        <div className="pe-section-header">
                            <span className="pe-step-number">2</span>
                            <h2>Contact Details</h2>
                        </div>

                        <div className="pe-form-row split">
                            <div className="pe-form-group">
                                <label>Phone Number <span className="pe-required">*</span></label>
                                <input
                                    type="tel"
                                    name="phone"
                                    className="pe-input"
                                    placeholder="10-digit number"
                                    pattern="[0-9]{10}"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="pe-form-group">
                                <label>Email Address <span className="pe-required">*</span></label>
                                <input
                                    type="email"
                                    name="email"
                                    className="pe-input"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="pe-form-row full-width">
                            <div className="pe-form-group">
                                <label>Residential Address <span className="pe-required">*</span></label>
                                <textarea
                                    name="address"
                                    className="pe-textarea"
                                    placeholder="Full street address and city"
                                    rows="3"
                                    value={formData.address}
                                    onChange={handleChange}
                                    required
                                ></textarea>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Extra Details */}
                    <section className="pe-form-section">
                        <div className="pe-section-header">
                            <span className="pe-step-number">3</span>
                            <h2>Extra Details</h2>
                        </div>

                        <div className="pe-form-row split">
                            <div className="pe-form-group">
                                <label>Aadhar Number <span className="pe-required">*</span></label>
                                <input
                                    type="text"
                                    name="aadhar_number"
                                    className="pe-input"
                                    placeholder="12-digit Aadhar number"
                                    pattern="[0-9]{12}"
                                    title="Please enter a valid 12-digit Aadhar number"
                                    value={formData.aadhar_number}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="pe-form-group">
                                <label>PAN Number <span className="pe-required">*</span></label>
                                <input
                                    type="text"
                                    name="pan_number"
                                    className="pe-input"
                                    placeholder="e.g. ABCDE1234F"
                                    pattern="[a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}"
                                    title="Please enter a valid PAN number"
                                    value={formData.pan_number}
                                    onChange={handleChange}
                                    style={{ textTransform: 'uppercase' }}
                                    required
                                />
                            </div>
                        </div>
                    </section>

                    <div className="pe-form-actions">
                        <button type="submit" className="pe-submit-btn" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default PublicEnrollment;
