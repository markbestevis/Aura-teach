// public/js/main.js
document.addEventListener('DOMContentLoaded', () => {
    const form   = document.getElementById('contact-form');
    const status = document.getElementById('contact-status');
    const submit = document.getElementById('contact-submit');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name    = document.getElementById('name').value.trim();
        const email   = document.getElementById('email').value.trim();
        const message = document.getElementById('message').value.trim();

        if (!name || !email || !message) {
            setStatus('Please fill in all fields.', 'error');
            return;
        }

        submit.disabled = true;
        submit.textContent = 'Sending...';
        setStatus('', '');

        try {
            const res = await fetch('/api/contact', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ name, email, message }),
            });
            const data = await res.json();

            if (res.ok && data.ok) {
                setStatus(data.message || 'Message sent successfully.', 'success');
                form.reset();
            } else {
                setStatus(data.error || 'Something went wrong. Please try again.', 'error');
            }
        } catch (err) {
            setStatus('Network error. Please check your connection and try again.', 'error');
        } finally {
            submit.disabled = false;
            submit.textContent = 'Send Message';
        }
    });

    function setStatus(text, type) {
        status.textContent = text;
        status.className = 'contact-status' + (type ? ' ' + type : '');
    }
});
