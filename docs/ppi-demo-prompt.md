# Build: "What is your LLM simulation actually worth?" — an interactive demo

## Context

LLM-based simulation of human respondents (digital twins, synthetic personas) is
cheap but inaccurate. Prediction-powered inference (PPI) lets you combine a small
gold-standard human sample with a large simulated sample to get valid estimates.
Broska, Howes & van Loon (2025, *Sociological Methods & Research* 54(3):1074–1109,
"The Mixed Subjects Design") reframe this for practitioners: the key quantity is
the **effective sample size** — how many real respondents your simulation is worth.

I want a single-page web demo that walks a mixed audience (statisticians, ML
engineers, product managers) through this idea using a real dataset, and that also
works as a tool: users can plug in their own cost assumptions and their own paired
data.

You are working in an empty (or README-only) git repository that is already
cloned locally. Set the project up yourself.

## Deliverable

A Vite + React single-page app, deployable to Vercel as a static site. Recharts
for charts. No backend. A Python script under `data/` prepares a small JSON that
the frontend imports.

## Working order

Follow this sequence. Do not skip ahead — each step gives me a checkpoint I can
verify before the next one builds on it.

**Step 0 — scaffold and baseline.**
Scaffold the Vite + React project in the repository root
(`npm create vite@latest . -- --template react`; keep the existing README and
.gitignore). Run `npm install`, verify `npm run dev` starts cleanly, then commit
this as a separate baseline commit before writing any application code. Also
extend `.gitignore` with `node_modules/`, `dist/`, `.env`, `.env.local`, and
`data/raw/`, and create `data/raw/.gitkeep`. Raw datasets must never be committed.

**Step 1 — data.**
Write and run `data/prepare.py`. **Print the resulting numbers to stdout and stop
there.** I want to see them before any frontend work begins. If the dataset schema
does not match expectations, stop and report what you actually found rather than
guessing at column names. If the download fails, say so — do not fabricate numbers.

**Step 2 — compute layer.**
Implement the formulas below as pure functions with unit tests, independent of any
UI. Verify the tests pass before wiring anything to a component.

**Step 3 — UI.**
Build the four-section page described below.

**Step 4 — polish.**
README, assumptions section, deploy configuration.

Commit after each logical unit with a descriptive message (e.g. "add data prep
script", "compute effective sample size per domain", "add budget allocation
controls"). Keep infrastructure changes and feature changes in separate commits.

## Data

Dataset: **Twin-2K-500** — https://huggingface.co/datasets/LLM-Digital-Twin/Twin-2K-500
(and the companion `Twin-2K-500-Mega-Study`, which contains paired human and
LLM-simulated responses per respondent, so no LLM inference is needed).

`data/prepare.py` should:
1. Download the paired human/simulated responses into `data/raw/`.
2. Group items into 4–6 interpretable domains (e.g. personality, risk preference,
   consumer choice, moral judgment). Document the mapping in a comment.
3. For each domain compute and write to `src/data/twin2k.json`:
   `n_items`, `n_respondents`, human mean, simulated mean,
   `var_human` (σ²_Y), `var_sim` (σ²_f), `var_diff` (σ²_Δ where Δ = Y − f),
   `corr` (Pearson r between Y and f), and per-item rows for drill-down.

Binarization or scoring rules must be explicit and per-item. Reverse-coded scale
items will corrupt the profile if handled blindly — if the coding direction of an
item is unclear, drop it and note the exclusion rather than guessing.

## The math (implement exactly this)

Notation: `n` = gold-standard (human) sample size, `N` = simulated sample size,
Y = human response, f = simulated response, Δ = Y − f.

**PPI mean estimator (the "rectifier"):**
```
θ̂_PPI = mean(f over N unlabeled) + mean(Y − f over n labeled)
Var(θ̂_PPI) = σ²_f / N + σ²_Δ / n
```

**Classical estimator (humans only):**
```
θ̂_classical = mean(Y over n)
Var(θ̂_classical) = σ²_Y / n
```

**Effective sample size** — the number of human respondents that would give the
same variance as the PPI estimate:
```
n_eff = σ²_Y / Var(θ̂_PPI) = σ²_Y / (σ²_f/N + σ²_Δ/n)
```

**Optimal budget allocation** — minimize Var subject to `c_h·n + c_m·N = B`:
```
n/N = sqrt( (σ²_Δ · c_m) / (σ²_f · c_h) )
```
then scale to exhaust the budget. `c_h` = cost per human respondent,
`c_m` = cost per simulated respondent.

**PPI correlation:** Broska et al. define this as their measure of
interchangeability. I do not have their exact definition — look it up in the paper
(SSRN abstract_id=5133034 or the Sage version) and implement it as defined there.
If you cannot access the paper, implement plain Pearson correlation between Y and
f, label it clearly as "correlation (not the paper's PPI correlation)", and flag
this in the code and the UI. **Do not invent a formula and call it PPI
correlation.**

## Structure: four sections, each headed by a plain-language question

The demo is a narrative, not a dashboard. One page, four sections, read in order.
Each headline is a question a non-technical reader would ask.

**1. "How far off are the AI's answers?"**
Scatter or paired-bar comparison of human vs simulated responses per domain. Pure
intuition, no jargon, no coefficients yet. The reader should see the gap before
being given any number for it.

**2. "So what is the simulation worth?"**
Introduce effective sample size. The memorable line, rendered large:
`Simulating 2,000 respondents ≈ interviewing 340 real people`
(use the real computed numbers). One short paragraph explaining what that means.

**3. "Where can't we trust it?"**
Break n_eff down by domain. Bar chart, sorted. Some domains will be worth much
less than others; that heterogeneity is the point. Add one line naming the domain
where simulation is least trustworthy and why that matters — a single global
"accuracy" number would have hidden it.

**4. "Given my budget, how many real people should I recruit?"**
Inputs (sliders + number fields): cost per human respondent, cost per simulated
respondent, total budget, target confidence-interval width. Outputs: optimal
`n` and `N`, resulting CI width, and cost saved versus a humans-only design that
achieves the same precision. This is the section a manager will screenshot.

## User input: two layers

**Layer 1 (required):** the cost/budget controls in section 4. Recomputes
instantly from the closed forms above. No server, no libraries needed.

**Layer 2 (required):** a "use your own data" panel. User pastes or uploads a
two-column CSV (`human,simulated`), optionally with a third `group` column. On
submit, recompute sections 2–4 against their data. Validate input and show clear
errors for non-numeric values, mismatched lengths, or n < 30. For mean estimation
all the formulas above are closed-form, so this is a few lines of JS — no stats
library required.

## Design and tone

- Explain in plain language first, formula second. Every technical term gets a
  one-sentence gloss on first use. Put the formulas in a collapsible "the math"
  block so statisticians can check them without them being in the way.
- Restrained, editorial visual style. Not a corporate BI dashboard.
- State assumptions honestly in the UI where they bite: this treats the human
  sample as a valid gold standard, and assumes the calibration sample is drawn
  from the same population as the target. If they differ, the correction can
  fail. One short "assumptions and limits" section at the end — do not bury it.
- Every displayed estimate gets an uncertainty interval, not just a point value.
- No placeholder or lorem text in the final build. If a number is not yet real,
  label it as synthetic in the UI itself.

## README

Written for a stranger: what the project does in two sentences, a screenshot,
exact setup commands, how to regenerate the data, a short note on the method with
the Broska et al. citation, and the assumptions and limits. Someone should be able
to clone and run it in five minutes.
