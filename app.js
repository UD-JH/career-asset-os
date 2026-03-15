const STORAGE_KEY = 'career-asset-os-data-v5';
const AUTH_KEY = 'career-asset-os-auth-v1';
const SITE_PASSWORD = 'change-this-password';

/**
 * Supabase 설정값을 넣어줘.
 * 예:
 * const SUPABASE_URL = 'https://xxxx.supabase.co';
 * const SUPABASE_ANON_KEY = 'sb_publishable_xxxx' 또는 legacy anon key
 */
const SUPABASE_URL = 'https://qhndtmybuyopztxqswqc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_whlWNk_L6g_lnABT9UNOkw_GW31-I3E';

const state = {
  works: [],
  selectedId: null,
  editingId: null,
  supabase: null,
  session: null,
  loading: false,
};

const el = {
  authGate: document.getElementById('authGate'),
  appRoot: document.getElementById('appRoot'),
  authForm: document.getElementById('authForm'),
  passwordInput: document.getElementById('passwordInput'),
  authError: document.getElementById('authError'),
  form: document.getElementById('workForm'),
  workList: document.getElementById('workList'),
  detailView: document.getElementById('detailView'),
  detailEmpty: document.getElementById('detailEmpty'),
  totalWorks: document.getElementById('totalWorks'),
  totalAssets: document.getElementById('totalAssets'),
  topSkill: document.getElementById('topSkill'),
  monthlyWorkCount: document.getElementById('monthlyWorkCount'),
  exportBtn: document.getElementById('exportBtn'),
  mdExportBtn: document.getElementById('mdExportBtn'),
  importInput: document.getElementById('importInput'),
  searchInput: document.getElementById('searchInput'),
  projectFilter: document.getElementById('projectFilter'),
  skillFilter: document.getElementById('skillFilter'),
  listSummary: document.getElementById('listSummary'),
  seedBtn: document.getElementById('seedBtn'),
  formTitle: document.getElementById('formTitle'),
  formModeHint: document.getElementById('formModeHint'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  submitBtn: document.getElementById('submitBtn'),
  skillMap: document.getElementById('skillMap'),
  skillSummary: document.getElementById('skillSummary'),
  assetLibrary: document.getElementById('assetLibrary'),
  assetSummary: document.getElementById('assetSummary'),
  monthPicker: document.getElementById('monthPicker'),
  monthlySummary: document.getElementById('monthlySummary'),
  syncStatus: document.getElementById('syncStatus'),
  syncNote: document.getElementById('syncNote'),
  emailInput: document.getElementById('emailInput'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function isCloudMode() {
  return Boolean(state.supabase && state.session?.user);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(text) {
  return escapeHtml(text || '').replace(/\n/g, '<br>');
}

function parseSkills(value) {
  return String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

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
    asset: work.asset && work.asset.name ? { name: work.asset.name || '', type: work.asset.type || '' } : null,
    createdAt: work.createdAt || new Date().toISOString(),
    updatedAt: work.updatedAt || work.createdAt || null,
  };
}

function toDbRow(work) {
  return {
    id: work.id,
    user_id: state.session?.user?.id || null,
    title: work.title,
    work_date: work.date || null,
    project: work.project,
    category: work.category,
    summary: work.summary,
    role: work.role,
    tools: work.tools,
    link: work.link,
    problem: work.problem,
    action: work.action,
    result: work.result,
    lesson: work.lesson,
    skills: work.skills || [],
    asset: work.asset || null,
    created_at: work.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function fromDbRow(row) {
  return normalizeWork({
    id: row.id,
    title: row.title,
    date: row.work_date,
    project: row.project,
    category: row.category,
    summary: row.summary,
    role: row.role,
    tools: row.tools,
    link: row.link,
    problem: row.problem,
    action: row.action,
    result: row.result,
    lesson: row.lesson,
    skills: row.skills || [],
    asset: row.asset || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ works: state.works }));
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY)
    || localStorage.getItem('career-asset-os-data-v3')
    || localStorage.getItem('career-asset-os-data-v2')
    || localStorage.getItem('career-asset-os-data-v1');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.works = Array.isArray(parsed.works) ? parsed.works.map(normalizeWork) : [];
  } catch (e) {
    console.error(e);
  }
}

async function initSupabase() {
  if (!hasSupabaseConfig()) return;
  state.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data } = await state.supabase.auth.getSession();
  state.session = data.session || null;

  state.supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session || null;
    updateSyncStatus();
    await loadWorks();
  });
}

async function sendMagicLink() {
  if (!state.supabase) {
    alert('먼저 app.js에 SUPABASE_URL과 SUPABASE_ANON_KEY를 넣어줘.');
    return;
  }
  const email = el.emailInput.value.trim();
  if (!email) {
    alert('로그인 이메일을 입력해줘.');
    return;
  }
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await state.supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) {
    alert(`로그인 링크 발송 실패: ${error.message}`);
    return;
  }
  alert('이메일로 매직 링크를 보냈어. 메일에서 링크를 누른 뒤 다시 이 페이지로 돌아오면 돼.');
}

async function logout() {
  if (state.supabase && state.session) {
    await state.supabase.auth.signOut();
  }
  state.session = null;
  updateSyncStatus();
  await loadWorks();
}

function setDefaultMonthPicker() {
  const dates = state.works.map(w => w.date).filter(Boolean).sort().reverse();
  const basis = dates[0] || new Date().toISOString().slice(0, 10);
  el.monthPicker.value = basis.slice(0, 7);
}

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

  el.projectFilter.innerHTML = '<option value="">모든 프로젝트</option>'
    + getProjectOptions().map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  el.skillFilter.innerHTML = '<option value="">모든 역량</option>'
    + getSkillOptions().map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');

  el.projectFilter.value = getProjectOptions().includes(currentProject) ? currentProject : '';
  el.skillFilter.value = getSkillOptions().includes(currentSkill) ? currentSkill : '';
}

function getFilteredWorks() {
  const query = el.searchInput.value.trim().toLowerCase();
  const project = el.projectFilter.value;
  const skill = el.skillFilter.value;

  return [...state.works]
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''))
    .filter(w => {
      const matchesQuery = !query || [w.title, w.project, w.summary, w.problem, ...(w.skills || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
      const matchesProject = !project || w.project === project;
      const matchesSkill = !skill || (w.skills || []).includes(skill);
      return matchesQuery && matchesProject && matchesSkill;
    });
}

function renderStats() {
  el.totalWorks.textContent = state.works.length;
  el.totalAssets.textContent = state.works.filter(w => w.asset && w.asset.name).length;
  const top = getSkillFrequency()[0];
  el.topSkill.textContent = top ? top[0] : '-';

  const selectedMonth = el.monthPicker.value;
  const monthly = selectedMonth ? state.works.filter(w => String(w.date || '').startsWith(selectedMonth)) : [];
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
  const totalTags = entries.reduce((sum, [, count]) => sum + count, 0);
  el.skillSummary.textContent = `총 ${entries.length}개 역량 / 누적 태그 ${totalTags}개`;
  el.skillMap.innerHTML = entries.map(([skill, count]) => {
    const width = Math.max(8, Math.round((count / max) * 100));
    return `
      <div class="skill-row">
        <div class="skill-name">${escapeHtml(skill)}</div>
        <div class="skill-bar"><div class="skill-bar-fill" style="width:${width}%"></div></div>
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
    <div class="work-item ${w.id === state.selectedId ? 'active' : ''}" data-id="${w.id}">
      <h3>${escapeHtml(w.title)}</h3>
      <div class="meta">${escapeHtml(w.date || '')} · ${escapeHtml(w.project || '-')} · ${escapeHtml(w.category || '-')}</div>
      <div class="meta">${escapeHtml(w.summary || '')}</div>
      <div class="tag-list">
        ${(w.skills || []).map(s => `<span class="tag">${escapeHtml(s)}</span>`).join('')}
        ${w.asset && w.asset.name ? `<span class="tag asset-tag">${escapeHtml(w.asset.name)}</span>` : ''}
      </div>
    </div>`).join('');

  [...document.querySelectorAll('.work-item')].forEach(node => {
    node.addEventListener('click', () => {
      state.selectedId = node.dataset.id;
      renderDetail();
      renderList();
    });
  });
}

function renderAssets() {
  const assets = state.works
    .filter(w => w.asset && w.asset.name)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

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

  const assets = items.filter(w => w.asset && w.asset.name);
  const topSkills = getSkillFrequency(items).slice(0, 5);
  const highlights = items.slice(0, 3).map(w => `<li>${escapeHtml(w.title)} — ${escapeHtml(w.result || w.summary || '')}</li>`).join('');
  const monthlyNarrative = `${month}에는 총 ${items.length}개의 업무를 수행했고, ${assets.length}개의 자산을 남겼다. 핵심 역량은 ${topSkills.map(([skill]) => skill).join(', ') || '기록 없음'} 중심으로 축적되었다.`;

  el.monthlySummary.innerHTML = `
    <div class="summary-item">
      <strong>월간 서술 요약</strong>
      <div class="meta">${escapeHtml(monthlyNarrative)}</div>
    </div>
    <div class="summary-item">
      <strong>주요 업무</strong>
      <ul>${highlights}</ul>
    </div>
    <div class="summary-item">
      <strong>상위 역량</strong>
      <ul>${topSkills.map(([skill, count]) => `<li>${escapeHtml(skill)} (${count})</li>`).join('')}</ul>
    </div>
    <div class="summary-item">
      <strong>남긴 자산</strong>
      <ul>${assets.length ? assets.map(w => `<li>${escapeHtml(w.asset.name)} (${escapeHtml(w.asset.type || '-')})</li>`).join('') : '<li>없음</li>'}</ul>
    </div>`;
}

function renderDetail() {
  const work = state.works.find(w => w.id === state.selectedId);
  if (!work) {
    el.detailEmpty.classList.remove('hidden');
    el.detailView.classList.add('hidden');
    el.detailView.innerHTML = '';
    return;
  }
  const outputs = buildOutputs(work);
  el.detailEmpty.classList.add('hidden');
  el.detailView.classList.remove('hidden');
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
      <div class="detail-card"><h3>자산</h3><div>${work.asset && work.asset.name ? `${escapeHtml(work.asset.name)} (${escapeHtml(work.asset.type || '-')})` : '<span class="muted">없음</span>'}</div></div>
      <div class="detail-card full"><h3>이력서 Bullet</h3><pre class="output">${escapeHtml(outputs.resume)}</pre></div>
      <div class="detail-card"><h3>포트폴리오 문단</h3><pre class="output">${escapeHtml(outputs.portfolio)}</pre></div>
      <div class="detail-card"><h3>면접 STAR</h3><pre class="output">${escapeHtml(outputs.star)}</pre></div>
    </div>`;

  el.detailView.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit(work.id));
  el.detailView.querySelector('[data-action="delete"]').addEventListener('click', () => deleteWork(work.id));
}

function workFromForm(form) {
  const data = new FormData(form);
  const assetName = (data.get('assetName') || '').trim();
  const assetType = (data.get('assetType') || '').trim();
  return {
    title: (data.get('title') || '').trim(),
    date: data.get('date') || '',
    project: (data.get('project') || '').trim(),
    category: (data.get('category') || '').trim(),
    summary: (data.get('summary') || '').trim(),
    role: (data.get('role') || '').trim(),
    tools: (data.get('tools') || '').trim(),
    link: (data.get('link') || '').trim(),
    problem: (data.get('problem') || '').trim(),
    action: (data.get('action') || '').trim(),
    result: (data.get('result') || '').trim(),
    lesson: (data.get('lesson') || '').trim(),
    skills: parseSkills(data.get('skills') || ''),
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
  el.form.title.value = work.title || '';
  el.form.date.value = work.date || '';
  el.form.project.value = work.project || '';
  el.form.category.value = work.category || '';
  el.form.summary.value = work.summary || '';
  el.form.role.value = work.role || '';
  el.form.tools.value = work.tools || '';
  el.form.link.value = work.link || '';
  el.form.problem.value = work.problem || '';
  el.form.action.value = work.action || '';
  el.form.result.value = work.result || '';
  el.form.lesson.value = work.lesson || '';
  el.form.skills.value = (work.skills || []).join(', ');
  el.form.assetName.value = work.asset?.name || '';
  el.form.assetType.value = work.asset?.type || '';
  el.formTitle.textContent = '업무 수정';
  el.formModeHint.textContent = '선택한 업무를 수정 중이야. 저장하면 기존 내용이 업데이트돼.';
  el.submitBtn.textContent = '수정 저장';
  el.cancelEditBtn.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadWorks() {
  if (isCloudMode()) {
    const { data, error } = await state.supabase
      .from('works')
      .select('*')
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      alert(`Supabase 로드 실패: ${error.message}`);
      loadLocal();
    } else {
      state.works = (data || []).map(fromDbRow);
    }
  } else {
    loadLocal();
  }
  state.selectedId = state.works[0]?.id || null;
  populateFilters();
  setDefaultMonthPicker();
  renderAll();
  updateSyncStatus();
}

async function persistWork(work) {
  if (isCloudMode()) {
    const { error } = await state.supabase.from('works').upsert(toDbRow(work));
    if (error) throw error;
  } else {
    saveLocal();
  }
}

async function removeWork(id) {
  if (isCloudMode()) {
    const { error } = await state.supabase.from('works').delete().eq('id', id);
    if (error) throw error;
  } else {
    saveLocal();
  }
}

async function replaceAllWorks(newWorks) {
  state.works = newWorks.map(normalizeWork);
  if (isCloudMode()) {
    const existingIds = (await state.supabase.from('works').select('id')).data?.map(row => row.id) || [];
    if (existingIds.length) {
      const { error: deleteError } = await state.supabase.from('works').delete().in('id', existingIds);
      if (deleteError) throw deleteError;
    }
    const rows = state.works.map(toDbRow);
    if (rows.length) {
      const { error: insertError } = await state.supabase.from('works').upsert(rows);
      if (insertError) throw insertError;
    }
  } else {
    saveLocal();
  }
}

async function upsertWorkFromForm(form) {
  const payload = workFromForm(form);
  try {
    if (state.editingId) {
      const prev = state.works.find(work => work.id === state.editingId);
      const updated = { ...prev, ...payload, updatedAt: new Date().toISOString() };
      state.works = state.works.map(work => work.id === state.editingId ? updated : work);
      await persistWork(updated);
      state.selectedId = state.editingId;
    } else {
      const work = { id: uid(), ...payload, createdAt: new Date().toISOString(), updatedAt: null };
      state.works.unshift(work);
      await persistWork(work);
      state.selectedId = work.id;
    }
    if (!isCloudMode()) saveLocal();
    populateFilters();
    renderAll();
    resetFormMode();
    updateSyncStatus('저장 완료');
  } catch (error) {
    console.error(error);
    alert(`저장 실패: ${error.message}`);
  }
}

async function deleteWork(id) {
  const work = state.works.find(w => w.id === id);
  if (!work) return;
  const ok = confirm(`'${work.title}' 업무를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`);
  if (!ok) return;
  try {
    state.works = state.works.filter(w => w.id !== id);
    await removeWork(id);
    if (!isCloudMode()) saveLocal();
    if (state.editingId === id) resetFormMode();
    if (state.selectedId === id) state.selectedId = state.works[0]?.id || null;
    populateFilters();
    renderAll();
    updateSyncStatus('삭제 완료');
  } catch (error) {
    console.error(error);
    alert(`삭제 실패: ${error.message}`);
  }
}

function exportJson() {
  const blob = new Blob([JSON.stringify({ works: state.works }, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'career-asset-os-data.json');
}

function exportMarkdown() {
  const month = el.monthPicker.value;
  const items = month ? state.works.filter(w => String(w.date || '').startsWith(month)) : state.works;
  const topSkills = getSkillFrequency(items).slice(0, 5);
  const lines = [
    '# Career Asset OS Export',
    '',
    `- 생성일: ${new Date().toISOString().slice(0, 10)}`,
    `- 대상 월: ${month || '전체'}`,
    `- 업무 수: ${items.length}`,
    `- 자산 수: ${items.filter(w => w.asset && w.asset.name).length}`,
    '',
    '## 상위 역량',
    ...topSkills.map(([skill, count]) => `- ${skill}: ${count}`),
    '',
    '## 업무 목록',
  ];

  items.forEach((work, idx) => {
    const outputs = buildOutputs(work);
    lines.push(
      '',
      `### ${idx + 1}. ${work.title}`,
      `- 날짜: ${work.date || '-'}`,
      `- 프로젝트: ${work.project || '-'}`,
      `- 유형: ${work.category || '-'}`,
      `- 요약: ${work.summary || '-'}`,
      `- 문제: ${work.problem || '-'}`,
      `- 행동: ${work.action || '-'}`,
      `- 결과: ${work.result || '-'}`,
      `- 배운 점: ${work.lesson || '-'}`,
      `- 역량: ${(work.skills || []).join(', ') || '-'}`,
      `- 자산: ${work.asset?.name ? `${work.asset.name} (${work.asset.type || '-'})` : '-'}`,
      '',
      '#### 이력서 Bullet',
      outputs.resume,
      '',
      '#### STAR',
      outputs.star,
    );
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `career-asset-os-${month || 'all'}.md`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function importJson(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result);
      const works = Array.isArray(parsed.works) ? parsed.works.map(normalizeWork) : [];
      await replaceAllWorks(works);
      state.selectedId = state.works[0]?.id || null;
      resetFormMode();
      populateFilters();
      setDefaultMonthPicker();
      renderAll();
      updateSyncStatus('가져오기 완료');
    } catch (e) {
      console.error(e);
      alert('JSON 파일을 읽지 못했습니다.');
    }
  };
  reader.readAsText(file);
}

async function seedDemo() {
  if (state.works.length && !confirm('기존 데이터가 있습니다. 데모 데이터로 바꿀까요?')) return;
  const demo = [
    {
      id: uid(), title: '주간 리포트 구조 개선', date: '2026-03-15', project: '성과 보고 체계', category: '분석/리포팅',
      summary: '반복되는 주간 보고서를 재사용 가능한 구조로 정리', role: '기획 및 작성', tools: 'Google Sheets, Markdown', link: '',
      problem: '매주 보고서 형식과 스토리라인이 흔들려 작성 시간이 길어졌다.', action: '보고서 섹션을 고정하고 핵심 지표-원인-액션 구조로 템플릿화했다.',
      result: '작성 시간이 줄고 팀 공유용 문장 품질이 안정화되었다.', lesson: '반복 업무일수록 템플릿을 먼저 만드는 것이 효과적이다.',
      skills: ['리포팅', '구조 설계', '문서화'], asset: { name: '주간 보고서 템플릿', type: 'template' }, createdAt: new Date().toISOString(), updatedAt: null,
    },
    {
      id: uid(), title: 'AI 모자이크 검수 기준 정리', date: '2026-03-14', project: 'AI 이미지 운영', category: '운영/품질',
      summary: '모델 결과물 검수 기준을 명확히 정리', role: '운영 정리', tools: '문서, 이미지 샘플', link: '',
      problem: '해상도에 따라 결과 체감이 달라 검수 기준이 흔들렸다.', action: '실패 케이스를 유형화하고 체크리스트 기준으로 정리했다.',
      result: '판단 기준이 명확해져 커뮤니케이션 비용이 줄었다.', lesson: '애매한 감각 기준은 반드시 체크리스트로 외부화해야 한다.',
      skills: ['문제 해결', '운영', '체크리스트 설계'], asset: { name: '모자이크 검수 체크리스트', type: 'checklist' }, createdAt: new Date().toISOString(), updatedAt: null,
    },
    {
      id: uid(), title: '업무 자산화 MVP 구현', date: '2026-03-13', project: 'Career Asset OS', category: '개발/MVP',
      summary: '실무를 커리어 문장으로 바꾸는 개인용 웹앱 MVP를 구현', role: '기획 및 구현', tools: 'HTML, CSS, JavaScript', link: '',
      problem: '업무 경험이 흩어져 있어 이력서나 포트폴리오로 바로 연결되기 어려웠다.', action: '입력-구조화-출력 흐름을 화면으로 설계하고 동기화 가능한 구조로 만들었다.',
      result: '업무를 기록하는 즉시 커리어 문장으로 변환할 수 있는 기반이 생겼다.', lesson: '작은 MVP라도 실제로 써볼 수 있게 만들면 개선 포인트가 빨리 보인다.',
      skills: ['기획', '프론트엔드', '문제 해결', '구조 설계'], asset: { name: 'Career Asset OS MVP', type: 'document' }, createdAt: new Date().toISOString(), updatedAt: null,
    }
  ];
  try {
    await replaceAllWorks(demo);
    state.selectedId = state.works[0]?.id || null;
    resetFormMode();
    populateFilters();
    setDefaultMonthPicker();
    renderAll();
    updateSyncStatus('데모 데이터 반영');
  } catch (e) {
    console.error(e);
    alert(`데모 데이터 반영 실패: ${e.message}`);
  }
}

function showApp() {
  el.authGate.classList.add('hidden');
  el.appRoot.classList.remove('hidden');
}

function showGate() {
  el.authGate.classList.remove('hidden');
  el.appRoot.classList.add('hidden');
}

function isUnlocked() {
  return localStorage.getItem(AUTH_KEY) === 'ok';
}

function unlock() {
  localStorage.setItem(AUTH_KEY, 'ok');
}

function relock() {
  localStorage.removeItem(AUTH_KEY);
}

function handleGateSubmit(e) {
  e.preventDefault();
  if (el.passwordInput.value === SITE_PASSWORD) {
    unlock();
    el.passwordInput.value = '';
    el.authError.classList.add('hidden');
    showApp();
  } else {
    el.authError.classList.remove('hidden');
  }
}

function updateSyncStatus(extra = '') {
  if (!hasSupabaseConfig()) {
    el.syncStatus.textContent = '로컬 모드';
    el.syncStatus.className = 'sync-status local';
    el.syncNote.textContent = 'Supabase 설정이 없어서 이 브라우저에만 저장됩니다.';
    return;
  }
  if (isCloudMode()) {
    const email = state.session?.user?.email || '로그인됨';
    el.syncStatus.textContent = '클라우드 모드';
    el.syncStatus.className = 'sync-status cloud';
    el.syncNote.textContent = `${email} 계정으로 Supabase와 동기화 중${extra ? ` · ${extra}` : ''}`;
    return;
  }
  el.syncStatus.textContent = '준비됨 / 로그인 필요';
  el.syncStatus.className = 'sync-status pending';
  el.syncNote.textContent = 'Supabase 설정은 되어 있지만 아직 로그인 전이라 로컬에만 저장됩니다.';
}

function renderAll() {
  renderStats();
  renderSkillMap();
  renderList();
  renderAssets();
  renderMonthlySummary();
  renderDetail();
}

el.authForm.addEventListener('submit', handleGateSubmit);
el.form.addEventListener('submit', async (e) => { e.preventDefault(); await upsertWorkFromForm(el.form); });
el.exportBtn.addEventListener('click', exportJson);
el.mdExportBtn.addEventListener('click', exportMarkdown);
el.importInput.addEventListener('change', async (e) => { const file = e.target.files?.[0]; if (file) await importJson(file); });
el.searchInput.addEventListener('input', renderList);
el.projectFilter.addEventListener('change', renderList);
el.skillFilter.addEventListener('change', renderList);
el.seedBtn.addEventListener('click', seedDemo);
el.cancelEditBtn.addEventListener('click', resetFormMode);
el.monthPicker.addEventListener('change', () => { renderStats(); renderMonthlySummary(); });
el.loginBtn.addEventListener('click', sendMagicLink);
el.logoutBtn.addEventListener('click', logout);

async function bootstrap() {
  loadLocal();
  await initSupabase();
  await loadWorks();
  resetFormMode();
  updateSyncStatus();
  if (isUnlocked()) showApp();
  else showGate();
}

bootstrap();
