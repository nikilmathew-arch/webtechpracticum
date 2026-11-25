/* =====================================================================
   Riverside General Hospital: interactions and animations
   Every animation is driven by CSS. This script only adds and removes
   classes (classList), listens for events (addEventListener) and uses
   setTimeout for delays.
   ===================================================================== */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- helpers ---------- */
  function $(selector, parent) { return (parent || document).querySelector(selector); }
  function $all(selector, parent) { return Array.prototype.slice.call((parent || document).querySelectorAll(selector)); }

  // Plays a CSS animation again: remove the class, force a reflow, add it back.
  function restartAnimation(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  function scrollToId(id) {
    var target = document.getElementById(id);
    if (target) { target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' }); }
  }


  /* =====================================================================
     1. TOAST NOTIFICATIONS
     showToast(title, message, type) where type is success, info, warn or error
     ===================================================================== */
  var toastRegion = $('#toast-region');
  var TOAST_LIFE = 4500;
  var MAX_TOASTS = 3;
  var TOAST_ICONS = { success: '\u2713', info: 'i', warn: '!', error: '!' };

  function hideToast(toast) {
    if (!toast || toast.classList.contains('is-leaving')) { return; }
    toast.classList.add('is-leaving');                       // plays the slide-out animation
    setTimeout(function () {
      if (toast.parentNode) { toast.parentNode.removeChild(toast); }
    }, 320);
  }

  function showToast(title, message, type) {
    if (!toastRegion) { return; }
    type = type || 'info';

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.style.setProperty('--life', TOAST_LIFE + 'ms');

    var icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = TOAST_ICONS[type] || 'i';

    var body = document.createElement('div');
    var heading = document.createElement('strong');
    heading.textContent = title;
    body.appendChild(heading);
    if (message) {
      var text = document.createElement('p');
      text.textContent = message;
      body.appendChild(text);
    }

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'icon-btn';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.textContent = '\u00D7';

    toast.appendChild(icon);
    toast.appendChild(body);
    toast.appendChild(close);
    toastRegion.appendChild(toast);

    // keep the stack short: the oldest toast leaves first
    var visible = $all('.toast:not(.is-leaving)', toastRegion);
    if (visible.length > MAX_TOASTS) { hideToast(visible[0]); }

    var timer = setTimeout(function () { hideToast(toast); }, TOAST_LIFE);
    close.addEventListener('click', function () {
      clearTimeout(timer);
      hideToast(toast);
    });
  }


  /* =====================================================================
     2. BOOKING SHORTCUT (used by department cards and the doctor pop-up)
     ===================================================================== */
  function startBooking(department) {
    var select = $('#dept');
    scrollToId('appointment');
    setTimeout(function () {
      if (select && department) {
        select.value = department;
        select.focus({ preventScroll: true });
        restartAnimation(select, 'is-highlight');            // amber glow on the department field
        setTimeout(function () { select.classList.remove('is-highlight'); }, 1800);
      }
    }, prefersReduced ? 0 : 600);
    showToast(department + ' selected', 'Choose a preferred date and describe your visit to finish the request.', 'info');
  }

  $all('[data-book-dept]').forEach(function (button) {
    button.addEventListener('click', function () {
      startBooking(button.getAttribute('data-book-dept'));
    });
  });


  /* =====================================================================
     3. DEPARTMENT CARDS: open and close the clinic-detail panel
     ===================================================================== */
  $all('[data-toggle-panel]').forEach(function (button) {
    button.addEventListener('click', function () {
      var panel = document.getElementById(button.getAttribute('aria-controls'));
      if (!panel) { return; }
      var willOpen = !panel.classList.contains('is-open');
      panel.classList.toggle('is-open', willOpen);           // CSS animates the height and fade
      button.setAttribute('aria-expanded', String(willOpen)); // also turns the chevron
    });
  });


  /* =====================================================================
     4. DOCTOR PROFILE POP-UP
     ===================================================================== */
  var modal = $('#doctor-modal');
  var lastTrigger = null;

  function openDoctor(trigger) {
    var card = trigger.closest('article');
    var name = $('h3', card).textContent.trim();
    var dept = $('.tag', card).textContent.trim();
    var photo = $('img', card);
    var badge = $('.badge', card);

    // clinic days and hours come from the timetable table, so they are written once
    var days = '', time = '';
    $all('#doctors tbody tr').forEach(function (row) {
      var doctorCell = $('td[data-label="Doctor"]', row);
      if (doctorCell && doctorCell.textContent.trim() === name) {
        days = $('td[data-label="Days"]', row).textContent.trim();
        time = $('td[data-label="Time"]', row).textContent.trim();
      }
    });

    $('#modal-title').textContent = name;
    $('#modal-dept').textContent = dept;
    $('#modal-bio').textContent = $('p', card).textContent.trim();
    $('#modal-days').textContent = days;
    $('#modal-time').textContent = time;
    $('#modal-status').textContent = badge ? badge.textContent.trim() : '';
    $('#modal-photo').src = photo.src;
    $('#modal-photo').alt = photo.alt;
    var book = $('#modal-book');
    book.textContent = 'Book ' + dept;
    book.setAttribute('data-dept', dept);

    lastTrigger = trigger;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    setTimeout(function () { $('.modal-close', modal).focus(); }, 50);
  }

  function closeDoctor(returnFocus) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    if (returnFocus !== false && lastTrigger) { lastTrigger.focus(); }
  }

  if (modal) {
    $all('[data-doctor]').forEach(function (button) {
      button.addEventListener('click', function () { openDoctor(button); });
    });

    modal.addEventListener('click', function (event) {
      if (event.target.closest('[data-close]')) { closeDoctor(); }
    });

    $('#modal-book').addEventListener('click', function () {
      var dept = this.getAttribute('data-dept');
      closeDoctor(false);
      startBooking(dept);
    });

    // keyboard: Esc closes, Tab stays inside the pop-up
    document.addEventListener('keydown', function (event) {
      if (!modal.classList.contains('is-open')) { return; }
      if (event.key === 'Escape') { closeDoctor(); return; }
      if (event.key !== 'Tab') { return; }
      var focusable = $all('button', $('.modal-card', modal)).filter(function (el) { return !el.disabled; });
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }


  /* =====================================================================
     5. NOTIFICATION BELL
     ===================================================================== */
  var bellBtn = $('#bell-btn');
  var bellPanel = $('#bell-panel');
  var bellCount = $('#bell-count');
  var noteList = $('#note-list');
  var bellEmpty = $('#bell-empty');
  var markRead = $('#mark-read');

  function setBell(open) {
    bellPanel.classList.toggle('is-open', open);
    bellBtn.setAttribute('aria-expanded', String(open));
  }

  function updateBell() {
    var live = $all('.note-item:not(.is-removing)', noteList);
    var unread = live.filter(function (item) { return !item.classList.contains('is-read'); }).length;

    bellCount.textContent = unread;
    bellCount.classList.toggle('is-empty', unread === 0);
    if (unread > 0) { restartAnimation(bellCount, 'is-pop'); }
    bellBtn.setAttribute('aria-label', 'Notifications, ' + (unread ? unread + ' unread' : 'none unread'));
    bellEmpty.classList.toggle('is-visible', live.length === 0);
    markRead.disabled = unread === 0;
  }

  if (bellBtn && bellPanel) {
    bellBtn.addEventListener('click', function () {
      setBell(!bellPanel.classList.contains('is-open'));
    });

    document.addEventListener('click', function (event) {
      if (!bellPanel.contains(event.target) && !bellBtn.contains(event.target)) { setBell(false); }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && bellPanel.classList.contains('is-open')) {
        setBell(false);
        bellBtn.focus();
      }
    });

    noteList.addEventListener('click', function (event) {
      var dismiss = event.target.closest('.note-dismiss');
      if (!dismiss) { return; }
      var item = dismiss.closest('.note-item');
      var next = $all('.note-dismiss', noteList).filter(function (btn) {
        return btn !== dismiss && !btn.closest('.is-removing');
      })[0];

      item.classList.add('is-removing');                     // slide out, then collapse
      updateBell();
      (next || bellBtn).focus();
      setTimeout(function () {
        if (item.parentNode) { item.parentNode.removeChild(item); }
      }, 330);
    });

    markRead.addEventListener('click', function () {
      $all('.note-item', noteList).forEach(function (item) { item.classList.add('is-read'); });
      updateBell();
    });

    // one short ring after load to show there are notices
    setTimeout(function () {
      bellBtn.classList.add('is-ringing');
      setTimeout(function () { bellBtn.classList.remove('is-ringing'); }, 1100);
    }, 2500);
  }


  /* =====================================================================
     6. EMERGENCY BANNER: dismiss
     ===================================================================== */
  var bar = $('.emergency-bar');
  var barClose = $('.bar-close');
  if (bar && barClose) {
    barClose.addEventListener('click', function () {
      bar.classList.add('is-closing');                       // collapses and fades
      setTimeout(function () { bar.hidden = true; }, 420);
      showToast('Emergency banner hidden', 'You can still call 108 at any time with the red button at the bottom of the page.', 'info');
    });
  }


  /* =====================================================================
     7. BACK-TO-TOP: fades in after scrolling
     ===================================================================== */
  var topBtn = $('.back-to-top');
  function onScroll() {
    if (topBtn) { topBtn.classList.toggle('is-visible', window.scrollY > 500); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();


  /* =====================================================================
     8. HEARTBEAT LINE: replay
     ===================================================================== */
  var replay = $('#pulse-replay');
  var ecg = $('.ecg-line');
  if (replay && ecg) {
    replay.addEventListener('click', function () {
      ecg.classList.add('is-restarting');                    // animation: none
      void ecg.getBoundingClientRect();                      // reflow
      ecg.classList.remove('is-restarting');                 // the line draws again
    });
  }


  /* =====================================================================
     9. VIRTUAL TOUR TRACKER
     ===================================================================== */
  var shots = $all('.shot');
  var tourCount = $('#tour-count');
  var tourBar = $('#tour-bar');
  var tourTrack = $('.progress-track');

  function updateTour(announce) {
    var done = $all('.shot.is-explored').length;
    var total = shots.length;
    tourCount.textContent = done;
    restartAnimation(tourCount, 'is-pop');
    tourBar.style.setProperty('--p', total ? done / total : 0);
    tourBar.classList.toggle('is-complete', done === total);
    tourTrack.setAttribute('aria-valuenow', done);
    if (announce && done === total) {
      showToast('Tour complete', 'You have seen all ' + total + ' areas. Ready to book a visit?', 'success');
    }
  }

  if (tourCount && tourBar && tourTrack) {
    $('#tour-total').textContent = shots.length;
    tourTrack.setAttribute('aria-valuemax', shots.length);

    $all('[data-explore]').forEach(function (button) {
      button.addEventListener('click', function () {
        var shot = button.closest('.shot');
        var on = !shot.classList.contains('is-explored');
        shot.classList.toggle('is-explored', on);            // stamp pops in / out
        button.setAttribute('aria-pressed', String(on));
        updateTour(on);
      });
    });

    $('#tour-reset').addEventListener('click', function () {
      shots.forEach(function (shot) { shot.classList.remove('is-explored'); });
      $all('[data-explore]').forEach(function (button) { button.setAttribute('aria-pressed', 'false'); });
      updateTour(false);
    });
  }


  /* =====================================================================
     10. PATIENT REGISTRATION FORM: validation, error messages, success
     The HTML attributes (required, type, min, max, minlength, maxlength,
     pattern) set the basic rules. This script adds:
       1. a friendly message under each field            (checkValidity)
       2. rules that compare fields with each other      (setCustomValidity)
       3. a list of problems on submit, then the browser's own
          message on the first bad field                 (reportValidity)
       4. a success card with a summary of the request
     ===================================================================== */
  var form = $('#appointment form');
  var success = $('#form-success');

  if (form && success) {
    var summary = document.getElementById('form-summary');

    // Clinic days from the timetable (0 = Sunday ... 6 = Saturday)
    var CLINICS = {
      'Cardiology':               { days: [1, 3, 5],          text: 'Mon, Wed, Fri' },
      'Orthopaedics':             { days: [2, 4, 6],          text: 'Tue, Thu, Sat' },
      'Paediatrics':              { days: [1, 2, 3, 4, 5],    text: 'Mon to Fri' },
      'Obstetrics & Gynaecology': { days: [2, 4, 5],          text: 'Tue, Thu, Fri' },
      'Neurology':                { days: [1, 2, 3, 4, 5, 6], text: 'Mon to Sat' },
      'General Medicine':         { days: [1, 2, 3, 4, 5, 6], text: 'Mon to Sat' }
    };
    var LABELS = {
      first_name: 'First name', last_name: 'Last name', dob: 'Date of birth', age: 'Age',
      gender: 'Gender', email: 'Email', phone: 'Mobile number', department: 'Department',
      appointment_date: 'Preferred date', visit_type: 'Visit type', reason: 'Reason for visit',
      records: 'Previous reports', password: 'Password', consent_treatment: 'Consent'
    };
    var HINTS = {
      first_name: "Use letters, spaces and . ' - only.",
      last_name: "Use letters, spaces and . ' - only.",
      phone: 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.',
      password: 'Use at least 8 characters, with at least one letter and one number.'
    };

    /* ---------- date helpers ---------- */
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function parseDate(value) { var p = value.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
    function ageFromDob(value) {
      var born = parseDate(value), now = new Date();
      var age = now.getFullYear() - born.getFullYear();
      if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) { age--; }
      return age;
    }
    // Patient age: from the date of birth when it makes sense, otherwise from the Age box
    function patientAge() {
      var dob = form.elements.dob.value;
      if (dob) {
        var a = ageFromDob(dob);
        if (!isNaN(a) && a >= 0 && a <= 120) { return a; }
      }
      var typed = form.elements.age.value;
      return typed === '' ? null : Number(typed);
    }

    // Booking dates can never be in the past, birth dates never in the future
    var todayIso = isoDate(new Date());
    form.elements.dob.max = todayIso;
    form.elements.appointment_date.min = todayIso;

    /* ---------- which controls are checked ---------- */
    function isField(el) {
      return !!el && el.form === form && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && !!el.name &&
             !(el.type === 'checkbox' && !el.required);      // optional tick boxes need no checking
    }
    function fields() {                                      // one entry per radio group
      return $all('input, select, textarea', form).filter(function (el) {
        return isField(el) && (el.type !== 'radio' || el === $('input[name="' + el.name + '"]', form));
      });
    }
    function groupOf(el) {
      return el.type === 'radio' ? $all('input[name="' + el.name + '"]', form) : [el];
    }

    /* ---------- messages ---------- */
    function rangeMessage(el, v) {
      if (el.name === 'dob')              { return v.rangeOverflow ? 'Date of birth cannot be in the future.' : 'Date of birth cannot be before 1900.'; }
      if (el.name === 'appointment_date') { return v.rangeUnderflow ? 'Choose today or a later date.' : 'Appointments can be booked up to 31 Dec 2027.'; }
      return LABELS[el.name] + ' must be between ' + el.min + ' and ' + el.max + '.';
    }

    // Native rule broken (required, type, pattern, minlength, min, max, step): say it clearly
    function nativeMessage(el) {
      var v = el.validity, label = LABELS[el.name] || 'This field';
      if (v.valueMissing) {
        if (el.type === 'radio')    { return 'Choose one option for ' + label.toLowerCase() + '.'; }
        if (el.type === 'checkbox') { return 'Please tick this box to continue.'; }
        if (el.tagName === 'SELECT') { return 'Select a ' + label.toLowerCase() + ' from the list.'; }
        return label + ' is required.';
      }
      if (v.typeMismatch)  { return 'Enter a valid email address, like name@example.com.'; }
      if (v.patternMismatch) { return HINTS[el.name] || el.title || 'Use the requested format.'; }
      if (v.tooShort)      { return label + ' needs at least ' + el.minLength + ' characters (you have ' + el.value.length + ').'; }
      if (v.tooLong)       { return label + ' can have at most ' + el.maxLength + ' characters.'; }
      if (v.rangeUnderflow || v.rangeOverflow) { return rangeMessage(el, v); }
      if (v.stepMismatch)  { return label + ' must be a whole number.'; }
      if (v.badInput)      { return 'Enter a valid ' + label.toLowerCase() + '.'; }
      return el.validationMessage;
    }

    // Rules HTML attributes cannot express: they compare fields or look at files
    function checkFiles(el) {
      var allowed = /\.(pdf|jpe?g|png)$/i, max = 5 * 1024 * 1024;
      for (var i = 0; i < el.files.length; i++) {
        var file = el.files[i];
        if (!allowed.test(file.name)) { return '"' + file.name + '" is not a PDF, JPG or PNG file.'; }
        if (file.size > max)          { return '"' + file.name + '" is larger than 5 MB.'; }
      }
      return '';
    }
    function customRule(el) {
      var value = el.value;
      if (el.name === 'first_name' || el.name === 'last_name') {
        return /[A-Za-z]/.test(value) ? '' : 'Enter at least one letter.';
      }
      if (el.name === 'age' && value !== '' && form.elements.dob.value) {
        var fromDob = ageFromDob(form.elements.dob.value);
        if (!isNaN(fromDob) && fromDob >= 0 && Math.abs(fromDob - Number(value)) > 1) {
          return 'Age ' + value + ' does not match the date of birth (that gives about ' + fromDob + ').';
        }
      }
      if (el.name === 'department' && value === 'Paediatrics') {
        var age = patientAge();
        if (age !== null && age > 18) { return 'Paediatrics treats patients aged 18 or younger. Choose General Medicine instead.'; }
      }
      if (el.name === 'appointment_date' && value) {
        var day = parseDate(value).getDay();
        var clinic = CLINICS[form.elements.department.value];
        if (clinic && clinic.days.indexOf(day) === -1) {
          return form.elements.department.value + ' clinic runs on ' + clinic.text + '. Choose one of those days.';
        }
        if (day === 0) { return 'Outpatient clinics are closed on Sundays. Choose Monday to Saturday.'; }
      }
      if (el.name === 'records') { return checkFiles(el); }
      return '';
    }

    /* ---------- show / hide the message under a field ---------- */
    function showMessage(el, message) {
      var grouped = el.type === 'radio' || el.type === 'checkbox';
      var host = grouped ? el.closest('fieldset') : el.closest('.field');
      var id = 'err-' + (el.type === 'radio' ? el.name : (el.id || el.name));
      var span = document.getElementById(id);
      if (!span) {
        span = document.createElement('span');
        span.id = id;
        span.className = 'error-msg';
        span.setAttribute('aria-live', 'polite');
        host.appendChild(span);
      }
      span.textContent = message;
      groupOf(el).forEach(function (c) {
        c.setAttribute('aria-invalid', message ? 'true' : 'false');
        c.setAttribute('aria-describedby', id);
      });
      if (grouped) {
        host.classList.toggle('has-error', message !== '');
      } else {
        // "touched" switches on the red/green :invalid / :valid styling
        el.classList.toggle('touched', message !== '' || el.value !== '');
      }
    }

    /* ---------- check one field ---------- */
    function validateField(el) {
      var group = groupOf(el);
      group.forEach(function (c) { c.setCustomValidity(''); });            // forget the last message
      var message = el.checkValidity() ? customRule(el) : nativeMessage(el);
      if (message) {
        group.forEach(function (c) { c.setCustomValidity(message); });    // field is now :invalid, bubble text = our text
      }
      showMessage(el, message);
      return message === '';
    }

    // When one field changes, fields that depend on it are checked again
    var DEPENDENTS = { dob: ['age', 'department'], age: ['department'], department: ['appointment_date'] };
    function revalidateRelated(el) {
      (DEPENDENTS[el.name] || []).forEach(function (name) {
        var other = form.elements[name];
        if (other && other.classList.contains('touched')) { validateField(other); }
      });
    }

    function clearAll() {
      fields().forEach(function (el) {
        groupOf(el).forEach(function (c) { c.setCustomValidity(''); c.removeAttribute('aria-invalid'); });
        el.classList.remove('touched');
      });
      $all('.error-msg', form).forEach(function (span) { span.textContent = ''; });
      $all('fieldset.has-error', form).forEach(function (box) { box.classList.remove('has-error'); });
      summary.hidden = true;
    }

    /* ---------- summary box ---------- */
    function showSummary(bad) {
      summary.innerHTML = '';
      var title = document.createElement('p');
      title.textContent = bad.length === 1 ? 'Please fix 1 problem before sending:' : 'Please fix these ' + bad.length + ' problems before sending:';
      var list = document.createElement('ul');
      bad.forEach(function (el) {
        var item = document.createElement('li');
        var link = document.createElement('button');
        link.type = 'button';
        link.className = 'link-btn';
        link.textContent = (LABELS[el.name] || el.name) + ': ' + el.validationMessage;
        link.addEventListener('click', function () { el.focus(); });
        item.appendChild(link);
        list.appendChild(item);
      });
      summary.appendChild(title);
      summary.appendChild(list);
      summary.hidden = false;
      restartAnimation(summary, 'rise-in');
    }

    /* ---------- events: live feedback ---------- */
    form.addEventListener('focusout', function (event) {            // leaving a field checks it
      var el = event.target;
      if (!isField(el) || /^(radio|checkbox|file)$/.test(el.type) || event.relatedTarget === el) { return; }
      validateField(el);
      revalidateRelated(el);
    });
    form.addEventListener('input', function (event) {               // typing: update at once, once the field has been checked
      var el = event.target;
      if (isField(el) && el.classList.contains('touched')) {
        validateField(el);
        revalidateRelated(el);
      }
    });
    form.addEventListener('change', function (event) {              // ticks, choices, dates and files
      var el = event.target;
      if (isField(el)) {
        validateField(el);
        revalidateRelated(el);
      }
    });
    form.addEventListener('reset', function () { setTimeout(clearAll, 0); });

    /* ---------- submit ---------- */
    function formatDate(value) {
      return parseDate(value).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();                                // demo page: nothing is sent to a server
      var submit = $('button[type="submit"]', form);
      if (submit.classList.contains('is-loading')) { return; }

      var bad = fields().filter(function (el) { return !validateField(el); });
      if (bad.length || !form.checkValidity()) {
        showSummary(bad);
        bad.forEach(function (el) {                          // shake every field that needs attention
          var box = el.closest('.field, .choices') || el;
          restartAnimation(box, 'shake');
          setTimeout(function () { box.classList.remove('shake'); }, 500);
        });
        showToast('Check the highlighted fields', bad.length + (bad.length === 1 ? ' field needs' : ' fields need') + ' attention.', 'error');
        if (bad[0]) { bad[0].reportValidity(); }             // scrolls to the first problem and shows the browser's bubble
        return;
      }

      summary.hidden = true;
      var firstName = form.elements.first_name.value.trim();
      var detail = form.elements.department.value + ' on ' + formatDate(form.elements.appointment_date.value) +
                   '. We will confirm by phone or email (' + form.elements.email.value.trim() + ').';
      var label = submit.textContent;
      submit.classList.add('is-loading');                    // spinner
      submit.disabled = true;
      submit.textContent = 'Sending request';

      setTimeout(function () {
        submit.classList.remove('is-loading');
        submit.disabled = false;
        submit.textContent = label;
        form.classList.add('is-fading');                     // form fades out

        setTimeout(function () {
          form.reset();                                      // also clears every message (reset listener)
          form.hidden = true;
          form.classList.remove('is-fading');
          $('#success-title').textContent = firstName ? 'Thank you, ' + firstName + '. Request received' : 'Request received';
          $('#success-detail').textContent = detail;
          success.hidden = false;
          restartAnimation(success, 'rise-in');              // card rises, tick draws itself
          $('#success-title').focus();
          showToast('Request sent', 'The registration desk will confirm your appointment.', 'success');
        }, 320);
      }, 1600);
    });

    $('#success-again').addEventListener('click', function () {
      success.hidden = true;
      success.classList.remove('rise-in');
      form.hidden = false;
      restartAnimation(form, 'rise-in');
      form.elements.first_name.focus({ preventScroll: true });
      scrollToId('appointment');
    });

    $('button[type="reset"]', form).addEventListener('click', function () {
      showToast('Form cleared', 'All fields are empty again.', 'info');
    });
  }


  /* =====================================================================
     11. DOCTOR DIRECTORY MANAGER
     Add, display, modify and remove doctors without reloading the page.
     The "doctors" array is the single source of truth. The list on screen
     is built from it with createElement + appendChild, and updated with
     textContent, setAttribute, replaceChild and remove().
     ===================================================================== */
  var staffList = document.getElementById('staff-list');

  if (staffList) {
    var nameInput   = document.getElementById('s-name');
    var deptInput   = document.getElementById('s-dept');
    var hoursInput  = document.getElementById('s-hours');
    var bioInput    = document.getElementById('s-bio');
    var availInput  = document.getElementById('s-available');
    var searchInput = document.getElementById('s-search');
    var saveBtn     = document.getElementById('mgr-save');
    var cancelBtn   = document.getElementById('mgr-cancel');
    var formBox     = document.getElementById('staff-form');
    var formTitle   = document.getElementById('mgr-form-title');
    var errorBox    = document.getElementById('mgr-error');
    var countBox    = document.getElementById('mgr-count');
    var emptyBox    = document.getElementById('mgr-empty');

    var doctors = [
      { id: 1, name: 'Dr. Anita Raman',         dept: 'Cardiology',               hours: 'Mon, Wed, Fri, 9:00 am to 1:00 pm',  bio: 'Head of Cardiology. MD, DM. Interventional cardiology.', available: true },
      { id: 2, name: 'Dr. Karthik Subramanian', dept: 'Orthopaedics',             hours: 'Tue, Thu, Sat, 10:00 am to 2:00 pm', bio: 'Senior Consultant. MS (Ortho). Knee and hip replacement.', available: true },
      { id: 3, name: 'Dr. Meera Nair',          dept: 'Paediatrics',              hours: 'Mon to Fri, 8:00 am to 12:00 noon',  bio: 'Consultant Paediatrician. MD. Newborn and adolescent health.', available: true },
      { id: 4, name: 'Dr. Farah Hussain',       dept: 'Obstetrics & Gynaecology', hours: 'Tue, Thu, Fri, 2:00 pm to 6:00 pm',  bio: 'Consultant. MS (OBG). High-risk pregnancy care.', available: true }
    ];
    var nextId = 5;        // id given to the next doctor that is added
    var editingId = null;  // null = the form adds; a number = the form edits that doctor
    var addedId = null;    // newest doctor, so only that row plays the entrance animation

    function findDoctor(id) {
      return doctors.filter(function (d) { return d.id === id; })[0];
    }

    /* ---- DISPLAY: build one <li> for one doctor ---- */
    function buildItem(d) {
      var li = document.createElement('li');
      li.className = 'staff-item' +
        (d.available ? '' : ' is-off') +
        (d.id === addedId ? ' is-new' : '') +
        (d.id === editingId ? ' is-editing-now' : '');
      li.setAttribute('data-id', d.id);

      var main = document.createElement('div');
      main.className = 'staff-main';

      var name = document.createElement('strong');
      name.className = 'staff-name';
      name.textContent = d.name;                       // textContent keeps typed text safe

      var meta = document.createElement('div');
      meta.className = 'staff-meta';
      var tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = d.dept;
      var status = document.createElement('span');
      status.className = 'status-chip ' + (d.available ? 'is-on' : 'is-off');
      status.textContent = d.available ? 'Available today' : 'Not available today';
      meta.appendChild(tag);
      meta.appendChild(status);

      main.appendChild(name);
      main.appendChild(meta);
      if (d.hours) {
        var hours = document.createElement('p');
        hours.className = 'staff-hours';
        hours.textContent = d.hours;
        main.appendChild(hours);
      }
      if (d.bio) {
        var bio = document.createElement('p');
        bio.className = 'staff-bio';
        bio.textContent = d.bio;
        main.appendChild(bio);
      }

      var actions = document.createElement('div');
      actions.className = 'staff-actions';
      [
        { action: 'edit',   label: 'Edit',                                  css: 'btn-small',               aria: 'Edit ' + d.name },
        { action: 'toggle', label: d.available ? 'Mark unavailable' : 'Mark available', css: 'btn-small', aria: 'Change availability of ' + d.name },
        { action: 'remove', label: 'Remove',                                css: 'btn-small btn-danger',    aria: 'Remove ' + d.name }
      ].forEach(function (cfg) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = cfg.css;
        button.textContent = cfg.label;
        button.setAttribute('data-action', cfg.action);
        button.setAttribute('aria-label', cfg.aria);
        actions.appendChild(button);
      });

      li.appendChild(main);
      li.appendChild(actions);
      return li;
    }

    function updateCount() {
      var shown = staffList.children.length;
      countBox.textContent = shown + ' of ' + doctors.length + ' doctors shown';
      emptyBox.hidden = shown !== 0;
    }

    /* ---- DISPLAY: rebuild the list (respects the search box) ---- */
    function renderDoctors() {
      var term = searchInput.value.trim().toLowerCase();
      staffList.innerHTML = '';                        // clear the old rows
      doctors.filter(function (d) {
        return (d.name + ' ' + d.dept).toLowerCase().indexOf(term) !== -1;
      }).forEach(function (d) {
        staffList.appendChild(buildItem(d));
      });
      updateCount();

      var fresh = $('.is-new', staffList);
      if (fresh) { fresh.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'nearest' }); }
      addedId = null;
    }

    function showError(message) {
      errorBox.textContent = message;
      if (message) {
        restartAnimation(formBox, 'shake');
        setTimeout(function () { formBox.classList.remove('shake'); }, 500);
      }
    }

    function resetForm() {
      editingId = null;
      nameInput.value = '';
      deptInput.value = '';
      hoursInput.value = '';
      bioInput.value = '';
      availInput.checked = true;
      errorBox.textContent = '';
      formTitle.textContent = 'Add a doctor';
      saveBtn.textContent = 'Add doctor';
      cancelBtn.hidden = true;
      formBox.classList.remove('is-editing');
    }

    /* ---- ADD and MODIFY: one save button, two modes ---- */
    function saveDoctor() {
      var name = nameInput.value.trim();
      var dept = deptInput.value.trim();

      if (name.length < 2 || !dept) {
        showError('Enter the doctor name (at least 2 characters) and the department.');
        (name.length < 2 ? nameInput : deptInput).focus();
        return;
      }
      var duplicate = doctors.some(function (d) {
        return d.id !== editingId && d.name.toLowerCase() === name.toLowerCase();
      });
      if (duplicate) {
        showError(name + ' is already in the directory.');
        nameInput.focus();
        return;
      }

      var values = {
        name: name,
        dept: dept,
        hours: hoursInput.value.trim(),
        bio: bioInput.value.trim(),
        available: availInput.checked
      };

      if (editingId === null) {                        // ADD
        values.id = nextId++;
        doctors.push(values);
        addedId = values.id;
        searchInput.value = '';                        // make sure the new row is visible
        showToast('Doctor added', name + ' is now listed under ' + dept + '.', 'success');
      } else {                                         // MODIFY
        var doctor = findDoctor(editingId);
        doctor.name = values.name;
        doctor.dept = values.dept;
        doctor.hours = values.hours;
        doctor.bio = values.bio;
        doctor.available = values.available;
        showToast('Doctor updated', name + ' was updated.', 'success');
      }
      resetForm();
      renderDoctors();
      nameInput.focus({ preventScroll: true });
    }

    function startEdit(id) {
      var doctor = findDoctor(id);
      if (!doctor) { return; }
      editingId = id;
      nameInput.value = doctor.name;
      deptInput.value = doctor.dept;
      hoursInput.value = doctor.hours;
      bioInput.value = doctor.bio;
      availInput.checked = doctor.available;
      errorBox.textContent = '';
      formTitle.textContent = 'Edit doctor';
      saveBtn.textContent = 'Save changes';
      cancelBtn.hidden = false;
      formBox.classList.add('is-editing');
      renderDoctors();                                 // highlights the row being edited
      formBox.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'nearest' });
      nameInput.focus({ preventScroll: true });
    }

    /* ---- MODIFY in place: swap just one row, not the whole list ---- */
    function toggleAvailability(id, item) {
      var doctor = findDoctor(id);
      doctor.available = !doctor.available;
      staffList.replaceChild(buildItem(doctor), item);
      showToast('Availability changed', doctor.name + (doctor.available ? ' is available today.' : ' is not available today.'), 'info');
    }

    /* ---- REMOVE: slide the row out, then delete it from the DOM and the array ---- */
    function removeDoctor(id, item) {
      var doctor = findDoctor(id);
      if (!doctor || item.classList.contains('is-removing')) { return; }
      item.classList.add('is-removing');
      setTimeout(function () {
        item.remove();
        doctors = doctors.filter(function (d) { return d.id !== id; });
        if (editingId === id) { resetForm(); }
        updateCount();
      }, prefersReduced ? 0 : 340);
      showToast('Doctor removed', doctor.name + ' was removed from the directory.', 'warn');
    }

    /* ---- events ---- */
    saveBtn.addEventListener('click', saveDoctor);
    cancelBtn.addEventListener('click', function () { resetForm(); renderDoctors(); });
    searchInput.addEventListener('input', renderDoctors);

    formBox.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && event.target.type === 'text') {
        event.preventDefault();
        saveDoctor();
      } else if (event.key === 'Escape' && editingId !== null) {
        resetForm();
        renderDoctors();
      }
    });

    // one listener on the list handles every Edit / Mark / Remove button, even for rows added later
    staffList.addEventListener('click', function (event) {
      var button = event.target.closest('[data-action]');
      if (!button) { return; }
      var item = button.closest('.staff-item');
      var id = Number(item.getAttribute('data-id'));
      var action = button.getAttribute('data-action');
      if (action === 'edit') { startEdit(id); }
      else if (action === 'toggle') { toggleAvailability(id, item); }
      else if (action === 'remove') { removeDoctor(id, item); }
    });

    renderDoctors();
  }

  /* =====================================================================
     12. PUBLIC HEALTH STATISTICS: fetch JSON from an API and show it
     fetch() + async/await get the data, response.json() reads it,
     try / catch / finally handle errors, and createElement() +
     appendChild() + textContent build the table without innerHTML.
     ===================================================================== */
  var healthSection = $('#health-data');
  if (healthSection) {
    var API_URL = 'https://disease.sh/v3/covid-19/countries?sort=cases';
    var TIMEOUT_MS = 10000;      // give up after 10 seconds
    var PREVIEW_ROWS = 10;       // rows shown before "Show all"

    var hdFilters = $('#hd-filters');
    var hdRefresh = $('#hd-refresh');
    var hdLoading = $('#hd-loading');
    var hdError = $('#hd-error');
    var hdErrorMsg = $('#hd-error-msg');
    var hdRetry = $('#hd-retry');
    var hdContent = $('#hd-content');
    var hdStats = $('#hd-stats');
    var hdBody = $('#hd-body');
    var hdMeta = $('#hd-meta');
    var hdMore = $('#hd-more');

    var countries = [];          // every row returned by the API
    var activeContinent = 'All';
    var showAllRows = false;
    var isLoading = false;
    var numberFormat = new Intl.NumberFormat('en-IN');

    function formatNumber(value) {
      return (typeof value === 'number' && isFinite(value)) ? numberFormat.format(value) : 'n/a';
    }

    // Shows exactly one of: loading indicator, error message, or the data
    function setView(view) {
      hdLoading.hidden = view !== 'loading';
      hdError.hidden = view !== 'error';
      hdContent.hidden = view !== 'content';
    }

    function clearChildren(el) {
      while (el.firstChild) { el.removeChild(el.firstChild); }
    }

    function makeCell(tag, text, label) {
      var cell = document.createElement(tag);
      cell.textContent = text;
      if (label) { cell.setAttribute('data-label', label); }
      return cell;
    }

    function visibleCountries() {
      return countries.filter(function (c) {
        return activeContinent === 'All' || c.continent === activeContinent;
      });
    }

    function buildFilters() {
      clearChildren(hdFilters);
      var names = ['All'];
      countries.forEach(function (c) {
        if (c.continent && names.indexOf(c.continent) === -1) { names.push(c.continent); }
      });
      names.sort(function (a, b) {
        if (a === 'All') { return -1; }
        if (b === 'All') { return 1; }
        return a.localeCompare(b);
      });
      names.forEach(function (name) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-small';
        btn.setAttribute('data-continent', name);
        btn.setAttribute('aria-pressed', name === activeContinent ? 'true' : 'false');
        btn.textContent = name;
        hdFilters.appendChild(btn);
      });
    }

    function addStat(label, value) {
      var card = document.createElement('div');
      card.className = 'hd-stat';
      var number = document.createElement('strong');
      number.textContent = value;
      var caption = document.createElement('span');
      caption.textContent = label;
      card.appendChild(number);
      card.appendChild(caption);
      hdStats.appendChild(card);
    }

    function renderDashboard() {
      var rows = visibleCountries();
      var totals = rows.reduce(function (sum, c) {
        sum.cases += c.cases || 0;
        sum.deaths += c.deaths || 0;
        sum.recovered += c.recovered || 0;
        return sum;
      }, { cases: 0, deaths: 0, recovered: 0 });

      // summary cards
      clearChildren(hdStats);
      addStat('Countries shown', formatNumber(rows.length));
      addStat('Total cases', formatNumber(totals.cases));
      addStat('Total deaths', formatNumber(totals.deaths));
      addStat('Total recovered', formatNumber(totals.recovered));

      // table rows
      clearChildren(hdBody);
      var shown = showAllRows ? rows : rows.slice(0, PREVIEW_ROWS);
      shown.forEach(function (c, index) {
        var tr = document.createElement('tr');

        var nameCell = document.createElement('th');
        nameCell.scope = 'row';
        var rank = document.createElement('span');
        rank.className = 'hd-rank';
        rank.textContent = (index + 1) + '.';
        nameCell.appendChild(rank);
        nameCell.appendChild(document.createTextNode(' ' + c.country));
        tr.appendChild(nameCell);

        var rate = (c.cases > 0 && typeof c.deaths === 'number')
          ? (c.deaths / c.cases * 100).toFixed(2) + '%' : 'n/a';
        tr.appendChild(makeCell('td', c.continent || 'n/a', 'Continent'));
        tr.appendChild(makeCell('td', formatNumber(c.cases), 'Total cases'));
        tr.appendChild(makeCell('td', formatNumber(c.deaths), 'Deaths'));
        tr.appendChild(makeCell('td', c.recovered ? formatNumber(c.recovered) : 'n/a', 'Recovered'));
        tr.appendChild(makeCell('td', rate, 'Death rate'));
        hdBody.appendChild(tr);
      });

      // footer: count, last-updated time, show all / show fewer
      var stamp = countries.reduce(function (max, c) { return Math.max(max, c.updated || 0); }, 0);
      var updatedText = stamp ? ' Source last updated: ' + new Date(stamp).toLocaleString() + '.' : '';
      hdMeta.textContent = 'Showing ' + shown.length + ' of ' + rows.length + ' countries.' + updatedText;
      hdMore.hidden = rows.length <= PREVIEW_ROWS;
      hdMore.textContent = showAllRows ? 'Show top ' + PREVIEW_ROWS + ' only' : 'Show all ' + rows.length + ' countries';
    }

    function describeError(error) {
      if (error && error.name === 'AbortError') {
        return 'The server took too long to respond. Check your connection and try again.';
      }
      if (error instanceof TypeError) {
        return 'The data could not be reached. You may be offline, or the service may be blocked.';
      }
      return (error && error.message) ? error.message : 'Something went wrong while loading the data.';
    }

    async function loadHealthData() {
      if (isLoading) { return; }
      isLoading = true;
      hdRefresh.disabled = true;
      setView('loading');

      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

      try {
        var response = await fetch(API_URL, { signal: controller.signal });
        if (!response.ok) {
          throw new Error('The server replied with status ' + response.status + '. Please try again later.');
        }
        var data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('The service returned no data.');
        }

        countries = data.filter(function (c) { return c && c.country; });
        activeContinent = 'All';
        showAllRows = false;
        buildFilters();
        renderDashboard();
        setView('content');
        showToast('Data loaded', countries.length + ' countries received.', 'success');
      } catch (error) {
        hdErrorMsg.textContent = describeError(error);
        setView('error');
        showToast('Could not load data', 'Use "Try again" to repeat the request.', 'error');
      } finally {
        clearTimeout(timer);
        isLoading = false;
        hdRefresh.disabled = false;
      }
    }

    // one listener on the filter group covers every continent button
    hdFilters.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-continent]');
      if (!btn) { return; }
      activeContinent = btn.getAttribute('data-continent');
      showAllRows = false;
      $all('[data-continent]', hdFilters).forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      renderDashboard();
    });

    hdMore.addEventListener('click', function () {
      showAllRows = !showAllRows;
      renderDashboard();
    });
    hdRefresh.addEventListener('click', loadHealthData);
    hdRetry.addEventListener('click', loadHealthData);

    loadHealthData();            // fetch as soon as the page loads
  }

  /* =====================================================================
     13. HOSPITAL TASK MANAGER (CRUD + Local Storage)
     Create: tasks.push()                 Read: tasks.filter() + createElement()
     Update: tasks.find() + save          Delete: tasks.filter() + row.remove()
     Every change is written with localStorage.setItem(JSON.stringify(...))
     and read back on page load with JSON.parse(localStorage.getItem(...)).
     ===================================================================== */
  var taskSection = $('#tasks');
  if (taskSection) {
    var TASK_KEY = 'riversideHospitalTasks';
    var STATUS_LABELS = { todo: 'To do', progress: 'In progress', done: 'Done' };
    var STATUS_ORDER = { todo: 0, progress: 1, done: 2 };
    var PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
    var PRIORITY_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };

    var tkForm = $('#tk-form');
    var tkFormTitle = $('#tk-form-title');
    var tkTitle = $('#tk-title-input');
    var tkWard = $('#tk-ward');
    var tkAssignee = $('#tk-assignee');
    var tkPriority = $('#tk-priority');
    var tkStatus = $('#tk-status');
    var tkDue = $('#tk-due');
    var tkNotes = $('#tk-notes');
    var tkError = $('#tk-error');
    var tkSubmit = $('#tk-submit');
    var tkCancel = $('#tk-cancel');
    var tkSearch = $('#tk-search');
    var tkFilter = $('#tk-filter');
    var tkClearDone = $('#tk-clear-done');
    var tkTableWrap = $('#tk-table-wrap');
    var tkBody = $('#tk-body');
    var tkEmpty = $('#tk-empty');
    var tkMeta = $('#tk-meta');

    var tasks = [];
    var editingId = null;
    var storageWarned = false;

    /* ---------- dates ---------- */
    function isoDate(offsetDays) {
      var d = new Date();
      d.setDate(d.getDate() + (offsetDays || 0));
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function formatDue(iso) {
      if (!iso) { return 'No date'; }
      return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    function isOverdue(task) {
      return Boolean(task.due) && task.due < isoDate(0) && task.status !== 'done';
    }
    function newId() {
      return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    /* ---------- Local Storage ---------- */
    function sampleTasks() {
      return [
        { id: newId(), title: 'Restock the crash cart', ward: 'Emergency Department', assignee: 'Charge nurse', priority: 'high', status: 'todo', due: isoDate(0), notes: 'Check drugs, defibrillator pads and airway kit.' },
        { id: newId(), title: 'Sterilise operating theatre 2', ward: 'Orthopaedics', assignee: 'OT technician', priority: 'high', status: 'progress', due: isoDate(0), notes: '' },
        { id: newId(), title: 'Review discharge summaries', ward: 'Cardiology', assignee: 'Dr. Anita Raman', priority: 'medium', status: 'todo', due: isoDate(2), notes: 'Sign off before the afternoon ward round.' },
        { id: newId(), title: 'Update vaccine cold-chain log', ward: 'Paediatrics', assignee: 'Pharmacist', priority: 'medium', status: 'done', due: isoDate(-1), notes: '' },
        { id: newId(), title: 'Order pathology reagents', ward: 'Laboratory', assignee: 'Lab supervisor', priority: 'low', status: 'todo', due: isoDate(5), notes: '' }
      ];
    }

    // returns the saved array, or null when nothing usable is saved yet
    function loadTasks() {
      try {
        var raw = localStorage.getItem(TASK_KEY);
        if (raw === null) { return null; }
        var parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
      } catch (error) {
        return null;
      }
    }

    function saveTasks() {
      try {
        localStorage.setItem(TASK_KEY, JSON.stringify(tasks));
        return true;
      } catch (error) {
        if (!storageWarned) {
          storageWarned = true;
          showToast('Tasks not saved', 'Browser storage is unavailable, so changes will be lost when you leave the page.', 'warn');
        }
        return false;
      }
    }

    /* ---------- READ: build the table ---------- */
    function matchesFilters(task) {
      var status = tkFilter.value;
      var query = tkSearch.value.trim().toLowerCase();
      if (status !== 'all' && task.status !== status) { return false; }
      if (!query) { return true; }
      return (task.title + ' ' + task.ward + ' ' + task.assignee + ' ' + task.notes).toLowerCase().indexOf(query) !== -1;
    }

    function makeCell(text, label) {
      var td = document.createElement('td');
      td.textContent = text;
      td.setAttribute('data-label', label);
      return td;
    }

    function buildRow(task) {
      var tr = document.createElement('tr');
      tr.setAttribute('data-id', task.id);
      if (task.status === 'done') { tr.classList.add('is-done'); }
      if (isOverdue(task)) { tr.classList.add('is-overdue'); }

      // title (row header) + optional notes
      var th = document.createElement('th');
      th.scope = 'row';
      var title = document.createElement('span');
      title.className = 'tk-title';
      title.textContent = task.title;
      th.appendChild(title);
      if (isOverdue(task)) {
        var late = document.createElement('span');
        late.className = 'tk-badge tk-late';
        late.textContent = 'Overdue';
        th.appendChild(late);
      }
      if (task.notes) {
        var notes = document.createElement('span');
        notes.className = 'tk-notes';
        notes.textContent = task.notes;
        th.appendChild(notes);
      }
      tr.appendChild(th);

      tr.appendChild(makeCell(task.ward, 'Ward'));
      tr.appendChild(makeCell(task.assignee || 'Unassigned', 'Assigned to'));

      var priorityCell = document.createElement('td');
      priorityCell.setAttribute('data-label', 'Priority');
      var badge = document.createElement('span');
      badge.className = 'tk-badge tk-' + task.priority;
      badge.textContent = PRIORITY_LABELS[task.priority] || task.priority;
      priorityCell.appendChild(badge);
      tr.appendChild(priorityCell);

      tr.appendChild(makeCell(formatDue(task.due), 'Due'));

      // status can be changed straight from the table (UPDATE)
      var statusCell = document.createElement('td');
      statusCell.setAttribute('data-label', 'Status');
      var select = document.createElement('select');
      select.className = 'tk-status-select tk-s-' + task.status;
      select.setAttribute('data-action', 'status');
      select.setAttribute('aria-label', 'Status of ' + task.title);
      Object.keys(STATUS_LABELS).forEach(function (key) {
        var option = document.createElement('option');
        option.value = key;
        option.textContent = STATUS_LABELS[key];
        select.appendChild(option);
      });
      select.value = task.status;
      statusCell.appendChild(select);
      tr.appendChild(statusCell);

      // edit + delete buttons
      var actionCell = document.createElement('td');
      actionCell.setAttribute('data-label', 'Actions');
      var group = document.createElement('div');
      group.className = 'tk-actions';
      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn-small';
      edit.setAttribute('data-action', 'edit');
      edit.setAttribute('aria-label', 'Edit task: ' + task.title);
      edit.textContent = 'Edit';
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn-small btn-danger';
      del.setAttribute('data-action', 'delete');
      del.setAttribute('aria-label', 'Delete task: ' + task.title);
      del.textContent = 'Delete';
      group.appendChild(edit);
      group.appendChild(del);
      actionCell.appendChild(group);
      tr.appendChild(actionCell);

      return tr;
    }

    function updateSummary() {
      $('#tk-count-all').textContent = tasks.length;
      $('#tk-count-todo').textContent = tasks.filter(function (t) { return t.status === 'todo'; }).length;
      $('#tk-count-progress').textContent = tasks.filter(function (t) { return t.status === 'progress'; }).length;
      $('#tk-count-done').textContent = tasks.filter(function (t) { return t.status === 'done'; }).length;
      $('#tk-count-overdue').textContent = tasks.filter(isOverdue).length;
    }

    // empty-state message, "showing x of y" line and the Clear completed button
    function updateMeta() {
      var shown = tkBody.children.length;
      tkTableWrap.hidden = shown === 0;
      tkEmpty.hidden = shown !== 0;
      if (shown === 0) {
        tkEmpty.textContent = tasks.length === 0
          ? 'No tasks yet. Use the form above to add the first one.'
          : 'No tasks match your search or filter.';
      }
      tkMeta.textContent = tasks.length === 0 ? '' : 'Showing ' + shown + ' of ' + tasks.length + ' tasks.';
      tkClearDone.disabled = !tasks.some(function (t) { return t.status === 'done'; });
      updateSummary();
    }

    function renderTasks() {
      var list = tasks.filter(matchesFilters).slice().sort(function (a, b) {
        return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) ||
               (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) ||
               String(a.due || '9999').localeCompare(String(b.due || '9999'));
      });
      while (tkBody.firstChild) { tkBody.removeChild(tkBody.firstChild); }
      list.forEach(function (task) { tkBody.appendChild(buildRow(task)); });
      updateMeta();
    }

    /* ---------- CREATE / UPDATE: the form ---------- */
    function resetTaskForm() {
      tkForm.reset();
      editingId = null;
      tkFormTitle.textContent = 'Add a task';
      tkSubmit.textContent = 'Add task';
      tkCancel.hidden = true;
      tkForm.classList.remove('is-editing');
      tkError.textContent = '';
    }

    function startEdit(id) {
      var task = tasks.find(function (t) { return t.id === id; });
      if (!task) { return; }
      editingId = id;
      tkTitle.value = task.title;
      tkWard.value = task.ward;
      tkAssignee.value = task.assignee;
      tkPriority.value = task.priority;
      tkStatus.value = task.status;
      tkDue.value = task.due;
      tkNotes.value = task.notes;
      tkFormTitle.textContent = 'Edit task';
      tkSubmit.textContent = 'Update task';
      tkCancel.hidden = false;
      tkError.textContent = '';
      tkForm.classList.add('is-editing');
      tkForm.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' });
      tkTitle.focus();
    }

    function showTaskError(message, field) {
      tkError.textContent = message;
      field.focus();
    }

    tkForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var title = tkTitle.value.trim();
      if (title.length < 3) { showTaskError('Enter a task title of at least 3 characters.', tkTitle); return; }
      if (!tkWard.value) { showTaskError('Choose the ward or department for this task.', tkWard); return; }
      tkError.textContent = '';

      var values = {
        title: title,
        ward: tkWard.value,
        assignee: tkAssignee.value.trim(),
        priority: tkPriority.value,
        status: tkStatus.value,
        due: tkDue.value,
        notes: tkNotes.value.trim()
      };

      if (editingId) {
        var existing = tasks.find(function (t) { return t.id === editingId; });
        if (existing) {
          Object.assign(existing, values);
          showToast('Task updated', '\u201C' + title + '\u201D was saved.', 'success');
        }
      } else {
        values.id = newId();
        tasks.push(values);
        showToast('Task added', '\u201C' + title + '\u201D is on the list.', 'success');
      }
      saveTasks();
      resetTaskForm();
      renderTasks();
    });

    tkCancel.addEventListener('click', resetTaskForm);

    /* ---------- table buttons: one listener for every row ---------- */
    tkBody.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-action]');
      if (!button) { return; }
      var row = button.closest('tr');
      var id = row.getAttribute('data-id');
      var action = button.getAttribute('data-action');

      if (action === 'edit') {
        startEdit(id);
      } else if (action === 'delete') {
        var task = tasks.find(function (t) { return t.id === id; });
        if (!task || !window.confirm('Delete the task "' + task.title + '"? This cannot be undone.')) { return; }
        tasks = tasks.filter(function (t) { return t.id !== id; });
        saveTasks();
        if (editingId === id) { resetTaskForm(); }
        row.remove();
        updateMeta();
        showToast('Task deleted', '\u201C' + task.title + '\u201D was removed.', 'info');
      }
    });

    // changing the status dropdown in a row updates that task
    tkBody.addEventListener('change', function (event) {
      var select = event.target.closest('select[data-action="status"]');
      if (!select) { return; }
      var id = select.closest('tr').getAttribute('data-id');
      var task = tasks.find(function (t) { return t.id === id; });
      if (!task) { return; }
      task.status = select.value;
      saveTasks();
      renderTasks();
      var again = tkBody.querySelector('tr[data-id="' + id + '"] select');
      if (again) { again.focus(); }          // keep keyboard focus after the table is rebuilt
      showToast('Status updated', '\u201C' + task.title + '\u201D is now ' + STATUS_LABELS[task.status].toLowerCase() + '.', 'info');
    });

    /* ---------- search, filter, clear completed ---------- */
    tkSearch.addEventListener('input', renderTasks);
    tkFilter.addEventListener('change', renderTasks);
    tkClearDone.addEventListener('click', function () {
      var doneCount = tasks.filter(function (t) { return t.status === 'done'; }).length;
      if (!doneCount || !window.confirm('Remove ' + doneCount + ' completed task' + (doneCount === 1 ? '' : 's') + '?')) { return; }
      var removed = editingId && tasks.some(function (t) { return t.id === editingId && t.status === 'done'; });
      tasks = tasks.filter(function (t) { return t.status !== 'done'; });
      saveTasks();
      if (removed) { resetTaskForm(); }
      renderTasks();
      showToast('Completed tasks cleared', doneCount + ' removed.', 'info');
    });

    /* ---------- start-up: load from Local Storage (first visit gets sample tasks) ---------- */
    var savedTasks = loadTasks();
    if (savedTasks === null) {
      tasks = sampleTasks();
      saveTasks();
    } else {
      tasks = savedTasks;
    }
    renderTasks();
  }

})();