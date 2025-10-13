import React, { useEffect, useMemo, useRef, useState } from "react";
import "./SearchableSelect.css";

/**
 * SearchableDropdown (generic)
 * ---------------------------
 * Props:
 *  - items: any[]                                // array of primitives or objects
 *  - value: any | null                           // controlled value (item or scalar per valueMode)
 *  - onChange: (valOrItem) => void               // returns item or scalar per valueMode
 *  - keyField?: string                           // JSON key for React key (e.g., "employees_id")
 *  - labelField?: string                         // JSON key to display (e.g., "full_name")
 *  - valueField?: string                         // JSON key for controlled value (e.g., "employees_id")
 *  - valueMode?: "item" | "value"                // default "item"
 *
 *  - getLabel?: (item) => string                 // fallback if labelField not provided
 *  - getKey?: (item) => string | number          // fallback if keyField not provided
 *
 *  - placeholder?: string
 *  - disabled?: boolean
 *  - className?: string
 *  - menuClassName?: string
 *
 * Keyboard:
 *  - ArrowUp / ArrowDown to move
 *  - Enter to select, Esc to close
 */

export default function SearchableDropdown({
  items = [],
  value = null,
  onChange,
  keyField,
  labelField,
  valueField,
  valueMode = "item",
  getLabel = (it) =>
    typeof it === "object" ? it?.label ?? it?.name ?? String(it) : String(it),
  getKey = (it) =>
    typeof it === "object" ? it?.id ?? getLabel(it) : getLabel(it),
  placeholder = "Select…",
  disabled = false,
  className = "",
  menuClassName = "",
}) {
  // --- utilities ---
  const getByPath = (obj, path) => {
    if (!path) return undefined;
    if (obj == null) return undefined;
    // supports dot.path e.g. "user.name"
    return String(path)
      .split(".")
      .reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
  };

  const _items = Array.isArray(items) ? items : [];

  const labelOf = (it) => {
    if (labelField) {
      const v = getByPath(it, labelField);
      return v == null ? "" : String(v);
    }
    if (valueField) {
      const v = getByPath(it, valueField);
      return v == null ? "" : String(v);
    }
    return getLabel(it) ?? "";
  };

  const keyOf = (it, idx) => {
    let v;
    if (keyField) v = getByPath(it, keyField);
    if (v == null) v = getKey(it);
    if (v == null) v = idx; // ultimate fallback
    return String(v);
  };

  const valueOf = (it) => {
    if (valueField) {
      const v = getByPath(it, valueField);
      return v == null ? "" : v;
    }
    // fallback: if no valueField, use label text
    return labelOf(it);
  };

  // --- internal state ---
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // find selected item from value (for valueMode="value")
  const selectedItem = useMemo(() => {
    if (valueMode === "item") {
      return value && typeof value === "object" ? value : null;
    }
    // valueMode === "value": match by valueField (or label fallback)
    return _items.find((it) => String(valueOf(it)) === String(value)) || null;
  }, [_items, value, valueMode]); // eslint-disable-line

  // label shown when closed
  const selectedLabel =
    valueMode === "item"
      ? (value && typeof value === "object" ? labelOf(value) : "")
      : (selectedItem ? labelOf(selectedItem) : "");

  // sync query with selected label when closing
  useEffect(() => {
    if (!open) setQuery(selectedLabel || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedLabel]);

  // close on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // filter items
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return _items;
    return _items.filter((it) => (labelOf(it) || "").toLowerCase().includes(q));
  }, [_items, query]); // eslint-disable-line

  useEffect(() => setHighlight(0), [query, open]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const choose = (item) => {
    if (!onChange) return;
    if (valueMode === "value") {
      onChange(valueOf(item)); // return scalar (e.g., employees_id)
    } else {
      onChange(item); // return full item
    }
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setHighlight((h) => Math.max(h - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (filtered[highlight]) choose(filtered[highlight]);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
      e.preventDefault();
    }
  };

  return (
    <div
      className={`ss-wrap ${className}`}
      ref={wrapRef}
      aria-haspopup="listbox"
      aria-expanded={open ? "true" : "false"}
    >
      <div className="input-group" onClick={() => !disabled && setOpen(true)}>
        <span className="input-group-text">
          <i className="bi bi-search" />
        </span>
        <input
          ref={inputRef}
          className="form-control"
          placeholder={placeholder}
          disabled={disabled}
          value={open ? query : selectedLabel || ""}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => !disabled && setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          tabIndex={-1}
          onClick={() => (!disabled ? setOpen((o) => !o) : null)}
        >
          <i className={`bi bi-caret-${open ? "up" : "down"}-fill`} />
        </button>
      </div>

      <div className={`ss-menu ${open ? "show" : ""} ${menuClassName}`} role="listbox">
        <div className="ss-menu-body" ref={listRef}>
          {filtered.length === 0 && (
            <div className="ss-empty text-muted">No results</div>
          )}
          {filtered.map((it, idx) => {
            const active = idx === highlight;
            const key = keyOf(it, idx);
            return (
              <button
                type="button"
                key={key}
                className={`ss-item list-group-item list-group-item-action ${active ? "active" : ""}`}
                data-active={active ? "true" : "false"}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                onClick={() => choose(it)}
                role="option"
                aria-selected={active}
                title={labelOf(it)}
              >
                {labelOf(it)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
