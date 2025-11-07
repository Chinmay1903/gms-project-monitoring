import React, { useEffect, useMemo, useRef, useState } from "react";
import "./SearchableDropdown.css";

/**
 * SearchableDropdown
 * ------------------------------------------------------------------
 * Props:
 * - options: array<string | object>
 * - value:   selected value (primitive or object)
 * - onChange(next): callback with the selected option (same type as options[i])
 * - placeholder: string
 * - getOptionLabel(opt): string  (default: String(opt?.label || opt?.name || opt))
 * - getOptionValue(opt): any     (default: opt?.value ?? opt?.id ?? opt)
 * - clearable: boolean (default: false)
 * - disabled: boolean
 * - maxMenuHeight: number (px) (default: 240)
 * - className: string (extra class for root)
 */
export default function SearchableDropdown({
  options = [],
  value = null,
  onChange,
  placeholder = "Select…",
  getOptionLabel = (opt) =>
    String(opt?.label ?? opt?.name ?? opt ?? ""),
  getOptionValue = (opt) => opt?.value ?? opt?.id ?? opt,
  clearable = false,
  disabled = false,
  maxMenuHeight = 240,
  className = "",
}) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0); // highlighted index

  const labelOf = (opt) => (opt == null ? "" : getOptionLabel(opt));
  const valueKey = (opt) => getOptionValue(opt);

  // Filtered list from dynamic array length
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return options;
    return options.filter((o) => getOptionLabel(o).toLowerCase().includes(query));
  }, [options, q, getOptionLabel]);

  // Ensure highlighted index stays within bounds when list changes
  useEffect(() => {
    if (hi > filtered.length - 1) setHi(0);
  }, [filtered.length, hi]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Focus search when menu opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQ("");
      setHi(0);
    }
  }, [open]);

  const selectByIndex = (idx) => {
    const opt = filtered[idx];
    if (!opt) return;
    onChange?.(opt);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectByIndex(hi);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Highlight matched text (simple <mark>)
  const renderLabel = (text, query) => {
    if (!query) return text;
    const i = text.toLowerCase().indexOf(query.toLowerCase());
    if (i === -1) return text;
    const a = text.slice(0, i);
    const b = text.slice(i, i + query.length);
    const c = text.slice(i + query.length);
    return (<>{a}<mark>{b}</mark>{c}</>);
  };

  return (
    <div
      className={`sd-root ${className}`}
      ref={rootRef}
      onKeyDown={onKeyDown}
      aria-haspopup="listbox"
      aria-expanded={open ? "true" : "false"}
      role="combobox"
    >
      <button
        type="button"
        className="sd-toggle btn btn-light w-100 d-flex align-items-center"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span className={`sd-value ${value ? "" : "text-muted"}`}>
          {value ? labelOf(value) : placeholder}
        </span>
        <span className="ms-auto d-flex align-items-center">
          {clearable && value && (
            <i
              className="bi bi-x-circle me-2"
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(null);
              }}
              title="Clear"
            />
          )}
          <i className="bi bi-caret-down-fill" />
        </span>
      </button>

      {open && (
        <div className="sd-menu shadow">
          <div className="p-2 border-bottom">
            <input
              ref={inputRef}
              className="form-control form-control-sm"
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <ul
            className="sd-list list-unstyled mb-0"
            role="listbox"
            style={{ maxHeight: maxMenuHeight, overflow: "auto" }}
          >
            {filtered.length === 0 && (
              <li className="sd-empty text-muted py-3 text-center">No results</li>
            )}
            {filtered.map((opt, idx) => {
              const label = labelOf(opt);
              return (
                <li
                  key={String(valueKey(opt)) + "_" + idx}
                  className={`sd-item ${idx === hi ? "active" : ""}`}
                  role="option"
                  aria-selected={valueKey(opt) === valueKey(value)}
                  onMouseEnter={() => setHi(idx)}
                  onMouseDown={(e) => { e.preventDefault(); selectByIndex(idx); }} // avoid blurring input
                >
                  {renderLabel(label, q)}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
