# AI Recruitment ATS (Simple HTML/CSS/JS version)

Plain HTML + CSS + JavaScript. No install, no server — **double-click `index.html`**.
Data is saved in your browser (localStorage).

## How to use
1. **Jobs** → create a job (e.g. Python Developer, skills: python, fastapi, sql, docker, kubernetes).
2. **Candidates** → upload the `.txt` files in `sample-resumes/` (or paste resume text). Resumes are parsed (name, email, phone, skills, experience) and ranked by match score (70% skill match + 30% text similarity).
3. **Pipeline** → drag candidate cards between hiring stages.
4. **Interviews** → schedule interviews; double-booking an interviewer is blocked.

## Publish with GitHub Pages
Upload these files to a GitHub repo → Settings → Pages → Branch: main → Save. Your live link will be `https://USERNAME.github.io/REPO/`.
