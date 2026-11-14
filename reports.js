/* المبادرون — التقارير والشهادات */
(function () {
  'use strict';
  var R = { tab: 'class', preset: 'week', from: '', to: '', sid: '', out: '', csv: null, csvName: '', cert: [] };

  function $(s, r) { return (r || document).querySelector(s); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fd(s) { return fmtDate(s + 'T12:00:00'); }
  function rng() {
    var t = new Date(), f = new Date();
    if (R.preset === 'week') f.setDate(t.getDate() - 6);
    else if (R.preset === 'month') f = new Date(t.getFullYear(), t.getMonth(), 1);
    else if (R.preset === 'term') f = new Date(2000, 0, 1);
    else return { from: R.from || iso(t), to: R.to || iso(t) };
    return { from: iso(f), to: iso(t) };
  }
  function rlabel(r) { return R.preset === 'term' ? 'الفصل الدراسي كاملًا' : 'من ' + fd(r.from) + ' إلى ' + fd(r.to); }
  function sum(a, k) { return a.reduce(function (n, x) { return n + (x[k] || 0); }, 0); }

  /* ---------- أنماط (الشاشة والطباعة) ---------- */
  var css = '#printarea{display:none}' +
    '.pa{background:#fff;color:#1f3326;border-radius:12px;padding:18px;line-height:1.8;font-weight:700}' +
    '.pa h1{font-size:26px;margin:0}.pa h2{font-size:19px;margin:14px 0 4px;border-bottom:2px solid #5F7F63;padding-bottom:2px}' +
    '.pa-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;border-bottom:3px solid #5F7F63;padding-bottom:8px;font-size:14px}' +
    '.pa-title{text-align:center;flex:1}.pa-title h1{color:#476350}.pa-date{font-size:14px;white-space:nowrap}' +
    '.pa-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin:10px 0}' +
    '.pa-card{background:#E3EBDC;border-radius:10px;padding:6px 10px;text-align:center}.pa-card b{display:block;font-size:26px;line-height:1.3}' +
    '.pa table{width:100%;border-collapse:collapse;font-size:15px}.pa th,.pa td{border-bottom:1px solid #C9D6C0;padding:3px 8px;text-align:right;white-space:normal}' +
    '.pa th{background:#E3EBDC}.pa .bar{height:10px;background:#E3EBDC;border-radius:99px;overflow:hidden;margin:0}.pa .bar i{display:block;height:100%;background:#5F7F63;border-radius:99px}' +
    '.pa-foot{margin-top:14px;border-top:1px solid #C9D6C0;padding-top:4px;font-size:13px;color:#5E7866;text-align:center}' +
    '.pa-names{font-size:15px}' +
    '.cert{background:#fff;color:#1f3326;border:10px double #5F7F63;margin:0;padding:12mm 16mm;height:190mm;display:flex;flex-direction:column;justify-content:space-between;text-align:center;break-after:page;page:cert;font-weight:700}' +
    '.cert .hd{display:flex;justify-content:space-between;font-size:14px;text-align:center}.cert h1{font-size:54px;margin:0;color:#476350;line-height:1.3}' +
    '.cert .nm{font-size:40px;color:#1f3326;border-bottom:2px solid #5F7F63;display:inline-block;padding:0 24px;line-height:1.5}' +
    '.cert .tx{font-size:23px;line-height:2}.cert .lv{display:inline-block;font-size:30px;color:#fff;background:#5F7F63;border-radius:999px;padding:0 28px;border:0}' +
    '.cert .sg{display:flex;justify-content:space-around;font-size:18px}.cert .sg div{min-width:60mm;border-top:1.5px solid #476350;padding-top:4px}' +
    '.cert .ft{font-size:12px;color:#5E7866}' +
    '.rp-tabs{display:flex;gap:6px;flex-wrap:wrap}.rp-ctl{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end}.rp-ctl .field{min-width:130px}' +
    '.chk{display:flex;gap:8px;align-items:center;min-height:44px}.chk input{width:22px;min-height:22px;height:22px}' +
    '@page{size:A4;margin:12mm}@page cert{size:A4 landscape;margin:0}' +
    '@media print{body.printing{background:#fff!important;color:#000}body.printing>*:not(#printarea){display:none!important}' +
    'body.printing #printarea{display:block}body.printing .pa{border-radius:0;padding:0}' +
    '.pa,.pa *,.cert,.cert *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
  function injectCss() {
    if (document.getElementById('rp-css')) return;
    var s = document.createElement('style'); s.id = 'rp-css'; s.textContent = css; document.head.appendChild(s);
  }

  function printHtml(html) {
    var pa = $('#printarea');
    if (!pa) { pa = document.createElement('div'); pa.id = 'printarea'; document.body.appendChild(pa); }
    pa.innerHTML = html; document.body.classList.add('printing');
    var done = function () { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  }

  function csvDownload(name, rows) {
    var csv = '﻿' + rows.map(function (r) {
      return r.map(function (c) { c = String(c === null || c === undefined ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',');
    }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }

  function head(title, sub) {
    return '<div class="pa-head"><div>المملكة العربية السعودية<br>وزارة التعليم<br>الإدارة العامة للتعليم بمنطقة عسير<br>ابتدائية القادسية</div>' +
      '<div class="pa-title"><h1>' + esc(title) + '</h1><div>' + esc(sub) + '</div></div><div class="pa-date">' + fmtDate(new Date().toISOString()) + '</div></div>';
  }
  function foot(me) {
    return '<div class="pa-foot">نظام المبادرون — إعداد: ' + esc(me.full_name) + ' — تصميم وبرمجة: أ. عبدالله ال عواد</div>';
  }
  function cards(list) {
    return '<div class="pa-cards">' + list.map(function (c) { return '<div class="pa-card"><b>' + ar(c[1]) + '</b>' + esc(c[0]) + '</div>'; }).join('') + '</div>';
  }
  function levelDist(rows, S) {
    var names = S.levels.map(function (l) { return l.name; }), cnt = {}, none = 0;
    rows.forEach(function (r) { if (r.level_name) cnt[r.level_name] = (cnt[r.level_name] || 0) + 1; else none++; });
    return '<table><thead><tr><th>الرتبة</th><th>عدد الطلاب</th></tr></thead><tbody>' +
      names.slice().reverse().map(function (n) { return '<tr><td>' + esc(n) + '</td><td>' + ar(cnt[n] || 0) + '</td></tr>'; }).join('') +
      '<tr><td>في بداية الطريق</td><td>' + ar(none) + '</td></tr></tbody></table>';
  }
  function domTable(doms) {
    var mx = Math.max.apply(null, doms.map(function (d) { return d.pts; }).concat([1]));
    return '<table><thead><tr><th>مجال المبادرة</th><th>المبادرات</th><th>النقاط</th><th style="width:30%"></th></tr></thead><tbody>' +
      doms.map(function (d) {
        return '<tr><td>' + esc(d.domain_name) + '</td><td>' + ar(d.events) + '</td><td>' + ar(d.pts) + '</td><td><div class="bar"><i style="width:' + Math.round(Math.max(d.pts, 0) / mx * 100) + '%"></i></div></td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- بناء التقارير ---------- */
  function classReport(rows, doms, cls, r, S) {
    var pts = sum(rows, 'pts'), ev = sum(rows, 'events'), init = rows.filter(function (x) { return x.pts > 0; }).length;
    var top = rows.filter(function (x) { return x.pts > 0; }).slice(0, 10), zero = rows.filter(function (x) { return x.pts <= 0; });
    var html = head('تقرير فصل ' + className(cls), rlabel(r)) +
      cards([['عدد الطلاب', rows.length], ['الطلاب المبادرون', init], ['مجموع النقاط', pts], ['عدد المبادرات', ev], ['متوسط النقاط للطالب', rows.length ? Math.round(pts / rows.length * 10) / 10 : 0]]) +
      '<h2>مجالات المبادرة</h2>' + domTable(doms) +
      '<h2>توزيع الرتب (مجموع الفصل الدراسي)</h2>' + levelDist(rows, S) +
      '<h2>الأكثر مبادرة في الفترة</h2>' + (top.length ? '<table><thead><tr><th>#</th><th>الطالب</th><th>نقاط الفترة</th><th>أيام المبادرة</th><th>الرتبة</th></tr></thead><tbody>' +
        top.map(function (x, i) { return '<tr><td>' + ar(i + 1) + '</td><td>' + esc(x.full_name) + '</td><td>' + ar(x.pts) + '</td><td>' + ar(x.days) + '</td><td>' + esc(x.level_name || '—') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p>لا نقاط في هذه الفترة.</p>') +
      '<h2>لم تُرصد لهم نقاط في الفترة (' + ar(zero.length) + ')</h2>' +
      '<p class="pa-names">' + (zero.length ? zero.map(function (x) { return esc(x.full_name); }).join('، ') : 'كل الطلاب لهم مبادرات. أحسنتم!') + '</p>' + foot(S.me);
    var csv = [['الاسم', 'نقاط الفترة', 'مجموع الفصل الدراسي', 'الرتبة', 'عدد المبادرات', 'أيام المبادرة']].concat(rows.map(function (x) { return [x.full_name, x.pts, x.term_total, x.level_name || '', x.events, x.days]; }));
    return { html: html, csv: csv, name: 'class-report.csv' };
  }

  function schoolReport(rows, doms, r, S) {
    var by = {}, order = [];
    rows.forEach(function (x) {
      var k = x.class_id; if (!by[k]) { by[k] = { g: x.grade, s: x.section, n: 0, p: 0, e: 0, i: 0, z: [] }; order.push(k); }
      var b = by[k]; b.n++; b.p += x.pts; b.e += x.events; if (x.pts > 0) b.i++; else b.z.push(x.full_name);
    });
    var tot = rows.length, init = rows.filter(function (x) { return x.pts > 0; }).length;
    var html = head('تقرير المبادرون للمدرسة', rlabel(r)) +
      cards([['عدد الطلاب', tot], ['الطلاب المبادرون', init], ['نسبة المبادرة %', tot ? Math.round(init / tot * 100) : 0], ['مجموع النقاط', sum(rows, 'pts')], ['عدد المبادرات', sum(rows, 'events')]]) +
      '<h2>مقارنة الفصول</h2><table><thead><tr><th>الفصل</th><th>الطلاب</th><th>المبادرون</th><th>النسبة %</th><th>النقاط</th><th>المتوسط</th></tr></thead><tbody>' +
      order.map(function (k) { var b = by[k]; return '<tr><td>' + esc(GRADES[b.g] + ' / ' + b.s) + '</td><td>' + ar(b.n) + '</td><td>' + ar(b.i) + '</td><td>' + ar(b.n ? Math.round(b.i / b.n * 100) : 0) + '</td><td>' + ar(b.p) + '</td><td>' + ar(b.n ? Math.round(b.p / b.n * 10) / 10 : 0) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<h2>مجالات المبادرة</h2>' + domTable(doms) +
      '<h2>توزيع الرتب في المدرسة</h2>' + levelDist(rows, S) +
      '<h2>أعلى ١٠ طلاب في الفترة</h2><table><thead><tr><th>#</th><th>الطالب</th><th>الفصل</th><th>النقاط</th></tr></thead><tbody>' +
      rows.filter(function (x) { return x.pts > 0; }).sort(function (a, b) { return b.pts - a.pts; }).slice(0, 10).map(function (x, i) { return '<tr><td>' + ar(i + 1) + '</td><td>' + esc(x.full_name) + '</td><td>' + esc(GRADES[x.grade] + ' / ' + x.section) + '</td><td>' + ar(x.pts) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<h2>الفصول التي تحتاج دعمًا للمبادرة</h2><p class="pa-names">' + (order.filter(function (k) { return by[k].n && by[k].i / by[k].n < 0.5; }).map(function (k) { return esc(GRADES[by[k].g] + ' / ' + by[k].s) + ' (' + ar(Math.round(by[k].i / by[k].n * 100)) + '٪)'; }).join('، ') || 'كل الفصول تجاوزت نصف طلابها في المبادرة.') + '</p>' + foot(S.me);
    var csv = [['الصف', 'الفصل', 'الاسم', 'نقاط الفترة', 'مجموع الفصل الدراسي', 'الرتبة', 'عدد المبادرات']].concat(rows.map(function (x) { return [GRADES[x.grade], x.section, x.full_name, x.pts, x.term_total, x.level_name || '', x.events]; }));
    return { html: html, csv: csv, name: 'school-report.csv' };
  }

  function studentReport(d, r, S) {
    var html = head('تقرير الطالب', rlabel(r)) +
      '<h2>' + esc(d.name) + ' — الصف ' + esc(GRADES[d.grade]) + ' / ' + esc(d.section) + '</h2>' +
      cards([['نقاط الفترة', d.range_total], ['مجموع الفصل الدراسي', d.term_total]]) +
      '<p>الرتبة الحالية: <b>' + esc(d.level || 'في بداية الطريق') + '</b></p>' +
      '<h2>من أين جاءت النقاط</h2>' + (d.domains.length ? '<table><thead><tr><th>المجال</th><th>النقاط</th></tr></thead><tbody>' + d.domains.map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td>' + ar(x.points) + '</td></tr>'; }).join('') + '</tbody></table>' : '<p>لا نقاط في هذه الفترة.</p>') +
      '<h2>المبادرات</h2>' + (d.events.length ? '<table><thead><tr><th>التاريخ</th><th>المجال</th><th>النقاط</th><th>ملاحظة</th></tr></thead><tbody>' + d.events.map(function (x) { return '<tr><td>' + fmtDate(x.at) + '</td><td>' + esc(x.domain || 'مبادرة') + '</td><td>' + ar(x.points) + '</td><td>' + esc(x.note || '') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p>لا مبادرات في هذه الفترة.</p>') + foot(S.me);
    var csv = [['التاريخ', 'المجال', 'النقاط', 'ملاحظة']].concat(d.events.map(function (x) { return [new Date(x.at).toLocaleDateString('en-GB'), x.domain || '', x.points, x.note || '']; }));
    return { html: html, csv: csv, name: 'student-report.csv' };
  }

  function certHtml(list, cls, S) {
    var today = fmtDate(new Date().toISOString());
    return list.map(function (x) {
      return '<div class="cert"><div class="hd"><div>المملكة العربية السعودية<br>وزارة التعليم<br>الإدارة العامة للتعليم بمنطقة عسير</div><div>ابتدائية القادسية<br>برنامج المبادرون</div></div>' +
        '<div><h1>شهادة مبادِر</h1></div>' +
        '<div class="tx">تتشرف مدرسة القادسية الابتدائية بمنح الطالب<br><span class="nm">' + esc(x.full_name) + '</span><br>من الصف ' + esc(GRADES[x.grade]) + ' / ' + esc(x.section) +
        '<br>هذه الشهادة تقديرًا لمبادراته المتميزة، وقد بلغ رتبة<br><span class="lv">' + esc(x.level_name) + '</span><br>بمجموع ' + ar(x.term_total) + ' نقطة مبادرة</div>' +
        '<div class="sg"><div>معلم المادة<br>' + esc(S.me.full_name) + '</div><div>مدير المدرسة</div></div>' +
        '<div class="ft">التاريخ: ' + today + ' — تصميم وبرمجة: أ. عبدالله ال عواد</div></div>';
    }).join('');
  }

  /* ---------- الواجهة ---------- */
  function view(v, S, sb) {
    injectCss();
    var admin = S.me.role === 'admin', cls = S.classes.find(function (c) { return c.id === S.classId; });
    var tabs = [['class', 'تقرير الفصل'], ['student', 'تقرير الطالب']].concat(admin ? [['school', 'تقرير المدرسة']] : []).concat([['cert', 'الشهادات']]);
    var custom = R.preset === 'custom', today = iso(new Date());
    var html = '<div class="card"><div class="rp-tabs" role="tablist">' + tabs.map(function (t) {
      return '<button class="tab" role="tab" data-rt="' + t[0] + '" aria-selected="' + (R.tab === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</div>' +
      '<div class="rp-ctl" style="margin-top:10px">' +
      (R.tab !== 'cert' ? '<div class="field"><label for="rp">الفترة</label><select id="rp">' + [['week', 'آخر ٧ أيام'], ['month', 'هذا الشهر'], ['term', 'الفصل الدراسي كاملًا'], ['custom', 'فترة محددة']].map(function (o) {
        return '<option value="' + o[0] + '"' + (R.preset === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select></div>' : '') +
      (custom && R.tab !== 'cert' ? '<div class="field"><label for="rf">من</label><input id="rf" type="date" value="' + (R.from || today) + '"></div><div class="field"><label for="rt">إلى</label><input id="rt" type="date" value="' + (R.to || today) + '"></div>' : '') +
      (R.tab === 'student' ? '<div class="field" style="flex:1;min-width:200px"><label for="rs">الطالب</label><select id="rs"><option value="">اختر الطالب</option>' + S.students.map(function (s) {
        return '<option value="' + s.id + '"' + (R.sid === s.id ? ' selected' : '') + '>' + esc(s.full_name) + '</option>';
      }).join('') + '</select></div>' : '') +
      (R.tab !== 'cert' ? '<button class="btn" id="rgo">عرض التقرير</button>' : '<button class="btn" id="rgo">عرض المستحقين</button>') +
      '</div></div><div id="rp-out"></div>';
    v.innerHTML = html;
    document.querySelectorAll('[data-rt]').forEach(function (b) { b.onclick = function () { R.tab = b.dataset.rt; R.out = ''; view(v, S, sb); }; });
    var sel = $('#rp'); if (sel) sel.onchange = function () { R.preset = sel.value; view(v, S, sb); };
    if ($('#rf')) $('#rf').onchange = function () { R.from = this.value; };
    if ($('#rt')) $('#rt').onchange = function () { R.to = this.value; };
    if ($('#rs')) $('#rs').onchange = function () { R.sid = this.value; };
    $('#rgo').onclick = function () { run(v, S, sb, cls); };
    if (R.out) show($('#rp-out'), S);
  }

  function actions(extra) {
    return '<div class="row-actions" style="margin:10px 0">' + (extra || '') +
      '<button class="btn" id="rpr">طباعة / حفظ PDF</button><button class="btn ghost" id="rcsv">تنزيل جدول Excel</button></div>';
  }
  function show(o, S) {
    o.innerHTML = actions() + '<div class="pa">' + R.out + '</div>';
    $('#rpr').onclick = function () { printHtml('<div class="pa">' + R.out + '</div>'); };
    $('#rcsv').onclick = function () { csvDownload(R.csvName, R.csv); };
  }

  async function run(v, S, sb, cls) {
    var r = rng(), o = $('#rp-out');
    if (r.from > r.to) return toast('تاريخ البداية بعد تاريخ النهاية.', { bad: true });
    o.innerHTML = '<p class="empty">جارٍ إعداد التقرير…</p>';
    try {
      var out;
      if (R.tab === 'class') {
        if (!cls) throw new Error('اختر فصلًا أولًا.');
        var a = await Promise.all([sb.rpc('report_students', { p_from: r.from, p_to: r.to, p_class: cls.id }), sb.rpc('report_domains', { p_from: r.from, p_to: r.to, p_class: cls.id })]);
        if (a[0].error) throw a[0].error; if (a[1].error) throw a[1].error;
        out = classReport(a[0].data || [], a[1].data || [], cls, r, S);
      } else if (R.tab === 'school') {
        var b = await Promise.all([sb.rpc('report_students', { p_from: r.from, p_to: r.to, p_class: null }), sb.rpc('report_domains', { p_from: r.from, p_to: r.to, p_class: null })]);
        if (b[0].error) throw b[0].error; if (b[1].error) throw b[1].error;
        out = schoolReport(b[0].data || [], b[1].data || [], r, S);
      } else if (R.tab === 'student') {
        if (!R.sid) throw new Error('اختر الطالب أولًا.');
        var c = await sb.rpc('student_report', { p_student: R.sid, p_from: r.from, p_to: r.to });
        if (c.error) throw c.error;
        out = studentReport(c.data, r, S);
      } else {
        if (!cls) throw new Error('اختر فصلًا أولًا.');
        var d = await sb.rpc('report_students', { p_from: '2000-01-01', p_to: iso(new Date()), p_class: cls.id });
        if (d.error) throw d.error;
        var ok = (d.data || []).filter(function (x) { return x.level_name; });
        R.cert = ok;
        if (!ok.length) { o.innerHTML = '<div class="card empty">لم يبلغ أحد من طلاب هذا الفصل رتبة بعد.</div>'; return; }
        o.innerHTML = '<div class="card"><h2>طلاب بلغوا رتبة (' + ar(ok.length) + ')</h2>' +
          '<label class="chk"><input type="checkbox" id="call" checked> تحديد الكل</label>' +
          ok.map(function (x, i) { return '<label class="chk"><input type="checkbox" class="cc" data-i="' + i + '" checked> ' + esc(x.full_name) + ' — ' + esc(x.level_name) + ' (' + ar(x.term_total) + ' نقطة)</label>'; }).join('') +
          '<div class="row-actions" style="margin-top:10px"><button class="btn" id="cprn">طباعة الشهادات المحددة</button></div></div>';
        $('#call').onchange = function () { var on = this.checked; document.querySelectorAll('.cc').forEach(function (c) { c.checked = on; }); };
        $('#cprn').onclick = function () {
          var pick = []; document.querySelectorAll('.cc').forEach(function (c) { if (c.checked) pick.push(R.cert[+c.dataset.i]); });
          if (!pick.length) return toast('حدد طالبًا واحدًا على الأقل.', { bad: true });
          printHtml(certHtml(pick, cls, S));
        };
        return;
      }
      R.out = out.html; R.csv = out.csv; R.csvName = out.name;
      show(o, S);
    } catch (e) { o.innerHTML = ''; toast(friendly(e), { bad: true }); }
  }

  window.MBReports = { view: view };
})();
