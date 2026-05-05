import { useState, useEffect, useRef, useCallback } from 'react';
import './ConfirmModal.css';

/* ── Variant config ──────────────────────────────────────────── */
const VARIANT_CONFIG = {
  danger:  { btnClass: 'cm-btn--danger',  iconBg: 'cm-icon-wrap--danger',  defaultIcon: '🗑️', defaultConfirmLabel: 'Yes, Delete'  },
  warning: { btnClass: 'cm-btn--warning', iconBg: 'cm-icon-wrap--warning', defaultIcon: '⚠️', defaultConfirmLabel: 'Proceed'      },
  info:    { btnClass: 'cm-btn--info',    iconBg: 'cm-icon-wrap--info',    defaultIcon: 'ℹ️', defaultConfirmLabel: 'Confirm'      },
  success: { btnClass: 'cm-btn--success', iconBg: 'cm-icon-wrap--success', defaultIcon: '✅', defaultConfirmLabel: 'Done'         },
  accent:  { btnClass: 'cm-btn--accent',  iconBg: 'cm-icon-wrap--accent',  defaultIcon: '🔥', defaultConfirmLabel: 'Confirm'      },
};

/* ── Countdown ring ──────────────────────────────────────────── */
function CountdownRing({ seconds, total }) {
  const circumference = 75.4; // 2π × 12
  const fraction      = seconds / total;
  const offset        = circumference * (1 - fraction);

  return (
    <div className="cm-countdown__ring" aria-hidden="true">
      <svg viewBox="0 0 28 28">
        <circle className="cm-countdown__ring-bg"   cx="14" cy="14" r="12" />
        <circle
          className="cm-countdown__ring-fill"
          cx="14" cy="14" r="12"
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <span className="cm-countdown__num">{seconds}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CONFIRM MODAL
   ════════════════════════════════════════════════════════════ */

/**
 * ConfirmModal
 *
 * Props:
 *   open            {boolean}         — controlled visibility
 *   onClose         {fn}              — called on cancel / overlay click / Esc
 *   onConfirm       {fn(reason?)}     — called on confirm click; receives optional reason string
 *
 *   title           {string}          — modal headline
 *   description     {string|ReactNode}— body copy
 *   note            {string}          — small warning note below description
 *   icon            {string}          — emoji override
 *   variant         {'danger'|'warning'|'info'|'success'|'accent'} default: 'danger'
 *
 *   confirmLabel    {string}          — confirm button text
 *   cancelLabel     {string}          — cancel button text (default 'Cancel')
 *
 *   loading         {boolean}         — shows spinner on confirm button
 *   disabled        {boolean}         — disables confirm button
 *
 *   countdown       {number|null}     — auto-confirm after N seconds (null = no countdown)
 *
 *   requireReason   {boolean}         — show a textarea; reason passed to onConfirm
 *   reasonLabel     {string}          — textarea label
 *   reasonPlaceholder {string}
 *
 *   typeToConfirm   {string|null}     — user must type this exact string to unlock confirm
 *
 * Usage:
 *   // Simple delete
 *   <ConfirmModal
 *     open={showDelete}
 *     onClose={() => setShowDelete(false)}
 *     onConfirm={handleDelete}
 *     title="Delete this product?"
 *     description={<>Remove <strong>{product.name}</strong> permanently.</>}
 *     note="This cannot be undone."
 *     loading={deleting}
 *   />
 *
 *   // With reason + type-to-confirm
 *   <ConfirmModal
 *     open={showBan}
 *     onClose={...}
 *     onConfirm={(reason) => banUser(reason)}
 *     title="Ban this user?"
 *     variant="warning"
 *     requireReason
 *     typeToConfirm="BAN"
 *   />
 */
export default function ConfirmModal({
  open              = false,
  onClose,
  onConfirm,

  title             = 'Are you sure?',
  description       = 'This action cannot be undone.',
  note              = '',
  icon              = null,
  variant           = 'danger',

  confirmLabel      = null,
  cancelLabel       = 'Cancel',

  loading           = false,
  disabled          = false,

  countdown         = null,
  requireReason     = false,
  reasonLabel       = 'Reason (optional)',
  reasonPlaceholder = 'Explain why…',

  typeToConfirm     = null,
}) {
  const cfg            = VARIANT_CONFIG[variant] || VARIANT_CONFIG.danger;
  const resolvedIcon   = icon         || cfg.defaultIcon;
  const resolvedLabel  = confirmLabel || cfg.defaultConfirmLabel;

  const [reason,      setReason]      = useState('');
  const [typeInput,   setTypeInput]   = useState('');
  const [timer,       setTimer]       = useState(countdown);

  const overlayRef    = useRef(null);
  const cancelBtnRef  = useRef(null);
  const confirmBtnRef = useRef(null);
  const firstInputRef = useRef(null);

  /* ── Reset state when opened ─────────────────────────────── */
  useEffect(() => {
    if (open) {
      setReason('');
      setTypeInput('');
      setTimer(countdown);
      // Focus first focusable element
      setTimeout(() => {
        (firstInputRef.current || cancelBtnRef.current)?.focus();
      }, 60);
    }
  }, [open, countdown]);

  /* ── Countdown timer ─────────────────────────────────────── */
  useEffect(() => {
    if (!open || timer === null || timer <= 0) return;
    const t = setTimeout(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          handleConfirm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }); // intentionally no dep array — re-run each render for timer

  /* ── Keyboard: Esc to close, Tab trap ───────────────────── */
  useEffect(() => {
    if (!open) return;

    const handler = (e) => {
      if (e.key === 'Escape') { onClose?.(); return; }

      // Tab trap within modal
      if (e.key === 'Tab') {
        const focusable = overlayRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };

    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  /* ── Confirm handler ─────────────────────────────────────── */
  const handleConfirm = useCallback(() => {
    if (loading || isConfirmDisabled) return;
    onConfirm?.(requireReason ? reason : undefined);
  }, [loading, reason, requireReason, onConfirm]); // eslint-disable-line

  /* ── Overlay click ───────────────────────────────────────── */
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !loading) onClose?.();
  };

  /* ── Type-to-confirm validation ──────────────────────────── */
  const typeValid     = !typeToConfirm || typeInput === typeToConfirm;
  const isConfirmDisabled = disabled || !typeValid || loading;

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="cm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cm-title"
      aria-describedby="cm-desc"
      onClick={handleOverlayClick}
    >
      <div className={`cm-modal cm-modal--${variant}`}>

        {/* ── Body ──────────────────────────────────────── */}
        <div className="cm-body">

          {/* Icon */}
          <div className={`cm-icon-wrap ${cfg.iconBg}`} aria-hidden="true">
            {resolvedIcon}
          </div>

          {/* Title */}
          <h2 className="cm-title" id="cm-title">{title}</h2>

          {/* Description */}
          <p className="cm-desc" id="cm-desc">{description}</p>

          {/* Note */}
          {note && (
            <div className="cm-note">
              <span className="cm-note__icon" aria-hidden="true">⚠️</span>
              <span>{note}</span>
            </div>
          )}

          {/* Countdown */}
          {timer !== null && timer > 0 && (
            <div className="cm-countdown" aria-live="polite" aria-atomic="true">
              <CountdownRing seconds={timer} total={countdown} />
              <span>Auto-confirming in {timer}s</span>
            </div>
          )}

          {/* Type-to-confirm */}
          {typeToConfirm && (
            <div className="cm-typeconfirm">
              <label htmlFor="cm-type-input" className="cm-typeconfirm__label">
                Type <code>{typeToConfirm}</code> below to confirm
              </label>
              <input
                ref={firstInputRef}
                id="cm-type-input"
                type="text"
                className={`cm-typeconfirm__input${typeValid && typeInput ? ' cm-typeconfirm__input--valid' : ''}`}
                placeholder={typeToConfirm}
                value={typeInput}
                onChange={(e) => setTypeInput(e.target.value)}
                autoComplete="off"
                spellCheck="false"
                aria-describedby="cm-desc"
              />
            </div>
          )}

          {/* Reason textarea */}
          {requireReason && (
            <div className="cm-input-wrap">
              <label htmlFor="cm-reason" className="cm-input-label">{reasonLabel}</label>
              <textarea
                ref={typeToConfirm ? undefined : firstInputRef}
                id="cm-reason"
                className="cm-input"
                placeholder={reasonPlaceholder}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
              />
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────── */}
        <div className="cm-footer">
          <button
            ref={cancelBtnRef}
            className="cm-btn cm-btn--cancel"
            onClick={onClose}
            disabled={loading}
            type="button"
            aria-label={cancelLabel}
          >
            {cancelLabel}
          </button>

          <button
            ref={confirmBtnRef}
            className={`cm-btn ${cfg.btnClass}`}
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            type="button"
            aria-label={resolvedLabel}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="cm-btn__spinner" aria-hidden="true" />
                Processing…
              </>
            ) : (
              <>
                <span aria-hidden="true">
                  {variant === 'danger'  ? '🗑️' :
                   variant === 'warning' ? '⚠️' :
                   variant === 'success' ? '✅' :
                   variant === 'info'    ? 'ℹ️' : '🔥'}
                </span>
                {resolvedLabel}
                {typeToConfirm && !typeValid && (
                  <span style={{ fontSize: '0.7rem', opacity: 0.7 }}> (type to unlock)</span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PRESET HELPERS — one-liner shortcuts for common dialogs
   ════════════════════════════════════════════════════════════ */

/**
 * DeleteConfirm — pre-configured danger modal for deleting a resource
 *
 * <DeleteConfirm
 *   open={showDel}
 *   onClose={() => setShowDel(false)}
 *   onConfirm={handleDelete}
 *   itemName="Butter Chicken Biryani"
 *   itemType="product"
 *   loading={deleting}
 * />
 */
export function DeleteConfirm({
  open,
  onClose,
  onConfirm,
  itemName  = 'this item',
  itemType  = 'item',
  loading   = false,
}) {
  return (
    <ConfirmModal
      open          = {open}
      onClose       = {onClose}
      onConfirm     = {onConfirm}
      title         = {`Delete ${itemType}?`}
      description   = {<>Remove <strong>{itemName}</strong> permanently from the system.</>}
      note          = "This action cannot be undone. All associated data will be lost."
      icon          = "🗑️"
      variant       = "danger"
      confirmLabel  = {`Yes, Delete ${itemType}`}
      loading       = {loading}
    />
  );
}

/**
 * LogoutConfirm — pre-configured for admin sign-out
 */
export function LogoutConfirm({ open, onClose, onConfirm }) {
  return (
    <ConfirmModal
      open         = {open}
      onClose      = {onClose}
      onConfirm    = {onConfirm}
      title        = "Sign out?"
      description  = "You'll be logged out of the admin panel. Any unsaved changes will be lost."
      icon         = "🚪"
      variant      = "warning"
      confirmLabel = "Yes, Sign Out"
    />
  );
}

/**
 * StatusConfirm — pre-configured for order status changes that need confirmation
 */
export function StatusConfirm({
  open,
  onClose,
  onConfirm,
  orderId   = '',
  newStatus = '',
  loading   = false,
}) {
  return (
    <ConfirmModal
      open         = {open}
      onClose      = {onClose}
      onConfirm    = {onConfirm}
      title        = {`Mark as ${newStatus}?`}
      description  = {<>Order <strong>#{orderId}</strong> will be updated to <strong>{newStatus}</strong>.</>}
      icon         = {newStatus === 'Cancelled' ? '❌' : newStatus === 'Delivered' ? '✅' : '🔄'}
      variant      = {newStatus === 'Cancelled' ? 'danger' : newStatus === 'Delivered' ? 'success' : 'info'}
      confirmLabel = {`Confirm: ${newStatus}`}
      loading      = {loading}
    />
  );
}

/**
 * BulkDeleteConfirm — for bulk deletion with type-to-confirm
 */
export function BulkDeleteConfirm({
  open,
  onClose,
  onConfirm,
  count   = 0,
  loading = false,
}) {
  return (
    <ConfirmModal
      open          = {open}
      onClose       = {onClose}
      onConfirm     = {onConfirm}
      title         = {`Delete ${count} items?`}
      description   = {`All ${count} selected items will be permanently removed.`}
      note          = "This bulk action cannot be reversed."
      icon          = "⚠️"
      variant       = "danger"
      confirmLabel  = {`Delete All ${count}`}
      typeToConfirm = "DELETE"
      loading       = {loading}
    />
  );
}