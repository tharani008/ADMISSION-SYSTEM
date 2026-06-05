import React, { useState, useEffect } from 'react';
import './index.css';

const API_URL = 'https://asia-south1-lasak-c1db5.cloudfunctions.net/api';

function App() {
    const [formData, setFormData] = useState({
        fullName: '',
        dob: '',
        gender: '',
        phone: '',
        email: '',
        address: '',
        aadhar: '',
        pan: '',
        branch: '',
        course: ''
    });

    const [branches, setBranches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetch(`${API_URL}/api/branches`).then(r => r.json()).then(setBranches).catch(console.error);
        fetch(`${API_URL}/api/fees`).then(r => r.json()).then(setCourses).catch(console.error);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                student_name: formData.fullName,
                dob: formData.dob,
                gender: formData.gender,
                phone: formData.phone,
                email: formData.email,
                address: formData.address,
                aadhar_number: formData.aadhar,
                pan_number: formData.pan,
                branch: formData.branch,
                course: formData.course
            };

            const response = await fetch(`${API_URL}/api/applications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to submit');

            alert('Application Submitted Successfully!');
            setFormData({ fullName: '', dob: '', gender: '', phone: '', email: '', address: '', aadhar: '', pan: '', branch: '', course: '' });
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="app-container">
            <div className="form-wrapper">
                <header className="form-header">
                    <h1>Enrollment Application</h1>
                    <p>Please fill out the form below to enroll at Lasak.</p>
                </header>

                <form onSubmit={handleSubmit} className="enrollment-form">
                    {/* Section 1: Personal Information */}
                    <section className="form-section">
                        <div className="section-header">
                            <span className="step-number">1</span>
                            <h2>Personal Information</h2>
                        </div>

                        <div className="form-row full-width">
                            <div className="form-group">
                                <label>Full Name <span className="required">*</span></label>
                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="Enter your full name"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row split">
                            <div className="form-group">
                                <label>Date of Birth <span className="required">*</span></label>
                                <input
                                    type="date"
                                    name="dob"
                                    value={formData.dob}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Gender <span className="required">*</span></label>
                                <div className="select-wrapper">
                                    <select name="gender" value={formData.gender} onChange={handleChange} required>
                                        <option value="" disabled>Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Contact Details */}
                    <section className="form-section">
                        <div className="section-header">
                            <span className="step-number">2</span>
                            <h2>Contact Details</h2>
                        </div>

                        <div className="form-row split">
                            <div className="form-group">
                                <label>Phone Number <span className="required">*</span></label>
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="10-digit number"
                                    pattern="[0-9]{10}"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Email Address <span className="required">*</span></label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row full-width">
                            <div className="form-group">
                                <label>Residential Address <span className="required">*</span></label>
                                <textarea
                                    name="address"
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
                    <section className="form-section">
                        <div className="section-header">
                            <span className="step-number">3</span>
                            <h2>Program & Extra Details</h2>
                        </div>

                        <div className="form-row split">
                            <div className="form-group">
                                <label>Select Branch <span className="required">*</span></label>
                                <div className="select-wrapper">
                                    <select name="branch" value={formData.branch} onChange={handleChange} required>
                                        <option value="" disabled>Choose a branch...</option>
                                        {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Select Course <span className="required">*</span></label>
                                <div className="select-wrapper">
                                    <select name="course" value={formData.course} onChange={handleChange} required>
                                        <option value="" disabled>Choose a course...</option>
                                        {courses.map(c => <option key={c.id} value={c.course_name}>{c.course_name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="form-row split mt-4">
                            <div className="form-group">
                                <label>Aadhar Number <span className="required">*</span></label>
                                <input
                                    type="text"
                                    name="aadhar"
                                    placeholder="12-digit Aadhar number"
                                    pattern="[0-9]{12}"
                                    title="Please enter a valid 12-digit Aadhar number"
                                    value={formData.aadhar}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>PAN Number <span className="required">*</span></label>
                                <input
                                    type="text"
                                    name="pan"
                                    placeholder="e.g. ABCDE1234F"
                                    pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                                    title="Please enter a valid PAN number"
                                    value={formData.pan}
                                    onChange={handleChange}
                                    style={{ textTransform: 'uppercase' }}
                                    required
                                />
                            </div>
                        </div>
                    </section>

                    <div className="form-actions">
                        <button type="submit" className="submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default App;
