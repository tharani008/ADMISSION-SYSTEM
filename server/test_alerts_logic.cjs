const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function testAlerts() {
    console.log('--- Testing Alerts Logic ---');

    // 1. Create a student with course ending in 5 days
    const studentNeedAlert = {
        student_name: 'Test Alert Student',
        phone: '9999999999',
        email: 'test@alert.com',
        branch: 'Computer Science', // matched backend logic usually
        course: 'B.Tech',
        course_start_date: new Date().toISOString().split('T')[0],
        course_end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +5 days
    };

    // 2. Create a student with course ending in 10 days
    const studentNoAlert = {
        student_name: 'Test No Alert Student',
        phone: '8888888888',
        email: 'test@noalert.com',
        branch: 'Computer Science',
        course: 'B.Tech',
        course_start_date: new Date().toISOString().split('T')[0],
        course_end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +10 days
    };

    try {
        // Prepare: Create students
        console.log('Creating student needing alert...');
        const res1 = await fetch(`${BASE_URL}/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentNeedAlert)
        });
        const data1 = await res1.json();
        if (!res1.ok) throw new Error(data1.error);
        const id1 = data1.application.id;
        console.log('Created:', id1);

        // Manually set status to 'Enrolled' because only Enrolled students get alerts
        await fetch(`${BASE_URL}/applications/${id1}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Enrolled' })
        });


        console.log('Creating student NOT needing alert...');
        const res2 = await fetch(`${BASE_URL}/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentNoAlert)
        });
        const data2 = await res2.json();
        if (!res2.ok) throw new Error(data2.error);
        const id2 = data2.application.id;
        console.log('Created:', id2);

        await fetch(`${BASE_URL}/applications/${id2}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Enrolled' })
        });

        // 3. Fetch Alerts
        console.log('Fetching alerts...');
        const alertsRes = await fetch(`${BASE_URL}/applications/alerts`);
        const alerts = await alertsRes.json();

        console.log('Alerts found:', alerts.length);

        const alert1 = alerts.find(a => a.id === id1);
        const alert2 = alerts.find(a => a.id === id2);

        if (alert1) console.log('✅ SUCCESS: Student ending in 5 days is in alerts.');
        else console.error('❌ FAILURE: Student ending in 5 days is NOT in alerts.');

        if (!alert2) console.log('✅ SUCCESS: Student ending in 10 days is NOT in alerts.');
        else console.error('❌ FAILURE: Student ending in 10 days IS in alerts.');

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testAlerts();
