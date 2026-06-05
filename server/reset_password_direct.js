
const supabase = require('./config/supabaseClient');

async function resetPassword() {
    const email = '24pa21@psgtech.ac.in';
    const newPassword = '654321'; // Using a distinct password to avoid confusion

    console.log(`Resetting password for ${email}...`);

    try {
        const { data, error } = await supabase
            .from('users')
            .update({
                password_hash: newPassword,
                reset_token: null,
                reset_token_expiry: null
            })
            .eq('email', email)
            .select();

        if (error) {
            console.error('Error updating password:', error);
            return;
        }

        if (data && data.length > 0) {
            console.log('Password updated successfully!');
            console.log('User:', data[0].username);
        } else {
            console.log('User not found with that email.');
        }
    } catch (err) {
        console.error('Script error:', err);
    }
}

resetPassword();
