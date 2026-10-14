# Madman improvement experiments — 2026-10-15

Research spike requested by the user: maximize attacking play and premove speed, accept tactical mistakes, keep one estimated 120 cp allowance, add no preferences. The experiments below were research prototypes. The user subsequently approved implementation: earlier prediction/seed publication and targeted offered-piece capture preparation are now integrated into the runtime. The experimental attack-weight changes remain unshipped. Measurements below belong to the recorded prototypes, not a new browser benchmark.

## Recommendation

Keep Stockfish 19 Lite, the current attacking selector, and 120 cp on every evaluated Madman turn. Improve how soon and where that selector runs:

1. **Publish the prediction search's legal reply PVs immediately.** Its six opponent lines often already contain our next move. Currently that work is discarded while branches are searched again. Treat these replies as speculative continuations with unknown concession, like the existing own-turn planned continuation. Never copy an opponent-root evaluation onto our reply or invent `0 cp` loss. An existing continuation from the selected Madman attack should outrank an ordinary prediction continuation for the same position.
2. **Publish an early Madman choice from each existing depth-three seed batch.** The preparer already searches three replies before doing its larger restricted depth-four comparison. Compare that complete same-depth batch immediately using the existing attack score and 120 cp allowance, then upgrade it with the depth-four and full searches. This buys a little more speed and aggression without another engine call. These estimates are shallower and can be wrong.
3. **Explicitly prepare captures of our offered piece.** Carry the chosen move's legal `captureMoves` into preparation, add up to four missing capture branches alongside the ordinary six, and prioritize those additions for aggressive reply searches. Publish ordinary prediction continuations before spending time on those extra searches. This targets the opponent accepting bait, including bad captures that best-play predictions omit. Increase the cache bound consistently to ten branches plus the own-turn planned continuation; preserve complete FEN/history/session/settings/variant checks and legality validation.

Keep one worker and serial searches. Already prepared entries remain usable when later work is canceled. A speculative entry must never overwrite an evaluated entry. Prediction replies must never overwrite the selected attack's existing planned reply merely because both have source `planned`. Evaluated depth-three choices must yield to depth-four/full results, and authoritative positive mates must retain priority.

Do not add a second risk threshold, a cooldown, queen-trade avoidance, random sacrifices, or a new setting. This proposal increases speculative coverage under the user's accepted risk policy.

## What was run

- Installed Stockfish package `19.0.1`, `stockfish-19-lite-single.js`, through the real `UciClient` with a Node subprocess acting as the worker transport. Bun 1.4.3, Node v26.11.1, Intel i5-10210U. No additional dependency or engine download.
- 32 manually selected opening positions: Italian, King's Gambit, Dragon, French, King's Indian, Scandinavian, Queen's Gambit, and Sicilian; two stages per opening and both colors. Legal SAN replay supplied complete histories.
- One persistent worker, reset before each tested mode. Each research process ran sequentially; no simultaneous timed engine processes.
- Actual `prepareMadmanPremoves` with depth-three prediction, existing depth-four fast pass, depth cap 18 and 100 ms refinement budget per branch. The same execution recorded hypothetical publication opportunities for raw prediction continuations and depth-three seed selections. Thus comparisons within the follow-up run share the same searches and completion times.
- Depth-14 single-PV opponent move as a deterministic coverage proxy. Scripted next opening moves were a second proxy in the initial run. Neither is a sample of human bullet replies.
- Style experiment: all legal root moves at depth eight, current versus proposed scores/pools, then a separate depth-14 restricted comparison including a depth-14 baseline move and all selected alternatives.
- Premove audit: depth-12 baseline followed by a depth-12 restricted comparison of the baseline and published moves on the predicted resulting position, with history extended correctly. Thirty reference branches were available for audit; the remaining two were prediction misses.
- Capture experiment: 19 of the 32 current-style selections from the diagnostic depth-eight six-plus-four pool offered a piece/pawn with a legal capture. There were 31 legal captures. A throwaway fast-pass copy added missing capture branches, before the ordinary predicted branches, with a ten-branch bound. The full refinement pass was omitted in both capture comparison modes to isolate fast readiness. These starting moves were not collected from live 100 ms foreground searches.

All timing is native WASM search/preparation time, **not browser move acceptance or dispatch latency**. The own-turn planned continuation already in the product is excluded from these coverage tables. The experiments measure opponent-turn table preparation only. Cold game positions were tested, not an entire prewarmed game sequence.

## Premove results

Follow-up run: number of 32 reference opponent replies with an entry available by the deadline. Entries upgrade as more search finishes.

| Preparation allowed | 25 ms | 50 ms | 100 ms | 200 ms |
| --- | ---: | ---: | ---: | ---: |
| Current depth-four/full entries | 1 | 7 | 22 | 29 |
| Also reuse prediction replies | 12 | 22 | 26 | 30 |
| Also publish depth-three choices, without raw prediction replies | 4 | 13 | 22 | 29 |
| Both early publication changes | 12 | 24 | 26 | 30 |

Median first publication across positions: prediction continuation 27 ms (31 positions had one), depth-three selection 36 ms, current depth-four entry 53 ms. The first full upgrade was 288 ms among the 30 positions that produced one. These are first-entry timings, not readiness of all branches.

An earlier run found 13 versus 24 covered reference replies at 50 ms for current versus prediction reuse. Timing varies; the early-coverage direction held across both runs. The combined version was tested only in the follow-up.

At 50 ms, the combined version would use 11 raw continuations, six depth-three choices and seven depth-four choices. This makes the tradeoff explicit: some very fast opponents receive a conventional Stockfish continuation before an aggressive branch comparison is ready. At 100 ms, all six depth-three entries on the reference branches had been superseded by depth-four entries; four raw continuations were still needed.

In the depth-12 audit, none of the 24 available combined entries at 50 ms exceeded 120 cp relative to the audited comparison. At 100 ms, two of the 26 available entries exceeded 120 cp, with a maximum of 254 cp; both were existing depth-four choices. This small selected sample does not establish a blunder rate or prove the shallow extension equally strong. The 120 cp gate is a search estimate, not a bound on eventual loss.

### Captures of our offered piece

| Fast entries ready for the 31 legal captures | Ordinary six branches | Six plus targeted captures |
| --- | ---: | ---: |
| By 50 ms | 13 | 26 |
| By 100 ms | 15 | 30 |
| By 200 ms | 16 | 31 |
| Eventually in the fast pass | 16 | 31 |

Median targeted capture reply readiness was 29 ms; maximum 144 ms. Twelve of the 19 offer positions had at least one capture omitted by the ordinary table. Missing captures frequently included queen captures that lose the queen to an immediate recapture. They are valuable branches for this requested style even though best-play prediction ranks them poorly.

Depth-12 audit of the 31 targeted replies found five concessions above 120 cp, one above 300 cp, maximum 392 cp. That worst move was also selected by the ordinary preparer on the same capture branch. This does not make the loss acceptable under an exact bound; it demonstrates the existing shallow-policy limitation. The proposed extra branches increase how often speculative moves can actually be played.

Examples from the observations:

- Dragon-11: after our `...Bg4`, `Qxg4` was absent from the ordinary table. The targeted branch prepared `...Nxg4` in 23 ms; the depth-12 comparison found no concession relative to its baseline.
- Scandinavian-11: after our `...b5`, `Bxb5` was absent. `...cxb5` was ready in 20 ms, again with no concession in that audit.
- Sicilian-19: after our `...b5`, both `Bxb5` and `Nxb5` were absent. Targeted replies were ready in 20/28 ms. These branches cover tempting mistakes; they do not establish that every offered pawn is poisoned.

## Attack scoring: tested, but not ready to replace the current score

Tested adding a nonlinear bonus for multiple distinct attackers around the enemy king and a bonus for advanced pawns on the king's file/neighbouring files, averaged across our first three positions in the PV. A second variant reserved proposal slots for checks, king-file pawn moves and offered pieces, then filled remaining slots by attack score. We retained four extra proposals and 120 cp eligibility.

| Depth-eight selection variant | Changed moves / 32 | Mean audited loss at depth 14 | Audited loss above 120 cp |
| --- | ---: | ---: | ---: |
| Current score, all legal root lines | — | 62.4 cp | 7 |
| Added swarm/pawn score, all legal root lines | 6 | 64.0 cp | 7 |
| Current score and current six-plus-four proposal pool | — | 53.3 cp | 6 |
| New score and diversified six-plus-four proposal pool | 7 | 50.2 cp | 5 |

These are small diagnostic comparisons, not match results. The final row combines discovery and scoring changes, so it cannot attribute the improvement to either separately. Attack-feature scores are also the hypothesis being optimized, so an increased feature score is not independent evidence of better attacking chess.

One promising example was King's Indian-17: the combined pool selected `...h5` instead of `...Nd7`; the separately audited `...h5` was close to the current all-root choice in evaluation. Other changes preferred quiet moves such as `...d6` or a queen recapture. Raising attack weights did not consistently produce the user's intended visible aggression. **Do not ship these weights from this evidence.** A useful next experiment would isolate pawn-break discovery from score changes, using held-out middlegame positions and full games.

## Other ideas and criticism

| Idea | Decision | Reason |
| --- | --- | --- |
| Expand every prediction from six to twelve branches | Defer | Top-six contained 30/32 reference moves; twelve contained 31/32. Scripted opening moves improved 28 to 31. Wider prediction took a median 28 ms, but twelve actual branch preparations were not benchmarked. Targeting omitted captures addresses a clearer gap. |
| Force all premoves through full-depth policy | Reject for this request | Delays coverage and discards the accepted speculative-continuation tradeoff. |
| Pick geometrically aggressive unsearched moves | Reject | Random hanging moves are not evidence of sustained aggression; shallow searched alternatives are already cheap. |
| Make the capture-verification bonus actually affect selection | Worth a separate experiment | `analyzeMadman` probes the already chosen offer and sets `verifiedOffer` afterwards. It never supplies `verifiedOffers` when choosing moves, so the selector's existing +20 bonus does not influence runtime selection. Verification also requires a 400 ms budget, making it unavailable at the common 100 ms budget. Compare a small number of eligible offers during spare opponent time before promoting a trap-seeking selector. |
| Add a Maia human-reply predictor | Later research | Relevant to human coverage, but adds a model/runtime and must be measured on bullet. Keep it as an opponent predictor, never as a replacement for Stockfish risk evaluations. |
| Avoid queen trades | Reject | Adds the preference the user explicitly declined; does not solve prediction coverage. |
| Fix a suspected castling prediction problem | Ruled out | Direct checks passed for `e1g1`, `e1c1`, and king-to-rook `e1h1`. No castling change is justified by this investigation. |

## Research basis and limits

[Maia-2](https://arxiv.org/html/2409.20553v1) treats human move prediction as a different objective from strongest-play search. This supports questioning whether Stockfish's best six moves represent likely human replies; it does not give our cache a hit-rate guarantee.

[Chessformer / Maia-3](https://arxiv.org/html/2605.19091v1) is the newer relevant work: the paper reports 55.4% top-one matching for the 5M model and 57.1% for 79M on its stated test set. That set excludes the first ten moves and positions after a clock drops below 30 seconds. Our bullet use case therefore needs separate validation. These top-one figures are not top-six coverage or premove success rates. The [official implementation](https://github.com/CSSLab/maia3) also explains that its WDL-derived centipawn field is not a searched Stockfish evaluation; it must not be used for Madman's 120 cp gate.

[Acquisition of Chess Knowledge in AlphaZero](https://arxiv.org/html/2111.09259v3) studies threats, mobility and king safety as learned concepts, including qualitative analysis of successful and unsuccessful sacrifices. It motivates testing coordinated attacks and preparations, but does not validate our hand-selected weights or imply that adding a swarm bonus recreates AlphaZero.

[Superior Computer Chess with Model Predictive Control, Reinforcement Learning, and Rollout](https://arxiv.org/html/2409.06477v1) distinguishes a nominal opponent from an evaluator and studies response-conditioned lookahead. Its substantially more expensive architecture is not directly suited to our one-worker bullet budget. The relevant inference here is to prepare likely responses cheaply and keep exact-position results, rather than assume one predicted reply is inevitable.

The official [Stockfish search source](https://github.com/official-stockfish/Stockfish/blob/master/src/search.cpp) performs a root search for each MultiPV line. More branches/candidates cost search; expanding every comparison without measuring readiness can reduce useful premove coverage on fast opponents.

No self-play match, human-game corpus evaluation, browser timing run, Elo estimate, or measured 70% live premove rate was produced. The 32 selected opening positions are correlated and unrepresentative of entire bullet games. Reference and audit searches use the same engine family; depth 12/14 is a stronger comparison here, not ground truth. Counts demonstrate opportunities in this architecture, not population probabilities.

## Retained results

[Coverage and audit table](research/2026-10-15-madman/coverage.csv) and [style comparisons](research/2026-10-15-madman/style.csv) retain the compact results. Release 12.1.0 removes the overlapping premove-options document, throwaway scripts with machine-specific imports, and bulky raw observations. The methodology and measured limits above remain the research record; the removed prototypes are not a supported benchmark command.

Runtime contracts and controls are documented in [README](../README.md), [AGENTS](../AGENTS.md), and the [verification record](madman-verification.md).
