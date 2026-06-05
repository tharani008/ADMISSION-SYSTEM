const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Request logger - Console only to avoid node --watch restart loop
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.use(cors({
    origin: function (origin, callback) {
        callback(null, true);
    },
    credentials: true
}));

app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Basic Route
app.get('/', (req, res) => {
    res.send('Admission Management System API is running');
});


const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/applications');

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/branches', require('./routes/branches'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/content', require('./routes/content'));
app.use('/api/software', require('./routes/software'));
app.use('/api/course-templates', require('./routes/course-templates'));
app.use('/api/certificate', require('./routes/certificate-preview'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/settings', require('./routes/settings'));

// Initialize Cron Jobs
const initCertificateCron = require('./jobs/certificateCron');
initCertificateCron();


app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT} [RESTART_SIG_999]`);
});
