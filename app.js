/* المبادرون — لوحة المعلم */
(function () {
  'use strict';
  var cfg = window.APP_CONFIG || {};
  var appEl = document.getElementById('app');
  var sb = null;

  var S = {
    me: null, classes: [], classId: null, tab: 'rasd',
    domains: [], levels: [], cap: 3,
    board: [], log: [], students: [],
    filter: '', sel: null, selDomain: null, selPts: 1, busy: false,
    newCreds: null
  };
  var IDLE_MS = 30 * 60 * 1000, idleTimer = null;

  function $(s, r) { return (r || document).querySelector(s); }
  function curClass() { return S.classes.find(function (c) { return c.id === S.classId; }); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- بدء التشغيل ---------- */
  async function init() {
    window.addEventListener('online', syncOnline); window.addEventListener('offline', syncOnline); syncOnline();
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
      appEl.innerHTML = shellOpen() + '<main class="login"><div class="card"><h2>الإعداد غير مكتمل</h2>' +
        '<p>افتح الملف <b>config.js</b> وضع رابط مشروع Supabase والمفتاح العام (anon) ثم أعد تحميل الصفحة.</p></div></main>' + footer();
      return;
    }
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    var recovering = /type=recovery/.test(location.hash);
    sb.auth.onAuthStateChange(function (ev) { if (ev === 'PASSWORD_RECOVERY') showSetPassword(); });
    if (recovering) return showSetPassword();
    var r = await sb.auth.getSession();
    if (r.data && r.data.session) boot(); else showLogin();
  }

  /* ---------- تعيين كلمة مرور جديدة (من رابط الاستعادة) ---------- */
  function showSetPassword() {
    appEl.innerHTML = shellOpen() +
      '<main class="login"><div class="brand"><h1>كلمة مرور جديدة</h1><p class="muted">اكتب كلمة مرور قوية لا تقل عن ١٠ أحرف</p></div>' +
      '<form class="card" id="sf" novalidate><div class="err" id="serr" role="alert" hidden></div>' +
      '<div class="field"><label class="req" for="np">كلمة المرور الجديدة</label><div class="pw">' +
      '<input id="np" type="password" autocomplete="new-password" dir="ltr" required>' +
      '<button type="button" class="btn ghost" id="snp" aria-pressed="false">إظهار</button></div></div>' +
      '<button class="btn" id="sgo" type="submit">حفظ ودخول</button></form></main>' + footer();
    $('#snp').onclick = function () { var p = $('#np'), sh = p.type === 'password'; p.type = sh ? 'text' : 'password'; this.textContent = sh ? 'إخفاء' : 'إظهار'; this.setAttribute('aria-pressed', sh); };
    $('#sf').onsubmit = async function (ev) {
      ev.preventDefault();
      var v = $('#np').value, e = $('#serr');
      if (v.length < 10) { e.textContent = 'كلمة المرور أقصر من ١٠ أحرف.'; e.hidden = false; return; }
      var r = await sb.auth.updateUser({ password: v });
      if (r.error) { e.textContent = friendly(r.error); e.hidden = false; return; }
      history.replaceState(null, '', location.pathname); boot();
    };
  }
  function syncOnline() { $('#offline').hidden = navigator.onLine; }

  function shellOpen() { return '<div class="sig-top no-print">' + signature() + '</div>'; }
  function footer() {
    return '<footer class="footer"><span class="muted">نظام المبادرون — مدرسة القادسية الابتدائية</span>' +
      '<span>' + signature() + '</span></footer>';
  }

  /* ---------- تسجيل الدخول ---------- */
  function showLogin(msg) {
    appEl.innerHTML = shellOpen() +
      '<main class="login"><div class="brand"><h1>المبادرون</h1><p class="muted">نظام نقاط المبادرة لطلاب مدرسة القادسية</p></div>' +
      '<form class="card" id="lf" novalidate>' +
        (msg ? '<div class="err" role="alert">' + esc(msg) + '</div>' : '') +
        '<div class="field"><label class="req" for="em">البريد الإلكتروني</label>' +
          '<input id="em" type="email" inputmode="email" autocomplete="username" dir="ltr" required></div>' +
        '<div class="field"><label class="req" for="pw">كلمة المرور</label>' +
          '<div class="pw"><input id="pw" type="password" autocomplete="current-password" dir="ltr" autocapitalize="characters" required>' +
          '<button type="button" class="btn ghost" id="showpw" aria-pressed="false">إظهار</button></div>' +
          '<div class="hint" id="caps" hidden>تنبيه: مفتاح الأحرف الكبيرة (Caps Lock) مفعّل.</div></div>' +
        '<div class="err" id="lerr" role="alert" hidden></div>' +
        '<button class="btn" id="lgo" type="submit">دخول</button>' +
        '<button class="btn ghost" id="forgot" type="button">نسيت كلمة المرور؟</button>' +
      '</form></main>' + footer();
    var pw = $('#pw');
    $('#showpw').onclick = function () {
      var show = pw.type === 'password'; pw.type = show ? 'text' : 'password';
      this.textContent = show ? 'إخفاء' : 'إظهار'; this.setAttribute('aria-pressed', show);
    };
    pw.addEventListener('keyup', function (e) { $('#caps').hidden = !(e.getModifierState && e.getModifierState('CapsLock')); });
    $('#forgot').onclick = async function () {
      var em = $('#em').value.trim();
      if (!em) return fail('اكتب بريدك أولًا ثم اضغط «نسيت كلمة المرور؟».');
      var r = await sb.auth.resetPasswordForEmail(em, { redirectTo: location.href.split('#')[0] });
      if (r.error) return fail(friendly(r.error));
      $('#lerr').hidden = true; toast('أُرسل رابط إعادة التعيين إلى بريدك.');
    };
    function fail(t) { var e = $('#lerr'); e.textContent = t; e.hidden = false; }
    $('#lf').onsubmit = async function (ev) {
      ev.preventDefault();
      var em = $('#em').value.trim(), pass = pw.value;
      if (!em || !pass) return fail('اكتب البريد وكلمة المرور.');
      var b = $('#lgo'); b.disabled = true; b.textContent = 'جارٍ الدخول…';
      var r = await sb.auth.signInWithPassword({ email: em, password: pass });
      b.disabled = false; b.textContent = 'دخول';
      if (r.error) return fail(friendly(r.error));
      boot();
    };
  }

  async function logout(msg) {
    clearTimeout(idleTimer);
    try { await sb.auth.signOut(); } catch (e) {}
    S.me = null; showLogin(msg);
  }
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { logout('انتهت الجلسة بعد ٣٠ دقيقة دون نشاط. سجّل الدخول من جديد.'); }, IDLE_MS);
  }
  ['click', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, function () { if (S.me) resetIdle(); }, { passive: true }); });

  /* ---------- تحميل البيانات ---------- */
  async function boot() {
    appEl.innerHTML = '<main class="wrap"><p class="empty">جارٍ التحميل…</p></main>';
    try {
      var u = await sb.auth.getUser();
      var uid = u.data.user.id;
      var t = await sb.from('teachers').select('id, full_name, role').eq('id', uid).maybeSingle();
      if (t.error) throw t.error;
      if (!t.data) return logout('هذا الحساب غير مسجَّل كمعلم. اطلب من المدير تسجيله.');
      S.me = t.data;
      var res = await Promise.all([
        sb.from('classes').select('id, grade, section').order('grade').order('section'),
        sb.from('domains').select('id, name').eq('active', true).order('sort'),
        sb.from('levels').select('name, min_points').order('min_points'),
        sb.from('settings').select('key, value').eq('key', 'daily_cap')
      ]);
      res.forEach(function (r) { if (r.error) throw r.error; });
      S.classes = res[0].data; S.domains = res[1].data; S.levels = res[2].data;
      S.cap = res[3].data.length ? res[3].data[0].value : 3;
      var last = lsGet('mb_class');
      S.classId = S.classes.some(function (c) { return c.id === last; }) ? last : (S.classes[0] && S.classes[0].id);
      S.selDomain = S.domains[0] && S.domains[0].id;
      resetIdle();
      await loadClass();
    } catch (e) { appEl.innerHTML = ''; showLogin(friendly(e)); }
  }

  async function loadClass() {
    if (!S.classId) { render(); return; }
    var r = await Promise.all([
      sb.rpc('class_board', { p_class: S.classId }),
      sb.rpc('class_log', { p_class: S.classId, p_limit: 60 }),
      sb.from('students').select('id, full_name, code, active').eq('class_id', S.classId).order('full_name')
    ]);
    for (var i = 0; i < r.length; i++) if (r[i].error) { toast(friendly(r[i].error), { bad: true }); }
    S.board = r[0].data || []; S.log = r[1].data || []; S.students = r[2].data || [];
    render();
  }

  /* ---------- الهيكل ---------- */
  var TABS = [['rasd', 'الرصد'], ['board', 'لوحة الصدارة'], ['students', 'الطلاب'], ['link', 'الربط'], ['log', 'السجل'], ['reports', 'التقارير'], ['settings', 'الإعدادات']];

  function render() {
    appEl.innerHTML =
      '<header class="topbar no-print"><div class="in"><h1>المبادرون</h1>' +
        (curClass() && S.step === 'students' ? '<span class="curcls">' + esc(className(curClass())) + '</span>' : '') +
        '<button class="btn small" id="out">خروج</button></div></header>' +
      '<nav class="tabs no-print" role="tablist" aria-label="الأقسام">' +
        TABS.map(function (t) { return '<button class="tab" role="tab" data-t="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') +
      '</nav><main class="wrap' + (S.tab === 'rasd' && S.step === 'students' ? ' wide' : '') + '" id="view"></main>' + footer();
    $('#out').onclick = function () { logout(); };
    document.querySelectorAll('.tab').forEach(function (b) {
      b.onclick = function () { S.tab = b.dataset.t; render(); };
    });
    var v = $('#view');
    if (!S.classes.length && S.tab !== 'settings') {
      v.innerHTML = '<div class="card empty">لا توجد فصول مربوطة بحسابك بعد.' +
        (S.me.role === 'admin' ? ' أضف فصلك الأول من «الإعدادات».' : ' اطلب من المدير ربطك بفصولك.') + '</div>';
      return;
    }
    ({ rasd: viewRasd, board: viewBoard, students: viewStudents, log: viewLog, link: viewLink, reports: function (x) { MBReports.view(x, S, sb); }, settings: viewSettings })[S.tab](v);
  }

  function levelBadge(name) { return name ? '<span class="lv lv-' + esc(name) + '">' + esc(name) + '</span>' : ''; }

  /* ---------- الرصد ---------- */
  function viewRasd(v) {
    if (!S.step) S.step = 'grades';
    if (S.step !== 'students') return viewPick(v);
    var q = S.filter.trim();
    var list = S.board.filter(function (s) { return !q || s.full_name.indexOf(q) !== -1; });
    var html = '<div class="rasd-head"><button type="button" class="btn ghost small" id="bk">رجوع</button><h2>' + esc(className(curClass())) + ' <span class="muted">— ' + ar(S.board.length) + ' طالبًا</span></h2>' +
      '<div class="field"><label class="sr" for="q">بحث عن طالب</label><input id="q" type="search" value="' + esc(S.filter) + '" placeholder="ابحث عن طالب"></div></div>';
    if (!S.board.length) {
      html += '<div class="card empty">لا يوجد طلاب في هذا الفصل بعد. أضفهم من قسم «الطلاب».</div>';
    } else if (!list.length) {
      html += '<div class="card empty">لا نتائج مطابقة.</div>';
    } else {
      html += '<div class="circles">' + list.map(function (s) {
        return '<button class="circle' + (s.level_name ? ' lv-' + esc(s.level_name) : '') + '" data-id="' + s.student_id + '" title="' + esc(s.full_name) + '" aria-label="' + esc(s.full_name) + '">' +
          (s.today ? '<span class="tdy">+' + ar(s.today) + '</span>' : '') +
          '<span class="nm">' + esc(shortName(s.full_name)) + '</span><span class="pts">' + ar(s.total) + '</span>' +
          (s.level_name ? '<span class="lvn">' + esc(s.level_name) + '</span>' : '') + '</button>';
      }).join('') + '</div>';
    }
    v.innerHTML = html;
    $('#bk').onclick = function () { S.step = 'sections'; S.pickGrade = curClass() ? curClass().grade : S.pickGrade; render(); };
    var q1 = $('#q');
    q1.oninput = function () { S.filter = q1.value; var pos = q1.selectionStart; viewRasd(v); var n = $('#q'); n.focus(); n.setSelectionRange(pos, pos); };
    v.querySelectorAll('.circle').forEach(function (b) { b.onclick = function () { openSheet(b.dataset.id); }; });
  }

  /* الاسم المختصر داخل الدائرة (الاسم الأول والثاني) */
  function shortName(n) {
    var w = String(n).trim().split(/\s+/);
    if (w.length <= 2) return w.join(' ');
    return (w[0] === 'عبد' || w[0] === 'أبو' || w[0] === 'ابو' ? w.slice(0, 3) : w.slice(0, 2)).join(' ');
  }

  /* الصفوف ثم الفصول: دوائر كبيرة فقط، بلا أسماء طلاب */
  function viewPick(v) {
    var html;
    if (S.step === 'sections' && S.pickGrade) {
      var cs = S.classes.filter(function (c) { return c.grade === S.pickGrade; });
      html = '<div class="stage"><button type="button" class="btn ghost small bk" id="bk">رجوع</button>' +
        '<h2>الصف ' + esc(GRADES[S.pickGrade]) + '</h2><p class="muted">اختر الفصل</p><div class="pk-row">' +
        cs.map(function (c, i) { return '<button type="button" class="pk-c" style="--i:' + i + '" data-c="' + c.id + '"><span>فصل</span><b>' + esc(c.section) + '</b></button>'; }).join('') + '</div></div>';
    } else {
      S.step = 'grades';
      var gs = []; S.classes.forEach(function (c) { if (gs.indexOf(c.grade) < 0) gs.push(c.grade); });
      html = '<div class="stage"><h2>اختر الصف</h2><div class="pk-row">' +
        gs.map(function (g, i) { return '<button type="button" class="pk-c g" style="--i:' + i + '" data-g="' + g + '"><span>الصف</span><b>' + esc(GRADES[g]) + '</b></button>'; }).join('') + '</div></div>';
    }
    v.innerHTML = html;
    v.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { S.pickGrade = +b.dataset.g; S.step = 'sections'; render(); }; });
    v.querySelectorAll('[data-c]').forEach(function (b) {
      b.onclick = async function () { S.classId = b.dataset.c; lsSet('mb_class', S.classId); S.filter = ''; S.step = 'students'; await loadClass(); };
    });
    var bk = $('#bk'); if (bk) bk.onclick = function () { S.step = 'grades'; render(); };
  }

  function openSheet(id) {
    var st = S.board.find(function (s) { return s.student_id === id; });
    if (!st) return;
    var left = Math.max(0, S.cap - st.today);
    S.sel = st; S.selPts = Math.min(Math.max(1, S.selPts), Math.max(1, left));
    var sc = document.createElement('div'); sc.className = 'scrim'; sc.id = 'sheet';
    function draw() {
      sc.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="رصد نقاط">' +
        '<h2>' + esc(st.full_name) + '</h2>' +
        '<div class="muted">مجموعه ' + ar(st.total) + ' نقطة ' + levelBadge(st.level_name) + ' — المتبقي اليوم: ' + ar(left) + ' من ' + ar(S.cap) + '</div>' +
        '<div><div class="req">مجال المبادرة</div><div class="chips" id="dm">' +
          S.domains.map(function (d) { return '<button class="chip" data-d="' + d.id + '" aria-pressed="' + (S.selDomain === d.id) + '">' + esc(d.name) + '</button>'; }).join('') + '</div></div>' +
        '<div><div class="req">عدد النقاط</div><div class="chips" id="pt">' +
          [1, 2, 3, 4, 5].map(function (n) { return '<button class="chip" data-p="' + n + '" aria-pressed="' + (S.selPts === n) + '"' + (n > left ? ' disabled' : '') + '>' + ar(n) + '</button>'; }).join('') + '</div></div>' +
        '<div class="field"><label for="nt">ملاحظة (اختياري)</label><input id="nt" maxlength="200" placeholder="مثال: ساعد زميله في ترتيب الخريطة"></div>' +
        (left === 0 ? '<div class="err">بلغ الطالب السقف اليومي للنقاط.</div>' : '') +
        '<div class="row-actions"><button class="btn" id="go"' + (left === 0 ? ' disabled' : '') + '>رصد النقاط</button><button class="btn ghost" id="cx">إلغاء</button></div></div>';
      sc.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { S.selDomain = +b.dataset.d; var n = $('#nt', sc).value; draw(); $('#nt', sc).value = n; }; });
      sc.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { S.selPts = +b.dataset.p; var n = $('#nt', sc).value; draw(); $('#nt', sc).value = n; }; });
      $('#cx', sc).onclick = close;
      $('#go', sc).onclick = save;
    }
    function close() { sc.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    async function save() {
      var b = $('#go', sc); b.disabled = true; b.textContent = 'جارٍ الرصد…';
      var r = await sb.rpc('add_points', { p_student: st.student_id, p_domain: S.selDomain, p_points: S.selPts, p_note: $('#nt', sc).value });
      if (r.error) { toast(friendly(r.error), { bad: true }); b.disabled = false; b.textContent = 'رصد النقاط'; return; }
      var eid = r.data, pts = S.selPts, nm = st.full_name;
      close();
      toast('رُصدت ' + ar(pts) + ' نقطة للطالب ' + nm, { ms: 9000, action: { label: 'تراجع', run: function () { undo(eid); } } });
      await loadClass();
    }
    sc.addEventListener('click', function (e) { if (e.target === sc) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(sc); draw();
  }

  async function undo(eid) {
    var r = await sb.rpc('undo_points', { p_event: eid });
    if (r.error) return toast(friendly(r.error), { bad: true });
    toast('تم التراجع عن النقطة.'); await loadClass();
  }

  /* ---------- لوحة الصدارة ---------- */
  function nextLevel(total) {
    for (var i = 0; i < S.levels.length; i++) if (S.levels[i].min_points > total) return S.levels[i];
    return null;
  }
  function viewBoard(v) {
    var rows = S.board.filter(function (s) { return s.total > 0; });
    var html = '<div class="row-actions no-print"><h2 style="flex:1">لوحة صدارة الفصل</h2></div>';
    if (!rows.length) { html += '<div class="card empty">لم تُرصد نقاط بعد في هذا الفصل الدراسي. ابدأ من قسم «الرصد».</div>'; v.innerHTML = html; return; }
    var pos = 0, prev = null, shown = 0;
    html += '<ol class="board">' + rows.map(function (s, i) {
      if (s.total !== prev) { pos = i + 1; prev = s.total; }
      var nx = nextLevel(s.total), base = 0;
      S.levels.forEach(function (l) { if (l.min_points <= s.total) base = l.min_points; });
      var pct = nx ? Math.round((s.total - base) / (nx.min_points - base) * 100) : 100;
      return '<li class="' + (pos <= 3 ? 'top' : '') + '"><span class="pos">' + ar(pos) + '</span>' +
        '<div><div>' + esc(s.full_name) + ' ' + levelBadge(s.level_name) + '</div>' +
        '<div class="bar" role="img" aria-label="التقدم نحو ' + (nx ? esc(nx.name) : 'القمة') + '"><i style="width:' + pct + '%"></i></div></div>' +
        '<span style="font-size:24px">' + ar(s.total) + '</span></li>';
    }).join('') + '</ol>';
    v.innerHTML = html;
  }

  /* ---------- الطلاب ---------- */
  function viewStudents(v) {
    var html = '<div class="card"><h2>إضافة طلاب</h2>' +
      '<p class="muted">اكتب كل اسم في سطر. سيُنشأ لكل طالب رمز دخول ورقم سري يظهران مرة واحدة فقط لطباعة بطاقاته. الأسماء المكررة في الفصل تُتجاوز تلقائيًا.</p>' +
      '<div class="field"><label class="req" for="names">أسماء الطلاب</label><textarea id="names" placeholder="أحمد محمد علي&#10;سارة خالد"></textarea></div>' +
      '<div class="row-actions" style="margin-top:8px"><button class="btn" id="imp">إضافة الطلاب</button></div></div>';
    if (S.newCreds) {
      html += '<div class="card" id="creds"><h2>بطاقات الدخول الجديدة</h2><p class="err">احفظها أو اطبعها الآن، فلن تظهر الأرقام السرية مرة أخرى.</p>' +
        '<div class="tbl-wrap"><table><thead><tr><th>الاسم</th><th>الرمز</th><th>الرقم السري</th></tr></thead><tbody>' +
        S.newCreds.map(function (c) { return '<tr><td>' + esc(c.full_name) + '</td><td class="num" dir="ltr">' + esc(c.code) + '</td><td class="num" dir="ltr">' + esc(c.pin) + '</td></tr>'; }).join('') +
        '</tbody></table></div><div class="row-actions no-print" style="margin-top:8px"><button class="btn" id="prn">طباعة البطاقات</button>' +
        '<button class="btn ghost" id="csv">تنزيل CSV</button><button class="btn ghost" id="hide">إخفاء</button></div></div>' +
        '<div class="print-cards">' + S.newCreds.map(function (c) {
          return '<div class="pcard"><div>مدرسة القادسية الابتدائية — المبادرون</div><b>' + esc(c.full_name) + '</b>' +
            '<div>الرمز: <b dir="ltr">' + esc(c.code) + '</b> &nbsp; الرقم السري: <b dir="ltr">' + esc(c.pin) + '</b></div>' +
            '<div>' + esc(location.origin + location.pathname.replace(/[^/]*$/, '') + 'student.html') + '</div></div>';
        }).join('') + '</div>';
    }
    html += '<div class="card"><h2>طلاب الفصل (' + ar(S.students.length) + ')</h2>';
    if (!S.students.length) html += '<div class="empty">لا طلاب بعد.</div>';
    else html += '<div class="tbl-wrap"><table><thead><tr><th>الاسم</th><th>الرمز</th><th></th></tr></thead><tbody>' +
      S.students.map(function (s) {
        return '<tr style="' + (s.active ? '' : 'opacity:.55') + '"><td>' + esc(s.full_name) + (s.active ? '' : ' (مؤرشف)') + '</td><td class="num" dir="ltr">' + esc(s.code) + '</td>' +
          '<td><div class="row-actions"><button class="btn small ghost" data-mv="' + s.id + '">نقل</button><button class="btn small ghost" data-pin="' + s.id + '">رقم سري جديد</button>' +
          '<button class="btn small ' + (s.active ? 'danger' : 'ghost') + '" data-arc="' + s.id + '" data-to="' + (s.active ? 0 : 1) + '">' + (s.active ? 'أرشفة' : 'استعادة') + '</button></div></td></tr>';
      }).join('') + '</tbody></table></div>';
    html += '</div>';
    v.innerHTML = html;

    $('#imp').onclick = async function () {
      var names = $('#names').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      if (!names.length) return toast('اكتب اسمًا واحدًا على الأقل.', { bad: true });
      var b = this; b.disabled = true; b.textContent = 'جارٍ الإضافة…';
      var r = await sb.rpc('import_students', { p_class: S.classId, p_names: names });
      b.disabled = false; b.textContent = 'إضافة الطلاب';
      if (r.error) return toast(friendly(r.error), { bad: true });
      S.newCreds = r.data || [];
      toast(S.newCreds.length ? 'أُضيف ' + ar(S.newCreds.length) + ' طالب.' : 'لم يُضف أحد: الأسماء مكررة أو فارغة.');
      await loadClass();
    };
    if (S.newCreds) {
      $('#prn').onclick = function () { window.print(); };
      $('#hide').onclick = function () { S.newCreds = null; render(); };
      $('#csv').onclick = function () {
        downloadCSV('student-cards.csv', [['الاسم', 'الرمز', 'الرقم السري']].concat(S.newCreds.map(function (c) { return [c.full_name, c.code, c.pin]; })));
      };
    }
    v.querySelectorAll('[data-pin]').forEach(function (b) {
      b.onclick = async function () {
        var s = S.students.find(function (x) { return x.id === b.dataset.pin; });
        if (!(await confirmBox('توليد رقم سري جديد للطالب «' + s.full_name + '»؟ سيتوقف الرقم القديم عن العمل.'))) return;
        var r = await sb.rpc('reset_pin', { p_student: s.id });
        if (r.error) return toast(friendly(r.error), { bad: true });
        S.newCreds = [{ full_name: s.full_name, code: s.code, pin: r.data }]; render();
      };
    });
    v.querySelectorAll('[data-mv]').forEach(function (b) {
      b.onclick = function () { openMove(S.students.find(function (x) { return x.id === b.dataset.mv; })); };
    });
    v.querySelectorAll('[data-arc]').forEach(function (b) {
      b.onclick = async function () {
        var s = S.students.find(function (x) { return x.id === b.dataset.arc; }), to = b.dataset.to === '1';
        if (!to && !(await confirmBox('أرشفة «' + s.full_name + '»؟ تبقى نقاطه محفوظة ويمكنك استعادته لاحقًا.'))) return;
        var r = await sb.rpc('set_student_active', { p_student: s.id, p_active: to });
        if (r.error) return toast(friendly(r.error), { bad: true });
        toast(to ? 'تمت الاستعادة.' : 'تمت الأرشفة.'); await loadClass();
      };
    });
  }

  /* نقل طالب إلى فصل آخر */
  function openMove(st) {
    var others = S.classes.filter(function (c) { return c.id !== S.classId; });
    if (!others.length) return toast('لا توجد فصول أخرى متاحة لك.', { bad: true });
    var sc = document.createElement('div'); sc.className = 'scrim';
    sc.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><h2>نقل الطالب</h2>' +
      '<p>' + esc(st.full_name) + '<br><span class="muted">من: ' + esc(className(curClass())) + '</span></p>' +
      '<div class="field"><label class="req" for="mvc">الفصل الجديد</label><select id="mvc">' +
      others.map(function (c) { return '<option value="' + c.id + '">' + esc(className(c)) + '</option>'; }).join('') + '</select></div>' +
      '<p class="muted">تنتقل نقاط الطالب ورتبته معه، ويبقى رمزه ورقمه السري كما هما.</p>' +
      '<div class="row-actions"><button class="btn" id="mvok">نقل الطالب</button><button class="btn ghost" id="mvno">إلغاء</button></div></div>';
    document.body.appendChild(sc);
    function close() { sc.remove(); }
    $('#mvno', sc).onclick = close; sc.onclick = function (e) { if (e.target === sc) close(); };
    $('#mvok', sc).onclick = async function () {
      var b = this, to = $('#mvc', sc).value, tc = S.classes.find(function (c) { return c.id === to; });
      b.disabled = true; b.textContent = 'جارٍ النقل…';
      var r = await sb.rpc('move_student', { p_student: st.id, p_class: to });
      if (r.error) { b.disabled = false; b.textContent = 'نقل الطالب'; return toast(friendly(r.error), { bad: true }); }
      close(); toast('نُقل «' + st.full_name + '» إلى ' + className(tc) + '.', { ms: 6000 }); await loadClass();
    };
  }

  /* ---------- السجل ---------- */
  function viewLog(v) {
    var html = '<h2>آخر العمليات</h2>';
    if (!S.log.length) { v.innerHTML = html + '<div class="card empty">لا عمليات بعد.</div>'; return; }
    var now = Date.now();
    html += '<div class="card tbl-wrap"><table><thead><tr><th>الوقت</th><th>الطالب</th><th>المجال</th><th>النقاط</th><th>المعلم</th><th></th></tr></thead><tbody>' +
      S.log.map(function (e) {
        var canUndo = !e.is_reversal && !e.reversed && (S.me.role === 'admin' || (now - new Date(e.created_at).getTime() < 10 * 60 * 1000 && e.teacher_name === S.me.full_name));
        return '<tr style="' + (e.reversed ? 'opacity:.5;text-decoration:line-through' : '') + '"><td>' + fmtDate(e.created_at) + ' ' + fmtTime(e.created_at) + '</td><td>' + esc(e.student_name) + '</td>' +
          '<td>' + esc(e.is_reversal ? 'تراجع' : e.domain_name || '') + '</td><td class="num">' + (e.points > 0 ? '+' : '−') + ar(Math.abs(e.points)) + '</td><td>' + esc(e.teacher_name) + '</td>' +
          '<td>' + (canUndo ? '<button class="btn small ghost" data-u="' + e.event_id + '">تراجع</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    v.innerHTML = html;
    v.querySelectorAll('[data-u]').forEach(function (b) {
      b.onclick = async function () { if (await confirmBox('التراجع عن هذه النقطة؟')) undo(b.dataset.u); };
    });
  }

  /* ---------- الربط مع الإذاعة ---------- */
  async function viewLink(v) {
    v.innerHTML = '<div class="card empty">جارٍ التحميل…</div>';
    var rs = await Promise.all([
      sb.from('link_sources').select('*').order('source'),
      sb.from('external_events').select('id,source,status,title,event_date,points,raw_name,raw_grade,raw_section,decided_at,students(full_name),classes(grade,section)').order('created_at', { ascending: false }).limit(200)
    ]);
    var srcs = rs[0].data || [], src = srcs.find(function (x) { return x.source === S.linkSrc; }) || srcs[0], ev = (rs[1].data || []).filter(function (e) { return !src || e.source === src.source; });
    if (rs[0].error || !src) { v.innerHTML = '<div class="card empty">الربط غير مفعّل بعد في قاعدة البيانات.</div>'; return; }
    var pend = ev.filter(function (e) { return e.status === 'pending'; });
    var unm = ev.filter(function (e) { return e.status === 'unmatched'; });
    var done = ev.filter(function (e) { return e.status === 'approved' || e.status === 'rejected'; }).slice(0, 15);
    function who(e) { return e.students ? e.students.full_name : e.raw_name; }
    function cls(e) { return e.classes ? className(e.classes) : (e.raw_grade ? GRADES[e.raw_grade] + ' / ' + ar(e.raw_section) : ''); }
    var html = '<div class="row-actions" style="margin-bottom:10px">' + srcs.map(function (x) { return '<button class="btn small' + (x.source === src.source ? '' : ' ghost') + '" data-src="' + x.source + '">' + esc(x.title) + '</button>'; }).join('') + '</div><div class="card"><h2>' + esc(src.title) + '</h2><p class="muted">تصل مشاركات الطلاب إلى هنا «بانتظار الاعتماد»، ولا تُحتسب نقاطًا إلا بعد موافقتك. لا تتكرر المشاركة الواحدة أبدًا.</p>';
    if (S.me.role === 'admin') {
      html += '<div class="row-actions" style="align-items:flex-end"><div class="field" style="min-width:140px"><label for="lkp">نقاط كل مشاركة</label><select id="lkp">' +
        [1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + (n === src.points ? ' selected' : '') + '>' + ar(n) + '</option>'; }).join('') + '</select></div>' +
        '<label style="display:flex;gap:8px;align-items:center;min-height:44px"><input type="checkbox" id="lke"' + (src.enabled ? ' checked' : '') + '> الربط مفعّل</label>' +
        '<button class="btn small" id="lks">حفظ</button><button class="btn small ghost" id="lkk">' + (src.secret_hash ? 'مفتاح جديد' : 'توليد مفتاح الربط') + '</button></div><div id="lkkey"></div>';
    } else html += '<p class="hint">نقاط كل مشاركة: <b>' + ar(src.points) + '</b></p>';
    html += '</div>';
    html += '<div class="card"><h2>بانتظار الاعتماد (' + ar(pend.length) + ')</h2>';
    if (!pend.length) html += '<p class="muted">لا توجد مشاركات معلّقة.</p>';
    else {
      html += '<div class="tbl-wrap"><table><thead><tr><th></th><th>الطالب</th><th>الفصل</th><th>المشاركة</th><th>التاريخ</th></tr></thead><tbody>' +
        pend.map(function (e) { return '<tr><td><input type="checkbox" class="lkc" value="' + e.id + '" checked aria-label="تحديد"></td><td>' + esc(who(e)) + '</td><td>' + esc(cls(e)) + '</td><td>' + esc(e.title || '') + '</td><td>' + (e.event_date ? fmtDate(e.event_date) : '') + '</td></tr>'; }).join('') +
        '</tbody></table></div><div class="row-actions"><button class="btn" id="lka">اعتماد المحدد</button><button class="btn danger" id="lkr">رفض المحدد</button></div>';
    }
    html += '</div>';
    if (unm.length) {
      html += '<div class="card"><h2>لم تُطابَق مع طالب (' + ar(unm.length) + ')</h2><p class="muted">الاسم أو الفصل في الإذاعة يختلف عن المبادرون. صحّح الاسم أو انقل الطالب ثم أعد المزامنة، أو تجاهلها.</p>' +
        '<div class="tbl-wrap"><table><tbody>' + unm.map(function (e) { return '<tr><td>' + esc(e.raw_name) + '</td><td>' + esc(cls(e)) + '</td><td>' + esc(e.title || '') + '</td><td><button class="btn small ghost" data-ig="' + e.id + '">تجاهل</button></td></tr>'; }).join('') + '</tbody></table></div></div>';
    }
    if (done.length) {
      html += '<div class="card"><h2>آخر القرارات</h2><div class="tbl-wrap"><table><tbody>' + done.map(function (e) {
        return '<tr><td>' + esc(who(e)) + '</td><td>' + esc(e.title || '') + '</td><td>' + (e.status === 'approved' ? '+' + ar(e.points) + ' معتمدة' : 'مرفوضة') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    }
    v.innerHTML = html;
    v.querySelectorAll('[data-src]').forEach(function (b) { b.onclick = function () { S.linkSrc = b.dataset.src; viewLink(v); }; });
    function ids() { return Array.prototype.map.call(v.querySelectorAll('.lkc:checked'), function (c) { return c.value; }); }
    var a = $('#lka'), r = $('#lkr');
    if (a) a.onclick = async function () {
      var x = ids(); if (!x.length) return toast('حدّد مشاركة واحدة على الأقل.', { bad: true });
      var res = await sb.rpc('link_approve', { p_ids: x });
      if (res.error) return toast(friendly(res.error), { bad: true });
      toast('اعتُمدت ' + ar(res.data) + ' مشاركة.'); if (S.classId) await loadClass(); viewLink(v);
    };
    if (r) r.onclick = async function () {
      var x = ids(); if (!x.length) return toast('حدّد مشاركة واحدة على الأقل.', { bad: true });
      if (!(await confirmBox('رفض المشاركات المحددة؟'))) return;
      var res = await sb.rpc('link_reject', { p_ids: x });
      if (res.error) return toast(friendly(res.error), { bad: true });
      toast('رُفضت ' + ar(res.data) + '.'); viewLink(v);
    };
    v.querySelectorAll('[data-ig]').forEach(function (b) {
      b.onclick = async function () { var res = await sb.rpc('link_reject', { p_ids: [b.dataset.ig] }); if (res.error) return toast(friendly(res.error), { bad: true }); viewLink(v); };
    });
    async function conf(newSecret) {
      var res = await sb.rpc('link_configure', { p_source: src.source, p_enabled: $('#lke').checked, p_points: +$('#lkp').value, p_new_secret: newSecret });
      if (res.error) { toast(friendly(res.error), { bad: true }); return null; }
      return res;
    }
    var sv = $('#lks'), kk = $('#lkk');
    if (sv) sv.onclick = async function () { if (await conf(false)) { toast('حُفظت الإعدادات.'); viewLink(v); } };
    if (kk) kk.onclick = async function () {
      var res = await conf(true); if (!res) return;
      $('#lkkey').innerHTML = '<div class="card" style="margin-top:10px"><p class="muted">مفتاح الربط — يظهر مرة واحدة فقط، انسخه الآن:</p><p dir="ltr" style="user-select:all;word-break:break-all"><b>' + esc(res.data) + '</b></p></div>';
    };
  }

  /* ---------- الإعدادات والنسخ الاحتياطي ---------- */
  function viewSettings(v) {
    var last = lsGet('mb_backup');
    var html = '<div class="card"><h2>نسخة احتياطية</h2><p class="muted">تنزيل ملف CSV بنقاط الفصل الحالي وسجل عملياته، يُفتح في Excel. آخر نسخة: ' + (last ? fmtDate(last) : 'لم تؤخذ بعد') + '</p>' +
      '<div class="row-actions"><button class="btn" id="bk"' + (S.classId ? '' : ' disabled') + '>تنزيل نسخة الفصل</button></div></div>';
    if (S.me.role === 'admin') {
      html += '<div class="card"><h2>إضافة فصل</h2><div class="row-actions" style="align-items:flex-end">' +
        '<div class="field" style="flex:1;min-width:140px"><label class="req" for="gr">الصف</label><select id="gr">' +
          [4, 5, 6].map(function (g) { return '<option value="' + g + '"' + (g === 4 ? ' selected' : '') + '>' + GRADES[g] + '</option>'; }).join('') + '</select></div>' +
        '<div class="field" style="flex:1;min-width:120px"><label class="req" for="sc">الفصل (أ / ب / ج)</label><input id="sc" maxlength="3" placeholder="أ"></div>' +
        '<button class="btn" id="addc">إضافة</button></div>' +
        '<p class="hint">يُربط الفصل بحسابك تلقائيًا. ولربط معلم آخر استخدم جدول class_teachers في Supabase (الخطوات في ملف README).</p></div>';
    }
    html += '<div class="card"><h2>السقف اليومي</h2><p class="muted">أقصى نقاط يمنحها المعلم للطالب الواحد في اليوم: <b>' + ar(S.cap) + '</b>' +
      (S.me.role === 'admin' ? ' — يُغيَّر من جدول settings (المفتاح daily_cap).' : '') + '</p></div>';
    v.innerHTML = html;
    var bk = $('#bk');
    if (bk) bk.onclick = function () {
      var c = curClass();
      var rows = [['الاسم', 'الرمز', 'المجموع', 'الرتبة']].concat(S.board.map(function (s) { return [s.full_name, s.code, s.total, s.level_name || '']; }));
      rows.push([]); rows.push(['الوقت', 'الطالب', 'المجال', 'النقاط', 'المعلم', 'ملاحظة']);
      S.log.forEach(function (e) { rows.push([new Date(e.created_at).toLocaleString('en-GB'), e.student_name, e.is_reversal ? 'تراجع' : e.domain_name, e.points, e.teacher_name, e.note || '']); });
      downloadCSV('mubadiroon-' + (c ? c.grade + c.section : 'class') + '.csv', rows);
      lsSet('mb_backup', new Date().toISOString()); viewSettings(v);
    };
    var add = $('#addc');
    if (add) add.onclick = async function () {
      var sec = $('#sc').value.trim(), g = +$('#gr').value;
      if (!sec) return toast('اكتب رمز الفصل.', { bad: true });
      var r = await sb.from('classes').insert({ grade: g, section: sec }).select('id').single();
      if (r.error) return toast(/duplicate|unique/i.test(r.error.message) ? 'هذا الفصل موجود من قبل.' : friendly(r.error), { bad: true });
      var uid = (await sb.auth.getUser()).data.user.id;
      var l = await sb.from('class_teachers').insert({ class_id: r.data.id, teacher_id: uid });
      if (l.error) return toast(friendly(l.error), { bad: true });
      toast('أُضيف الفصل.'); await boot();
    };
  }

  /* ---------- أدوات ---------- */
  function downloadCSV(name, rows) {
    var csv = '﻿' + rows.map(function (r) {
      return r.map(function (c) { c = String(c === null || c === undefined ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',');
    }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }

  function confirmBox(text) {
    return new Promise(function (res) {
      var sc = document.createElement('div'); sc.className = 'scrim';
      sc.innerHTML = '<div class="sheet" role="alertdialog" aria-modal="true"><p>' + esc(text) + '</p><div class="row-actions">' +
        '<button class="btn" id="y">تأكيد</button><button class="btn ghost" id="n">إلغاء</button></div></div>';
      document.body.appendChild(sc);
      function done(v) { sc.remove(); res(v); }
      $('#y', sc).onclick = function () { done(true); }; $('#n', sc).onclick = function () { done(false); };
      sc.addEventListener('click', function (e) { if (e.target === sc) done(false); });
      $('#n', sc).focus();
    });
  }

  init();
})();
