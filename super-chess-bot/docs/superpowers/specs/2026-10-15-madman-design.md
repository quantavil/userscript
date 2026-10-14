# Maximum Aggression Madman Design

User intent: maximum sustained aggression on as many eligible turns as possible, with occasional approximately 120 cp concessions acceptable. This is a playing-style policy, not a promise of spectacular moves every turn or preserved engine strength.

One final selector samples the next two legal own-move positions in each searched PV and ranks legal pressure around the enemy king, attacks on valuable targets, pawn breakthroughs and credible sacrifice offers. Style points stay separate from engine scores. Maximum loss is 120 cp, reduced to 50 cp for three observed own-turn positions after a concession above 50 cp. Forced mates and exact tablebase outcomes take precedence. Missing scores, illegal moves and incomplete candidate batches fail closed.

The baseline searches six lines. At budgets of at least 80 ms, reserve time to evaluate the baseline together with up to four extra legal attacking candidates, including a book suggestion. Compare in one completed batch, not unrelated depths. Optional capture probes at budgets of at least 400 ms provide provisional evidence of poison only when a legal capture continuation substantially worsens the opponent's result. They never increase the candidate's safety evaluation.

All optional searches use positive movetime, one turn deadline, the current session signal and existing worker. Failure retains a usable baseline. Graceful stop/worker-drain overhead can exceed the deadline; this is not a zero-latency promise.

Madman defaults off. When on, it owns final selection instead of Elo error sampling and bypasses unchecked instant book/premove responses. Opponent thinking time remains available for analysis. Engine resources, licensing, move confirmation provenance and game reports remain intact.

Validate pure policy/position behavior, UCI commands, optional-search expiration/failure, and scheduler/settings integration. Run full local checks. Stronger-reference audits and actual style/strength/latency game benchmarks remain manual follow-up work.
