/* Career Asset OS v6.0 — Redesign */
const STORAGE_KEY = 'career-asset-os-data-v5';
const AUTH_KEY = 'career-asset-os-auth-v1';
const SITE_PASSWORD = 'jiheon0409';
const SUPABASE_URL = 'https://qhndtmybuyopztxqswqc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_whlWNk_L6g_lnABT9UNOkw_GW31-I3E';

const state = { works: [], selectedId: null, editingId: null, cloud: { enabled: false, client: null, user: null } };
const el = {};

function cacheDom() {
  ['authGate','appRoot','authForm','passwordInput','authError','logoutBtn','workForm','workList','detailView','detailEmpty','totalWorks','totalAssets','topSkill','monthlyWorkCount','exportBtn','mdExportBtn','importInput','searchInput','projectFilter','skillFilter','listSummary','seedBtn','formTitle','formModeHint','cancelEditBtn','submitBtn','skillMap','skillSummary','assetLibrary','assetSummary','monthPicker','monthlySummary','syncEmail','sendMagicLinkBtn','syncDownBtn','syncUpBtn','cloudSignOutBtn','cloudStatus','tabNav','cloudBadge'].forEach(id => { el[id] = document.getElementById(id); });
  el.form = el.workForm;
}

function uid() { return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`; }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = String(s || ''); return d.innerHTML; }
function nl2br(t) { return escapeHtml(t || '').replace(/\n/g, '<br>'); }
function parseSkills(v) { return String(v || '').split(',').map(s => s.trim()).filter(Boolean); }
function debounce(fn, ms = 200) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(p => p.classList.toggle('active', p.dataset.tab === name));
}

function normalizeWork(w) {
  return { id: w.id || uid(), title: w.title || '', date: w.date || '', project: w.project || '', category: w.category || '', summary: w.summary || '', role: w.role || '', tools: w.tools || '', link: w.link || '', problem: w.problem || '', action: w.action || '', result: w.result || '', lesson: w.lesson || '', skills: Array.isArray(w.skills) ? w.skills : [], asset: w.asset && w.asset.name ? { name: w.asset.name, type: w.asset.type || '' } : null, createdAt: w.createdAt || new Date().toISOString(), updatedAt: w.updatedAt || null };
}

function saveLocal() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ works: state.works })); } catch(e) { console.warn(e); } }
function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('career-asset-os-data-v4') || localStorage.getItem('career-asset-os-data-v3');
  if (!raw) return;
  try { const p = JSON.parse(raw); state.works = Array.isArray(p.works) ? p.works.map(normalizeWork) : []; } catch(e) { console.error(e); }
}

function isAuthenticated() { return localStorage.getItem(AUTH_KEY) === '1'; }
function showApp() { el.authGate.setAttribute('hidden', ''); el.appRoot.classList.add('is-active'); if (el.authError) el.authError.setAttribute('hidden', ''); }
function showGate() { el.authGate.removeAttribute('hidden'); el.appRoot.classList.remove('is-active'); if (el.passwordInput) el.passwordInput.value = ''; if (el.authError) el.authError.setAttribute('hidden', ''); }
function normalizePassword(v) { return String(v || '').normalize('NFC').replace(/\r?\n/g, '').trim(); }
function handleAuthSubmit(e) { e.preventDefault(); if (normalizePassword(el.passwordInput?.value) === normalizePassword(SITE_PASSWORD)) { localStorage.setItem(AUTH_KEY, '1'); showApp(); return; } if (el.authError) el.authError.removeAttribute('hidden'); }
function logout() { localStorage.removeItem(AUTH_KEY); showGate(); }

function setDefaultMonthPicker() { const d = state.works.map(w => w.date).filter(Boolean).sort().reverse(); if (el.monthPicker) el.monthPicker.value = (d[0] || new Date().toISOString().slice(0, 10)).slice(0, 7); }

function buildOutputs(w) {
  const s = w.summary || w.problem || '주어진 과제', a = w.action || '문제를 구조화하고 실행했다', r = w.result || '실무 흐름을 개선했다', sk = (w.skills || []).length ? w.skills.join(', ') : '핵심 실무 역량';
  return {
    resume: `- ${s}를 다루는 과정에서 ${a}하고, ${r}로 이어지도록 기여함.`,
    portfolio: `배경: ${s}\n문제: ${w.problem || '문제 정의 보강 필요'}\n행동: ${a}\n결과: ${r}\n의미: 이 경험은 ${sk}을 실제 업무 맥락에서 증명하는 사례가 된다.`,
    star: `S: ${s}\nT: ${w.problem || '해결해야 할 과제가 있었다.'}\nA: ${a}\nR: ${r}`
  };
}

function getSkillFrequency(works = state.works) { const f = {}; works.forEach(w => (w.skills || []).forEach(s => { f[s] = (f[s] || 0) + 1; })); return Object.entries(f).sort((a, b) => b[1] - a[1]); }

function populateFilters() {
  const cp = el.projectFilter.value, cs = el.skillFilter.value;
  const projects = [...new Set(state.works.map(w => w.project).filter(Boolean))].sort();
  const skills = [...new Set(state.works.flatMap(w => w.skills || []).filter(Boolean))].sort();
  el.projectFilter.innerHTML = '<option value="">모든 프로젝트</option>' + projects.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  el.skillFilter.innerHTML = '<option value="">모든 역량</option>' + skills.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  el.projectFilter.value = projects.includes(cp) ? cp : '';
  el.skillFilter.value = skills.includes(cs) ? cs : '';
}

function getFilteredWorks() {
  const q = el.searchInput.value.trim().toLowerCase(), p = el.projectFilter.value, s = el.skillFilter.value;
  return [...state.works].sort((a, b) => (b.date || '').localeCompare(a.date || '')).filter(w => {
    if (q && ![w.title, w.project, w.summary, w.problem, ...(w.skills || [])].filter(Boolean).join(' ').toLowerCase().includes(q)) return false;
    if (p && w.project !== p) return false;
    if (s && !(w.skills || []).includes(s)) return false;
    return true;
  });
}

function renderStats() {
  el.totalWorks.textContent = state.works.length;
  el.totalAssets.textContent = state.works.filter(w => w.asset?.name).length;
  const top = getSkillFrequency()[0]; el.topSkill.textContent = top ? top[0] : '-';
  const m = el.monthPicker.value; el.monthlyWorkCount.textContent = m ? state.works.filter(w => String(w.date || '').startsWith(m)).length : 0;
}

function renderSkillMap() {
  const entries = getSkillFrequency();
  if (!entries.length) { el.skillSummary.textContent = '역량 데이터가 아직 없습니다.'; el.skillMap.innerHTML = '<div class="empty-state">업무에 역량 태그를 넣으면 여기에 쌓입니다.</div>'; return; }
  const max = entries[0][1] || 1, total = entries.reduce((s, [, c]) => s + c, 0);
  el.skillSummary.textContent = `${entries.length}개 역량 / 누적 ${total}개`;
  el.skillMap.innerHTML = entries.map(([skill, count]) => { const pct = Math.max(8, Math.round((count / max) * 100)); return `<div class="skill-row"><div class="skill-name">${escapeHtml(skill)}</div><div class="skill-bar"><div class="skill-bar-fill" style="width:${pct}%"></div></div><div class="skill-value">${count}</div></div>`; }).join('');
}

function renderList() {
  const items = getFilteredWorks();
  el.listSummary.textContent = `${items.length}개 표시 / 전체 ${state.works.length}개`;
  if (!items.length) { el.workList.innerHTML = '<div class="empty-state">조건에 맞는 업무가 없습니다.</div>'; return; }
  el.workList.innerHTML = items.map(w => `<div class="work-item${w.id === state.selectedId ? ' active' : ''}" data-id="${w.id}"><h3>${escapeHtml(w.title)}</h3><div class="meta">${escapeHtml(w.date || '')} · ${escapeHtml(w.project || '-')} · ${escapeHtml(w.category || '-')}</div><div class="meta">${escapeHtml(w.summary || '')}</div><div class="tag-list">${(w.skills || []).map(s => `<span class="tag">${escapeHtml(s)}</span>`).join('')}${w.asset?.name ? `<span class="tag tag-teal">${escapeHtml(w.asset.name)}</span>` : ''}</div></div>`).join('');
  el.workList.querySelectorAll('.work-item').forEach(node => { node.addEventListener('click', () => { state.selectedId = node.dataset.id; renderDetail(); renderList(); switchTab('detail'); }); });
}

function renderAssets() {
  const assets = state.works.filter(w => w.asset?.name).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  el.assetSummary.textContent = assets.length ? `총 ${assets.length}개 자산` : '아직 자산이 없습니다.';
  if (!assets.length) { el.assetLibrary.innerHTML = '<div class="empty-state">업무에 자산 이름을 넣으면 여기에 모입니다.</div>'; return; }
  el.assetLibrary.innerHTML = assets.map(w => `<div class="asset-item"><h4>${escapeHtml(w.asset.name)}</h4><div class="meta">${escapeHtml(w.asset.type || '-')} · ${escapeHtml(w.project || '-')} · ${escapeHtml(w.date || '')}</div><div class="meta">원본: ${escapeHtml(w.title)}</div><div class="tag-list">${(w.skills || []).map(s => `<span class="tag">${escapeHtml(s)}</span>`).join('')}</div></div>`).join('');
}

function renderMonthlySummary() {
  const month = el.monthPicker.value;
  if (!month) { el.monthlySummary.innerHTML = '<div class="empty-state">월을 선택하면 요약이 생성됩니다.</div>'; return; }
  const items = state.works.filter(w => String(w.date || '').startsWith(month));
  if (!items.length) { el.monthlySummary.innerHTML = `<div class="empty-state">${escapeHtml(month)}에 기록된 업무가 없습니다.</div>`; return; }
  const assets = items.filter(w => w.asset?.name), top5 = getSkillFrequency(items).slice(0, 5);
  const highlights = items.slice(0, 3).map(w => `<li>${escapeHtml(w.title)} — ${escapeHtml(w.result || w.summary || '')}</li>`).join('');
  const narrative = `${month}에는 총 ${items.length}개 업무를 수행, ${assets.length}개 자산을 남겼다. 핵심 역량은 ${top5.map(([s]) => s).join(', ') || '기록 없음'} 중심.`;
  el.monthlySummary.innerHTML = `<div class="summary-item"><strong>월간 서술</strong><div class="meta">${escapeHtml(narrative)}</div></div><div class="summary-item"><strong>주요 업무</strong><ul>${highlights}</ul></div><div class="summary-item"><strong>상위 역량</strong><ul>${top5.map(([s, c]) => `<li>${escapeHtml(s)} (${c})</li>`).join('')}</ul></div><div class="summary-item"><strong>남긴 자산</strong><ul>${assets.length ? assets.map(w => `<li>${escapeHtml(w.asset.name)} (${escapeHtml(w.asset.type || '-')})</li>`).join('') : '<li>없음</li>'}</ul></div>`;
}

function renderDetail() {
  const work = state.works.find(w => w.id === state.selectedId);
  if (!work) { el.detailEmpty.style.display = ''; el.detailView.className = 'detail-hidden'; el.detailView.innerHTML = ''; return; }
  const out = buildOutputs(work);
  el.detailEmpty.style.display = 'none';
  el.detailView.className = 'detail-visible';
  el.detailView.innerHTML = `<div class="detail-grid"><div class="detail-card full"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap"><div><h3 style="font-size:22px;margin-bottom:6px">${escapeHtml(work.title)}</h3><div class="meta">${escapeHtml(work.date || '')} · ${escapeHtml(work.project || '-')} · ${escapeHtml(work.role || '-')}</div></div><div class="detail-actions"><button type="button" class="btn btn-ghost btn-sm" data-action="edit">수정</button><button type="button" class="btn btn-danger btn-sm" data-action="delete">삭제</button></div></div></div><div class="detail-card"><h3>한 줄 설명</h3><div class="content">${nl2br(work.summary)}</div></div><div class="detail-card"><h3>사용 도구</h3><div class="content">${nl2br(work.tools || '-')}</div></div><div class="detail-card"><h3>문제</h3><div class="content">${nl2br(work.problem)}</div></div><div class="detail-card"><h3>행동</h3><div class="content">${nl2br(work.action)}</div></div><div class="detail-card"><h3>결과</h3><div class="content">${nl2br(work.result)}</div></div><div class="detail-card"><h3>배운 점</h3><div class="content">${nl2br(work.lesson)}</div></div><div class="detail-card"><h3>역량 태그</h3><div class="tag-list">${(work.skills || []).map(s => `<span class="tag tag-accent">${escapeHtml(s)}</span>`).join('') || '<span class="meta">없음</span>'}</div></div><div class="detail-card"><h3>자산</h3><div class="content">${work.asset?.name ? `${escapeHtml(work.asset.name)} <span class="tag tag-teal">${escapeHtml(work.asset.type || '-')}</span>` : '<span class="meta">없음</span>'}</div></div><div class="detail-card full"><h3>이력서 Bullet</h3><pre class="output">${escapeHtml(out.resume)}</pre></div><div class="detail-card"><h3>포트폴리오 문단</h3><pre class="output">${escapeHtml(out.portfolio)}</pre></div><div class="detail-card"><h3>면접 STAR</h3><pre class="output">${escapeHtml(out.star)}</pre></div></div>`;
  el.detailView.querySelector('[data-action="edit"]')?.addEventListener('click', () => startEdit(work.id));
  el.detailView.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteWork(work.id));
}

function renderAll() { renderStats(); renderSkillMap(); renderList(); renderAssets(); renderMonthlySummary(); renderDetail(); }

function workFromForm(form) {
  const d = new FormData(form), an = (d.get('assetName') || '').trim(), at = (d.get('assetType') || '').trim();
  return { title: (d.get('title') || '').trim(), date: d.get('date') || '', project: (d.get('project') || '').trim(), category: (d.get('category') || '').trim(), summary: (d.get('summary') || '').trim(), role: (d.get('role') || '').trim(), tools: (d.get('tools') || '').trim(), link: (d.get('link') || '').trim(), problem: (d.get('problem') || '').trim(), action: (d.get('action') || '').trim(), result: (d.get('result') || '').trim(), lesson: (d.get('lesson') || '').trim(), skills: parseSkills(d.get('skills') || ''), asset: an ? { name: an, type: at } : null };
}

function resetFormMode() { state.editingId = null; el.form.reset(); el.formTitle.textContent = '새 업무 기록'; el.formModeHint.textContent = '빠르게 기록하고, 필요하면 나중에 더 구조화하면 돼.'; el.submitBtn.textContent = '저장하기'; el.cancelEditBtn.classList.add('hidden'); }

function startEdit(id) {
  const w = state.works.find(x => x.id === id); if (!w) return;
  state.editingId = id; const f = el.form;
  f.title.value = w.title; f.date.value = w.date; f.project.value = w.project; f.category.value = w.category; f.summary.value = w.summary; f.role.value = w.role; f.tools.value = w.tools; f.link.value = w.link; f.problem.value = w.problem; f.action.value = w.action; f.result.value = w.result; f.lesson.value = w.lesson; f.skills.value = (w.skills || []).join(', '); f.assetName.value = w.asset?.name || ''; f.assetType.value = w.asset?.type || '';
  el.formTitle.textContent = '업무 수정'; el.formModeHint.textContent = '선택한 업무를 수정 중.'; el.submitBtn.textContent = '수정 저장'; el.cancelEditBtn.classList.remove('hidden');
  switchTab('record'); window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function persistWorks() { saveLocal(); if (state.cloud.user) { try { await pushToCloud(true); } catch(e) { console.warn(e); } } }

async function upsertWorkFromForm(form) {
  const payload = workFromForm(form);
  if (state.editingId) { state.works = state.works.map(w => w.id === state.editingId ? { ...w, ...payload, updatedAt: new Date().toISOString() } : w); state.selectedId = state.editingId; }
  else { const w = { id: uid(), ...payload, createdAt: new Date().toISOString(), updatedAt: null }; state.works.unshift(w); state.selectedId = w.id; }
  await persistWorks(); populateFilters(); renderAll(); resetFormMode(); switchTab('works');
}

async function deleteWork(id) {
  const w = state.works.find(x => x.id === id); if (!w || !confirm(`'${w.title}' 삭제할까요?`)) return;
  state.works = state.works.filter(x => x.id !== id);
  if (state.editingId === id) resetFormMode(); if (state.selectedId === id) state.selectedId = state.works[0]?.id || null;
  await persistWorks(); populateFilters(); renderAll();
}

function downloadBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href); }
function exportJson() { downloadBlob(new Blob([JSON.stringify({ works: state.works }, null, 2)], { type: 'application/json' }), 'career-asset-os.json'); }

function exportMarkdown() {
  const month = el.monthPicker.value, items = month ? state.works.filter(w => String(w.date || '').startsWith(month)) : state.works, top5 = getSkillFrequency(items).slice(0, 5);
  const lines = ['# Career Asset OS Export', '', `- 생성일: ${new Date().toISOString().slice(0, 10)}`, `- 대상: ${month || '전체'}`, `- 업무: ${items.length}`, `- 자산: ${items.filter(w => w.asset?.name).length}`, '', '## 상위 역량', ...top5.map(([s, c]) => `- ${s}: ${c}`), '', '## 업무'];
  items.forEach((w, i) => { const o = buildOutputs(w); lines.push('', `### ${i + 1}. ${w.title}`, `- 날짜: ${w.date || '-'}`, `- 프로젝트: ${w.project || '-'}`, `- 유형: ${w.category || '-'}`, `- 요약: ${w.summary || '-'}`, `- 문제: ${w.problem || '-'}`, `- 행동: ${w.action || '-'}`, `- 결과: ${w.result || '-'}`, `- 배운 점: ${w.lesson || '-'}`, `- 역량: ${(w.skills || []).join(', ') || '-'}`, `- 자산: ${w.asset?.name ? `${w.asset.name} (${w.asset.type || '-'})` : '-'}`, '', '#### 이력서', o.resume, '', '#### STAR', o.star); });
  downloadBlob(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }), `career-asset-os-${month || 'all'}.md`);
}

async function importJson(file) { try { const p = JSON.parse(await file.text()); state.works = Array.isArray(p.works) ? p.works.map(normalizeWork) : []; state.selectedId = state.works[0]?.id || null; resetFormMode(); await persistWorks(); populateFilters(); setDefaultMonthPicker(); renderAll(); } catch { alert('JSON 파일을 읽지 못했습니다.'); } }

async function seedDemo() {
  if (state.works.length && !confirm('기존 데이터를 데모로 바꿀까요?')) return;
  state.works = [
    { id: uid(), title: '주간 리포트 구조 개선', date: '2026-03-15', project: '성과 보고 체계', category: '분석/리포팅', summary: '반복 주간 보고서를 재사용 구조로 정리', role: '기획 및 작성', tools: 'Google Sheets, Markdown', link: '', problem: '매주 형식이 흔들려 작성 시간이 길어졌다.', action: '섹션 고정 + 지표-원인-액션 구조 템플릿화.', result: '작성 시간 단축, 문장 품질 안정화.', lesson: '반복 업무일수록 템플릿을 먼저.', skills: ['리포팅', '구조 설계', '문서화'], asset: { name: '주간 보고서 템플릿', type: 'template' }, createdAt: new Date().toISOString(), updatedAt: null },
    { id: uid(), title: 'AI 모자이크 검수 기준 정리', date: '2026-03-14', project: 'AI 이미지 운영', category: '운영/품질', summary: '모델 결과물 검수 기준 명확화', role: '운영 정리', tools: '문서, 이미지 샘플', link: '', problem: '해상도별 체감 차이로 검수 기준이 흔들렸다.', action: '실패 케이스 유형화 + 체크리스트 기준 정리.', result: '판단 기준 명확화, 커뮤니케이션 비용 감소.', lesson: '감각 기준은 반드시 체크리스트로 외부화.', skills: ['문제 해결', '운영', '체크리스트 설계'], asset: { name: '모자이크 검수 체크리스트', type: 'checklist' }, createdAt: new Date().toISOString(), updatedAt: null },
    { id: uid(), title: '업무 자산화 MVP 구현', date: '2026-03-13', project: 'Career Asset OS', category: '개발/MVP', summary: '실무를 커리어 문장으로 바꾸는 웹앱 MVP', role: '기획 및 구현', tools: 'HTML, CSS, JavaScript', link: '', problem: '업무 경험이 흩어져 이력서로 연결이 어려웠다.', action: '입력-구조화-출력 흐름 설계 + localStorage MVP.', result: '기록 즉시 커리어 문장 변환 기반 생성.', lesson: '작은 MVP라도 써볼 수 있으면 개선 포인트가 보인다.', skills: ['기획', '프론트엔드', '문제 해결', '구조 설계'], asset: { name: 'Career Asset OS MVP', type: 'document' }, createdAt: new Date().toISOString(), updatedAt: null }
  ];
  state.selectedId = state.works[0].id; resetFormMode(); await persistWorks(); populateFilters(); setDefaultMonthPicker(); renderAll();
}

function setCloudStatus(msg, type = '') {
  el.cloudStatus.textContent = msg; el.cloudStatus.classList.remove('ok', 'warn', 'error'); if (type) el.cloudStatus.classList.add(type);
  if (el.cloudBadge) { if (type === 'ok') { el.cloudBadge.textContent = 'Cloud ✓'; el.cloudBadge.style.background = 'var(--teal-light)'; el.cloudBadge.style.color = 'var(--teal)'; } else { el.cloudBadge.textContent = 'localStorage'; el.cloudBadge.style.background = ''; el.cloudBadge.style.color = ''; } }
}
function cloudReady() { return Boolean(state.cloud.client && state.cloud.user); }

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) { setCloudStatus('localStorage 모드.', 'warn'); return; }
  if (!window.supabase?.createClient) { setCloudStatus('Supabase 로드 대기...', 'warn'); setTimeout(() => { if (window.supabase?.createClient) doInitSupabase(); else setCloudStatus('Supabase 로드 실패.', 'error'); }, 2000); return; }
  doInitSupabase();
}
function doInitSupabase() {
  try { state.cloud.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); state.cloud.enabled = true; setCloudStatus('Supabase 준비 완료.', 'warn'); refreshCloudSession(); state.cloud.client.auth.onAuthStateChange(async () => { await refreshCloudSession(); }); }
  catch(e) { setCloudStatus(`초기화 실패: ${e.message}`, 'error'); }
}
async function refreshCloudSession() {
  if (!state.cloud.client) return;
  try { const { data, error } = await state.cloud.client.auth.getSession(); if (error) { setCloudStatus(`세션 실패: ${error.message}`, 'error'); return; } state.cloud.user = data.session?.user || null; if (state.cloud.user) { el.syncEmail.value = state.cloud.user.email || ''; setCloudStatus(`로그인: ${state.cloud.user.email}`, 'ok'); } else { setCloudStatus('클라우드 미로그인.', 'warn'); } }
  catch(e) { setCloudStatus(`세션 오류: ${e.message}`, 'error'); }
}
async function sendMagicLink() {
  if (!state.cloud.client) { alert('Supabase 설정 필요.'); return; }
  const email = el.syncEmail.value.trim(); if (!email) { alert('이메일을 입력해주세요.'); return; }
  const { error } = await state.cloud.client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href.split('#')[0] } });
  if (error) { setCloudStatus(`발송 실패: ${error.message}`, 'error'); return; }
  setCloudStatus(`매직 링크를 ${email}로 보냈습니다.`, 'ok');
}
async function pullFromCloud() {
  if (!cloudReady()) { alert('클라우드 로그인 필요.'); return; }
  setCloudStatus('불러오는 중...', 'warn');
  const { data, error } = await state.cloud.client.from('works').select('work_id,payload,updated_at').eq('user_id', state.cloud.user.id).order('updated_at', { ascending: false });
  if (error) { setCloudStatus(`실패: ${error.message}`, 'error'); return; }
  state.works = (data || []).map(r => normalizeWork({ id: r.work_id, ...r.payload }));
  state.selectedId = state.works[0]?.id || null; saveLocal(); populateFilters(); setDefaultMonthPicker(); resetFormMode(); renderAll();
  setCloudStatus(`${state.works.length}개 불러옴.`, 'ok');
}
async function pushToCloud(silent = false) {
  if (!cloudReady()) return;
  const { data: rd, error: fe } = await state.cloud.client.from('works').select('work_id').eq('user_id', state.cloud.user.id);
  if (fe) { setCloudStatus(`조회 실패: ${fe.message}`, 'error'); return; }
  const remoteIds = new Set((rd || []).map(r => r.work_id)), localIds = new Set(state.works.map(w => w.id));
  const toDelete = [...remoteIds].filter(id => !localIds.has(id));
  if (toDelete.length) { const { error } = await state.cloud.client.from('works').delete().eq('user_id', state.cloud.user.id).in('work_id', toDelete); if (error) { setCloudStatus(`삭제 실패: ${error.message}`, 'error'); return; } }
  if (state.works.length) { const rows = state.works.map(w => ({ user_id: state.cloud.user.id, work_id: w.id, payload: { ...w, id: undefined }, updated_at: new Date().toISOString() })); const { error } = await state.cloud.client.from('works').upsert(rows, { onConflict: 'user_id,work_id' }); if (error) { setCloudStatus(`저장 실패: ${error.message}`, 'error'); if (!silent) alert(error.message); return; } }
  setCloudStatus(`${state.works.length}개 반영 완료.`, 'ok');
}
async function signOutCloud() { if (!state.cloud.client) return; await state.cloud.client.auth.signOut(); state.cloud.user = null; setCloudStatus('로그아웃됨.', 'warn'); }

function bindEvents() {
  el.tabNav.addEventListener('click', (e) => { const b = e.target.closest('.tab-btn'); if (b) switchTab(b.dataset.tab); });
  el.form.addEventListener('submit', async (e) => { e.preventDefault(); await upsertWorkFromForm(el.form); });
  el.exportBtn.addEventListener('click', exportJson);
  el.mdExportBtn.addEventListener('click', exportMarkdown);
  el.importInput.addEventListener('change', async (e) => { const f = e.target.files?.[0]; if (f) await importJson(f); });
  el.searchInput.addEventListener('input', debounce(renderList, 200));
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

function init() {
  cacheDom(); loadLocal(); populateFilters(); setDefaultMonthPicker();
  state.selectedId = state.works[0]?.id || null; resetFormMode(); renderAll();
  if (isAuthenticated()) showApp(); else showGate();
  bindEvents(); initSupabase();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
