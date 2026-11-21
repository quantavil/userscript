export const WORKSPACE_CSS = /* css */ `
  :host {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 2147483647;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #0f172a;
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
  }
  *, *::before, *::after { box-sizing: border-box; }
  button, input, select, textarea { font-family: inherit; }

  @keyframes bo-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .launcher {
    pointer-events: auto;
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: 48px;
    height: 48px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #1e3a5f;
    border-radius: 9999px;
    background: #0f2942;
    color: #ffffff;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(15, 41, 66, 0.3);
    transition: background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  }
  .launcher svg {
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .launcher:hover:not(:disabled) {
    background: #163a5f;
    transform: translateY(-2px) scale(1.04);
    box-shadow: 0 10px 28px rgba(15, 41, 66, 0.36);
  }
  .launcher:hover:not(:disabled) svg {
    transform: rotate(30deg);
  }
  .launcher:disabled,
  .launcher.busy {
    opacity: 0.8;
    cursor: wait;
  }
  .launcher:disabled svg,
  .launcher.busy svg {
    animation: bo-spin 1s linear infinite;
  }
  .launcher:focus-visible,
  .tab-btn:focus-visible,
  .mini-btn:focus-visible,
  .btn-pdf:focus-visible,
  .btn-fill:focus-visible {
    outline: 2px solid #0284c7;
    outline-offset: 2px;
  }

  .panel-shell {
    pointer-events: auto;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 540px;
    max-width: 96vw;
    display: flex;
    flex-direction: column;
    background: #ffffff;
    border-left: 1px solid #cbd5e1;
    box-shadow: -10px 0 32px rgba(15, 23, 42, 0.16);
    transition: width 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .panel-shell.expanded {
    width: 820px;
  }

  .panel-header {
    height: 54px;
    padding: 0 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0f2942;
    color: #ffffff;
    flex-shrink: 0;
  }
  .brand-wrap { display: flex; align-items: center; gap: 10px; }
  .brand-icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: #0284c7;
    color: #ffffff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .brand-title { font-size: 14.5px; font-weight: 700; letter-spacing: 0.01em; }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .header-btn {
    width: 32px;
    height: 32px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
    border-radius: 7px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }
  .header-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.35);
  }
  .header-btn:focus-visible {
    outline: 2px solid #38bdf8;
    outline-offset: 1px;
  }

  .tab-bar {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }
  .tab-btn {
    height: 42px;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    padding: 0 8px;
    font-size: 12.5px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
  }
  .tab-btn:hover { color: #0f2942; background: #f1f5f9; }
  .tab-btn.active { color: #0f2942; background: #ffffff; border-bottom-color: #0284c7; }
  .tab-count {
    font-size: 10.5px;
    font-weight: 700;
    min-width: 20px;
    height: 18px;
    padding: 0 6px;
    border-radius: 9999px;
    background: #e2e8f0;
    color: #334155;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .tab-btn.active .tab-count { background: #e0f2fe; color: #0369a1; }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #ffffff;
  }

  .section-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .section-card.white { background: #ffffff; }
  .section-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .section-title {
    font-size: 11.5px;
    font-weight: 700;
    color: #0f2942;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-strip { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .status-label { font-size: 12.5px; font-weight: 600; color: #0f2942; }
  .status-sub { font-weight: 500; color: #64748b; }

  .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .inline-pair { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 6px; }

  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 11.5px;
    font-weight: 600;
    color: #334155;
    min-width: 0;
  }
  .field-label-row { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
  .field input:not([type="file"]),
  .field select {
    width: 100%;
    height: 34px;
    padding: 0 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 12.5px;
    background-color: #ffffff;
    color: #0f172a;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  .field select {
    appearance: none;
    -webkit-appearance: none;
    padding-right: 30px;
    cursor: pointer;
    text-overflow: ellipsis;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 9px center;
    background-size: 14px 14px;
  }
  .field select:hover { border-color: #94a3b8; background-color: #f8fafc; }
  .field input[type="file"] { width: 100%; font-size: 11.5px; color: #475569; }
  .field textarea {
    width: 100%;
    padding: 7px 9px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 12.5px;
    background: #ffffff;
    color: #0f172a;
    resize: vertical;
  }
  .field input:focus,
  .field select:focus,
  .field textarea:focus {
    outline: none;
    border-color: #0284c7;
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.14);
  }
  .field input.invalid { border-color: #dc2626; background: #fef2f2; }
  .warn-txt { font-size: 10.5px; font-weight: 600; color: #b91c1c; }
  .preview-line { font-size: 10.5px; font-weight: 500; color: #475569; }

  .batch-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .stat-chip { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 7px; padding: 7px 9px; }
  .stat-label { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; }
  .stat-val { font-size: 12.5px; font-weight: 700; color: #0f2942; font-variant-numeric: tabular-nums; margin-top: 1px; }

  .roster-table-wrap { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff; }
  .roster-table { width: 100%; border-collapse: collapse; font-size: 11.5px; font-variant-numeric: tabular-nums; }
  .roster-table th {
    background: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 7px 8px;
    border-bottom: 1px solid #e2e8f0;
  }
  .roster-table td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .roster-row { cursor: pointer; }
  .roster-row:hover { background: #f8fafc; }
  .roster-row.active { background: #e0f2fe; }
  .roster-row:last-child td { border-bottom: none; }
  .num-col { text-align: right !important; }

  .badge {
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 0 7px;
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
  }
  .badge.pending { background: #fef3c7; color: #92400e; }
  .badge.filled { background: #dcfce7; color: #166534; }
  .badge.sample { background: #e0e7ff; color: #3730a3; }
  .badge.neutral { background: #f1f5f9; color: #475569; }

  .dir-list { display: flex; flex-direction: column; gap: 10px; }
  .dir-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 9px;
    padding: 12px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .dir-card.selected { border-color: #0284c7; background: #f0f9ff; }
  .dir-card-main { min-width: 0; flex: 1; }
  .dir-card-title { font-size: 13px; font-weight: 700; color: #0f2942; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .dir-card-meta { font-size: 11.5px; color: #475569; margin-top: 3px; word-break: break-word; }
  .dir-card-tags { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 6px; }
  .dir-card-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

  .empty-state {
    text-align: center;
    padding: 28px 16px;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .empty-title { font-size: 13px; font-weight: 700; color: #0f2942; }

  .btn-row { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .mini-btn {
    height: 30px;
    padding: 0 11px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #0f172a;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    transition: background-color 0.12s ease, border-color 0.12s ease;
  }
  .mini-btn:hover:not(:disabled) { background: #f1f5f9; border-color: #94a3b8; }
  .mini-btn.primary { background: #0f2942; color: #ffffff; border-color: #0f2942; }
  .mini-btn.primary:hover:not(:disabled) { background: #163a5f; }
  .mini-btn.danger { color: #b91c1c; border-color: #fecaca; background: #fff5f5; }
  .mini-btn.danger:hover:not(:disabled) { background: #fee2e2; }
  .mini-btn.icon-only { width: 28px; height: 28px; padding: 0; }
  .mini-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .link-btn {
    background: none;
    border: none;
    color: #0284c7;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .link-btn:hover { text-decoration: underline; }

  .thumb-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
  .thumb {
    max-height: 36px;
    max-width: 120px;
    object-fit: contain;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 3px;
    background: #ffffff;
  }

  .notice {
    font-size: 12px;
    padding: 9px 12px;
    border-radius: 7px;
    border: 1px solid #a7f3d0;
    background: #ecfdf5;
    color: #065f46;
    font-weight: 500;
  }
  .notice.err { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
  .notice.info { background: #f0f9ff; border-color: #bae6fd; color: #075985; }

  .panel-footer {
    padding: 12px 16px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    display: flex;
    flex-direction: column;
    gap: 9px;
    flex-shrink: 0;
  }
  .footer-grid { display: grid; grid-template-columns: 1fr 1.25fr; gap: 10px; }
  .btn-pdf, .btn-fill {
    height: 38px;
    padding: 0 12px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    white-space: nowrap;
    transition: background-color 0.15s ease;
  }
  .btn-pdf { background: #ffffff; color: #0f2942; border: 1.5px solid #0f2942; }
  .btn-pdf:hover:not(:disabled) { background: #f1f5f9; }
  .btn-fill { background: #0f2942; color: #ffffff; border: 1.5px solid #0f2942; }
  .btn-fill:hover:not(:disabled) { background: #163a5f; }
  .btn-pdf:disabled, .btn-fill:disabled { opacity: 0.6; cursor: wait; }
  .footer-sub-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 11.5px; color: #475569; }
  .check-inline { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; }
  .check-inline input { margin: 0; accent-color: #0f2942; }
`;
