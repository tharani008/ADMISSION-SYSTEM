const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

// API Router
const apiRouter = express.Router();
apiRouter.use('/auth', require('./routes/auth'));
apiRouter.use('/applications', require('./routes/applications'));
apiRouter.use('/branches', require('./routes/branches'));
apiRouter.use('/fees', require('./routes/fees'));
apiRouter.use('/content', require('./routes/content'));
apiRouter.use('/software', require('./routes/software'));
apiRouter.use('/course-templates', require('./routes/course-templates'));
apiRouter.use('/certificate', require('./routes/certificate-preview'));
apiRouter.use('/payments', require('./routes/payments'));
apiRouter.use('/settings', require('./routes/settings'));

app.use('/api', apiRouter);

// Basic Route
app.get('/', (req, res) => {
    res.send('Admission Management System API (Serverless) is running');
});

module.exports = app;
