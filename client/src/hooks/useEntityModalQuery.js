import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * useEntityModalQuery
 * Enables opening entity modals via URL query params.
 *
 * Supported query params:
 * - ?new=1                      open create modal
 * - ?edit=<id>                  open edit modal by id
 * - ?returnTo=<pathAndQuery>    when closing, navigate back (optional)
 * - ?prefillXxxId=...           any prefill params you want to consume
 */
export function useEntityModalQuery({
  isReady = true,
  onNew,
  onEdit,
  onClose,
  getPrefillFromQuery,
  clearKeys = ['new', 'edit', 'returnTo'],
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const lastKeyRef = useRef('');

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const editId = params.get('edit') || '';
  const isNew = params.get('new') === '1';
  const returnTo = params.get('returnTo') || '';

  const prefill = useMemo(() => {
    return typeof getPrefillFromQuery === 'function' ? getPrefillFromQuery(params) : {};
  }, [params, getPrefillFromQuery]);

  useEffect(() => {
    if (!isReady) return;
    const key = `${location.pathname}?new=${isNew ? '1' : '0'}&edit=${editId}`;
    if (key === lastKeyRef.current) return;

    if (isNew && typeof onNew === 'function') {
      lastKeyRef.current = key;
      onNew(prefill);
      return;
    }

    if (editId && typeof onEdit === 'function') {
      lastKeyRef.current = key;
      onEdit(editId);
    }
  }, [isReady, location.pathname, isNew, editId, onNew, onEdit, prefill]);

  const clearQueryOrReturn = () => {
    if (returnTo) {
      navigate(returnTo, { replace: true });
      return;
    }
    const next = new URLSearchParams(location.search);
    clearKeys.forEach((k) => next.delete(k));
    // also clear common prefill keys
    for (const k of Array.from(next.keys())) {
      if (k.toLowerCase().startsWith('prefill')) next.delete(k);
    }
    const nextSearch = next.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
      { replace: true }
    );
  };

  const replaceQuery = (nextParams) => {
    const next = new URLSearchParams(location.search);
    // allow caller to fully control keys (set/delete)
    for (const [k, v] of Object.entries(nextParams || {})) {
      if (v === null || v === undefined || v === '') next.delete(k);
      else next.set(k, String(v));
    }
    const nextSearch = next.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
      { replace: true }
    );
  };

  const replaceWithEdit = (id) => {
    if (!id) return;
    const next = new URLSearchParams(location.search);
    next.delete('new');
    next.set('edit', String(id));
    // keep returnTo if present
    // clear prefill keys (they are one-shot)
    for (const k of Array.from(next.keys())) {
      if (k.toLowerCase().startsWith('prefill')) next.delete(k);
    }
    const nextSearch = next.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
      { replace: true }
    );
  };

  const handleClose = (...args) => {
    if (typeof onClose === 'function') onClose(...args);
    clearQueryOrReturn();
  };

  return {
    isNew,
    editId,
    prefill,
    returnTo,
    closeAndClear: handleClose,
    clearQueryOrReturn,
    replaceQuery,
    replaceWithEdit,
  };
}


