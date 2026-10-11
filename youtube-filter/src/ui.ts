import { clearInputError, showInputError } from './dom';
import {
  dateToDaysAgo,
  daysAgoToDate,
  validateFormValues
} from './parser';
import { getDefaultFilters, loadProfiles, saveFilters, saveProfiles } from './storage';
import type { FilterProfile, FilterState, WatchedMode } from './types';

export interface UIController {
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  updateStats: (visible: number, total: number, dimmed?: number) => void;
  syncUI: () => void;
  destroy: () => void;
}

const createFilterSvg = (size: number): SVGSVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'currentColor');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z');
  svg.appendChild(path);
  return svg;
};

interface ChipSpec {
  label: string;
  onClick: () => void;
}

export const createUI = (
  state: FilterState,
  onFiltersChange: () => void
): UIController => {
  const oldToggle = document.getElementById('yt-filter-toggle');
  const oldPanel = document.getElementById('yt-filter-panel');
  if (oldToggle) oldToggle.remove();
  if (oldPanel) oldPanel.remove();

  let profiles = loadProfiles();

  // Create Left-edge YouTube Tab Button (Trusted Types safe)
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'yt-filter-toggle';
  toggleBtn.type = 'button';
  toggleBtn.title = 'Filter YouTube Videos (Alt+F)';

  const iconSpan = document.createElement('span');
  iconSpan.className = 'ytf-toggle-icon';
  iconSpan.appendChild(createFilterSvg(15));

  const textSpan = document.createElement('span');
  textSpan.textContent = 'FILTER';

  const dotSpan = document.createElement('span');
  dotSpan.className = 'ytf-active-dot';

  toggleBtn.appendChild(iconSpan);
  toggleBtn.appendChild(textSpan);
  toggleBtn.appendChild(dotSpan);

  if (state.enabled) {
    toggleBtn.classList.add('active');
  }

  // Create Left-side YouTube Drawer Panel
  const panel = document.createElement('div');
  panel.id = 'yt-filter-panel';

  const header = document.createElement('h3');
  const titleWrap = document.createElement('span');
  titleWrap.className = 'ytf-title-wrap';

  const titleIcon = createFilterSvg(17);
  titleIcon.classList.add('ytf-title-icon');
  titleWrap.appendChild(titleIcon);

  const titleText = document.createElement('span');
  titleText.textContent = 'Video Filters';
  titleWrap.appendChild(titleText);

  const closeBtn = document.createElement('span');
  closeBtn.className = 'ytf-close';
  closeBtn.title = 'Close';
  closeBtn.textContent = '×';

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Mount elements to DOM safely
  const mount = () => {
    const root = document.body || document.documentElement;
    if (!document.getElementById('yt-filter-toggle') && root) {
      root.appendChild(toggleBtn);
    }
    if (!document.getElementById('yt-filter-panel') && root) {
      root.appendChild(panel);
    }
  };

  mount();

  const openPanel = () => {
    panel.classList.add('visible');
    toggleBtn.classList.add('panel-open');
  };

  const closePanel = () => {
    panel.classList.remove('visible');
    toggleBtn.classList.remove('panel-open');
  };

  const togglePanel = () => {
    if (panel.classList.contains('visible')) {
      closePanel();
    } else {
      openPanel();
    }
  };

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openPanel();
  });

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closePanel();
  });

  // Close panel on click outside
  document.addEventListener('click', (e) => {
    if (
      panel.classList.contains('visible') &&
      !panel.contains(e.target as Node) &&
      !toggleBtn.contains(e.target as Node)
    ) {
      closePanel();
    }
  });

  // Keyboard shortcut: Alt+F to toggle, Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('visible')) {
      closePanel();
    } else if (e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      togglePanel();
    }
  });

  // 1. Profile Switcher Section
  const profileSection = document.createElement('div');
  profileSection.className = 'ytf-profile-section';

  const profileHeader = document.createElement('div');
  profileHeader.className = 'ytf-profile-header';
  const profileLabel = document.createElement('label');
  profileLabel.textContent = 'Presets / Profiles';
  profileHeader.appendChild(profileLabel);

  const saveProfileBtn = document.createElement('button');
  saveProfileBtn.type = 'button';
  saveProfileBtn.className = 'ytf-save-profile-btn';
  saveProfileBtn.textContent = '+ Save Profile';
  profileHeader.appendChild(saveProfileBtn);

  profileSection.appendChild(profileHeader);

  const profilePills = document.createElement('div');
  profilePills.className = 'ytf-profile-pills';
  profileSection.appendChild(profilePills);

  panel.appendChild(profileSection);

  // Form Inputs
  const createTextInput = (id: string, placeholder: string) => {
    const input = document.createElement('input');
    input.className = 'ytf-input';
    input.id = id;
    input.placeholder = placeholder;
    input.type = 'text';
    return input;
  };

  const createDateInput = (id: string, placeholder: string) => {
    const input = document.createElement('input');
    input.className = 'ytf-input';
    input.id = id;
    input.placeholder = placeholder;
    input.type = 'date';
    return input;
  };

  const createNumberInput = (id: string, placeholder: string) => {
    const input = document.createElement('input');
    input.className = 'ytf-input';
    input.id = id;
    input.placeholder = placeholder;
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    return input;
  };

  const minViewsInput = createTextInput('minViews', 'Min (e.g., 10K)');
  const maxViewsInput = createTextInput('maxViews', 'Max (e.g., 10M)');
  const minDateInput = createDateInput('minDate', 'From');
  const maxDateInput = createDateInput('maxDate', 'To');
  const minDurInput = createNumberInput('minDuration', 'Min (mins)');
  const maxDurInput = createNumberInput('maxDuration', 'Max (mins)');

  const allNumberInputs = [
    minViewsInput,
    maxViewsInput,
    minDateInput,
    maxDateInput,
    minDurInput,
    maxDurInput
  ];

  for (const input of allNumberInputs) {
    input.addEventListener('input', () => clearInputError(input));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyFilterAction();
      }
    });
  }

  const createGroup = (
    labelTxt: string,
    inputs: HTMLInputElement[],
    chips: ChipSpec[] = []
  ) => {
    const group = document.createElement('div');
    group.className = 'ytf-group';

    const headerRow = document.createElement('div');
    headerRow.className = 'ytf-header-row';

    const label = document.createElement('label');
    label.textContent = labelTxt;
    headerRow.appendChild(label);

    if (chips.length > 0) {
      const chipsContainer = document.createElement('div');
      chipsContainer.className = 'ytf-inline-chips';

      for (const chip of chips) {
        const chipBtn = document.createElement('button');
        chipBtn.type = 'button';
        chipBtn.className = 'ytf-chip';
        chipBtn.textContent = chip.label;
        chipBtn.addEventListener('click', (e) => {
          e.preventDefault();
          chip.onClick();
        });
        chipsContainer.appendChild(chipBtn);
      }
      headerRow.appendChild(chipsContainer);
    }

    const row = document.createElement('div');
    row.className = 'ytf-row';

    for (const input of inputs) {
      const wrapper = document.createElement('div');
      wrapper.className = 'ytf-input-wrapper';
      wrapper.appendChild(input);
      row.appendChild(wrapper);
    }

    group.appendChild(headerRow);
    group.appendChild(row);
    return group;
  };

  // 2. Watched Videos & Content Toggles Section
  const contentSection = document.createElement('div');
  contentSection.className = 'ytf-group';
  const contentLabel = document.createElement('label');
  contentLabel.textContent = 'Watched & Content Filters';
  contentSection.appendChild(contentLabel);

  const segmentedBox = document.createElement('div');
  segmentedBox.className = 'ytf-segmented-control';

  const modes: { mode: WatchedMode; label: string }[] = [
    { mode: 'dim', label: 'Dim (Greyout)' },
    { mode: 'hide', label: 'Hide' },
    { mode: 'off', label: 'Off' }
  ];

  const segmentBtns: Record<WatchedMode, HTMLButtonElement> = {} as any;

  for (const { mode, label } of modes) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `ytf-segment-btn ${state.watchedMode === mode ? 'active' : ''}`;
    btn.textContent = label;
    btn.addEventListener('click', () => {
      state.watchedMode = mode;
      for (const m of Object.keys(segmentBtns) as WatchedMode[]) {
        segmentBtns[m].classList.toggle('active', m === mode);
      }
      if (state.enabled) {
        saveFilters(state);
        onFiltersChange();
      }
    });
    segmentBtns[mode] = btn;
    segmentedBox.appendChild(btn);
  }

  contentSection.appendChild(segmentedBox);

  // Content toggle checkboxes (Hide Shorts & Hide Posts)
  const toggleRow = document.createElement('div');
  toggleRow.className = 'ytf-toggle-row';

  const createToggleCheckbox = (
    id: string,
    labelTxt: string,
    initialChecked: boolean,
    onChange: (checked: boolean) => void
  ) => {
    const label = document.createElement('label');
    label.className = `ytf-switch-label ${initialChecked ? 'active' : ''}`;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.className = 'ytf-checkbox';
    cb.checked = initialChecked;

    const span = document.createElement('span');
    span.textContent = labelTxt;

    cb.addEventListener('change', () => {
      label.classList.toggle('active', cb.checked);
      onChange(cb.checked);
      if (state.enabled) {
        saveFilters(state);
        onFiltersChange();
      }
    });

    label.appendChild(cb);
    label.appendChild(span);
    return { label, cb };
  };

  const shortsToggle = createToggleCheckbox('ytf-hide-shorts', 'Hide Shorts', Boolean(state.hideShorts), (checked) => {
    state.hideShorts = checked;
  });

  const postsToggle = createToggleCheckbox('ytf-hide-posts', 'Hide Posts', Boolean(state.hidePosts), (checked) => {
    state.hidePosts = checked;
  });

  toggleRow.appendChild(shortsToggle.label);
  toggleRow.appendChild(postsToggle.label);
  contentSection.appendChild(toggleRow);

  panel.appendChild(contentSection);

  // 3. Number Filters
  panel.appendChild(
    createGroup(
      'Views',
      [minViewsInput, maxViewsInput],
      [
        {
          label: '> 100K',
          onClick: () => {
            minViewsInput.value = '100K';
            clearInputError(minViewsInput);
          }
        },
        {
          label: '> 1M',
          onClick: () => {
            minViewsInput.value = '1M';
            clearInputError(minViewsInput);
          }
        }
      ]
    )
  );

  panel.appendChild(createGroup('Date Range', [minDateInput, maxDateInput]));

  panel.appendChild(
    createGroup(
      'Duration (mins)',
      [minDurInput, maxDurInput],
      [
        {
          label: '< 15m',
          onClick: () => {
            maxDurInput.value = '15';
            clearInputError(maxDurInput);
          }
        },
        {
          label: '> 20m',
          onClick: () => {
            minDurInput.value = '20';
            clearInputError(minDurInput);
          }
        }
      ]
    )
  );

  // 4. Tag Chip Input Builder (Keywords & Channels)
  const createTagInputGroup = (
    labelTxt: string,
    tagList: string[],
    placeholder: string,
    chipType: 'keyword' | 'blacklist' | 'vip' = 'keyword'
  ) => {
    const group = document.createElement('div');
    group.className = 'ytf-group';

    const label = document.createElement('label');
    label.textContent = labelTxt;
    group.appendChild(label);

    const box = document.createElement('div');
    box.className = 'ytf-tag-input-box';

    const renderChips = () => {
      const existingChips = box.querySelectorAll('.ytf-tag-chip');
      for (const c of existingChips) c.remove();

      for (let i = 0; i < tagList.length; i++) {
        const val = tagList[i];
        const chip = document.createElement('span');
        chip.className = `ytf-tag-chip ${chipType}`;

        const txt = document.createElement('span');
        txt.textContent = val;

        const removeBtn = document.createElement('span');
        removeBtn.className = 'ytf-tag-remove';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          tagList.splice(i, 1);
          renderChips();
          if (state.enabled) {
            saveFilters(state);
            onFiltersChange();
          }
        });

        chip.appendChild(txt);
        chip.appendChild(removeBtn);
        box.insertBefore(chip, field);
      }
    };

    const field = document.createElement('input');
    field.type = 'text';
    field.className = 'ytf-tag-field';
    field.placeholder = placeholder;

    const commit = () => {
      const v = field.value.trim().replace(/^,|,$/g, '');
      if (v && !tagList.includes(v)) {
        tagList.push(v);
        field.value = '';
        renderChips();
        if (state.enabled) {
          saveFilters(state);
          onFiltersChange();
        }
      }
    };

    field.addEventListener('blur', commit);
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Backspace' && field.value === '' && tagList.length > 0) {
        tagList.pop();
        renderChips();
        if (state.enabled) {
          saveFilters(state);
          onFiltersChange();
        }
      }
    });

    box.appendChild(field);
    group.appendChild(box);

    renderChips();
    return { group, renderChips, commit };
  };

  const keywordsTagInput = createTagInputGroup(
    'Keyword Blacklist',
    state.keywordBlacklist,
    'Add keyword (e.g. prank)...',
    'keyword'
  );
  panel.appendChild(keywordsTagInput.group);

  const channelBlacklistInput = createTagInputGroup(
    'Channel Blacklist',
    state.channelBlacklist,
    'Block channel name...',
    'blacklist'
  );
  panel.appendChild(channelBlacklistInput.group);

  const channelWhitelistInput = createTagInputGroup(
    'VIP Channels',
    state.channelWhitelist,
    'VIP creator name...',
    'vip'
  );
  panel.appendChild(channelWhitelistInput.group);

  // Form Hydration Function
  const hydrateForm = () => {
    const setInputVal = (el: HTMLInputElement, val: number) => {
      el.value = val === Infinity || val === 0 ? '' : String(val);
    };
    setInputVal(minViewsInput, state.minViews);
    setInputVal(maxViewsInput, state.maxViews);

    minDateInput.value =
      state.maxDays !== Infinity ? daysAgoToDate(state.maxDays) : '';
    maxDateInput.value = state.minDays !== 0 ? daysAgoToDate(state.minDays) : '';

    setInputVal(minDurInput, state.minDuration);
    setInputVal(maxDurInput, state.maxDuration);

    for (const m of Object.keys(segmentBtns) as WatchedMode[]) {
      segmentBtns[m]?.classList.toggle('active', m === state.watchedMode);
    }

    shortsToggle.cb.checked = Boolean(state.hideShorts);
    shortsToggle.label.classList.toggle('active', Boolean(state.hideShorts));

    postsToggle.cb.checked = Boolean(state.hidePosts);
    postsToggle.label.classList.toggle('active', Boolean(state.hidePosts));

    keywordsTagInput.renderChips();
    channelBlacklistInput.renderChips();
    channelWhitelistInput.renderChips();

    renderProfiles();
  };

  // Profile Rendering, Switching and Deleting
  const renderProfiles = () => {
    profilePills.replaceChildren();

    for (let i = 0; i < profiles.length; i++) {
      const prof = profiles[i];
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `ytf-profile-pill ${state.activeProfile === prof.name ? 'active' : ''}`;

      const nameSpan = document.createElement('span');
      nameSpan.textContent = prof.name;
      pill.appendChild(nameSpan);

      // Deletion button for custom profiles (Default cannot be deleted)
      if (prof.name.toLowerCase() !== 'default') {
        const delBtn = document.createElement('span');
        delBtn.className = 'ytf-profile-delete';
        delBtn.title = `Delete profile "${prof.name}"`;
        delBtn.textContent = '×';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          profiles.splice(i, 1);
          if (state.activeProfile === prof.name) {
            state.activeProfile = 'Default';
            const defaultFilters = getDefaultFilters();
            state.minViews = defaultFilters.minViews;
            state.maxViews = defaultFilters.maxViews;
            state.minDays = defaultFilters.minDays;
            state.maxDays = defaultFilters.maxDays;
            state.minDuration = defaultFilters.minDuration;
            state.maxDuration = defaultFilters.maxDuration;
            state.keywordBlacklist = [...defaultFilters.keywordBlacklist];
            state.channelBlacklist = [...defaultFilters.channelBlacklist];
            state.channelWhitelist = [...defaultFilters.channelWhitelist];
            state.watchedMode = defaultFilters.watchedMode;
            state.hideShorts = defaultFilters.hideShorts;
            state.hidePosts = defaultFilters.hidePosts;
            hydrateForm();
            saveFilters(state);
            if (state.enabled) {
              onFiltersChange();
            }
          }
          saveProfiles(profiles);
          renderProfiles();
        });
        pill.appendChild(delBtn);
      }

      pill.addEventListener('click', () => {
        state.activeProfile = prof.name;
        state.minViews = prof.minViews;
        state.maxViews = prof.maxViews;
        state.minDays = prof.minDays;
        state.maxDays = prof.maxDays;
        state.minDuration = prof.minDuration;
        state.maxDuration = prof.maxDuration;
        state.keywordBlacklist = [...prof.keywordBlacklist];
        state.channelBlacklist = [...prof.channelBlacklist];
        state.channelWhitelist = [...prof.channelWhitelist];
        state.watchedMode = prof.watchedMode;
        state.hideShorts = Boolean(prof.hideShorts);
        state.hidePosts = Boolean(prof.hidePosts);

        hydrateForm();
        saveFilters(state);
        if (state.enabled) {
          onFiltersChange();
        }
      });

      profilePills.appendChild(pill);
    }
  };

  saveProfileBtn.addEventListener('click', () => {
    const profileName = prompt('Enter a name for this custom profile:');
    if (!profileName || !profileName.trim()) return;

    const name = profileName.trim();
    const newProf: FilterProfile = {
      name,
      minViews: state.minViews,
      maxViews: state.maxViews,
      minDays: state.minDays,
      maxDays: state.maxDays,
      minDuration: state.minDuration,
      maxDuration: state.maxDuration,
      keywordBlacklist: [...state.keywordBlacklist],
      channelBlacklist: [...state.channelBlacklist],
      channelWhitelist: [...state.channelWhitelist],
      watchedMode: state.watchedMode,
      hideShorts: Boolean(state.hideShorts),
      hidePosts: Boolean(state.hidePosts)
    };

    const existingIdx = profiles.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existingIdx >= 0) {
      profiles[existingIdx] = newProf;
    } else {
      profiles.push(newProf);
    }

    state.activeProfile = name;
    saveProfiles(profiles);
    saveFilters(state);
    renderProfiles();
  });

  renderProfiles();
  hydrateForm();

  // 5. Actions & Buttons
  const actions = document.createElement('div');
  actions.className = 'ytf-actions';

  const applyBtn = document.createElement('button');
  applyBtn.className = 'ytf-btn primary';
  applyBtn.id = 'ytf-apply';
  applyBtn.type = 'button';
  applyBtn.textContent = state.enabled ? 'Disable Filter' : 'Apply Filter';
  if (state.enabled) applyBtn.classList.add('active');

  const applyFilterAction = () => {
    if (state.enabled) {
      // Disable mode
      state.enabled = false;
      applyBtn.textContent = 'Apply Filter';
      applyBtn.classList.remove('active');
      toggleBtn.classList.remove('active');
      saveFilters(state);
      onFiltersChange();
    } else {
      // Commit pending tag fields first
      keywordsTagInput.commit();
      channelBlacklistInput.commit();
      channelWhitelistInput.commit();

      // Apply mode
      const { result, errors } = validateFormValues({
        minViews: minViewsInput.value,
        maxViews: maxViewsInput.value,
        minDate: minDateInput.value,
        maxDate: maxDateInput.value,
        minDur: minDurInput.value,
        maxDur: maxDurInput.value
      });

      for (const input of allNumberInputs) {
        clearInputError(input);
      }

      if (!result.valid) {
        if (errors.minViews) showInputError(minViewsInput, errors.minViews);
        if (errors.maxViews) showInputError(maxViewsInput, errors.maxViews);
        if (errors.minDate) showInputError(minDateInput, errors.minDate);
        if (errors.maxDate) showInputError(maxDateInput, errors.maxDate);
        if (errors.minDur) showInputError(minDurInput, errors.minDur);
        if (errors.maxDur) showInputError(maxDurInput, errors.maxDur);
        return;
      }

      state.minViews = result.minViews ?? 0;
      state.maxViews = result.maxViews ?? Infinity;
      state.maxDays = result.minDate ? dateToDaysAgo(result.minDate) : Infinity;
      state.minDays = result.maxDate ? dateToDaysAgo(result.maxDate) : 0;
      state.minDuration = result.minDur ?? 0;
      state.maxDuration = result.maxDur ?? Infinity;

      state.enabled = true;
      applyBtn.textContent = 'Disable Filter';
      applyBtn.classList.add('active');
      toggleBtn.classList.add('active');
      saveFilters(state);
      onFiltersChange();
    }
  };

  applyBtn.addEventListener('click', applyFilterAction);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'ytf-btn';
  resetBtn.type = 'button';
  resetBtn.textContent = 'Reset';

  resetBtn.addEventListener('click', () => {
    for (const input of allNumberInputs) {
      input.value = '';
      clearInputError(input);
    }

    const fresh = getDefaultFilters();
    state.minViews = fresh.minViews;
    state.maxViews = fresh.maxViews;
    state.minDays = fresh.minDays;
    state.maxDays = fresh.maxDays;
    state.minDuration = fresh.minDuration;
    state.maxDuration = fresh.maxDuration;
    state.keywordBlacklist = [];
    state.channelBlacklist = [];
    state.channelWhitelist = [];
    state.watchedMode = 'dim';
    state.hideShorts = fresh.hideShorts;
    state.hidePosts = fresh.hidePosts;
    state.activeProfile = 'Default';
    state.enabled = false;

    applyBtn.textContent = 'Apply Filter';
    applyBtn.classList.remove('active');
    toggleBtn.classList.remove('active');

    hydrateForm();
    saveFilters(state);
    onFiltersChange();
  });

  actions.appendChild(applyBtn);
  actions.appendChild(resetBtn);
  panel.appendChild(actions);

  const stats = document.createElement('div');
  stats.className = 'ytf-stats';
  stats.id = 'ytf-stats';
  stats.textContent = state.enabled ? 'Applying…' : 'Filter disabled';
  panel.appendChild(stats);

  const updateStats = (visible: number, total: number, dimmed = 0) => {
    if (state.enabled) {
      const dimmedTxt = dimmed > 0 ? ` (${dimmed} dimmed)` : '';
      stats.textContent = `Showing ${visible} of ${total} videos${dimmedTxt}`;
    } else {
      stats.textContent = 'Filter disabled';
    }
  };

  const syncUI = () => {
    mount();
  };

  const destroy = () => {
    toggleBtn.remove();
    panel.remove();
  };

  return { togglePanel, openPanel, closePanel, updateStats, syncUI, destroy };
};
