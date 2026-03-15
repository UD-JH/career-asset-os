/* ─── Career Asset OS v5.1 ─── */

const STORAGE_KEY = 'career-asset-os-data-v5';
const AUTH_KEY = 'career-asset-os-auth-v1';
const SITE_PASSWORD = 'jiheon0409';

// Supabase 값을 여기에 넣어줘.
const SUPABASE_URL = 'https://qhndtmybuyopztxqswqc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_whlWNk_L6g_lnABT9UNOkw_GW31-I3E';

/* ─── State ─── */
const state = {
  works: [],
  selectedId: null,
  editingId: null,
  cloud: { enabled: false, client: null, user: null },
};

/* ─── DOM References ─── */
const el = {};

function cacheDom() {
  const ids = [
    'authGate', 'appRoot', 'authForm', 'passwordInput', 'authError',
    'logoutBtn', 'workForm', 'workList', 'detailView', 'detailEmpty',
    'totalWorks', 'totalAssets', 'topSkill', 'monthlyWorkCount',
    'exportBtn', 'mdExportBtn', 'importInput', 'searchInput',
    'projectFilter', 'skillFilter', 'listSummary', 'seedBtn',
    'formTitle', 'formModeHint', 'cancelEditBtn', 'submitBtn',
    'skillMap', 'skillSummary', 'assetLibrary', 'assetSummary',
    'monthPicker', 'monthlySummary', 'syncEmail', 'sendMagicLinkBtn',
    'syncDownBtn', 'syncUpBtn', 'cloudSignOutBtn', 'cloudStatus',
  ];
  ids.forEach(id => { el[id] = document.getElementById(id); });
  // alias
  el.form = el.workForm;
}

/* ─── Utility ─── */
function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}

function nl2br(text) {
  return escapeHtml(text || '').replace(/\n/g, '<br>');
}

function parseSkills(value) {
  return String(value || '').split(',').map(v => v.trim()).filter(Boolean);
}

function debounce(fn, ms = 200) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

/* ─── Data Normalization ─── */
function normalizeWork(work) {
  return {
    id: work.id || uid(),
    title: work.title || '',
    date: work.date || '',
    project: work.project || '',
    category: work.category || '',
    summary: work.summary || '',
    role: work.role || '',
    tools: work.tools || '',
    link: work.link || '',
    problem: work.problem || '',
    action: work.action || '',
    result: work.result || '',
    lesson: work.lesson || '',
    skills: Array.isArray(work.skills) ? work.skills : [],
    asset: work.asset && work.asset.name ? { name: work.asset.name, type: work.asset.type || '' } : null,
    createdAt: work.createdAt || new Date().toISOString(),
    updatedAt: work.updatedAt || null,
  };
}

/* ─── Persistence (localStorage) ─── */
function saveLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ works: state.works }));
  } catch (e) {
    console.warn('localStorage 저장 실패:', e);
  }
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY)
    || localStorage.getItem('career-asset-os-data-v4')
    || localStorage.getItem('career-asset-os-data-v3')
    || localStorage.getItem('career-asset-os-data-v2')
    || localStorage.getItem('career-asset-os-data-v1');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.works = Array.isArray(parsed.works) ? parsed.works.map(normalizeWork) : [];
  } catch (e) {
    console.error('localStorage 파싱 실패:', e);
  }
}

/* ─── Auth (Password Gate) ─── */
function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === '1';
}

/*
  핵심 수정: hidden 클래스의 !important 충돌 제거.
  - authGate: hidden 속성(HTML native)으로 제어
  - appRoot: .is-active 클래스로 display:grid 전환 (hidden 클래스 미사용)
  - detailView: .detail-view-hidden / .detail-view-visible 전용 클래스 사용
*/
function showApp() {
  el.authGate.setAttribute('hidden', '');
  el.appRoot.classList.add('is-active');
  if (el.authError) el.authError.setAttribute('hidden', '');
}

function showGate() {
  el.authGate.removeAttribute('hidden');
  el.appRoot.classList.remove('is-active');
  if (el.passwordInput) el.passwordInput.value = '';
  if (el.authError) el.authError.setAttribute('hidden', '');
}

function normalizePassword(value) {
  return String(value || '').normalize('NFC').replace(/\r?\n/g, '').trim();
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const entered = normalizePassword(el.passwordInput?.value);
  const expected = normalizePassword(SITE_PASSWORD);

  if (entered === expected) {
    localStorage.setItem(AUTH_KEY, '1');
    showApp();
    return;
  }
  if (el.authError) el.authError.removeAttribute('hidden');
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  showGate();
}

/* ─── Month Picker ─── */
function setDefaultMonthPicker() {
  const dates = state.works.map(w => w.date).filter(Boolean).sort().reverse();
  const basis = dates[0] || new Date().toISOString().slice(0, 10);
  if (el.monthPicker) el.monthPicker.value = basis.slice(0, 7);
}

/* ─── Career Outputs ─── */
function buildOutputs(work) {
  const summary = work.summary || work.problem || '주어진 과제';
  const action = work.action || '문제를 구조화하고 실행했다';
  const result = work.result || '실무 흐름을 개선했다';
  const skillsText = (work.skills || []).length ? work.skills.join(', ') : '핵심 실무 역량';

  return {
    resume: `- ${summary}를 다루는 과정에서 ${action}하고, ${result}로 이어지도록 기여함.`,
    portfolio: `배경: ${summary}\n문제: ${work.problem || '문제 정의 보강 필요'}\n행동: ${action}\n결과: ${result}\n의미: 이 경험은 ${skillsText}을 실제 업무 맥락에서 증명하는 사례가 된다.`,
    star: `S: ${summary}\nT: ${work.problem || '해결해야 할 과제가 있었다.'}\nA: ${action}\nR: ${result}`,
  };
}

/* ─── Computed Data ─── */
function getSkillFrequency(works = state.works) {
  const freq = {};
  works.forEach(w => (w.skills || []).forEach(s => { freq[s] = (freq[s] || 0) + 1; }));
  return Object.entries(freq).sort((a, b) => b[1] - a[1]);
}

function getProjectOptions() {
  return [...new Set(state.works.map(w => w.project).filter(Boolean))].sort();
}

function getSkillOptions() {
  return [...new Set(state.works.flatMap(w => w.skills || []).filter(Boolean))].sort();
}

function populateFilters() {
  const currentProject = el.projectFilter.value;
  const currentSkill = el.skillFilter.value;
  const projects = getProjectOptions();
  const skills = getSkillOptions();

  el.projectFilter.innerHTML = '<option value="">모든 프로젝트</option>'
    + projects.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  el.skillFilter.innerHTML = '<option value="">모든 역량</option>'
    + skills.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');

  el.projectFilter.value = projects.includes(currentProject) ? currentProject : '';
  el.skillFilter.value = skills.includes(currentSkill) ? currentSkill : '';
}

function getFilteredWorks() {
  const query = el.searchInput.value.trim().toLowerCase();
  const project = el.projectFilter.value;
  const skill = el.skillFilter.value;

  return [...state.works]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .filter(w => {
      if (query && ![w.title, w.project, w.summary, w.problem, ...(w.skills || [])]
        .filter(Boolean).join(' ').toLowerCase().includes(query)) return false;
      if (project && w.project !== project) return false;
      if (skill && !(w.skills || []).includes(skill)) return false;
      return true;
    });
}

/* ─── Render Functions ─── */
function renderStats() {
  el.totalWorks.textContent = state.works.length;
  el.totalAssets.textContent = state.works.filter(w => w.asset && w.asset.name).length;
  const top = getSkillFrequency()[0];
  el.topSkill.textContent = top ? top[0] : '-';
  const month = el.monthPicker.value;
  const monthly = month ? state.works.filter(w => String(w.date || '').startsWith(month)) : [];
  el.monthlyWorkCount.textContent = monthly.length;
}

function renderSkillMap() {
  const entries = getSkillFrequency();
  if (!entries.length) {
    el.skillSummary.textContent = '역량 데이터가 아직 없습니다.';
    el.skillMap.innerHTML = '<div class="empty-state">업무에 역량 태그를 넣으면 Skill Map이 여기에 쌓입니다.</div>';
    return;
  }
  const max = entries[0][1] || 1;
  const total = entries.reduce((sum, [, c]) => sum + c, 0);
  el.skillSummary.textContent = `총 ${entries.length}개 역량 / 누적 태그 ${total}개`;
  el.skillMap.innerHTML = entries.map(([skill, count]) => {
    const pct = Math.max(8, Math.round((count / max) * 100));
    return `<div class="skill-row">
      <div class="skill-name">${escapeHtml(skill)}</div>
      <div class="skill-bar"><div class="skill-bar-fill" style="width:${pct}%"></div></div>
      <div class="skill-value">${count}</div>
    </div>`;
  }).join('');
}

function renderList() {
  const items = getFilteredWorks();
  el.listSummary.textContent = `${items.length}개 표시 / 전체 ${state.works.length}개`;

  if (!items.length) {
    el.workList.innerHTML = '<div class="empty-state">조건에 맞는 업무가 없습니다.</div>';
    return;
  }

  el.workList.innerHTML = items.map(w => `
    <div class="work-item${w.id === state.selectedId ? ' active' : ''}" data-id="${w.id}">
      <h3>${escapeHtml(w.title)}</h3>
      <div class="meta">${escapeHtml(w.date || '')} · ${escapeHtml(w.project || '-')} · ${escapeHtml(w.category || '-')}</div>
      <div class="meta">${escapeHtml(w.summary || '')}</div>
      <div class="tag-list">
        ${(w.skills || []).map(s => `<span class="tag">${escapeHtml(s)}</span>`).join('')}
        ${w.asset?.name ? `<span class="tag asset-tag">${escapeHtml(w.asset.name)}</span>` : ''}
      </div>
    </div>`).join('');

  // 이벤트 위임 대신 개별 바인딩 (항목 수가 적으므로 OK)
  el.workList.querySelectorAll('.work-item').forEach(node => {
    node.addEventListener('click', () => {
      state.selectedId = node.dataset.id;
      renderDetail();
      renderList();
    });
  });
}

function renderAssets() {
  const assets = state.works.filter(w => w.asset?.name).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  el.assetSummary.textContent = assets.length ? `총 ${assets.length}개 자산` : '아직 자산이 없습니다.';

  if (!assets.length) {
    el.assetLibrary.innerHTML = '<div class="empty-state">업무에 자산 이름을 넣으면 Asset Library에 모입니다.</div>';
    return;
  }

  el.assetLibrary.innerHTML = assets.map(w => `
    <div class="asset-item">
      <h3>${escapeHtml(w.asset.name)}</h3>
      <div class="meta">${escapeHtml(w.asset.type || '-')} · ${escapeHtml(w.project || '-')} · ${escapeHtml(w.date || '')}</div>
      <div class="meta">원본 업무: ${escapeHtml(w.title)}</div>
      <div class="tag-list">${(w.skills || []).map(s => `<span class="tag">${escapeHtml(s)}</span>`).join('')}</div>
    </div>`).join('');
}

function renderMonthlySummary() {
  const month = el.monthPicker.value;
  if (!month) {
    el.monthlySummary.innerHTML = '<div class="empty-state">월을 선택하면 요약이 생성됩니다.</div>';
    return;
  }
  const items = state.works.filter(w => String(w.date || '').startsWith(month));
  if (!items.length) {
    el.monthlySummary.innerHTML = `<div class="empty-state">${escapeHtml(month)}에 기록된 업무가 없습니다.</div>`;
    return;
  }

  const assets = items.filter(w => w.asset?.name);
  const topSkills = getSkillFrequency(items).slice(0, 5);
  const highlights = items.slice(0, 3).map(w => `<li>${escapeHtml(w.title)} — ${escapeHtml(w.result || w.summary || '')}</li>`).join('');
  const narrative = `${month}에는 총 ${items.length}개의 업무를 수행했고, ${assets.length}개의 자산을 남겼다. 핵심 역량은 ${topSkills.map(([s]) => s).join(', ') || '기록 없음'} 중심으로 축적되었다.`;

  el.monthlySummary.innerHTML = `
    <div class="summary-item"><strong>월간 서술 요약</strong><div class="meta">${escapeHtml(narrative)}</div></div>
    <div class="summary-item"><strong>주요 업무</strong><ul>${highlights}</ul></div>
    <div class="summary-item"><strong>상위 역량</strong><ul>${topSkills.map(([s, c]) => `<li>${escapeHtml(s)} (${c})</li>`).join('')}</ul></div>
    <div class="summary-item"><strong>남긴 자산</strong><ul>${assets.length ? assets.map(w => `<li>${escapeHtml(w.asset.name)} (${escapeHtml(w.asset.type || '-')})</li>`).join('') : '<li>없음</li>'}</ul></div>`;
}

function renderDetail() {
  const work = state.works.find(w => w.id === state.selectedId);
  if (!work) {
    el.detailEmpty.classList.remove('hidden');
    el.detailView.className = 'detail-view-hidden';
    el.detailView.innerHTML = '';
    return;
  }
  const out = buildOutputs(work);
  el.detailEmpty.classList.add('hidden');
  el.detailView.className = 'detail-view-visible';
  el.detailView.innerHTML = `
    <div class="detail-grid">
      <div class="detail-card full">
        <div class="section-head">
          <div>
            <h3>${escapeHtml(work.title)}</h3>
            <div class="meta">${escapeHtml(work.date || '')} · ${escapeHtml(work.project || '-')} · ${escapeHtml(work.role || '-')}</div>
          </div>
          <div class="detail-actions">
            <button type="button" class="ghost" data-action="edit">수정</button>
            <button type="button" class="danger" data-action="delete">삭제</button>
          </div>
        </div>
      </div>
      <div class="detail-card"><h3>한 줄 설명</h3><div>${nl2br(work.summary)}</div></div>
      <div class="detail-card"><h3>사용 도구</h3><div>${nl2br(work.tools || '-')}</div></div>
      <div class="detail-card"><h3>문제</h3><div>${nl2br(work.problem)}</div></div>
      <div class="detail-card"><h3>행동</h3><div>${nl2br(work.action)}</div></div>
      <div class="detail-card"><h3>결과</h3><div>${nl2br(work.result)}</div></div>
      <div class="detail-card"><h3>배운 점</h3><div>${nl2br(work.lesson)}</div></div>
      <div class="detail-card"><h3>역량 태그</h3><div class="tag-list">${(work.skills || []).map(s => `<span class="tag">${escapeHtml(s)}</span>`).join('') || '<span class="muted">없음</span>'}</div></div>
      <div class="detail-card"><h3>자산</h3><div>${work.asset?.name ? `${escapeHtml(work.asset.name)} (${escapeHtml(work.asset.type || '-')})` : '<span class="muted">없음</span>'}</div></div>
      <div class="detail-card full"><h3>이력서 Bullet</h3><pre class="output">${escapeHtml(out.resume)}</pre></div>
      <div class="detail-card"><h3>포트폴리오 문단</h3><pre class="output">${escapeHtml(out.portfolio)}</pre></div>
      <div class="detail-card"><h3>면접 STAR</h3><pre class="output">${escapeHtml(out.star)}</pre></div>
    </div>`;

  el.detailView.querySelector('[data-action="edit"]')?.addEventListener('click', () => startEdit(work.id));
  el.detailView.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteWork(work.id));
}

function renderAll() {
  renderStats();
  renderSkillMap();
  renderList();
  renderAssets();
  renderMonthlySummary();
  renderDetail();
}

/* ─── Form Logic ─── */
function workFromForm(form) {
  const d = new FormData(form);
  const assetName = (d.get('assetName') || '').trim();
  const assetType = (d.get('assetType') || '').trim();
  return {
    title: (d.get('title') || '').trim(),
    date: d.get('date') || '',
    project: (d.get('project') || '').trim(),
    category: (d.get('category') || '').trim(),
    summary: (d.get('summary') || '').trim(),
    role: (d.get('role') || '').trim(),
    tools: (d.get('tools') || '').trim(),
    link: (d.get('link') || '').trim(),
    problem: (d.get('problem') || '').trim(),
    action: (d.get('action') || '').trim(),
    result: (d.get('result') || '').trim(),
    lesson: (d.get('lesson') || '').trim(),
    skills: parseSkills(d.get('skills') || ''),
    asset: assetName ? { name: assetName, type: assetType } : null,
  };
}

function resetFormMode() {
  state.editingId = null;
  el.form.reset();
  el.formTitle.textContent = '새 업무 기록';
  el.formModeHint.textContent = '빠르게 기록하고, 필요하면 나중에 더 구조화하면 돼.';
  el.submitBtn.textContent = '저장하기';
  el.cancelEditBtn.classList.add('hidden');
}

function startEdit(id) {
  const work = state.works.find(w => w.id === id);
  if (!work) return;
  state.editingId = id;
  const f = el.form;
  f.title.value = work.title || '';
  f.date.value = work.date || '';
  f.project.value = work.project || '';
  f.category.value = work.category || '';
  f.summary.value = work.summary || '';
  f.role.value = work.role || '';
  f.tools.value = work.tools || '';
  f.link.value = work.link || '';
  f.problem.value = work.problem || '';
  f.action.value = work.action || '';
  f.result.value = work.result || '';
  f.lesson.value = work.lesson || '';
  f.skills.value = (work.skills || []).join(', ');
  f.assetName.value = work.asset?.name || '';
  f.assetType.value = work.asset?.type || '';
  el.formTitle.textContent = '업무 수정';
  el.formModeHint.textContent = '선택한 업무를 수정 중이야. 저장하면 기존 내용이 업데이트돼.';
  el.submitBtn.textContent = '수정 저장';
  el.cancelEditBtn.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─── CRUD ─── */
async function persistWorks() {
  saveLocal();
  if (state.cloud.user) {
    try { await pushToCloud(true); } catch (e) { console.warn('클라우드 동기화 실패:', e); }
  }
}

async function upsertWorkFromForm(form) {
  const payload = workFromForm(form);
  if (state.editingId) {
    state.works = state.works.map(w => w.id === state.editingId
      ? { ...w, ...payload, updatedAt: new Date().toISOString() }
      : w);
    state.selectedId = state.editingId;
  } else {
    const work = { id: uid(), ...payload, createdAt: new Date().toISOString(), updatedAt: null };
    state.works.unshift(work);
    state.selectedId = work.id;
  }
  await persistWorks();
  populateFilters();
  renderAll();
  resetFormMode();
}

async function deleteWork(id) {
  const work = state.works.find(w => w.id === id);
  if (!work || !confirm(`'${work.title}' 업무를 삭제할까요?`)) return;
  state.works = state.works.filter(w => w.id !== id);
  if (state.editingId === id) resetFormMode();
  if (state.selectedId === id) state.selectedId = state.works[0]?.id || null;
  await persistWorks();
  populateFilters();
  renderAll();
}

/* ─── Export / Import ─── */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJson() {
  downloadBlob(
    new Blob([JSON.stringify({ works: state.works }, null, 2)], { type: 'application/json' }),
    'career-asset-os-data.json',
  );
}

function exportMarkdown() {
  const month = el.monthPicker.value;
  const items = month ? state.works.filter(w => String(w.date || '').startsWith(month)) : state.works;
  const topSkills = getSkillFrequency(items).slice(0, 5);
  const lines = [
    '# Career Asset OS Export', '',
    `- 생성일: ${new Date().toISOString().slice(0, 10)}`,
    `- 대상 월: ${month || '전체'}`,
    `- 업무 수: ${items.length}`,
    `- 자산 수: ${items.filter(w => w.asset?.name).length}`,
    '', '## 상위 역량',
    ...topSkills.map(([s, c]) => `- ${s}: ${c}`),
    '', '## 업무 목록',
  ];
  items.forEach((work, i) => {
    const out = buildOutputs(work);
    lines.push('', `### ${i + 1}. ${work.title}`,
      `- 날짜: ${work.date || '-'}`, `- 프로젝트: ${work.project || '-'}`,
      `- 유형: ${work.category || '-'}`, `- 요약: ${work.summary || '-'}`,
      `- 문제: ${work.problem || '-'}`, `- 행동: ${work.action || '-'}`,
      `- 결과: ${work.result || '-'}`, `- 배운 점: ${work.lesson || '-'}`,
      `- 역량: ${(work.skills || []).join(', ') || '-'}`,
      `- 자산: ${work.asset?.name ? `${work.asset.name} (${work.asset.type || '-'})` : '-'}`,
      '', '#### 이력서 Bullet', out.resume,
      '', '#### STAR', out.star,
    );
  });
  downloadBlob(
    new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }),
    `career-asset-os-${month || 'all'}.md`,
  );
}

async function importJson(file) {
  const text = await file.text();
  try {
    const parsed = JSON.parse(text);
    state.works = Array.isArray(parsed.works) ? parsed.works.map(normalizeWork) : [];
    state.selectedId = state.works[0]?.id || null;
    resetFormMode();
    await persistWorks();
    populateFilters();
    setDefaultMonthPicker();
    renderAll();
  } catch {
    alert('JSON 파일을 읽지 못했습니다.');
  }
}

/* ─── Seed Demo ─── */
async function seedDemo() {
  if (state.works.length && !confirm('기존 데이터가 있습니다. 데모 데이터로 바꿀까요?')) return;
  state.works = [
    {
      id: uid(), title: '주간 리포트 구조 개선', date: '2026-03-15', project: '성과 보고 체계', category: '분석/리포팅',
      summary: '반복되는 주간 보고서를 재사용 가능한 구조로 정리', role: '기획 및 작성', tools: 'Google Sheets, Markdown', link: '',
      problem: '매주 보고서 형식과 스토리라인이 흔들려 작성 시간이 길어졌다.',
      action: '보고서 섹션을 고정하고 핵심 지표-원인-액션 구조로 템플릿화했다.',
      result: '작성 시간이 줄고 팀 공유용 문장 품질이 안정화되었다.',
      lesson: '반복 업무일수록 템플릿을 먼저 만드는 것이 효과적이다.',
      skills: ['리포팅', '구조 설계', '문서화'], asset: { name: '주간 보고서 템플릿', type: 'template' },
      createdAt: new Date().toISOString(), updatedAt: null,
    },
    {
      id: uid(), title: 'AI 모자이크 검수 기준 정리', date: '2026-03-14', project: 'AI 이미지 운영', category: '운영/품질',
      summary: '모델 결과물 검수 기준을 명확히 정리', role: '운영 정리', tools: '문서, 이미지 샘플', link: '',
      problem: '해상도에 따라 결과 체감이 달라 검수 기준이 흔들렸다.',
      action: '실패 케이스를 유형화하고 체크리스트 기준으로 정리했다.',
      result: '판단 기준이 명확해져 커뮤니케이션 비용이 줄었다.',
      lesson: '애매한 감각 기준은 반드시 체크리스트로 외부화해야 한다.',
      skills: ['문제 해결', '운영', '체크리스트 설계'], asset: { name: '모자이크 검수 체크리스트', type: 'checklist' },
      createdAt: new Date().toISOString(), updatedAt: null,
    },
    {
      id: uid(), title: '업무 자산화 MVP 구현', date: '2026-03-13', project: 'Career Asset OS', category: '개발/MVP',
      summary: '실무를 커리어 문장으로 바꾸는 개인용 웹앱 MVP를 구현', role: '기획 및 구현', tools: 'HTML, CSS, JavaScript', link: '',
      problem: '업무 경험이 흩어져 있어 이력서나 포트폴리오로 바로 연결되기 어려웠다.',
      action: '입력-구조화-출력 흐름을 화면으로 설계하고 localStorage 기반 MVP를 만들었다.',
      result: '업무를 기록하는 즉시 커리어 문장으로 변환할 수 있는 기반이 생겼다.',
      lesson: '작은 MVP라도 실제로 써볼 수 있게 만들면 개선 포인트가 빨리 보인다.',
      skills: ['기획', '프론트엔드', '문제 해결', '구조 설계'], asset: { name: 'Career Asset OS MVP', type: 'document' },
      createdAt: new Date().toISOString(), updatedAt: null,
    },
  ];
  state.selectedId = state.works[0].id;
  resetFormMode();
  await persistWorks();
  populateFilters();
  setDefaultMonthPicker();
  renderAll();
}

/* ─── Cloud (Supabase) ─── */
function setCloudStatus(msg, type = '') {
  el.cloudStatus.textContent = msg;
  el.cloudStatus.classList.remove('ok', 'warn', 'error');
  if (type) el.cloudStatus.classList.add(type);
}

function cloudReady() {
  return Boolean(state.cloud.client && state.cloud.user);
}

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    setCloudStatus('localStorage 모드. app.js에 Supabase 정보를 넣으면 클라우드 동기화가 켜집니다.', 'warn');
    return;
  }
  // Supabase 라이브러리가 아직 로드 안 됐으면 재시도
  if (!window.supabase?.createClient) {
    setCloudStatus('Supabase 라이브러리 로드 대기 중...', 'warn');
    // defer 스크립트라 약간 늦을 수 있으므로 재시도
    setTimeout(() => {
      if (window.supabase?.createClient) {
        doInitSupabase();
      } else {
        setCloudStatus('Supabase 라이브러리를 불러오지 못했습니다. 네트워크를 확인하세요.', 'error');
      }
    }, 2000);
    return;
  }
  doInitSupabase();
}

function doInitSupabase() {
  try {
    state.cloud.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    state.cloud.enabled = true;
    setCloudStatus('Supabase 연결 준비 완료. 이메일로 매직 링크를 보내 로그인하세요.', 'warn');
    // 세션 체크
    refreshCloudSession();
    state.cloud.client.auth.onAuthStateChange(async () => {
      await refreshCloudSession();
    });
  } catch (e) {
    console.error('Supabase 초기화 실패:', e);
    setCloudStatus(`Supabase 초기화 실패: ${e.message}`, 'error');
  }
}

async function refreshCloudSession() {
  if (!state.cloud.client) return;
  try {
    const { data, error } = await state.cloud.client.auth.getSession();
    if (error) {
      setCloudStatus(`세션 확인 실패: ${error.message}`, 'error');
      return;
    }
    const user = data.session?.user || null;
    state.cloud.user = user;
    if (user) {
      el.syncEmail.value = user.email || '';
      setCloudStatus(`클라우드 로그인됨: ${user.email}`, 'ok');
    } else {
      setCloudStatus('클라우드 미로그인. localStorage 모드로 사용 중입니다.', 'warn');
    }
  } catch (e) {
    setCloudStatus(`세션 확인 오류: ${e.message}`, 'error');
  }
}

async function sendMagicLink() {
  if (!state.cloud.client) {
    alert('먼저 app.js에 Supabase URL과 key를 넣어주세요.');
    return;
  }
  const email = el.syncEmail.value.trim();
  if (!email) { alert('이메일을 입력해주세요.'); return; }

  const redirectTo = window.location.href.split('#')[0];
  const { error } = await state.cloud.client.auth.signInWithOtp({
    email, options: { emailRedirectTo: redirectTo },
  });
  if (error) {
    setCloudStatus(`매직 링크 발송 실패: ${error.message}`, 'error');
    return;
  }
  setCloudStatus(`매직 링크를 ${email}로 보냈습니다. 메일에서 링크를 눌러 돌아오세요.`, 'ok');
}

async function pullFromCloud() {
  if (!cloudReady()) { alert('클라우드 로그인 후 사용할 수 있습니다.'); return; }
  setCloudStatus('클라우드에서 불러오는 중...', 'warn');

  const { data, error } = await state.cloud.client
    .from('works').select('work_id,payload,updated_at')
    .eq('user_id', state.cloud.user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    setCloudStatus(`불러오기 실패: ${error.message}`, 'error');
    return;
  }
  state.works = (data || []).map(row => normalizeWork({ id: row.work_id, ...row.payload }));
  state.selectedId = state.works[0]?.id || null;
  saveLocal();
  populateFilters();
  setDefaultMonthPicker();
  resetFormMode();
  renderAll();
  setCloudStatus(`클라우드에서 ${state.works.length}개 업무를 불러왔습니다.`, 'ok');
}

async function pushToCloud(silent = false) {
  if (!cloudReady()) return;

  const { data: remoteData, error: fetchErr } = await state.cloud.client
    .from('works').select('work_id').eq('user_id', state.cloud.user.id);
  if (fetchErr) {
    setCloudStatus(`클라우드 조회 실패: ${fetchErr.message}`, 'error');
    if (!silent) alert(fetchErr.message);
    return;
  }

  const remoteIds = new Set((remoteData || []).map(r => r.work_id));
  const localIds = new Set(state.works.map(w => w.id));
  const toDelete = [...remoteIds].filter(id => !localIds.has(id));

  if (toDelete.length) {
    const { error } = await state.cloud.client.from('works').delete()
      .eq('user_id', state.cloud.user.id).in('work_id', toDelete);
    if (error) {
      setCloudStatus(`삭제 동기화 실패: ${error.message}`, 'error');
      return;
    }
  }

  if (state.works.length) {
    const rows = state.works.map(w => ({
      user_id: state.cloud.user.id,
      work_id: w.id,
      payload: { ...w, id: undefined },
      updated_at: new Date().toISOString(),
    }));
    const { error } = await state.cloud.client.from('works').upsert(rows, { onConflict: 'user_id,work_id' });
    if (error) {
      setCloudStatus(`클라우드 저장 실패: ${error.message}`, 'error');
      if (!silent) alert(error.message);
      return;
    }
  }
  setCloudStatus(`클라우드에 ${state.works.length}개 업무를 반영했습니다.`, 'ok');
}

async function signOutCloud() {
  if (!state.cloud.client) return;
  await state.cloud.client.auth.signOut();
  state.cloud.user = null;
  setCloudStatus('클라우드 로그아웃됨. localStorage 모드로 전환되었습니다.', 'warn');
}

/* ─── Event Binding ─── */
function bindEvents() {
  el.form.addEventListener('submit', async (e) => { e.preventDefault(); await upsertWorkFromForm(el.form); });
  el.exportBtn.addEventListener('click', exportJson);
  el.mdExportBtn.addEventListener('click', exportMarkdown);
  el.importInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) await importJson(file);
  });

  // 검색: debounce 적용
  const debouncedRenderList = debounce(renderList, 200);
  el.searchInput.addEventListener('input', debouncedRenderList);
  el.projectFilter.addEventListener('change', renderList);
  el.skillFilter.addEventListener('change', renderList);

  el.seedBtn.addEventListener('click', seedDemo);
  el.cancelEditBtn.addEventListener('click', resetFormMode);
  el.monthPicker.addEventListener('change', () => { renderStats(); renderMonthlySummary(); });
  el.authForm.addEventListener('submit', handleAuthSubmit);
  el.logoutBtn.addEventListener('click', logout);
  el.sendMagicLinkBtn.addEventListener('click', sendMagicLink);
  el.syncDownBtn.addEventListener('click', pullFromCloud);
  el.syncUpBtn.addEventListener('click', () => pushToCloud(false));
  el.cloudSignOutBtn.addEventListener('click', signOutCloud);
}

/* ─── Init ─── */
function init() {
  cacheDom();
  loadLocal();
  populateFilters();
  setDefaultMonthPicker();
  state.selectedId = state.works[0]?.id || null;
  resetFormMode();
  renderAll();

  // 인증 체크 → 화면 전환
  if (isAuthenticated()) {
    showApp();
  } else {
    showGate();
  }

  bindEvents();

  // Supabase는 비동기로 초기화 (실패해도 앱 자체는 정상 작동)
  initSupabase();
}

// DOMContentLoaded 보장 (defer 스크립트지만 안전장치)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}