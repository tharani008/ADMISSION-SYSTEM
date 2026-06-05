
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SuccessPage from './pages/SuccessPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import ForgotPassword from './pages/admin/ForgotPassword';
import ResetPassword from './pages/admin/ResetPassword';
import FeesDetails from './pages/admin/FeesDetails';
import TermsAndConditions from './pages/TermsAndConditions';
import PrintPage from './pages/ApplicationPrint';
import PublicEnrollment from './pages/PublicEnrollment';

function App() {
  const hostname = window.location.hostname;
  const isFranchise = hostname.includes('franchise');
  const isAdmission = hostname.includes('admission');
  const isEnrolled = hostname.includes('enrolled');

  // If no specific subdomain is detected (like localhost), allow all routes
  const isDevelopment = hostname === 'localhost' || hostname === '127.0.0.1';

  return (
    <Router>
      <Routes>
        {/* Common Routes */}
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/print-application/*" element={<PrintPage />} />

        {/* Admission Restricted Routes */}
        {(isAdmission || isDevelopment) && (
          <Route path="/" element={<LandingPage />} />
        )}

        {/* Franchise Restricted Routes */}
        {(isFranchise || isDevelopment) && (
          <>
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/forgot-password" element={<ForgotPassword />} />
            <Route path="/admin/reset-password" element={<ResetPassword />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/fees" element={<FeesDetails />} />
          </>
        )}

        {/* Redirect for Root if on Franchise */}
        {isFranchise && (
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
        )}

        {/* Enrolled Restricted Routes */}
        {(isEnrolled || isDevelopment) && (
          <>
            <Route path="/enroll" element={<PublicEnrollment />} />
            {isEnrolled && <Route path="/" element={<PublicEnrollment />} />}
          </>
        )}

        {/* Fallback */}
        <Route path="*" element={
          isDevelopment ? <LandingPage /> : <Navigate to={isFranchise ? "/admin/login" : (isEnrolled ? "/enroll" : "/")} replace />
        } />

      </Routes>
    </Router>
  );
}


export default App;
