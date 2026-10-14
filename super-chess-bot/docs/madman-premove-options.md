# Madman premove support: options and trade-offs

Status: design discussion, not implemented. Madman currently suspends instant premove arming/dispatch even if the saved Premove preference is enabled. Normal mode resumes that preference.

## Why the existing path is unsuitable

The normal path optimizes fast legal replies: own-turn recapture-chain steering, recapture fallbacks and replies taken from opponent-root PVs. Madman optimizes the resulting position's attacking style within a risk envelope. An ordinary engine reply can be legal and position-matched while missing Madman's attacking alternative or bypassing its current 50/120 cp limit. A recapture can also replace the intended continuation of an offered-piece trap.

An opponent-root PV provides one minimax continuation, not a complete own-turn candidate comparison under Madman. Reusing its second move without another selection pass would silently change the mode's behavior.

## Options

| Approach | Benefits | Costs / limitations |
| --- | --- | --- |
| Keep instant replies suspended | One final selector; simple cancellation and cooldown; no unchecked recapture surprises | More own-clock search; loses bullet speed; saved toggle can confuse |
| Arm forced single-legal-move replies | Smallest first step; no alternative move choice to suppress; cheap validation | Narrow coverage; still needs session/position validation and correct terminal/promotion handling |
| Cache branch-specific Madman selections | More instant coverage while preserving evaluated attacking choices | Requires a separate own-turn candidate comparison per branch; more CPU, cache state and invalidation; worker time competes with depth |
| Re-enable ordinary PV/recapture premoves | Broad coverage with minimal extra computation | Bypasses the selected policy and can undo sacrifices; unsuitable as the default Madman behavior |

## Recommended sequence

First add only forced replies with exact context validation. Measure how often they hit and how much clock they save. Then, if worthwhile, examine a small number of likely opponent branches sequentially during the opponent's clock. For each branch, apply the opponent move, obtain an own-turn baseline, run Madman's selector under the projected cooldown and cache only that selected reply with its evaluation provenance.

Dispatch should be quick validation plus the existing adapter submission, with no new foreground search on a valid cache hit. A miss or invalid entry falls back to ordinary Madman analysis. Do not add a blind recapture fallback to improve hit rate.

## Required entry context

Store game/session identity; a canonical position that preserves en passant, draw-relevant state and history; settings revision; risk/cooldown context; selected move; exact score and search depth/completeness. A placement-only or three-field key cannot establish all of these. Recheck legality and current session before dispatch, and invalidate on incompatible settings, mode, position, session or cooldown changes.

Use the existing single engine worker. Abort and drain branch work when a real turn arrives; never let speculative work postpone a usable current-position move. Keep move confirmation provenance and uncertain-dispatch recovery unchanged.

## Evidence required before enabling

Measure hit rate, clock saved, own-turn search depth, aggression/style continuity and stronger-reference evaluation loss against Madman without premoves. Test unexpected opponent moves, settings toggles, session replacement, en passant, Chess960 castling, promotion, repetition/draw context and cooldown transitions. “Instant” means no intentional delay on a validated hit, not zero browser or transport latency.
