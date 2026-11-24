// public/js/main.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Navigation Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu    = document.getElementById('nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
        });
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => navMenu.classList.remove('open'));
        });
    }

    // 2. Ambient Cursor Glow (Desktop)
    const glow = document.getElementById('cursor-glow');
    if (glow && window.matchMedia('(pointer: fine)').matches) {
        window.addEventListener('mousemove', (e) => {
            glow.style.left = `${e.clientX}px`;
            glow.style.top  = `${e.clientY}px`;
        });
    }

    // 3. Scroll Reveal Observer
    const revealEls = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    revealEls.forEach(el => observer.observe(el));

    // 4. Interactive Project Estimator
    const typeBtns     = document.querySelectorAll('#est-type .est-btn');
    const scaleBtns    = document.querySelectorAll('#est-scale .est-btn');
    const addonChecks  = document.querySelectorAll('.addon-check input');
    const priceDisplay = document.getElementById('est-price');
    const timeDisplay  = document.getElementById('est-timeline');
    const applyEstBtn  = document.getElementById('apply-estimate');

    let currentEstimate = { label: 'Web Development', price: 600, weeks: 2 };

    function calculateEstimate() {
        const activeType  = document.querySelector('#est-type .est-btn.active');
        const activeScale = document.querySelector('#est-scale .est-btn.active');
        if (!activeType || !activeScale) return;

        let basePrice = Number(activeType.dataset.price);
        let baseWeeks = Number(activeType.dataset.weeks);
        const mult    = Number(activeScale.dataset.mult);
        const addWks  = Number(activeScale.dataset.addweeks);

        let addonsPrice = 0;
        let addonsWeeks = 0;
        addonChecks.forEach(chk => {
            if (chk.checked) {
                addonsPrice += Number(chk.value);
                addonsWeeks += Number(chk.dataset.weeks || 0);
            }
        });

        const totalPrice = Math.round((basePrice * mult) + addonsPrice);
        const totalWeeks = baseWeeks + addWks + addonsWeeks;

        currentEstimate = {
            label: activeType.dataset.label,
            price: totalPrice,
            weeks: totalWeeks
        };

        priceDisplay.textContent = `$${totalPrice.toLocaleString()}`;
        timeDisplay.textContent  = `${totalWeeks} ${totalWeeks === 1 ? 'Week' : 'Weeks'}`;
    }

    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            calculateEstimate();
        });
    });

    scaleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            scaleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            calculateEstimate();
        });
    });

    addonChecks.forEach(chk => chk.addEventListener('change', calculateEstimate));

    if (applyEstBtn) {
        applyEstBtn.addEventListener('click', () => {
            const serviceSelect = document.getElementById('service');
            const budgetInput   = document.getElementById('budget');
            const msgBox        = document.getElementById('message');

            if (serviceSelect) serviceSelect.value = currentEstimate.label;
            if (budgetInput) budgetInput.value = `~$${currentEstimate.price.toLocaleString()} (${currentEstimate.weeks} wks)`;
            if (msgBox && !msgBox.value.trim()) {
                msgBox.value = `Hi AURA TECH, I used your estimator for a ${currentEstimate.label} project (~$${currentEstimate.price.toLocaleString()}, ${currentEstimate.weeks} weeks). Here are my details:\n`;
            }

            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        });
    }
    // 5. Product Waitlist Modal
    const modal         = document.getElementById('waitlist-modal');
    const modalClose    = document.getElementById('modal-close');
    const modalTitle    = document.getElementById('modal-title');
    const waitlistProd  = document.getElementById('waitlist-product');
    const waitlistForm  = document.getElementById('waitlist-form');
    const waitlistStat  = document.getElementById('waitlist-status');
    const waitlistSub   = document.getElementById('waitlist-submit');

    document.querySelectorAll('.waitlist-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
            const product = btn.dataset.product;
            modalTitle.textContent = `Join ${product}`;
            waitlistProd.value = product;
            waitlistStat.textContent = '';
            waitlistStat.className = 'contact-status';
            modal.classList.add('open');
        });
    });

    if (modalClose) {
        modalClose.addEventListener('click', () => modal.classList.remove('open'));
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('open');
        });
    }

    if (waitlistForm) {
        waitlistForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email   = document.getElementById('waitlist-email').value.trim();
            const product = waitlistProd.value;

            waitlistSub.disabled = true;
            waitlistSub.textContent = 'Joining...';

            try {
                const res = await fetch('/api/waitlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, product })
                });
                const data = await res.json();
                if (res.ok && data.ok) {
                    waitlistStat.textContent = data.message;
                    waitlistStat.className = 'contact-status success';
                    waitlistForm.reset();
                } else {
                    waitlistStat.textContent = data.error || 'Unable to join waitlist.';
                    waitlistStat.className = 'contact-status error';
                }
            } catch {
                waitlistStat.textContent = 'Network error. Please try again.';
                waitlistStat.className = 'contact-status error';
            } finally {
                waitlistSub.disabled = false;
                waitlistSub.textContent = 'Request Early Access';
            }
        });
    }

    // 6. Contact Form Submission
    const form   = document.getElementById('contact-form');
    const status = document.getElementById('contact-status');
    const submit = document.getElementById('contact-submit');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name    = document.getElementById('name').value.trim();
            const email   = document.getElementById('email').value.trim();
            const service = document.getElementById('service').value;
            const budget  = document.getElementById('budget').value.trim();
            const message = document.getElementById('message').value.trim();

            if (!name || !email || !message) {
                setStatus('Please fill in all required fields.', 'error');
                return;
            }

            submit.disabled = true;
            submit.textContent = 'Sending Inquiry...';
            setStatus('', '');

            try {
                const res = await fetch('/api/contact', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ name, email, service, budget, message }),
                });
                const data = await res.json();

                if (res.ok && data.ok) {
                    setStatus(data.message || 'Message sent successfully.', 'success');
                    form.reset();
                } else {
                    setStatus(data.error || 'Something went wrong. Please try again.', 'error');
                }
            } catch {
                setStatus('Network error. Please check your connection and try again.', 'error');
            } finally {
                submit.disabled = false;
                submit.textContent = 'Send Project Inquiry';
            }
        });
    }

    function setStatus(text, type) {
        status.textContent = text;
        status.className = 'contact-status' + (type ? ' ' + type : '');
    }
});
