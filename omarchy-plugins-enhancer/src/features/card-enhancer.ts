import { catalogService } from "../catalog.ts";
import { ICONS } from "../icons.ts";
import { storage } from "../storage.ts";

export function enhanceCard(card: HTMLElement): void {
  const pluginId = card.getAttribute("data-card-plugin");
  if (!pluginId) return;

  const isSeen = storage.isPluginSeen(pluginId);

  // If already enhanced, only synchronize the seen visual state
  if (card.hasAttribute("data-ope-enhanced")) {
    updateCardSeenVisuals(card, isSeen);
    return;
  }

  card.setAttribute("data-ope-enhanced", "true");
  card.classList.add("ope-enhanced");

  // 1. Inject GitHub link (Icon only, no text, matching Omarchy UI/UX)
  const actionsContainer = card.querySelector<HTMLElement>(".plugin-card-actions");
  if (actionsContainer && !actionsContainer.querySelector(".ope-github-btn")) {
    const repoUrl = catalogService.getPluginRepo(pluginId);
    if (repoUrl) {
      const ghBtn = document.createElement("a");
      ghBtn.className = "ope-github-btn";
      ghBtn.href = repoUrl;
      ghBtn.target = "_blank";
      ghBtn.rel = "noopener noreferrer";
      ghBtn.title = `GitHub: ${repoUrl}`;
      ghBtn.setAttribute("aria-label", `View GitHub repository for ${pluginId}`);
      ghBtn.innerHTML = ICONS.github;

      // Clicking GitHub stops navigation to plugin.html and marks as seen
      ghBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        storage.markPluginSeen(pluginId);
        updateCardSeenVisuals(card, true);
      });

      actionsContainer.appendChild(ghBtn);
    }
  }

  // 2. Inject Seen Toggle Badge in title line (Icon only, no emoji, subtle)
  const titleLine = card.querySelector<HTMLElement>(".plugin-title-line");
  if (titleLine && !titleLine.querySelector(".ope-seen-badge")) {
    const seenBadge = document.createElement("button");
    seenBadge.type = "button";
    seenBadge.className = "ope-seen-badge";
    seenBadge.setAttribute("aria-label", `Toggle seen state for ${pluginId}`);

    seenBadge.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (storage.isPluginSeen(pluginId)) {
        storage.unmarkPluginSeen(pluginId);
        updateCardSeenVisuals(card, false);
      } else {
        storage.markPluginSeen(pluginId);
        updateCardSeenVisuals(card, true);
      }
    });

    titleLine.appendChild(seenBadge);
  }

  // 3. Listen to card link / install clicks to auto-mark as seen
  const cardLink = card.querySelector<HTMLElement>(".plugin-card-link");
  if (cardLink && !cardLink.hasAttribute("data-ope-listener")) {
    cardLink.setAttribute("data-ope-listener", "true");
    cardLink.addEventListener("click", () => {
      storage.markPluginSeen(pluginId);
      updateCardSeenVisuals(card, true);
    });
  }

  const installBtn = card.querySelector<HTMLElement>(".card-install");
  if (installBtn && !installBtn.hasAttribute("data-ope-listener")) {
    installBtn.setAttribute("data-ope-listener", "true");
    installBtn.addEventListener("click", () => {
      storage.markPluginSeen(pluginId);
      updateCardSeenVisuals(card, true);
    });
  }

  // 4. Initial visual state for seen
  updateCardSeenVisuals(card, isSeen);
}

export function updateCardSeenVisuals(card: HTMLElement, isSeen: boolean): void {
  card.classList.toggle("ope-seen", isSeen);
  card.setAttribute("data-ope-seen", isSeen ? "true" : "false");
  const badge = card.querySelector<HTMLElement>(".ope-seen-badge");
  if (badge) {
    badge.classList.toggle("is-seen", isSeen);
    badge.title = isSeen ? "Seen (click to unmark)" : "Mark as seen";
    badge.innerHTML = isSeen ? ICONS.check : ICONS.eye;
  }
}

export function enhanceAllCards(): void {
  const cards = document.querySelectorAll<HTMLElement>(".plugin-card");
  for (const card of cards) {
    enhanceCard(card);
  }
}
