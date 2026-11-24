document.addEventListener('DOMContentLoaded', function () {
    var menuToggle = document.getElementById('menu-toggle');
    var navMenu = document.getElementById('nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function () {
            navMenu.classList.toggle('open');
        });
        navMenu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                navMenu.classList.remove('open');
            });
        });
    }

    var glow = document.getElementById('cursor-glow');
    if (glow && window.matchMedia('(pointer: fine)').matches) {
        window.addEventListener('mousemove', function (e) {
            glow.style.left = e.clientX + 'px';
            glow.style.top = e.clientY + 'px';
        });
    }

    var revealEls = document.querySelectorAll('.reveal');
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    revealEls.forEach(function (el) {
        observer.observe(el);
    });

    var typeBtns = document.querySelectorAll('#est-type .est-btn');
    var scaleBtns = document.querySelectorAll('#est-scale .est-btn');
    var addonChecks = document.querySelectorAll('.addon-check input');
    var priceDisplay = document.getElementById('est-price');
    var timeDisplay = document.getElementById('est-timeline');
    var applyEstBtn = document.getElementById('apply-estimate');

    var currentEstimate = { label: 'Web Development', price: 600, weeks: 2 };

    function calculateEstimate() {
        var activeType = document.querySelector('#est-type .est-btn.active');
        var activeScale = document.querySelector('#est-scale .est-btn.active');
        if (!activeType || !activeScale) return;

        var basePrice = Number(activeType.dataset.price);
        var baseWeeks = Number(activeType.dataset.weeks);
        var mult = Number(activeScale.dataset.mult);
        var addWks = Number(activeScale.dataset.addweeks);

        var addonsPrice = 0;
        var addonsWeeks = 0;
        addonChecks.forEach(function (chk) {
            if (chk.checked) {
                addonsPrice += Number(chk.value);
                addonsWeeks += Number(chk.dataset.weeks || 0);
            }
        });

        var totalPrice = Math.round((basePrice * mult) + addonsPrice);
        var totalWeeks = baseWeeks + addWks + addonsWeeks;

        currentEstimate = {
            label: activeType.dataset.label,
            price: totalPrice,
            weeks: totalWeeks
        };

        priceDisplay.textContent = '$' + totalPrice.toLocaleString();
        timeDisplay.textContent = totalWeeks + (totalWeeks === 1 ? ' Week' : ' Weeks');
    }

    typeBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            typeBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            calculateEstimate();
        });
    });

    scaleBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            scaleBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            calculateEstimate();
        });
    });

    addonChecks.forEach(function (chk) {
        chk.addEventListener('change', calculateEstimate);
    });

    if (applyEstBtn) {
        applyEstBtn.addEventListener('click', function () {
            var serviceSelect = document.getElementById('service');
            var budgetInput = document.getElementById('budget');
            var msgBox = document.getElementById('message');

            if (serviceSelect) serviceSelect.value = currentEstimate.label;
            if (budgetInput) budgetInput.value = '~$' + currentEstimate.price.toLocaleString() + ' (' + currentEstimate.weeks + ' wks)';
            if (msgBox && !msgBox.value.trim()) {
                msgBox.value = 'Hi AURA TECH, I used your estimator for a ' + currentEstimate.label + ' project (~$' + currentEstimate.price.toLocaleString() + ', ' + currentEstimate.weeks + ' weeks). Here are my details:\n';
            }

            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        });
    }
    var modal = document.getElementById('waitlist-modal');
    var modalClose = document.getElementById('modal-close');
    var modalTitle = document.getElementById('modal-title');
    var waitlistProd = document.getElementById('waitlist-product');
    var waitlistForm = document.getElementById('waitlist-form');
    var waitlistStat = document.getElementById('waitlist-status');
    var waitlistSub = document.getElementById('waitlist-submit');

    document.querySelectorAll('.waitlist-trigger').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var product = btn.dataset.product;
            modalTitle.textContent = 'Join ' + product;
            waitlistProd.value = product;
            waitlistStat.textContent = '';
            waitlistStat.className = 'contact-status';
            modal.classList.add('open');
        });
    });

    if (modalClose) {
        modalClose.addEventListener('click', function () {
            modal.classList.remove('open');
        });
    }
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                modal.classList.remove('open');
            }
        });
    }

    if (waitlistForm) {
        waitlistForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            var email = document.getElementById('waitlist-email').value.trim();
            var product = waitlistProd.value;

            waitlistSub.disabled = true;
            waitlistSub.textContent = 'Joining...';

            try {
                var res = await fetch('/api/waitlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, product: product })
                });
                var data = await res.json();
                if (res.ok && data.ok) {
                    waitlistStat.textContent = data.message;
                    waitlistStat.className = 'contact-status success';
                    waitlistForm.reset();
                } else {
                    waitlistStat.textContent = data.error || 'Unable to join waitlist.';
                    waitlistStat.className = 'contact-status error';
                }
            } catch (err) {
                waitlistStat.textContent = 'Network error. Please try again.';
                waitlistStat.className = 'contact-status error';
            } finally {
                waitlistSub.disabled = false;
                waitlistSub.textContent = 'Request Early Access';
            }
        });
    }

    var form = document.getElementById('contact-form');
    var status = document.getElementById('contact-status');
    var submit = document.getElementById('contact-submit');

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            var name = document.getElementById('name').value.trim();
            var email = document.getElementById('email').value.trim();
            var service = document.getElementById('service').value;
            var budget = document.getElementById('budget').value.trim();
            var message = document.getElementById('message').value.trim();

            if (!name || !email || !message) {
                setStatus('Please fill in all required fields.', 'error');
                return;
            }

            submit.disabled = true;
            submit.textContent = 'Sending Inquiry...';
            setStatus('', '');

            try {
                var res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name, email: email, service: service, budget: budget, message: message })
                });
                var data = await res.json();

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
                submit.textContent = 'Send Project Inquiry';
            }
        });
    }

    function setStatus(text, type) {
        status.textContent = text;
        status.className = 'contact-status' + (type ? ' ' + type : '');
    }
});
