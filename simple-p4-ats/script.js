// ---------- Data (saved in browser localStorage) ----------
const STAGES = ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"];
const SKILLS = ["python","java","javascript","typescript","c++","c#","php","sql","mysql","postgresql","mongodb","react","angular","vue","node.js","django","flask","fastapi","html","css","docker","kubernetes","aws","azure","git","linux","rest","graphql","machine learning","deep learning","nlp","pandas","numpy","tensorflow","excel","power bi","tableau","agile","scrum","figma","communication","leadership"];

let db = JSON.parse(localStorage.getItem("ats") || '{"jobs":[],"apps":[],"interviews":[],"next":1}');
const save = () => localStorage.setItem("ats", JSON.stringify(db));
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const scoreColor = (s) => (s >= 70 ? "#16a34a" : s >= 40 ? "#d97706" : "#dc2626");
let currentJob = db.jobs[0]?.id || null;

// ---------- NLP: parse resume & score ----------
function extractSkills(text) {
  const t = " " + text.toLowerCase() + " ";
  return SKILLS.filter((s) => new RegExp("(?<![a-z0-9])" + s.replace(/[.+]/g, "\\$&") + "(?![a-z0-9])").test(t));
}
function parseResume(text) {
  const email = text.match(/[\w.+-]+@[\w.-]+\.\w+/);
  const phone = text.match(/\+?\d[\d\s()-]{8,14}\d/);
  const years = [...text.toLowerCase().matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/g)].map((m) => +m[1]);
  const name = (text.split("\n").find((l) => l.trim()) || "Unknown").trim().slice(0, 60);
  return { name, email: email ? email[0] : "", phone: phone ? phone[0].trim() : "", skills: extractSkills(text), years: years.length ? Math.max(...years) : 0 };
}
function wordVec(text) {
  const v = {};
  (text.toLowerCase().match(/[a-z+#.]{3,}/g) || []).forEach((w) => (v[w] = (v[w] || 0) + 1));
  return v;
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const k in a) { na += a[k] ** 2; if (b[k]) dot += a[k] * b[k]; }
  for (const k in b) nb += b[k] ** 2;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
function scoreCandidate(job, resumeText, skills) {
  const req = job.skills.length ? job.skills : extractSkills(job.desc);
  const matched = req.filter((s) => skills.includes(s));
  const missing = req.filter((s) => !skills.includes(s));
  const skillScore = req.length ? matched.length / req.length : 0;
  const textScore = cosine(wordVec(job.desc), wordVec(resumeText));
  return { score: Math.round((0.7 * skillScore + 0.3 * textScore) * 1000) / 10, matched, missing };
}

// ---------- UI ----------
function render() {
  $("jobSelect").innerHTML = db.jobs.map((j) => `<option value="${j.id}" ${j.id == currentJob ? "selected" : ""}>${esc(j.title)}</option>`).join("");
  const apps = db.apps;
  $("stats").innerHTML = `<div><b>${db.jobs.length}</b>Jobs</div><div><b>${apps.length}</b>Applications</div>
    <div><b>${apps.length ? (apps.reduce((s, a) => s + a.score, 0) / apps.length).toFixed(1) : 0}</b>Avg score</div>
    <div><b>${apps.filter((a) => a.stage === "Hired").length}</b>Hired</div>`;

  $("jobList").innerHTML = db.jobs.map((j) => `<div class="card"><div class="row"><h3>${esc(j.title)}</h3>
    <button onclick="delJob(${j.id})">Delete</button></div>
    <p class="muted">${apps.filter((a) => a.jobId === j.id).length} applicants</p>
    ${(j.skills.length ? j.skills : extractSkills(j.desc)).map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>`).join("");

  const jobApps = apps.filter((a) => a.jobId == currentJob).sort((a, b) => b.score - a.score);
  $("rankBody").innerHTML = jobApps.map((a, i) => `<tr><td>${i + 1}</td>
    <td><b>${esc(a.name)}</b><br><span class="muted">${esc(a.email)}</span></td>
    <td><span class="score" style="background:${scoreColor(a.score)}">${a.score}%</span></td><td>${a.years} yrs</td>
    <td>${a.matched.map((s) => `<span class="chip ok">${esc(s)}</span>`).join("")}</td>
    <td>${a.missing.map((s) => `<span class="chip bad">${esc(s)}</span>`).join("")}</td></tr>`).join("");

  $("kanban").innerHTML = STAGES.map((st) => `<div class="col" ondragover="event.preventDefault()" ondrop="dropCard(event,'${st}')">
    <h4>${st} <span class="muted">(${jobApps.filter((a) => a.stage === st).length})</span></h4>
    ${jobApps.filter((a) => a.stage === st).map((a) => `<div class="kcard" draggable="true" ondragstart="event.dataTransfer.setData('id','${a.id}')">
      <b>${esc(a.name)}</b><br><span class="score" style="background:${scoreColor(a.score)}">${a.score}%</span></div>`).join("")}</div>`).join("");

  $("ivCand").innerHTML = apps.map((a) => `<option value="${a.id}">${esc(a.name)} — ${esc(db.jobs.find((j) => j.id === a.jobId)?.title || "")}</option>`).join("");
  $("ivList").innerHTML = db.interviews.sort((a, b) => a.when.localeCompare(b.when)).map((i) => {
    const a = db.apps.find((x) => x.id === i.appId);
    return `<div class="card"><div class="row"><b>${esc(a?.name)}</b><button onclick="delIv(${i.id})">Cancel</button></div>
      <div class="muted">${i.dur} min</div><div>${new Date(i.when).toLocaleString()} with ${esc(i.who)}</div></div>`;
  }).join("");
}

// ---------- Actions ----------
window.delJob = (id) => { db.jobs = db.jobs.filter((j) => j.id !== id); db.apps = db.apps.filter((a) => a.jobId !== id); currentJob = db.jobs[0]?.id || null; save(); render(); };
window.delIv = (id) => { db.interviews = db.interviews.filter((i) => i.id !== id); save(); render(); };
window.dropCard = (e, stage) => { const a = db.apps.find((x) => x.id == e.dataTransfer.getData("id")); if (a) { a.stage = stage; save(); render(); } };

function addResumeText(text) {
  const job = db.jobs.find((j) => j.id == currentJob);
  if (!job) return alert("Create and select a job first.");
  if (!text.trim()) return;
  const p = parseResume(text);
  const r = scoreCandidate(job, text, p.skills);
  db.apps.push({ id: db.next++, jobId: job.id, stage: "Applied", name: p.name, email: p.email, phone: p.phone, years: p.years, skills: p.skills, ...r });
  save(); render();
}

$("jobForm").onsubmit = (e) => {
  e.preventDefault();
  const skills = $("jSkills").value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const job = { id: db.next++, title: $("jTitle").value, desc: $("jDesc").value, skills };
  db.jobs.push(job); currentJob = job.id; save(); e.target.reset(); render();
};
$("jobSelect").onchange = (e) => { currentJob = +e.target.value; render(); };
$("addResume").onclick = () => { addResumeText($("resumeText").value); $("resumeText").value = ""; };
$("resumeFile").onchange = (e) => {
  [...e.target.files].forEach((f) => { const r = new FileReader(); r.onload = () => addResumeText(r.result); r.readAsText(f); });
  e.target.value = "";
};
$("ivForm").onsubmit = (e) => {
  e.preventDefault();
  const start = new Date($("ivWhen").value), dur = +$("ivDur").value, who = $("ivWho").value.trim();
  const clash = db.interviews.find((i) => i.who.toLowerCase() === who.toLowerCase() &&
    start < new Date(new Date(i.when).getTime() + i.dur * 60000) && new Date(i.when) < new Date(start.getTime() + dur * 60000));
  const msg = $("ivMsg");
  if (clash) { msg.textContent = `${who} is already booked at ${new Date(clash.when).toLocaleString()}`; msg.classList.remove("hidden"); return; }
  msg.classList.add("hidden");
  const app = db.apps.find((a) => a.id == $("ivCand").value);
  if (app && ["Applied", "Screening"].includes(app.stage)) app.stage = "Interview";
  db.interviews.push({ id: db.next++, appId: +$("ivCand").value, who, when: $("ivWhen").value, dur });
  save(); render();
};
$("nav").onclick = (e) => {
  if (!e.target.dataset.tab) return;
  document.querySelectorAll(".tab").forEach((t) => t.classList.add("hidden"));
  $(e.target.dataset.tab).classList.remove("hidden");
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("on", b === e.target));
};
render();
