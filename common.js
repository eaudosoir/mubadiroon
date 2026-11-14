/* أدوات مشتركة: الأرقام العربية، التواريخ، الإشعارات، التوقيع */
(function () {
  var D = '٠١٢٣٤٥٦٧٨٩';
  window.ar = function (v) {
    return String(v === null || v === undefined ? '' : v).replace(/[0-9]/g, function (d) { return D[+d]; });
  };
  window.esc = function (s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  // اليوم / الشهر / السنة، تُقرأ من اليمين داخل عنصر RTL
  window.fmtDate = function (iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return ar(d.getDate()) + ' / ' + ar(d.getMonth() + 1) + ' / ' + ar(d.getFullYear());
  };
  window.fmtTime = function (iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var h = d.getHours(), m = d.getMinutes();
    return ar(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
  };
  window.GRADES = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
  window.className = function (c) { return GRADES[c.grade] + ' / ' + c.section; };

  // إشعارات
  window.toast = function (msg, opts) {
    opts = opts || {};
    var box = document.getElementById('toasts');
    if (!box) return;
    var t = document.createElement('div');
    t.className = 'toast' + (opts.bad ? ' bad' : '');
    t.setAttribute('role', opts.bad ? 'alert' : 'status');
    var s = document.createElement('span'); s.textContent = msg; t.appendChild(s);
    if (opts.action) {
      var b = document.createElement('button');
      b.textContent = opts.action.label;
      b.onclick = function () { t.remove(); opts.action.run(); };
      t.appendChild(b);
    }
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, opts.ms || (opts.bad ? 6000 : 3500));
  };

  window.signature = function (cls) {
    return '<span class="sig ' + (cls || '') + '" aria-label="teacher abdullah — Design &amp; Programming">' +
      '<span class="nm">teacher abdullah</span><span class="dv"></span>' +
      '<span class="lb">Design<br>&amp; Programming</span></span>';
  };

  // نصوص أخطاء مفهومة
  window.friendly = function (e) {
    var m = (e && (e.message || e.error_description)) || String(e || '');
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'تعذّر الاتصال بالإنترنت، حاول مرة أخرى.';
    if (/Invalid login credentials/i.test(m)) return 'البريد أو كلمة المرور غير صحيحة.';
    if (/Email not confirmed/i.test(m)) return 'لم يتم تأكيد البريد بعد.';
    if (/permission denied|row-level security/i.test(m)) return 'ليس لديك صلاحية لهذا الإجراء.';
    return m;
  };
})();
