"""Prepare data/raw/Twin-2K-500 human vs. LLM-simulated responses into src/data/twin2k.json.

DATA SOURCE (see docs in this repo's conversation history / README for the full
reconnaissance). Two files from the HuggingFace dataset
LLM-Digital-Twin/Twin-2K-500, folder LLM_simulation_results/
GPT4.1-mini-simulation-llm-vs-human/, share the same 168-column schema:

  - responses_wave4_formatted.csv   -> the REAL wave-4 human answers
        (verified: for every mapped column this is byte-identical to the
        official wave4_response.csv, corr = 1.000 -- confirmed empirically
        before writing this script)
  - responses_wave1_3_formatted.csv -> GPT-4.1-mini's SIMULATED prediction of
        each person's wave-4 answers, generated from a persona built out of
        that same person's wave 1-3 answers. This is the actual "digital
        twin" prediction the demo is about.

A third file in the same folder, responses_llm_imputed_formatted.csv, is a
weaker fallback simulation (used for respondents with incomplete wave 1-3
personas, correlation to the human values ~0.3-0.6 vs ~0.5-0.8 for the file
above) -- EXCLUDED here, not representative of the primary digital-twin
result.

NOTE ON WHAT'S *NOT* HERE: the companion dataset Twin-2K-500-Mega-Study
does NOT contain paired human/simulated data (checked: its parquet files
hold only human responses plus an LLM prompt template -- generating the
simulated side would require running new LLM inference, which is out of
scope for this demo). It is not used. This also means there is no paired
"personality" or "moral judgment" domain: personality (Big Five, etc.) was
only ever collected from humans and used as INPUT to build each persona; the
LLM was never asked to reproduce it, so there is no simulated counterpart to
compare against. The domains below reflect what the wave-4 behavioral-
economics / heuristics-and-biases battery (the only battery with real
paired data) actually covers.

ITEM SCORING RULE (deterministic, derived only from question_catalog.json
metadata -- never guessed from the observed data):
  - Slider (0-100 range in this dataset): score = raw / 100
  - MC / Matrix with exactly 2 options: score = 1.0 if raw == 1 else 0.0
    (first listed option -> 1, second -> 0)
  - MC / Matrix with > 2 options: score = (raw - 1) / (n_options - 1)
    (native Options/Columns order is used as-is; these are single-
    administration items, not multi-item validated scales, so there is no
    independent criterion for reverse-coding direction)
  - Free-text numeric (TE) items are handled per-item because the catalog
    has no declared bound for them:
      * Sunk cost (QID181, QID182): question text explicitly states
        "Enter a number between 0 and 20" -> score = raw / 20
      * Anchoring estimates (QID164, QID166, QID168, QID170: African-country
        count / redwood height in feet) have no natural bound and mix
        incompatible units -> score = raw / (human sample mean for that
        item), a ratio index centered near 1.0 for humans by construction.
        This is the one item type where the normalizer is derived from the
        data rather than fixed metadata; flagged in the UI.

EXCLUDED ITEMS: the 4 anchoring "more or fewer than X?" gating questions
(QID163, QID165, QID167, QID169) are dropped -- they are binary manipulation
checks that precede the actual numeric estimate (QID164/166/168/170) for the
same paradigm, not an independent quantity worth its own row.

DOMAINS (grouped from the dataset's own BlockName field, by QuestionID):
  consumer_choice         - 40 items - product purchase-intent (yes/no)
  risk_framing            - 17 items - disease framing, outcome bias,
                             less-is-more gambles, proportion dominance,
                             Myside bias, omission bias, denominator neglect
  probability_estimation  - 18 items - engineer/lawyer base-rate sliders,
                             probability-matching choice trials
  anchoring_estimation    -  4 items - numeric estimates after a low/high
                             anchor (African countries, redwood height)
  consistency_judgments   - 15 items - Linda conjunction fallacy, sunk cost,
                             absolute-vs-relative framing, WTA/WTP, Allais
  self_referential_bias   - 28 items - false consensus (self & others),
                             benefit/risk ratings of technologies
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

RAW = Path(__file__).parent / "raw"
OUT = Path(__file__).parent.parent / "src" / "data" / "twin2k.json"

HUMAN_CSV = RAW / "responses_wave4_formatted.csv"
SIM_CSV = RAW / "responses_wave1_3_formatted.csv"
CATALOG_JSON = RAW / "question_catalog.json"
MAPPING_JSON = RAW / "wave4_formatted_to_catalog_mapping.json"

DOMAIN_LABELS = {
    "consumer_choice": "Consumer choice",
    "risk_framing": "Risk & decision framing",
    "probability_estimation": "Probability & base-rate judgment",
    "anchoring_estimation": "Anchoring & numeric estimation",
    "consistency_judgments": "Consistency & value judgments",
    "self_referential_bias": "Self-referential & heuristic bias",
}

DOMAIN_DESCRIPTIONS = {
    "consumer_choice": "Would you buy this product at this price? 40 everyday product categories.",
    "risk_framing": "Classic gain/loss framing, outcome bias, and proportion-dominance judgments about risky decisions.",
    "probability_estimation": "Base-rate estimates and probability-matching-vs-maximizing choice trials.",
    "anchoring_estimation": "Numeric estimates (country counts, tree height) after being shown a low or high anchor.",
    "consistency_judgments": "Conjunction fallacy, sunk cost, WTA/WTP, and Allais-paradox choices that classically violate strict rational-choice axioms.",
    "self_referential_bias": "False-consensus effect (self & others) and benefit/risk ratings of everyday technologies.",
}

# QuestionID -> domain. QIDs not listed here (QID163, QID165, QID167, QID169)
# are the excluded anchoring gating items -- see module docstring.
QID_DOMAIN = {}
for i in range(1, 41):
    QID_DOMAIN[f"QID9_{i}"] = "consumer_choice"
for qid in [
    "QID158", "QID157", "QID161", "QID162",
    "QID171", "QID172", "QID173",
    "QID174", "QID175", "QID176", "QID177", "QID178", "QID179",
    "QID194", "QID195", "QID291", "QID196",
]:
    QID_DOMAIN[qid] = "risk_framing"
for qid in ["QID156", "QID154", "QID198", "QID203"]:
    QID_DOMAIN[qid] = "probability_estimation"
for qid in ["QID164", "QID166", "QID168", "QID170"]:
    QID_DOMAIN[qid] = "anchoring_estimation"
for qid in [
    "QID159", "QID160", "QID181", "QID182", "QID183", "QID184",
    "QID189", "QID190", "QID191", "QID192", "QID193",
]:
    QID_DOMAIN[qid] = "consistency_judgments"
for qid in ["QID287", "QID288", "QID289", "QID290"]:
    QID_DOMAIN[qid] = "self_referential_bias"

EXCLUDED_QIDS = {"QID163", "QID165", "QID167", "QID169"}
SUNK_COST_QIDS = {"QID181", "QID182"}  # bounded 0-20 per question text
RATIO_QIDS = {"QID164", "QID166", "QID168", "QID170"}  # unbounded numeric estimate


def load_catalog():
    catalog = json.loads(CATALOG_JSON.read_text())
    return {c["QuestionID"]: c for c in catalog}


def load_mapping():
    return json.loads(MAPPING_JSON.read_text())


def score_column(qid, cat_entry, raw, human_ref_mean=None):
    """Return the [0,1]-ish scored series for one column, per the rule in the
    module docstring. `raw` is the pandas Series of raw numeric values."""
    qtype = cat_entry["QuestionType"]

    if qtype == "Slider":
        rng = cat_entry.get("Range") or {}
        lo, hi = rng.get("Min", 0), rng.get("Max", 100)
        assert (lo, hi) == (0, 100), f"unexpected slider range for {qid}: {rng}"
        return raw / 100.0

    if qtype == "TE":
        if qid in SUNK_COST_QIDS:
            return raw / 20.0
        if qid in RATIO_QIDS:
            assert human_ref_mean not in (None, 0), f"missing human reference mean for {qid}"
            return raw / human_ref_mean
        raise ValueError(f"unhandled TE item {qid}")

    if qtype in ("MC", "Matrix"):
        n_opts = len(cat_entry.get("Options") or cat_entry.get("Columns") or [])
        if n_opts == 2:
            return raw.map(lambda v: 1.0 if v == 1 else (0.0 if v == 2 else np.nan))
        return (raw - 1) / (n_opts - 1)

    raise ValueError(f"unhandled question type {qtype!r} for {qid}")


def pearson_or_nan(a, b):
    if len(a) < 2 or a.std(ddof=1) == 0 or b.std(ddof=1) == 0:
        return None
    r = np.corrcoef(a, b)[0, 1]
    return None if np.isnan(r) else float(r)


def var_or_none(x):
    if len(x) < 2:
        return None
    return float(x.var(ddof=1))


def main():
    for f in (HUMAN_CSV, SIM_CSV, CATALOG_JSON, MAPPING_JSON):
        if not f.exists():
            raise SystemExit(f"missing required raw file: {f}. Run the download step first.")

    human = pd.read_csv(HUMAN_CSV, skiprows=[1])
    sim = pd.read_csv(SIM_CSV, skiprows=[1])
    catalog = load_catalog()
    mapping = load_mapping()

    human = human.set_index("TWIN_ID")
    sim = sim.set_index("TWIN_ID")
    common_pids = human.index.intersection(sim.index)

    excluded_rows = []
    item_scores = {}  # formatted_column -> DataFrame(human=..., sim=...)
    item_meta = {}

    for m in mapping:
        col, qid = m["formatted_column"], m["QuestionID"]
        if qid in EXCLUDED_QIDS:
            excluded_rows.append({
                "formatted_column": col,
                "question_id": qid,
                "reason": "binary anchoring manipulation-check ('more or fewer than X?') that "
                          "precedes the numeric estimate for the same paradigm; not an "
                          "independent quantity",
            })
            continue
        domain = QID_DOMAIN.get(qid)
        if domain is None:
            excluded_rows.append({
                "formatted_column": col,
                "question_id": qid,
                "reason": "not assigned to a domain",
            })
            continue

        cat_entry = catalog[qid]
        raw_h = pd.to_numeric(human.loc[common_pids, col], errors="coerce")
        raw_s = pd.to_numeric(sim.loc[common_pids, col], errors="coerce")

        ref_mean = raw_h.mean() if qid in RATIO_QIDS else None
        scored_h = score_column(qid, cat_entry, raw_h, ref_mean)
        scored_s = score_column(qid, cat_entry, raw_s, ref_mean)

        df = pd.DataFrame({"human": scored_h, "sim": scored_s}).dropna()
        item_scores[col] = df
        item_meta[col] = {
            "question_id": qid,
            "domain": domain,
            "question_text": (cat_entry.get("QuestionText") or "")[:200],
            "question_type": cat_entry["QuestionType"],
        }

    domains_out = []
    for domain_id, label in DOMAIN_LABELS.items():
        cols = [c for c, meta in item_meta.items() if meta["domain"] == domain_id]

        item_rows = []
        composite_h = {}
        composite_s = {}
        for col in cols:
            df = item_scores[col]
            meta = item_meta[col]
            diff = df["human"] - df["sim"]
            item_rows.append({
                "id": col,
                "question_id": meta["question_id"],
                "question_text": meta["question_text"],
                "n": int(len(df)),
                "human_mean": float(df["human"].mean()),
                "sim_mean": float(df["sim"].mean()),
                "var_human": var_or_none(df["human"]),
                "var_sim": var_or_none(df["sim"]),
                "var_diff": var_or_none(diff),
                "corr": pearson_or_nan(df["human"], df["sim"]),
            })
            for pid, row in df.iterrows():
                composite_h.setdefault(pid, []).append(row["human"])
                composite_s.setdefault(pid, []).append(row["sim"])

        pids = sorted(set(composite_h) & set(composite_s))
        y = pd.Series({p: np.mean(composite_h[p]) for p in pids})
        f = pd.Series({p: np.mean(composite_s[p]) for p in pids})
        diff = y - f

        domains_out.append({
            "id": domain_id,
            "label": label,
            "description": DOMAIN_DESCRIPTIONS[domain_id],
            "n_items": len(cols),
            "n_respondents": len(pids),
            "human_mean": float(y.mean()),
            "sim_mean": float(f.mean()),
            "var_human": var_or_none(y),
            "var_sim": var_or_none(f),
            "var_diff": var_or_none(diff),
            "corr": pearson_or_nan(y, f),
            "items": sorted(item_rows, key=lambda r: r["id"]),
        })

    # Overall headline figure (section 2): same composite-and-pool method as
    # each domain above, but pooling every retained item across all domains
    # instead of grouping by domain. Not a "domain" itself -- a summary of all
    # of them together, used for the single memorable "worth" line.
    all_composite_h = {}
    all_composite_s = {}
    for col, df in item_scores.items():
        for pid, row in df.iterrows():
            all_composite_h.setdefault(pid, []).append(row["human"])
            all_composite_s.setdefault(pid, []).append(row["sim"])
    all_pids = sorted(set(all_composite_h) & set(all_composite_s))
    y_all = pd.Series({p: np.mean(all_composite_h[p]) for p in all_pids})
    f_all = pd.Series({p: np.mean(all_composite_s[p]) for p in all_pids})
    diff_all = y_all - f_all
    overall_out = {
        "n_items": len(item_scores),
        "n_respondents": len(all_pids),
        "human_mean": float(y_all.mean()),
        "sim_mean": float(f_all.mean()),
        "var_human": var_or_none(y_all),
        "var_sim": var_or_none(f_all),
        "var_diff": var_or_none(diff_all),
        "corr": pearson_or_nan(y_all, f_all),
    }

    output = {
        "meta": {
            "source": "LLM-Digital-Twin/Twin-2K-500 (HuggingFace), "
                      "LLM_simulation_results/GPT4.1-mini-simulation-llm-vs-human/",
            "human_file": HUMAN_CSV.name,
            "sim_file": SIM_CSV.name,
            "n_respondents_total": int(len(common_pids)),
            "correlation_caveat": "corr fields are plain Pearson correlation between human and "
                                  "simulated scores -- NOT the PPI correlation defined in "
                                  "Broska, Howes & van Loon (2025); that definition was not "
                                  "accessible while building this demo.",
        },
        "excluded": excluded_rows,
        "overall": overall_out,
        "domains": domains_out,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(output, indent=2))

    print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes)\n")
    print(f"Paired respondents (human ∩ sim): {len(common_pids)}")
    print(f"Excluded items: {len(excluded_rows)}\n")
    o = overall_out
    print("[overall] all domains pooled")
    print(f"  n_items={o['n_items']}  n_respondents={o['n_respondents']}")
    print(f"  human_mean={o['human_mean']:.4f}  sim_mean={o['sim_mean']:.4f}")
    print(f"  var_human={o['var_human']:.5f}  var_sim={o['var_sim']:.5f}  var_diff={o['var_diff']:.5f}")
    print(f"  corr={o['corr']:.3f}\n" if o["corr"] is not None else "  corr=None\n")
    for d in domains_out:
        print(f"[{d['id']}] {d['label']}")
        print(f"  n_items={d['n_items']}  n_respondents={d['n_respondents']}")
        print(f"  human_mean={d['human_mean']:.4f}  sim_mean={d['sim_mean']:.4f}")
        print(f"  var_human={d['var_human']:.5f}  var_sim={d['var_sim']:.5f}  var_diff={d['var_diff']:.5f}")
        print(f"  corr={d['corr']:.3f}" if d["corr"] is not None else "  corr=None")
        print()


if __name__ == "__main__":
    main()
