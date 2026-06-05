
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
const logo = '/logo.png';
import config from '../config';

const AdmissionForm = () => {
    const navigate = useNavigate();
    const MAX_FILE_SIZE = 512000; // 500KB in bytes

    const [formData, setFormData] = useState({
        student_name: '',
        phone: '',
        email: '',
        address: '',
        dob: '',
        gender: '',
        college_company: '',
        course: '',
        course_start_date: '',
        course_end_date: '',
        photo: null,
        signature: null,
        id_proof: null,
        marksheet_10th: null,
        marksheet_12th: null,
        marksheet_degree: null,
        // Scholarship fields
        marks_10th: '',
        marks_12th: '',
        marks_ug: '',
        // Referral fields
        referral1_name: '',
        referral1_email: '',
        referral1_contact_no: '',
        referral1_occupation: '',
        referral2_name: '',
        referral2_email: '',
        referral2_contact_no: '',
        referral2_occupation: '',
        previous_school: '',
        previous_marks: '',
        payment_mode: 'Online', // Default to Online
        payment_type: '',
        installments_count: ''
    });
    const [agreed, setAgreed] = useState(false);
    const [uploadLater, setUploadLater] = useState({
        photo: false,
        signature: false,
        id_proof: false,
        marksheet_10th: false,
        marksheet_12th: false,
        marksheet_degree: false
    });
    const [paymentScreenshot, setPaymentScreenshot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleUploadLaterChange = (field) => (e) => {
        const isChecked = e.target.checked;
        setUploadLater(prev => ({
            ...prev,
            [field]: isChecked
        }));

        if (isChecked) {
            setFormData(prev => ({
                ...prev,
                [field]: null
            }));
        }
    };





    const [feeData, setFeeData] = useState([]);
    const [selectedFee, setSelectedFee] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isScholarship, setIsScholarship] = useState(false);
    const [scholarshipPercent, setScholarshipPercent] = useState(0);
    const [showScholarshipForm, setShowScholarshipForm] = useState(false);
    const [scholarshipData, setScholarshipData] = useState(null);

    React.useEffect(() => {
        // Fetch fee structures on load
        const fetchFees = async () => {
            try {
                const response = await fetch(config.API_URL + '/api/fees');
                if (response.ok) {
                    const data = await response.json();
                    setFeeData(data);
                }
            } catch (err) {
                console.error("Failed to fetch fees", err);
            }
        };
        fetchFees();
    }, []);

    const handleChange = (e) => {
        if (e.target.type === 'file') {
            const file = e.target.files[0];

            // Check if it's a marksheet field and validate size
            if (['marksheet_10th', 'marksheet_12th', 'marksheet_degree'].includes(e.target.name)) {
                if (file && file.size > MAX_FILE_SIZE) {
                    setError(`${e.target.name.replace('marksheet_', '').replace('_', ' ').toUpperCase()} marksheet file size must be less than 500KB. Current size: ${(file.size / 1024).toFixed(2)}KB`);
                    e.target.value = ''; // Clear the input
                    return;
                }
            }

            setFormData({
                ...formData,
                [e.target.name]: file
            });
            setError(null); // Clear any previous errors
        } else {
            let additionalFields = {};
            if (e.target.name === 'payment_type') {
                additionalFields.installments_count = '';
            }
            setFormData({
                ...formData,
                [e.target.name]: e.target.value,
                ...additionalFields
            });

            // If course selection changes, update selectedFee
            if (e.target.name === 'course') {
                const fee = feeData.find(f => f.course_name === e.target.value);
                setSelectedFee(fee || null);
            }
        }
    };

    const handleScholarshipCalculation = async () => {
        // Validate marks input
        if (!formData.marks_10th || !formData.marks_12th) {
            setError('Please enter 10th and 12th marks to calculate scholarship');
            return;
        }

        if (formData.marks_10th < 0 || formData.marks_10th > 100 ||
            formData.marks_12th < 0 || formData.marks_12th > 100) {
            setError('Marks must be between 0 and 100');
            return;
        }

        if (formData.marks_ug && (formData.marks_ug < 0 || formData.marks_ug > 100)) {
            setError('UG marks must be between 0 and 100');
            return;
        }

        if (!formData.course) {
            setError('Please select a course first');
            return;
        }

        try {
            const response = await fetch(config.API_URL + '/api/fees/calculate-scholarship', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    course: formData.course,
                    marks_10th: formData.marks_10th,
                    marks_12th: formData.marks_12th,
                    marks_ug: formData.marks_ug || null
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to calculate scholarship');
            }

            setScholarshipData(data);
            setIsScholarship(data.isEligible);
            setScholarshipPercent(data.scholarshipPercent);
            setError(null);
            setShowScholarshipForm(false);
        } catch (err) {
            setError(err.message);
        }
    };


    const uploadFile = async (file, path) => {
        if (!file) return null;

        console.log(`Uploading file: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);

        const fileExt = file.name.split('.').pop();
        const fileName = `documents/${path}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        try {
            const storageRef = ref(storage, fileName);
            const snapshot = await uploadBytes(storageRef, file);
            console.log(`File uploaded successfully: ${fileName}`);

            const publicUrl = await getDownloadURL(snapshot.ref);
            console.log(`Public URL generated: ${publicUrl}`);
            return publicUrl;
        } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Phone validation (10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(formData.phone)) {
            newErrors.phone = "Please enter a valid 10-digit phone number.";
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            newErrors.email = "Please enter a valid email address.";
        }



        // Detailed Referral 1 Validation
        if (formData.referral1_email && !emailRegex.test(formData.referral1_email)) {
            newErrors.referral1_email = "Please enter a valid email for Referrer 1.";
        }
        if (formData.referral1_contact_no && !phoneRegex.test(formData.referral1_contact_no)) {
            newErrors.referral1_contact_no = "Please enter a valid 10-digit contact for Referrer 1.";
        }

        // Detailed Referral 2 Validation
        if (formData.referral2_email && !emailRegex.test(formData.referral2_email)) {
            newErrors.referral2_email = "Please enter a valid email for Referrer 2.";
        }
        if (formData.referral2_contact_no && !phoneRegex.test(formData.referral2_contact_no)) {
            newErrors.referral2_contact_no = "Please enter a valid 10-digit contact for Referrer 2.";
        }

        if (!agreed) {
            newErrors.terms = "You must agree to the Terms and Conditions.";
        }

        return newErrors;
    };

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const submitApplication = async (payload) => {
        try {
            console.log('Submitting payload:', payload);
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

            // Persist for refresh/navigation safety, then redirect with ID in URL.
            try {
                sessionStorage.setItem('lastApplication', JSON.stringify(data.application));
            } catch { }
            const appId = data?.application?.application_id;
            const successUrl = appId ? `/success?application_id=${encodeURIComponent(appId)}` : '/success';
            navigate(successUrl, { state: { application: data.application } });
        } catch (err) {
            console.error('Submission failed:', err);
            setError(`Submission issue: ${err.message}`);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) {
            // Display the first error found
            const firstError = Object.values(formErrors)[0];
            setError(firstError);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Upload files first
            const photoUrl = await uploadFile(formData.photo, 'photos');
            const signatureUrl = await uploadFile(formData.signature, 'signatures');
            const idProofUrl = await uploadFile(formData.id_proof, 'id_proofs');
            const marksheet10thUrl = await uploadFile(formData.marksheet_10th, 'marksheet_10th');
            const marksheet12thUrl = await uploadFile(formData.marksheet_12th, 'marksheet_12th');
            const marksheetDegreeUrl = await uploadFile(formData.marksheet_degree, 'marksheet_degree');

            // Upload payment screenshot if Already Paid
            let paymentScreenshotUrl = null;
            if (formData.payment_mode === 'AlreadyPaid' && paymentScreenshot) {
                paymentScreenshotUrl = await uploadFile(paymentScreenshot, 'payment_screenshots');
            }

            let initialGraceDays = 7;
            if (formData.payment_mode === 'Online' && ['Installment', 'EMI', 'Bajaj', 'Flashaid', 'Fibe'].includes(formData.payment_type)) {
                initialGraceDays = 30;
            }

            const lastDate = new Date();
            lastDate.setDate(lastDate.getDate() + initialGraceDays);

            const payload = {
                ...formData,
                photo_url: photoUrl,
                signature_url: signatureUrl,
                id_proof_url: idProofUrl,
                marksheet_10th_url: marksheet10thUrl,
                marksheet_12th_url: marksheet12thUrl,
                marksheet_degree_url: marksheetDegreeUrl,
                payment_screenshot_url: paymentScreenshotUrl,
                payment_last_date: lastDate.toISOString().split('T')[0]
            };

            // Backend requires `branch` for application creation. The public admission form
            // doesn't collect it, so default to the main branch.
            if (!payload.branch) payload.branch = 'Main';

            // Add Fee Snapshot if available
            if (selectedFee) {
                const total = Number(selectedFee.total_fee);
                let effectiveTotal = total;
                let discountAmount = 0;

                // Apply scholarship if applicable
                if (isScholarship && scholarshipPercent > 0) {
                    discountAmount = (total * scholarshipPercent) / 100;
                    effectiveTotal = total - discountAmount;
                }

                const gstAmount = (effectiveTotal * Number(selectedFee.gst_percent)) / 100;
                const netAmount = effectiveTotal - gstAmount;

                payload.fee_total = total;
                payload.fee_gst_amount = gstAmount;
                payload.fee_main_branch_amount = (netAmount * Number(selectedFee.main_branch_percent)) / 100;
                payload.fee_franchise_branch_amount = (netAmount * Number(selectedFee.franchise_branch_percent)) / 100;

                // Add scholarship data
                payload.is_scholarship = isScholarship;
                payload.scholarship_percent = scholarshipPercent;
                payload.fee_discount_amount = discountAmount;

                if (scholarshipData) {
                    payload.marks_average = scholarshipData.average;
                    payload.scholarship_category = scholarshipData.category;
                }
            }

            // Remove file objects from payload
            delete payload.photo;
            delete payload.signature;
            delete payload.id_proof;
            delete payload.marksheet_10th;
            delete payload.marksheet_12th;
            delete payload.marksheet_degree;

            // Handle Payment Flow
            let finalAmount = 0;
            if (selectedFee) {
                const total = Number(payload.fee_total || 0);
                const discount = Number(payload.fee_discount_amount || 0);
                const payableAmount = total - discount;

                // If it's a divided payment method, we should only charge the first month/installment
                if (['Installment', 'EMI', 'Bajaj', 'Flashaid', 'Fibe'].includes(formData.payment_type) && formData.installments_count && !isNaN(formData.installments_count) && Number(formData.installments_count) > 0) {
                    finalAmount = payableAmount / Number(formData.installments_count);
                } else {
                    finalAmount = payableAmount;
                }

                // Keep to 2 decimal places to avoid Razorpay precision issues, then convert to Number
                finalAmount = Number(finalAmount.toFixed(2));
            }

            if (finalAmount > 0 && formData.payment_mode === 'Online') {
                const isLoaded = await loadRazorpayScript();
                if (!isLoaded) {
                    setError('Razorpay SDK failed to load. Are you online?');
                    setLoading(false);
                    return;
                }

                // Create Order on Backend
                const orderRes = await fetch(config.API_URL + '/api/payments/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: finalAmount, receipt: `adm_${Date.now()}` })
                });

                const order = await orderRes.json();
                if (!orderRes.ok) {
                    console.error('Order creation failed:', order);
                    throw new Error(order.error || 'Failed to initialize payment');
                }

                // Open Razorpay Checkout
                const options = {
                    key: config.RAZORPAY_KEY_ID,
                    amount: order.amount,
                    currency: order.currency,
                    name: "Lasak Techno Institute",
                    description: `Admission Fee for ${formData.course}`,
                    order_id: order.id,
                    handler: async (response) => {
                        // Verify Payment on Backend
                        const verifyRes = await fetch(config.API_URL + '/api/payments/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(response)
                        });

                        const verifyData = await verifyRes.json();

                        if (verifyRes.ok) {
                            // Payment Successful, finalize application
                            payload.payment_status = 'Paid';
                            payload.payment_transaction_id = response.razorpay_payment_id;
                            payload.payment_method = 'Razorpay';
                            payload.payment_date = new Date().toISOString();
                            payload.payment_amount = finalAmount;

                            await submitApplication(payload);
                        } else {
                            setError('Payment verification failed. Please contact support.');
                            setLoading(false);
                        }
                    },
                    prefill: {
                        name: formData.student_name,
                        email: formData.email,
                        contact: formData.phone,
                    },
                    theme: { color: "#4f46e5" },
                    modal: {
                        ondismiss: () => {
                            setLoading(false);
                        }
                    }
                };

                const rzp = new window.Razorpay(options);
                rzp.open();
            } else {
                // No fee or amount is 0, just submit
                await submitApplication(payload);
            }

        } catch (err) {
            console.error('Submit process error:', err);
            setError(`Error: ${err.message}`);
            setLoading(false);
        }
    };



    return (
        <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-2 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white p-4 sm:p-6 md:p-10 rounded-2xl shadow-xl">
                <div className="text-center mb-10">
                    <img src={logo} alt="Lasak Edu Logo" className="h-24 mx-auto mb-4 object-contain" />
                    <h1 className="text-4xl font-extrabold text-indigo-900 tracking-tight uppercase">
                        LASAK EDU
                    </h1>
                    <p className="mt-2 text-lg text-gray-600 font-medium tracking-wide uppercase">
                        OPEN FOR ALL LEARNING NEEDS
                    </p>
                    <p className="mt-4 text-base text-gray-500">
                        Student Admission Form
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Personal Information Section */}
                    <div className="bg-gray-50 p-3 sm:p-6 rounded-xl border border-gray-100">
                        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                            Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="md:col-span-2">
                                <label htmlFor="student_name" className="block text-sm font-semibold text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                                <input
                                    id="student_name"
                                    name="student_name"
                                    type="text"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ease-in-out"
                                    placeholder="Enter your full name"
                                    value={formData.student_name}
                                    onChange={handleChange}
                                />
                            </div>


                            <div>
                                <label htmlFor="dob" className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth <span className="text-red-500">*</span></label>
                                <input
                                    id="dob"
                                    name="dob"
                                    type="date"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    value={formData.dob}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 mb-2">Gender <span className="text-red-500">*</span></label>
                                <select
                                    id="gender"
                                    name="gender"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                    value={formData.gender}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information Section */}
                    <div className="bg-gray-50 p-3 sm:p-6 rounded-xl border border-gray-100">
                        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                            Contact Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div>
                                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="10-digit number"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">Residential Address <span className="text-red-500">*</span></label>
                                <textarea
                                    id="address"
                                    name="address"
                                    required
                                    rows="3"
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Full street address and city"
                                    value={formData.address}
                                    onChange={handleChange}
                                />
                            </div>

                        </div>
                    </div>

                    {/* Referral Details Section */}
                    <div className="bg-gray-50 p-3 sm:p-6 rounded-xl border border-gray-100">
                        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">3</span>
                            Referral Details
                        </h3>

                        {/* Referrer 1 */}
                        <h4 className="font-semibold text-gray-700 mb-4 border-b pb-2">Referrer 1</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label htmlFor="referral1_name" className="block text-sm font-semibold text-gray-700 mb-2">Name <span className="text-red-500">*</span></label>
                                <input
                                    id="referral1_name"
                                    name="referral1_name"
                                    type="text"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Name of Referrer 1"
                                    value={formData.referral1_name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="referral1_email" className="block text-sm font-semibold text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                                <input
                                    id="referral1_email"
                                    name="referral1_email"
                                    type="email"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="referrer1@example.com"
                                    value={formData.referral1_email}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="referral1_contact_no" className="block text-sm font-semibold text-gray-700 mb-2">Contact No <span className="text-red-500">*</span></label>
                                <input
                                    id="referral1_contact_no"
                                    name="referral1_contact_no"
                                    type="tel"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="10-digit number"
                                    value={formData.referral1_contact_no}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="referral1_occupation" className="block text-sm font-semibold text-gray-700 mb-2">Occupation <span className="text-red-500">*</span></label>
                                <input
                                    id="referral1_occupation"
                                    name="referral1_occupation"
                                    type="text"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g. Teacher"
                                    value={formData.referral1_occupation}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Referrer 2 */}
                        <h4 className="font-semibold text-gray-700 mb-4 border-b pb-2">Referrer 2</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div>
                                <label htmlFor="referral2_name" className="block text-sm font-semibold text-gray-700 mb-2">Name <span className="text-red-500">*</span></label>
                                <input
                                    id="referral2_name"
                                    name="referral2_name"
                                    type="text"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Name of Referrer 2"
                                    value={formData.referral2_name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="referral2_email" className="block text-sm font-semibold text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                                <input
                                    id="referral2_email"
                                    name="referral2_email"
                                    type="email"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="referrer2@example.com"
                                    value={formData.referral2_email}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="referral2_contact_no" className="block text-sm font-semibold text-gray-700 mb-2">Contact No <span className="text-red-500">*</span></label>
                                <input
                                    id="referral2_contact_no"
                                    name="referral2_contact_no"
                                    type="tel"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="10-digit number"
                                    value={formData.referral2_contact_no}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="referral2_occupation" className="block text-sm font-semibold text-gray-700 mb-2">Occupation <span className="text-red-500">*</span></label>
                                <input
                                    id="referral2_occupation"
                                    name="referral2_occupation"
                                    type="text"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g. Alumni"
                                    value={formData.referral2_occupation}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Academic & Professional Section */}
                    <div className="bg-gray-50 p-3 sm:p-6 rounded-xl border border-gray-100">
                        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">4</span>
                            Academic / Professional
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="md:col-span-2">
                                <label htmlFor="college_company" className="block text-sm font-semibold text-gray-700 mb-2">College / Company Name</label>
                                <input
                                    id="college_company"
                                    name="college_company"
                                    type="text"
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Current institution or workplace"
                                    value={formData.college_company}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="md:col-span-2 md:col-span-1">
                                <label htmlFor="previous_school" className="block text-sm font-semibold text-gray-700 mb-2">Previous School/College</label>
                                <input
                                    id="previous_school"
                                    name="previous_school"
                                    type="text"
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Name of last school"
                                    value={formData.previous_school}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="md:col-span-2 md:col-span-1">
                                <label htmlFor="previous_marks" className="block text-sm font-semibold text-gray-700 mb-2">Previous Marks/CGPA</label>
                                <input
                                    id="previous_marks"
                                    name="previous_marks"
                                    type="text"
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g. 85% or 9.0 CGPA"
                                    value={formData.previous_marks}
                                    onChange={handleChange}
                                />
                            </div>





                            <div className="md:col-span-2 md:col-span-1">
                                <label htmlFor="course_start_date" className="block text-sm font-semibold text-gray-700 mb-2">Course Start Date <span className="text-red-500">*</span></label>
                                <input
                                    id="course_start_date"
                                    name="course_start_date"
                                    type="date"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                    value={formData.course_start_date}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="md:col-span-2 md:col-span-1">
                                <label htmlFor="course_end_date" className="block text-sm font-semibold text-gray-700 mb-2">Course End Date <span className="text-red-500">*</span></label>
                                <input
                                    id="course_end_date"
                                    name="course_end_date"
                                    type="date"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                    value={formData.course_end_date}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Course Selection */}
                    <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">5</span>
                            Course Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            {/* Category Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Category <span className="text-red-500">*</span></label>
                                <select
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        setFormData(prev => ({ ...prev, course: '' }));
                                        setSelectedFee(null);
                                    }}
                                    required
                                >
                                    <option value="">-- Choose a Category --</option>
                                    <option value="IT & Software">IT &amp; Software</option>
                                    <option value="Mechanical CAD">Mechanical CAD</option>
                                    <option value="Civil CAD">Civil CAD</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Course Selection (Visible only after category is selected) */}
                            {selectedCategory && selectedCategory !== 'Other' && (
                                <div>
                                    <label htmlFor="course" className="block text-sm font-semibold text-gray-700 mb-2">Select Course <span className="text-red-500">*</span></label>
                                    <select
                                        id="course"
                                        name="course"
                                        className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                        value={formData.course}
                                        onChange={(e) => {
                                            handleChange(e);
                                            // Also try to match from feeData for fee display
                                            const fee = feeData.find(f => f.course_name === e.target.value);
                                            setSelectedFee(fee || null);
                                        }}
                                        required
                                    >
                                        <option value="">-- Choose a Course --</option>
                                        {selectedCategory === 'IT & Software' && (<>
                                            <option value="Data Analytics">Data Analytics</option>
                                            <option value="Software Testing">Software Testing</option>
                                            <option value="Digital Marketing (Adv)">Digital Marketing (Adv)</option>
                                            <option value="Full Stack Development">Full Stack Development</option>
                                            <option value="Full Stack Development with Python">Full Stack Development with Python</option>
                                            <option value="Java Programming Course">Java Programming Course</option>
                                            <option value="Python Programming">Python Programming</option>
                                            <option value="SCRUM MASTER">SCRUM MASTER</option>
                                            <option value="UI/UX Design">UI/UX Design</option>
                                            <option value="Web Development Course">Web Development Course</option>
                                            <option value="MERN Stack">MERN Stack</option>
                                            <option value="Cyber Security">Cyber Security</option>
                                            <option value="AWS">AWS</option>
                                        </>)}
                                        {selectedCategory === 'Mechanical CAD' && (<>
                                            <option value="3D Printing & Prototyping">3D Printing &amp; Prototyping</option>
                                            <option value="ANSA Pre-Processing">ANSA Pre-Processing</option>
                                            <option value="AutoCAD Mechanical">AutoCAD Mechanical</option>
                                            <option value="SolidWorks Masterclass">SolidWorks Masterclass</option>
                                            <option value="Creo Parametric Course">Creo Parametric Course</option>
                                            <option value="NX CAD (Unigraphics) Course">NX CAD (Unigraphics) Course</option>
                                            <option value="CATIA V5 Course">CATIA V5 Course</option>
                                            <option value="Autodesk Inventor Course">Autodesk Inventor Course</option>
                                            <option value="ANSYS Simulation">ANSYS Simulation</option>
                                            <option value="HyperMesh Course">HyperMesh Course</option>
                                            <option value="Computational Fluid Dynamics (CFD)">Computational Fluid Dynamics (CFD)</option>
                                            <option value="Wiring Harness">Wiring Harness</option>
                                            <option value="Combo Course (AutoCAD, SolidWorks, Creo, CATIA)">Combo Course (AutoCAD, SolidWorks, Creo, CATIA)</option>
                                        </>)}
                                        {selectedCategory === 'Civil CAD' && (<>
                                            <option value="Civil CAD">Civil CAD</option>
                                            <option value="Revit Architecture">Revit Architecture</option>
                                            <option value="SketchUp for Civil Engineering">SketchUp for Civil Engineering</option>
                                            <option value="STAAD.Pro">STAAD.Pro</option>
                                            <option value="BIM Professional">BIM Professional</option>
                                            <option value="AutoCAD Civil">AutoCAD Civil</option>
                                        </>)}
                                    </select>
                                </div>
                            )}

                            {/* Other Category - free text input */}
                            {selectedCategory === 'Other' && (
                                <div>
                                    <label htmlFor="course" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Course Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="course"
                                        name="course"
                                        type="text"
                                        className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="Type your course name here..."
                                        value={formData.course}
                                        onChange={handleChange}
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Please enter the exact course name you wish to enroll in.</p>
                                </div>
                            )}

                            {/* Fee Breakdown Card */}
                            {selectedFee && (
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                    <h4 className="text-indigo-800 font-semibold mb-3 text-sm uppercase tracking-wide">Course Fee</h4>

                                    {/* Show only total fee initially */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-lg font-bold">
                                            <span className="text-gray-800">Total Fee</span>
                                            <span className="text-indigo-600">₹{selectedFee.total_fee}</span>
                                        </div>

                                        {/* Scholarship Button */}
                                        {!showScholarshipForm && !scholarshipData && (
                                            <button
                                                type="button"
                                                onClick={() => setShowScholarshipForm(true)}
                                                className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                                            >
                                                Apply for Scholarship
                                            </button>
                                        )}

                                        {/* Scholarship Form */}
                                        {showScholarshipForm && (
                                            <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                                                <h5 className="font-semibold text-gray-800 mb-3 text-sm">Enter Your Academic Marks</h5>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">10th Percentage *</label>
                                                        <input
                                                            type="number"
                                                            name="marks_10th"
                                                            value={formData.marks_10th}
                                                            onChange={handleChange}
                                                            min="0"
                                                            max="100"
                                                            step="0.01"
                                                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                                            placeholder="e.g., 85.5"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">12th Percentage *</label>
                                                        <input
                                                            type="number"
                                                            name="marks_12th"
                                                            value={formData.marks_12th}
                                                            onChange={handleChange}
                                                            min="0"
                                                            max="100"
                                                            step="0.01"
                                                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                                            placeholder="e.g., 90.0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">UG Percentage (Optional)</label>
                                                        <input
                                                            type="number"
                                                            name="marks_ug"
                                                            value={formData.marks_ug}
                                                            onChange={handleChange}
                                                            min="0"
                                                            max="100"
                                                            step="0.01"
                                                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                                            placeholder="e.g., 88.0"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleScholarshipCalculation}
                                                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                                                        >
                                                            Calculate
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowScholarshipForm(false)}
                                                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Scholarship Result */}
                                        {scholarshipData && (
                                            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h5 className="font-semibold text-green-800 text-sm">Scholarship Applied!</h5>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setScholarshipData(null);
                                                            setIsScholarship(false);
                                                            setScholarshipPercent(0);
                                                            setFormData({ ...formData, marks_10th: '', marks_12th: '', marks_ug: '' });
                                                        }}
                                                        className="text-xs text-gray-600 hover:text-gray-800 underline"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-700">Category:</span>
                                                        <span className="font-medium text-gray-900">{scholarshipData.category}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-700">Average Marks:</span>
                                                        <span className="font-medium text-gray-900">{scholarshipData.average}%</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-700">Scholarship:</span>
                                                        <span className="font-bold text-green-700">{scholarshipData.scholarshipPercent}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Fee Breakdown (Student View - Simplified) */}
                                        {scholarshipData && scholarshipData.isEligible && (
                                            <>
                                                <div className="border-t border-gray-300 my-3"></div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Original Fee</span>
                                                        <span className="font-medium">₹{selectedFee.total_fee}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm text-green-600">
                                                        <span>Scholarship Discount ({scholarshipPercent}%)</span>
                                                        <span className="font-medium">- ₹{((selectedFee.total_fee * scholarshipPercent) / 100).toFixed(2)}</span>
                                                    </div>
                                                    <div className="border-t border-gray-200 my-2"></div>
                                                    <div className="flex justify-between text-lg font-bold">
                                                        <span className="text-gray-800">Final Amount</span>
                                                        <span className="text-indigo-600">₹{(selectedFee.total_fee - (selectedFee.total_fee * scholarshipPercent / 100)).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>


                    {/* Documents Utility */}
                    <div className="bg-gray-50 p-3 sm:p-6 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                                <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">5</span>
                                Documents Upload
                            </h3>
                            <p className="text-sm text-gray-500 italic">All documents are mandatory for submission.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-start mb-2">
                                    <label htmlFor="photo" className="block text-sm font-semibold text-gray-700">Student Photo <span className="text-red-500">*</span></label>
                                </div>
                                <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50 transition hover:bg-gray-100`}>
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="photo" className="relative cursor-pointer bg-transparent rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                                <span>Upload a file</span>
                                                <input id="photo" name="photo" type="file" className="sr-only" accept="image/*" required onChange={handleChange} />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                                        {formData.photo && <p className="text-sm text-green-600 mt-2 font-medium">Selected: {formData.photo.name}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-start mb-2">
                                    <label htmlFor="signature" className="block text-sm font-semibold text-gray-700">Student Signature <span className="text-red-500">*</span></label>
                                </div>
                                <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50 transition hover:bg-gray-100`}>
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        <div className="flex flex-col sm:flex-row items-center justify-center text-sm text-gray-600 space-y-2 sm:space-y-0 sm:space-x-1">
                                            <label htmlFor="signature" className="relative cursor-pointer bg-transparent rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none text-center">
                                                <span>Upload a file</span>
                                                <input id="signature" name="signature" type="file" className="sr-only" accept="image/*" required onChange={handleChange} />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG</p>
                                        {formData.signature && <p className="text-sm text-green-600 mt-2 font-medium">Selected: {formData.signature.name}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="id_proof" className="block text-sm font-semibold text-gray-700">ID Proof (Aadhar/Voter ID) <span className="text-red-500">*</span></label>
                                </div>
                                <input
                                    id="id_proof"
                                    name="id_proof"
                                    type="file"
                                    accept="image/*,.pdf"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition"
                                    onChange={handleChange}
                                />
                                {formData.id_proof && <p className="text-sm text-green-600 mt-2 font-medium">Selected: {formData.id_proof.name}</p>}
                            </div>

                            {/* 10th Marksheet */}
                            <div className="md:col-span-2 bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="marksheet_10th" className="block text-sm font-semibold text-gray-700">
                                        10th Degree Marksheet (Consolidated) <span className="text-red-500">*</span>
                                    </label>
                                </div>
                                <input
                                    id="marksheet_10th"
                                    name="marksheet_10th"
                                    type="file"
                                    accept="image/*,.pdf"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition"
                                    onChange={handleChange}
                                />
                                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG - Max 500KB</p>
                                {formData.marksheet_10th && (
                                    <p className="text-sm text-green-600 mt-2 font-medium">
                                        Selected: {formData.marksheet_10th.name} ({(formData.marksheet_10th.size / 1024).toFixed(2)}KB)
                                    </p>
                                )}
                            </div>

                            {/* 12th Marksheet */}
                            <div className="md:col-span-2 bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="marksheet_12th" className="block text-sm font-semibold text-gray-700">
                                        12th Degree Marksheet (Consolidated) <span className="text-red-500">*</span>
                                    </label>
                                </div>
                                <input
                                    id="marksheet_12th"
                                    name="marksheet_12th"
                                    type="file"
                                    accept="image/*,.pdf"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition"
                                    onChange={handleChange}
                                />
                                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG - Max 500KB</p>
                                {formData.marksheet_12th && (
                                    <p className="text-sm text-green-600 mt-2 font-medium">
                                        Selected: {formData.marksheet_12th.name} ({(formData.marksheet_12th.size / 1024).toFixed(2)}KB)
                                    </p>
                                )}
                            </div>

                            {/* Degree Marksheet (Optional) */}
                            <div className="md:col-span-2 bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="marksheet_degree" className="block text-sm font-semibold text-gray-700">
                                        Degree Marksheet (Consolidated) <span className="text-gray-400 text-xs">(Optional)</span>
                                    </label>
                                </div>
                                <input
                                    id="marksheet_degree"
                                    name="marksheet_degree"
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition"
                                    onChange={handleChange}
                                />
                                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG - Max 500KB</p>
                                {formData.marksheet_degree && (
                                    <p className="text-sm text-green-600 mt-2 font-medium">
                                        Selected: {formData.marksheet_degree.name} ({(formData.marksheet_degree.size / 1024).toFixed(2)}KB)
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Payment Selection Section */}
                    <div className="bg-gray-50 p-4 md:p-6 rounded-xl border border-indigo-100 ring-1 ring-indigo-50">
                        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">6</span>
                            Payment Details
                        </h3>

                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 mb-4">Choose how you would like to pay your admission fee:</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <label className={`relative flex p-4 cursor-pointer rounded-xl border-2 transition-all ${formData.payment_mode === 'Online' ? 'border-indigo-600 bg-indigo-50/50 shadow-md' : 'border-gray-200 bg-white hover:border-indigo-200'}`}>
                                    <input
                                        type="radio"
                                        name="payment_mode"
                                        value="Online"
                                        className="sr-only"
                                        checked={formData.payment_mode === 'Online'}
                                        onChange={handleChange}
                                    />
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.payment_mode === 'Online' ? 'border-indigo-600' : 'border-gray-300'}`}>
                                            {formData.payment_mode === 'Online' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">Pay Online Now</p>
                                            <p className="text-xs text-gray-500">Razorpay (UPI, Card, Netbanking)</p>
                                        </div>
                                    </div>
                                    {formData.payment_mode === 'Online' && <span className="absolute top-2 right-2 text-indigo-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></span>}
                                </label>

                                <label className={`relative flex p-4 cursor-pointer rounded-xl border-2 transition-all ${formData.payment_mode === 'Offline' ? 'border-indigo-600 bg-indigo-50/50 shadow-md' : 'border-gray-200 bg-white hover:border-indigo-200'}`}>
                                    <input
                                        type="radio"
                                        name="payment_mode"
                                        value="Offline"
                                        className="sr-only"
                                        checked={formData.payment_mode === 'Offline'}
                                        onChange={handleChange}
                                    />
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.payment_mode === 'Offline' ? 'border-indigo-600' : 'border-gray-300'}`}>
                                            {formData.payment_mode === 'Offline' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">Pay Later / Offline</p>
                                            <p className="text-xs text-gray-500">Pay at Branch or via Bank Transfer</p>
                                        </div>
                                    </div>
                                    {formData.payment_mode === 'Offline' && <span className="absolute top-2 right-2 text-indigo-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></span>}
                                </label>

                                <label className={`relative flex p-4 cursor-pointer rounded-xl border-2 transition-all ${formData.payment_mode === 'AlreadyPaid' ? 'border-green-600 bg-green-50/50 shadow-md' : 'border-gray-200 bg-white hover:border-green-200'}`}>
                                    <input
                                        type="radio"
                                        name="payment_mode"
                                        value="AlreadyPaid"
                                        className="sr-only"
                                        checked={formData.payment_mode === 'AlreadyPaid'}
                                        onChange={handleChange}
                                    />
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.payment_mode === 'AlreadyPaid' ? 'border-green-600' : 'border-gray-300'}`}>
                                            {formData.payment_mode === 'AlreadyPaid' && <div className="w-2.5 h-2.5 rounded-full bg-green-600" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">Already Paid</p>
                                            <p className="text-xs text-gray-500">Upload payment screenshot</p>
                                        </div>
                                    </div>
                                    {formData.payment_mode === 'AlreadyPaid' && <span className="absolute top-2 right-2 text-green-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></span>}
                                </label>
                            </div>

                            {/* Already Paid - Screenshot Upload */}
                            {formData.payment_mode === 'AlreadyPaid' && (
                                <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                                    <label htmlFor="payment_screenshot" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Upload Payment Screenshot <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">Please upload a screenshot of your payment confirmation (UPI, bank transfer receipt, etc.)</p>
                                    <div className={`flex justify-center px-6 pt-5 pb-6 border-2 border-green-300 border-dashed rounded-lg bg-white transition hover:bg-green-50`}>
                                        <div className="space-y-1 text-center">
                                            <svg className="mx-auto h-12 w-12 text-green-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <div className="flex text-sm text-gray-600">
                                                <label htmlFor="payment_screenshot" className="relative cursor-pointer bg-transparent rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none">
                                                    <span>Upload payment screenshot</span>
                                                    <input
                                                        id="payment_screenshot"
                                                        name="payment_screenshot"
                                                        type="file"
                                                        className="sr-only"
                                                        accept="image/*,.pdf"
                                                        required
                                                        onChange={(e) => {
                                                            const file = e.target.files[0];
                                                            setPaymentScreenshot(file);
                                                        }}
                                                    />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
                                            {paymentScreenshot && <p className="text-sm text-green-600 mt-2 font-medium">✅ Selected: {paymentScreenshot.name}</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6">
                                <label htmlFor="payment_type" className="block text-sm font-semibold text-gray-700 mb-2">Payment Type <span className="text-red-500">*</span></label>
                                <select
                                    id="payment_type"
                                    name="payment_type"
                                    required
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                    value={formData.payment_type}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Payment Type</option>
                                    <option value="Full">Full Payment</option>
                                    <option value="Installment">Installment</option>
                                    <option value="Bajaj">Bajaj Finance</option>
                                    <option value="Flashaid">Flashaid</option>
                                    <option value="Fibe">Fibe (Early Salary)</option>
                                    <option value="EMI">EMI</option>
                                    <option value="Credit Card">Credit Card</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1 italic">Note: Installment/EMI options are subject to management approval.</p>

                                {formData.payment_type === 'Installment' && (
                                    <div className="mt-4">
                                        <label htmlFor="installments_count" className="block text-sm font-semibold text-gray-700 mb-2">Number of Installments <span className="text-red-500">*</span></label>
                                        <select
                                            id="installments_count"
                                            name="installments_count"
                                            required
                                            className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                            value={formData.installments_count}
                                            onChange={handleChange}
                                        >
                                            <option value="">Select Installments</option>
                                            <option value="2">2 Installments</option>
                                            <option value="3">3 Installments</option>
                                        </select>
                                    </div>
                                )}

                                {['EMI', 'Bajaj', 'Flashaid', 'Fibe'].includes(formData.payment_type) && (
                                    <div className="mt-4">
                                        <label htmlFor="installments_count" className="block text-sm font-semibold text-gray-700 mb-2">EMI Months <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            id="installments_count"
                                            name="installments_count"
                                            min="1"
                                            max="60"
                                            required
                                            className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                            placeholder="Enter number of months"
                                            value={formData.installments_count}
                                            onChange={handleChange}
                                        />
                                    </div>
                                )}
                            </div>

                            {selectedFee && (
                                <div className="mt-6 p-4 bg-white rounded-xl border border-indigo-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Payable Amount</p>
                                        <p className="text-2xl font-black text-indigo-900">₹{(selectedFee.total_fee - (isScholarship ? (selectedFee.total_fee * scholarshipPercent / 100) : 0)).toFixed(2)}</p>
                                        {formData.installments_count && formData.payment_type !== 'Full' && !isNaN(formData.installments_count) ? (
                                            <p className="text-sm font-medium text-emerald-600 mt-1">
                                                (₹{((selectedFee.total_fee - (isScholarship ? (selectedFee.total_fee * scholarshipPercent / 100) : 0)) / parseInt(formData.installments_count)).toFixed(2)} per {formData.payment_type === 'Installment' ? 'installment' : 'month'})
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-indigo-600 font-bold uppercase">{formData.payment_mode === 'Online' ? 'Secure Online Payment' : 'Manual Entry after Review'}</p>
                                        <p className="text-[10px] text-gray-400">Incl. all taxes and scholarship</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Declaration */}
                    <div className="bg-gray-50 p-3 sm:p-6 rounded-xl border border-gray-100">
                        <label className="flex items-start cursor-pointer">
                            <div className="flex items-center h-6">
                                <input
                                    id="terms"
                                    name="terms"
                                    type="checkbox"
                                    required
                                    className="focus:ring-indigo-500 h-5 w-5 text-indigo-600 border-gray-300 rounded"
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <span className="font-medium text-gray-900">I Agree to the Terms & Conditions</span>
                                <p className="text-gray-500 mt-1">I hereby declare that I have read the <a href="/terms" target="_blank" className="text-indigo-600 hover:text-indigo-500 underline font-semibold">Terms and Conditions</a> (specifically the No-Refund Policy), and I agree to abide by them.</p>
                            </div>
                        </label>
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    {/* Heroicon name: solid/exclamation */}
                                    <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-4 px-6 border border-transparent text-lg font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 shadow-lg disabled:bg-indigo-400 disabled:cursor-not-allowed transition duration-200 transform hover:-translate-y-1"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing Application...
                                </span>
                            ) : (
                                formData.payment_mode === 'Online' ? 'Pay & Submit Application' : 'Submit Application'
                            )}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default AdmissionForm;
