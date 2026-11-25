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
     10. APPOINTMENT FORM: shake on errors, loading spinner, success card
     ===================================================================== */
  var form = $('#appointment form');
  var success = $('#form-success');

  if (form && success) {
    var invalidLock = false;

    // "invalid" does not bubble, so listen in the capture phase
    form.addEventListener('invalid', function (event) {
      var field = event.target.closest('.field, .choices') || event.target;
      restartAnimation(field, 'shake');
      setTimeout(function () { field.classList.remove('shake'); }, 500);

      if (!invalidLock) {                                    // one toast per attempt, not one per field
        invalidLock = true;
        showToast('Check the highlighted fields', 'Some details are missing or in the wrong format.', 'error');
        setTimeout(function () { invalidLock = false; }, 2000);
      }
    }, true);

    form.addEventListener('submit', function (event) {
      event.preventDefault();                                // demo page: nothing is sent to a server
      var submit = $('button[type="submit"]', form);
      if (submit.classList.contains('is-loading')) { return; }

      var firstName = form.elements.first_name.value.trim();
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
          form.reset();
          form.hidden = true;
          form.classList.remove('is-fading');
          $('#success-title').textContent = firstName ? 'Thank you, ' + firstName + '. Request received' : 'Request received';
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
})();