# Maximum Aggression Madman Design

User intent: maximum sustained aggression on as many eligible turns as possible, with occasional approximately 120 cp concessions acceptable. This is a playing-style policy, not a promise of spectacular moves every turn or preserved engine strength.

One final selector samples the next two legal own-move positions in each searched PV and ranks legal pressure around the enemy king, attacks on valuable targets, pawn breakthroughs and credible sacrifice offers. Style points stay separate from engine scores. Maximum estimated loss is 120 cp every turn, with no cooldown. Forced mates and exact tablebase outcomes take precedence. Missing scores, illegal moves and incomplete candidate batches fail closed.

The baseline searches six lines. At budgets of at least 80 ms, reserve time to evaluate the baseline together with up to four extra legal attacking candidates, including a book suggestion. Compare in one completed batch, not unrelated depths. Optional capture probes at budgets of at least 400 ms provide provisional evidence of poison only when a legal capture continuation substantially worsens the opponent's result. They never increase the candidate's safety evaluation.

All optional searches use positive movetime, one turn deadline, the current session signal and existing worker. Failure retains a usable baseline. Graceful stop/worker-drain overhead can exceed the deadline; this is not a zero-latency promise.

Madman defaults off. When on, it owns final selection instead of Elo error sampling and bypasses unchecked instant book/premove responses. Opponent thinking time remains available for analysis. Engine resources, licensing, move confirmation provenance and game reports remain intact.

Validate pure policy/position behavior, UCI commands, optional-search expiration/failure, and scheduler/settings integration. Run full local checks. Stronger-reference audits and actual style/strength/latency game benchmarks remain manual follow-up work.

## Approved premove extension

The user subsequently prioritized maximum aggression and frequent immediate replies over search certainty. Madman plus the existing Premove toggle enables selected-attack PV continuations with unknown next-turn concession, then six branch-specific fast comparisons (three shallow engine candidates plus four attacking proposals, depth 4), then full Madman upgrades. Entries retain explicit planned/fast/full provenance and exact session/FEN/history/settings context. Full outranks fast, which outranks planned. No extra preferences or queen-trade rule. See docs/madman-improvement-research.md and docs/superpowers/plans/2026-10-15-madman-premoves.md.


### Approved early-reply and capture-punishment extension

The user approved the follow-up research proposal and reiterated maximum aggression/speed rather than human-like play. Keep the same 120 cp rule. Publish opponent prediction PV replies with unknown loss only into empty/weaker slots; retain the selected own-turn attack continuation above those. Publish an aggressive choice from each existing complete depth-three seed batch before the depth-four attacking comparison finishes. After observed own moves, preserve legal offered-piece capture hints even with a short PV; prepare up to four omitted capture branches before the ordinary six. Hints require the same exact root/history/session/settings/variant. Keep one worker, cancellation, normal adapter dispatch and existing unknown-submission boundaries. Cache is bounded at eleven entries. Priority is full > fast > seed > planned > prediction, with positive mates retained over nonmating replacements. Attack-score tuning from the research is not adopted.
