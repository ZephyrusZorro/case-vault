# Risk Scoring

> Legacy ID-SHIELD identity prototype reference. Risk scoring is not part of the running CaseVault DMS.

The score answers one question: **why should a human look at this case?** It is
policy-driven, fully configurable (`backend/app/core/risk_weights.json`) and every
applied point is written to the `risk_factors` table — the UI ledger shows the
complete ± trail.

## Inputs (evidence)

| Source | Becomes factors |
|---|---|
| Cross-document conflicts | `dob_mismatch`, `name_mismatch`, `document_number_mismatch`, `address_mismatch`, `gender_nationality_mismatch` |
| Forensic findings | `forensic_high`, `forensic_medium` |
| Validation results | `validation_fail_per_check`, `expired_document`, `mrz_checksum_fail` |
| Reuse scan | `document_reuse` |
| Consistent evidence | reductions: `name_consistent`, `address_consistent`, `mrz_valid`, `all_validations_pass` |

## Current weights (policy, not measurement)

```
+30 DOB mismatch              +30 name mismatch
+25 document number conflict  +15 address / gender / nationality conflict
+25 forensic high   +12 forensic medium      (capped 1 / 2)
+6 per failed validation check (cap 18)
+10 expired document          +20 MRZ checksum failure    +30 document reuse

−5 name consistent   −5 address consistent   −5 MRZ valid   −5 all checks pass
```

## Rules that keep the score honest

1. **Caps** prevent stacking (e.g. five medium forensic clusters count twice).
2. **Clamping** to 0–100.
3. **Gating policy:** consistency reductions are suppressed when a medium/high
   cross-document conflict, a high-suspicion forensic indicator, or any reuse
   hit exists. Consistent evidence can never cancel a direct identity conflict
   or a tampering/reuse signal. Regression-tested.

## Bands & recommendations

| Score | Band | Recommendation |
|---|---|---|
| 0–29 | LOW | `verification_passed` |
| 30–59 | MEDIUM | `review_recommended` |
| 60–79 | HIGH | `manual_review_required` |
| 80–100 | CRITICAL | `manual_review_required` |

If no readable content was extracted at all (corrupt file, empty OCR), the
recommendation is forced to `unable_to_verify` regardless of score.

## Worked example — signature demo case (Rahul Sharma)

```
+30  Cross-document conflict detected in date of birth.
+30  This identity evidence was reused across submissions (1 match).
+12  Visual tampering indicator(s) detected.
= 72/100  HIGH → manual review required
```

Changing weights requires editing the JSON only; bands are data too. The engine
unit-tests recompute expectations from the config so policy edits cannot silently
break the math.
