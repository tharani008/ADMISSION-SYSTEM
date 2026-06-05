import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/DELL/Desktop/studentapplication app/admission-system/server/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log('Checking Supabase connection...');
    console.log('URL:', supabaseUrl);

    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, role');

        if (error) {
            console.error('Error fetching users:', error.message);
            return;
        }

        console.log('Found users:', users);

        if (users.length === 0) {
            console.log('No users found in the new database.');
        }
    } catch (err) {
        console.error('Unexpected error:', err.message);
    }
}

checkUsers();
