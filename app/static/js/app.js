/**
 * Головний модуль управління підсистемою МПЗ.
 * v2.0 — додано ролі, аналітика, AI-рекомендації.
 */
class MPZApplication {
    constructor() {
        this.token = localStorage.getItem('viti_jwt_token');
        this.role  = localStorage.getItem('viti_role') || '';
        this.name  = localStorage.getItem('viti_name') || '';
        this.eventsCache = [];
    }

    // -----------------------------------------------------------------------
    // Ініціалізація
    // -----------------------------------------------------------------------
    init() {
        this.applyLocalization();
        this.setupEventListeners();

        if (this.token) {
            this.showApp();
        } else {
            this.showLogin();
        }
    }

    // -----------------------------------------------------------------------
    // Локалізація (без змін)
    // -----------------------------------------------------------------------
    applyLocalization() {
        const lang = UI_CONFIG.localization;

        const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

        set('pageTitle',        lang.pageTitle);
        set('uiLoginHeader',    lang.loginHeader);
        set('uiLoginUserLabel', lang.loginUserLabel);
        set('uiLoginPassLabel', lang.loginPassLabel);
        set('uiLoginBtn',       lang.loginBtn);
        set('uiTitleMain',      lang.titleMain);
        set('uiTitleSub',       lang.titleSub);
        set('uiBadgeDuty',      lang.badgeDuty);
        set('uiBtnLogout',      lang.btnLogout);
        set('uiFormHeader',     lang.formHeader);
        set('uiLabelTitle',     lang.labelTitle);
        set('uiLabelDate',      lang.labelDate);
        set('uiLabelStatus',    lang.labelStatus);
        set('uiLabelLocation',  lang.labelLocation);
        set('uiLabelResp',      lang.labelResp);
        set('uiBtnSubmit',      lang.btnSubmit);
        set('uiKpiAll',         lang.kpiAll);
        set('uiKpiPlanned',     lang.kpiPlanned);
        set('uiKpiProgress',    lang.kpiProgress);
        set('uiBtnRefresh',     lang.btnRefresh);
        set('uiBtnExportDocx',  lang.btnExportDocx);
        set('thDate',           lang.thDate);
        set('thName',           lang.thName);
        set('thLoc',            lang.thLoc);
        set('thStatus',         lang.thStatus);
    }

    // -----------------------------------------------------------------------
    // Налаштування UI залежно від ролі
    // -----------------------------------------------------------------------
    applyRoleUI() {
        const role = this.role;

        // Показати ім'я та роль у навбарі
        const roleLabels = {
            admin:        '👑 Адміністратор',
            psychologist: '🧠 Психолог',
            commander:    '⭐ Командир',
            staff:        '👤 Персонал',
        };
        const roleColors = {
            admin:        '#f59e0b',
            psychologist: '#a78bfa',
            commander:    '#38bdf8',
            staff:        '#64748b',
        };

        const roleBadge = document.getElementById('uiRoleBadge');
        const userName  = document.getElementById('uiUserName');
        if (roleBadge) {
            roleBadge.textContent = roleLabels[role] || role;
            roleBadge.style.background = (roleColors[role] || '#223147') + '22';
            roleBadge.style.color      = roleColors[role] || '#fff';
            roleBadge.style.borderColor = roleColors[role] || '#223147';
        }
        if (userName) userName.textContent = this.name;

        // Бейдж чергового — приховуємо якщо роль вже показана
        const dutyBadge = document.getElementById('uiBadgeDuty');
        if (dutyBadge) {
            dutyBadge.style.display = 'none';
        }

        // Аналітика — видима для всіх крім staff
        const canSeeAnalytics = ['admin', 'psychologist', 'commander'].includes(role);
        const analyticsSection = document.getElementById('analyticsSection');
        if (analyticsSection) analyticsSection.style.display = canSeeAnalytics ? 'grid' : 'none';

        const kpiSatCard = document.getElementById('kpiSatisfactionCard');
        const kpiAttCard = document.getElementById('kpiAttendanceCard');
        if (kpiSatCard) kpiSatCard.style.display = canSeeAnalytics ? 'flex' : 'none';
        if (kpiAttCard) kpiAttCard.style.display = canSeeAnalytics ? 'flex' : 'none';

        // Форма додавання — тільки admin і psychologist
        const canWrite = ['admin', 'psychologist'].includes(role);
        const formSection = document.getElementById('eventFormSection');
        if (formSection) formSection.style.display = canWrite ? 'block' : 'none';

        // Навігаційні вкладки
        const isAdmin = role === 'admin';
        const navTabs = document.getElementById('navTabs');
        if (navTabs) navTabs.style.display = 'flex';

        // Вкладки профілів і журналу — тільки адмін
        const adminTabs = ['tabUsers', 'tabAudit'];
        adminTabs.forEach(id => {
            const t = document.getElementById(id);
            if (t) t.style.display = isAdmin ? 'inline-block' : 'none';
        });

        // Вкладка аналітики — для admin, psychologist, commander
        const canSeeAnalytics2 = ['admin', 'psychologist', 'commander'].includes(role);
        const tabAnalytics = document.getElementById('tabAnalytics');
        if (tabAnalytics) tabAnalytics.style.display = canSeeAnalytics2 ? 'inline-block' : 'none';
    }

    // -----------------------------------------------------------------------
    // Слухачі форм
    // -----------------------------------------------------------------------
    setupEventListeners() {
        // Логін
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;

                try {
                    const res = await fetch(`${UI_CONFIG.apiBaseUrl}/login`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({username, password})
                    });

                    if (res.ok) {
                        const data = await res.json();
                        this.token = data.token;
                        this.role  = data.role;
                        this.name  = data.name;
                        localStorage.setItem('viti_jwt_token', this.token);
                        localStorage.setItem('viti_role',      this.role);
                        localStorage.setItem('viti_name',      this.name);
                        this.showApp();
                    } else {
                        alert(UI_CONFIG.localization.loginError);
                    }
                } catch (err) {
                    console.error('Помилка мережі при авторизації:', err);
                }
            });
        }

        // Форма заходу
        const eventForm = document.getElementById('eventForm');
        if (eventForm) {
            eventForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const eventData = {
                    title:       document.getElementById('title').value,
                    date:        document.getElementById('date').value,
                    location:    document.getElementById('location').value,
                    responsible: document.getElementById('responsible').value,
                    status:      document.getElementById('status').value
                };

                const res = await fetch(`${UI_CONFIG.apiBaseUrl}/events`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify(eventData)
                });

                if (res.ok) {
                    document.getElementById('eventForm').reset();
                    document.getElementById('date').valueAsDate = new Date();
                    this.load();
                }
            });
        }
    }

    // -----------------------------------------------------------------------
    // Показ / приховування екранів
    // -----------------------------------------------------------------------
    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }

    showApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';

        const dateInput = document.getElementById('date');
        if (dateInput) dateInput.valueAsDate = new Date();

        this.applyRoleUI();
        this.load();
    }

    logout() {
        localStorage.removeItem('viti_jwt_token');
        localStorage.removeItem('viti_role');
        localStorage.removeItem('viti_name');
        this.token = null;
        this.role  = '';
        this.name  = '';
        this.showLogin();
    }

    // -----------------------------------------------------------------------
    // Завантаження даних
    // -----------------------------------------------------------------------
    async load() {
        if (!this.token) return;

        try {
            const res = await fetch(`${UI_CONFIG.apiBaseUrl}/events`, {
                headers: {'Authorization': `Bearer ${this.token}`}
            });
            if (res.status === 401) return this.logout();

            this.eventsCache = await res.json();
            this.renderKPI();
            this.renderTable('Усі');

            // Завантажуємо аналітику якщо є доступ
            const canSeeAnalytics = ['admin', 'psychologist', 'commander'].includes(this.role);
            if (canSeeAnalytics) {
                this.loadAnalytics();
                this.loadAI();
            }

        } catch (err) {
            console.error('Помилка завантаження реєстру заходів:', err);
        }
    }

    // -----------------------------------------------------------------------
    // Аналітика
    // -----------------------------------------------------------------------
    async loadAnalytics() {
        try {
            const headers = {'Authorization': `Bearer ${this.token}`};

            const [summaryRes, categoriesRes, unitsRes] = await Promise.all([
                fetch(`${UI_CONFIG.apiBaseUrl}/analytics/summary`,    {headers}),
                fetch(`${UI_CONFIG.apiBaseUrl}/analytics/categories`, {headers}),
                fetch(`${UI_CONFIG.apiBaseUrl}/analytics/units`,      {headers}),
            ]);

            const summary    = await summaryRes.json();
            const categories = await categoriesRes.json();
            const units      = await unitsRes.json();

            // Оновлюємо KPI картки задоволеності і явки
            const kpiSat = document.getElementById('kpiSatisfaction');
            const kpiAtt = document.getElementById('kpiAttendance');
            if (kpiSat) kpiSat.textContent = summary.avg_satisfaction > 0 ? summary.avg_satisfaction + ' / 5' : '—';
            if (kpiAtt) kpiAtt.textContent = summary.avg_attendance_pct > 0 ? summary.avg_attendance_pct + '%' : '—';

            this.renderCategoryRating(categories);
            this.renderUnitActivity(units);
        } catch (err) {
            console.error('Помилка завантаження аналітики:', err);
        }
    }

    renderCategoryRating(categories) {
        const el = document.getElementById('categoryRating');
        if (!el) return;

        if (!categories.length) {
            el.innerHTML = '<p class="muted-text">Немає даних</p>';
            return;
        }

        const maxSat = 5;
        el.innerHTML = categories.map((c, i) => {
            const pct = Math.round((c.avg_satisfaction / maxSat) * 100);
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
            const barColor = i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#223147';

            return `
            <div class="rating-row">
                <div class="rating-meta">
                    <span class="rating-medal">${medal}</span>
                    <span class="rating-name">${c.category_label}</span>
                    <span class="rating-score">${c.avg_satisfaction > 0 ? c.avg_satisfaction + '/5' : '—'}</span>
                </div>
                <div class="rating-bar-track">
                    <div class="rating-bar-fill" style="width:${pct}%; background:${barColor};"></div>
                </div>
                <div class="rating-stats">
                    <span>Явка: ${c.avg_attendance_pct}%</span>
                    <span>${c.event_count} заходів</span>
                </div>
            </div>`;
        }).join('');
    }

    renderUnitActivity(units) {
        const el = document.getElementById('unitActivity');
        if (!el) return;

        if (!units.length) {
            el.innerHTML = '<p class="muted-text">Немає даних</p>';
            return;
        }

        const maxCount = units[0].event_count || 1;

        el.innerHTML = units.map((u, i) => {
            const pct = Math.round((u.event_count / maxCount) * 100);
            const isTop = i === 0;
            return `
            <div class="unit-row ${isTop ? 'unit-top' : ''}">
                <div class="unit-meta">
                    <span class="unit-name">${isTop ? '⭐ ' : ''}${u.unit_name}</span>
                    <span class="unit-count">${u.event_count} заходів</span>
                </div>
                <div class="rating-bar-track">
                    <div class="rating-bar-fill" style="width:${pct}%; background:${isTop ? '#38bdf8' : '#223147'};"></div>
                </div>
            </div>`;
        }).join('');
    }

    // -----------------------------------------------------------------------
    // AI рекомендації
    // -----------------------------------------------------------------------
    async loadAI(analyticsPage = false) {
        const elId = analyticsPage ? 'aAiRecommendations' : 'aiRecommendations';
        const el = document.getElementById(elId);
        if (!el) return;
        el.innerHTML = '<p class="muted-text">⏳ Аналіз даних...</p>';

        try {
            const res = await fetch(`${UI_CONFIG.apiBaseUrl}/ai/recommendations?mode=rules`, {
                headers: {'Authorization': `Bearer ${this.token}`}
            });
            const data = await res.json();
            this.renderAI(data.recommendations, elId);
        } catch (err) {
            el.innerHTML = '<p class="muted-text">Помилка завантаження рекомендацій</p>';
        }
    }

    renderAI(recommendations, elId = 'aiRecommendations') {
        const el = document.getElementById(elId);
        if (!el) return;

        if (!recommendations || !recommendations.length) {
            el.innerHTML = '<p class="muted-text ai-ok">✅ Система не виявила проблем. Усі показники в нормі.</p>';
            return;
        }

        const icons = { warning: '⚠️', suggestion: '💡', positive: '✅', info: 'ℹ️' };
        const colors = {
            warning:    { bg: 'rgba(239,68,68,0.08)',   border: '#ef4444', text: '#fca5a5' },
            suggestion: { bg: 'rgba(251,191,36,0.08)',  border: '#fbbf24', text: '#fde68a' },
            positive:   { bg: 'rgba(52,211,153,0.08)',  border: '#34d399', text: '#6ee7b7' },
            info:       { bg: 'rgba(56,189,248,0.08)',  border: '#38bdf8', text: '#7dd3fc' },
        };

        el.innerHTML = recommendations.map(r => {
            const c = colors[r.type] || colors.info;
            return `
            <div class="ai-rec-card" style="background:${c.bg}; border-left: 3px solid ${c.border};">
                <span class="ai-rec-icon">${icons[r.type] || 'ℹ️'}</span>
                <p class="ai-rec-text" style="color:${c.text};">${r.message}</p>
            </div>`;
        }).join('');
    }

    // -----------------------------------------------------------------------
    // KPI / таблиця / фільтри / експорт (без змін)
    // -----------------------------------------------------------------------
    renderKPI() {
        if (!document.getElementById('kpiTotal')) return;
        document.getElementById('kpiTotal').textContent    = this.eventsCache.length;
        document.getElementById('kpiPlanned').textContent  = this.eventsCache.filter(e => e.status === 'Заплановано').length;
        document.getElementById('kpiProgress').textContent = this.eventsCache.filter(e => e.status === 'У процесі').length;
    }

    renderTable(filterStatus) {
        const tbody = document.getElementById('eventsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const filtered = filterStatus === 'Усі'
            ? this.eventsCache
            : this.eventsCache.filter(e => e.status === filterStatus);

        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b; padding:20px;">${UI_CONFIG.localization.emptyTable}</td></tr>`;
            return;
        }

        const canWrite = ['admin', 'psychologist'].includes(this.role);

        filtered.forEach(e => {
            const statusMap = {
                'Заплановано': 'planned',
                'У процесі':   'progress',
                'Завершено':   'done',
                'Скасовано':   'cancelled',
            };
            const cls = statusMap[e.status] || 'done';
            const satHtml = e.satisfaction_score > 0
                ? `<span class="sat-stars">★ ${e.satisfaction_score}</span>`
                : '';

            const statusCell = canWrite
                ? `<select class="status-inline" onchange="app.changeStatus(${e.id}, this.value)">
                        <option value="Заплановано" ${e.status==='Заплановано'?'selected':''}>Заплановано</option>
                        <option value="У процесі"   ${e.status==='У процесі'  ?'selected':''}>У процесі</option>
                        <option value="Завершено"   ${e.status==='Завершено'  ?'selected':''}>Завершено</option>
                        <option value="Скасовано"   ${e.status==='Скасовано'  ?'selected':''}>Скасовано</option>
                   </select>`
                : `<span class="status-badge ${cls}">${e.status}</span>`;

            const deleteBtn = canWrite
                ? `<button class="btn-delete" onclick="app.deleteEvent(${e.id})" title="Видалити захід">✕</button>`
                : '';

            const qrBtn = `<button class="btn-refresh" style="padding:3px 8px;font-size:0.65rem;" onclick="app.showQR(${e.id}, '${e.title.replace(/'/g,'').substring(0,30)}', ${e.attendance || 0})" title="QR-код">QR</button>`;

            tbody.innerHTML += `
                <tr>
                    <td class="date-col">${e.date}</td>
                    <td class="title-col">${e.title}${satHtml ? '<br>' + satHtml : ''}</td>
                    <td><div>${e.location || '—'}</div><div style="font-size:0.75rem; color:var(--text-muted);">${e.responsible || '—'}</div></td>
                    <td style="text-align:center;">${statusCell}</td>
                    <td style="text-align:center;">${qrBtn}</td>
                    <td style="text-align:center; width:40px;">${deleteBtn}</td>
                </tr>`;
        });
    }

    async changeStatus(eventId, newStatus) {
        try {
            const res = await fetch(`${UI_CONFIG.apiBaseUrl}/events/${eventId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                // Оновлюємо кеш без повного перезавантаження
                const updated = await res.json();
                const idx = this.eventsCache.findIndex(e => e.id === eventId);
                if (idx !== -1) this.eventsCache[idx] = updated;
                // Перемалюємо тільки таблицю
                const activeFilter = document.querySelector('.btn-filter.active');
                const status = activeFilter ? activeFilter.textContent.trim() : 'Усі';
                this.renderTable(status === 'В процесі' ? 'У процесі' : status);
                this.toast('Статус оновлено', 'success');
            }
        } catch (err) {
            this.toast('Помилка зміни статусу', 'error');
        }
    }

    async deleteEvent(eventId) {
        if (!confirm('Видалити цей захід з реєстру?')) return;
        try {
            const res = await fetch(`${UI_CONFIG.apiBaseUrl}/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) {
                this.eventsCache = this.eventsCache.filter(e => e.id !== eventId);
                this.renderKPI();
                const activeFilter = document.querySelector('.btn-filter.active');
                const status = activeFilter ? activeFilter.textContent.trim() : 'Усі';
                this.renderTable(status === 'В процесі' ? 'У процесі' : status);
            }
        } catch (err) {
            console.error('Помилка видалення:', err);
        }
    }


    // -----------------------------------------------------------------------
    // Перемикання вкладок
    // -----------------------------------------------------------------------
    switchTab(tab) {
        // Ховаємо всі сторінки
        ['pageEvents', 'pageAnalytics', 'pageUsers', 'pageAudit'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        // Знімаємо активний клас з усіх вкладок
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

        // Показуємо потрібну сторінку
        const pageMap = {
            events:    'pageEvents',
            analytics: 'pageAnalytics',
            users:     'pageUsers',
            audit:     'pageAudit',
        };
        const tabMap = {
            events:    'tabEvents',
            analytics: 'tabAnalytics',
            users:     'tabUsers',
            audit:     'tabAudit',
        };

        const page = document.getElementById(pageMap[tab]);
        const btn  = document.getElementById(tabMap[tab]);
        if (page) page.style.display = tab === 'events' ? 'grid' : 'block';
        if (btn)  btn.classList.add('active');

        // Завантажуємо дані при переході
        if (tab === 'analytics') this.loadAnalyticsPage();
        if (tab === 'users')     this.loadUsers();
        if (tab === 'audit')     this.loadAudit();
    }

    // -----------------------------------------------------------------------
    // Аналітика — окрема вкладка
    // -----------------------------------------------------------------------
    async loadAnalyticsPage() {
        try {
            const headers = {'Authorization': `Bearer ${this.token}`};
            const [summaryRes, categoriesRes, unitsRes] = await Promise.all([
                fetch(`${UI_CONFIG.apiBaseUrl}/analytics/summary`,    {headers}),
                fetch(`${UI_CONFIG.apiBaseUrl}/analytics/categories`, {headers}),
                fetch(`${UI_CONFIG.apiBaseUrl}/analytics/units`,      {headers}),
            ]);
            const summary    = await summaryRes.json();
            const categories = await categoriesRes.json();
            const units      = await unitsRes.json();

            // KPI
            const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
            set('aKpiTotal',   summary.total_events);
            set('aKpiPlanned', summary.planned_events);
            set('aKpiSat',     summary.avg_satisfaction > 0 ? summary.avg_satisfaction + ' / 5' : '—');
            set('aKpiAtt',     summary.avg_attendance_pct > 0 ? summary.avg_attendance_pct + '%' : '—');

            // Рейтинг категорій
            const catEl = document.getElementById('aCategoryRating');
            if (catEl) {
                const maxSat = 5;
                catEl.innerHTML = categories.map((c, i) => {
                    const pct = Math.round((c.avg_satisfaction / maxSat) * 100);
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
                    const barColor = i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#223147';
                    return `<div class="rating-row">
                        <div class="rating-meta">
                            <span class="rating-medal">${medal}</span>
                            <span class="rating-name">${c.category_label}</span>
                            <span class="rating-score">${c.avg_satisfaction > 0 ? c.avg_satisfaction+'/5' : '—'}</span>
                        </div>
                        <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${pct}%;background:${barColor};"></div></div>
                        <div class="rating-stats"><span>Явка: ${c.avg_attendance_pct}%</span><span>${c.event_count} заходів</span></div>
                    </div>`;
                }).join('');
            }

            // Активність підрозділів
            const unitEl = document.getElementById('aUnitActivity');
            if (unitEl) {
                const maxCount = units[0]?.event_count || 1;
                unitEl.innerHTML = units.map((u, i) => {
                    const pct = Math.round((u.event_count / maxCount) * 100);
                    const isTop = i === 0;
                    return `<div class="unit-row ${isTop ? 'unit-top' : ''}">
                        <div class="unit-meta">
                            <span class="unit-name">${isTop ? '⭐ ' : ''}${u.unit_name}</span>
                            <span class="unit-count">${u.event_count} заходів</span>
                        </div>
                        <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${pct}%;background:${isTop?'#38bdf8':'#223147'};"></div></div>
                    </div>`;
                }).join('');
            }

            // AI
            this.loadAI(true);
        } catch(err) { console.error('Помилка завантаження аналітики:', err); }
    }

    // -----------------------------------------------------------------------
    // Управління користувачами
    // -----------------------------------------------------------------------
    async loadUsers() {
        try {
            const res = await fetch(`${UI_CONFIG.apiBaseUrl}/users`, {
                headers: {'Authorization': `Bearer ${this.token}`}
            });
            if (!res.ok) return;
            const users = await res.json();
            this.renderUsersTable(users);
        } catch(err) { console.error('Помилка завантаження користувачів:', err); }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        const roleLabels = { admin:'👑 Адмін', psychologist:'🧠 Психолог', commander:'⭐ Командир', staff:'👤 Персонал' };
        tbody.innerHTML = users.map(u => `
            <tr>
                <td class="date-col">${u.username}</td>
                <td class="title-col">${u.last_name} ${u.first_name}</td>
                <td><div>${u.rank || '—'}</div><div style="font-size:0.75rem;color:#64748b;">${u.position || '—'}</div></td>
                <td>${u.unit || '—'}</td>
                <td><span class="role-badge" style="font-size:0.7rem;">${roleLabels[u.role] || u.role}</span></td>
                <td style="text-align:center;">${u.gender === 'F' ? '♀️' : '♂️'}</td>
                <td style="text-align:center; display:flex; gap:6px; justify-content:center;">
                    <button class="btn-refresh" style="padding:4px 10px; font-size:0.72rem;" onclick="app.editUser(${u.id})">✏️</button>
                    <button class="btn-delete" onclick="app.confirmDeleteUser(${u.id}, '${u.username}')" title="Видалити">✕</button>
                </td>
            </tr>`).join('');
    }

    openUserModal(user = null) {
        document.getElementById('userModal').style.display = 'flex';
        document.getElementById('modalErrors').style.display = 'none';
        document.getElementById('loginFields').style.display = user ? 'none' : 'grid';
        document.getElementById('modalTitle').textContent = user ? 'Редагувати профіль' : 'Додати профіль';
        document.getElementById('modalUserId').value = user ? user.id : '';
        document.getElementById('mFirstName').value = user ? user.first_name : '';
        document.getElementById('mLastName').value  = user ? user.last_name  : '';
        document.getElementById('mRank').value      = user ? user.rank       : '';
        document.getElementById('mPosition').value  = user ? user.position   : '';
        document.getElementById('mGender').value    = user ? user.gender     : 'M';
        document.getElementById('mUnit').value      = user ? user.unit       : 'Керівництво';
        document.getElementById('mRole').value      = user ? user.role       : 'staff';
        if (!user) {
            document.getElementById('mUsername').value = '';
            document.getElementById('mPassword').value = '';
        }
    }

    closeUserModal() {
        document.getElementById('userModal').style.display = 'none';
    }

    async editUser(userId) {
        const res = await fetch(`${UI_CONFIG.apiBaseUrl}/users`, {
            headers: {'Authorization': `Bearer ${this.token}`}
        });
        const users = await res.json();
        const user = users.find(u => u.id === userId);
        if (user) this.openUserModal(user);
    }

    async saveUser() {
        const userId = document.getElementById('modalUserId').value;
        const isEdit = !!userId;
        const data = {
            first_name: document.getElementById('mFirstName').value.trim(),
            last_name:  document.getElementById('mLastName').value.trim(),
            rank:       document.getElementById('mRank').value,
            position:   document.getElementById('mPosition').value.trim(),
            gender:     document.getElementById('mGender').value,
            unit:       document.getElementById('mUnit').value,
            role:       document.getElementById('mRole').value,
        };
        if (!isEdit) {
            data.username = document.getElementById('mUsername').value.trim();
            data.password = document.getElementById('mPassword').value;
        }

        const url    = isEdit ? `${UI_CONFIG.apiBaseUrl}/users/${userId}` : `${UI_CONFIG.apiBaseUrl}/users`;
        const method = isEdit ? 'PATCH' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {'Content-Type':'application/json','Authorization':`Bearer ${this.token}`},
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) {
                const errEl = document.getElementById('modalErrors');
                errEl.style.display = 'block';
                errEl.innerHTML = (result.errors || [result.error]).map(e => `<p>⚠️ ${e}</p>`).join('');
                return;
            }
            this.closeUserModal();
            this.loadUsers();
            this.loadAudit();
        } catch(err) { console.error(err); }
    }

    async confirmDeleteUser(userId, username) {
        if (!confirm(`Видалити користувача «${username}»?`)) return;
        const res = await fetch(`${UI_CONFIG.apiBaseUrl}/users/${userId}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${this.token}`}
        });
        if (res.ok) { this.loadUsers(); this.loadAudit(); }
        else {
            const d = await res.json();
            alert(d.error || 'Помилка видалення');
        }
    }

    // -----------------------------------------------------------------------
    // Журнал дій
    // -----------------------------------------------------------------------
    async loadAudit() {
        try {
            const res = await fetch(`${UI_CONFIG.apiBaseUrl}/audit`, {
                headers: {'Authorization': `Bearer ${this.token}`}
            });
            if (!res.ok) return;
            const logs = await res.json();
            this.renderAuditTable(logs);
        } catch(err) { console.error('Помилка завантаження журналу:', err); }
    }

    renderAuditTable(logs) {
        const tbody = document.getElementById('auditTableBody');
        if (!tbody) return;
        const actionLabels = { create:'✅ Створено', update:'✏️ Змінено', delete:'🗑️ Видалено' };
        const actionColors = { create:'#34d399', update:'#fbbf24', delete:'#f87171' };
        if (!logs.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#64748b;padding:20px;">Журнал порожній</td></tr>';
            return;
        }
        tbody.innerHTML = logs.map(l => `
            <tr>
                <td class="date-col">${l.created_at}</td>
                <td style="color:#38bdf8;">${l.username}</td>
                <td><span style="color:${actionColors[l.action]||'#fff'};font-weight:600;">${actionLabels[l.action]||l.action}</span></td>
                <td style="font-size:0.8rem;">${l.detail}</td>
            </tr>`).join('');
    }


    // -----------------------------------------------------------------------
    // Toast сповіщення
    // -----------------------------------------------------------------------
    toast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const icons = { success: '✓', error: '✕', warning: '⚠' };
        const el = document.createElement('div');
        el.className = `toast ${type !== 'success' ? type : ''}`;
        el.innerHTML = `<span>${icons[type] || '✓'}</span><span>${message}</span>`;
        container.appendChild(el);
        setTimeout(() => el.remove(), 3200);
    }

    // -----------------------------------------------------------------------
    // Export modal
    // -----------------------------------------------------------------------
    openExportModal() {
        const el = document.getElementById('exportModal');
        if (el) el.style.display = 'flex';
    }

    closeExportModal() {
        const el = document.getElementById('exportModal');
        if (el) el.style.display = 'none';
    }

    // -----------------------------------------------------------------------
    // QR-код
    // -----------------------------------------------------------------------
    async showQR(eventId, eventTitle, attendance) {
        try {
            const res = await fetch(`${UI_CONFIG.apiBaseUrl}/events/${eventId}/qr`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!res.ok) return;
            const data = await res.json();

            document.getElementById('qrImage').src = data.qr_base64;
            document.getElementById('qrEventName').textContent = eventTitle;
            document.getElementById('qrAttendance').textContent = attendance || 0;
            document.getElementById('qrModal').style.display = 'flex';

            // Store current event id for list loading
            document.getElementById('qrModal').dataset.eventId = eventId;

            // Load attendance list
            this.loadAttendanceList(eventId);
        } catch(err) { console.error('QR error:', err); }
    }

    async loadAttendanceList(eventId) {
        try {
            const res = await fetch(`${UI_CONFIG.apiBaseUrl}/attend/${eventId}/list`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!res.ok) return;
            const list = await res.json();

            const container = document.getElementById('qrAttendanceList');
            if (!container) return;

            if (list.length === 0) {
                container.innerHTML = '<div style="color:var(--text-muted);font-family:var(--font-mono);font-size:0.72rem;text-align:center;padding:8px;">Ще нікого не зареєстровано</div>';
                return;
            }

            container.innerHTML = list.map((r, i) => `
                <div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:0.72rem;">
                    <span style="color:var(--text-muted);min-width:20px;">${i+1}.</span>
                    <span style="color:var(--text-main);flex:1;">${r.rank ? r.rank + ' ' : ''}${r.full_name}</span>
                    <span style="color:var(--text-muted);">${r.group_name || ''}</span>
                    <span style="color:var(--text-muted);font-size:0.65rem;">${r.created_at}</span>
                </div>
            `).join('');

            // Update counter
            document.getElementById('qrAttendance').textContent = list.length;
        } catch(err) { console.error('Attendance list error:', err); }
    }

    closeQRModal() {
        document.getElementById('qrModal').style.display = 'none';
    }

    filter(status, btn) {
        document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderTable(status === 'В процесі' ? 'У процесі' : status);
    }

    async exportFile(type) {
        this.toast(`Генерація ${type.toUpperCase()}...`, 'success');
        try {
            const res = await fetch(`${UI_CONFIG.apiBaseUrl}/report/${type}`, {
                headers: {'Authorization': `Bearer ${this.token}`}
            });
            if (res.ok) {
                const blob = await res.blob();
                const url  = window.URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href = url;
                a.download = `raport_mpz.${type}`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                this.toast(`Документ ${type.toUpperCase()} завантажено`, 'success');
            } else {
                this.toast('Помилка генерації документа', 'error');
            }
        } catch (err) {
            this.toast('Помилка мережі', 'error');
        }
    }
}

const app = new MPZApplication();
window.addEventListener('DOMContentLoaded', () => { app.init(); });
