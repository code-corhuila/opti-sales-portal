import { useState, type ReactNode } from 'react';
import type { Page, ShellContext } from '../../shell-contract';

interface SearchPickerProps<T> {
  shell: ShellContext;
  id: string;
  label: string;
  placeholder: string;
  search: (q: string, signal: AbortSignal) => Promise<Page<T>>;
  optionId: (item: T) => string;
  optionLabel: (item: T) => string;
  selected: T | null;
  onSelect: (item: T) => void;
  onClear: () => void;
  error?: string | undefined;
}

const EMPTY_PAGE = { data: [], meta: { page: 1, limit: 5, total: 0, totalPages: 0 } };

/** Search-as-you-type, pick one. Used to find the patient and the frame of a new sale. */
export function SearchPicker<T>({
  shell,
  id,
  label,
  placeholder,
  search,
  optionId,
  optionLabel,
  selected,
  onSelect,
  onClear,
  error,
}: SearchPickerProps<T>): ReactNode {
  const { ui } = shell;
  const [text, setText] = useState('');
  const q = ui.useDebounced(text.trim(), 300);
  const { state } = ui.useLoad<Page<T>>(
    (signal) => (q.length >= 2 ? search(q, signal) : Promise.resolve(EMPTY_PAGE)),
    [q],
  );

  if (selected) {
    return (
      <div className="field">
        <label>{label}</label>
        <div className="picker-selected">
          <span>{optionLabel(selected)}</span>
          <button type="button" className="btn btn-quiet" onClick={onClear}>
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="field">
      <ui.TextField
        id={id}
        label={label}
        type="search"
        value={text}
        placeholder={placeholder}
        onChange={setText}
        error={error}
        maxLength={60}
      />
      {state.status === 'ready' && state.data.data.length > 0 ? (
        <ul className="picker-list">
          {state.data.data.map((item) => (
            <li key={optionId(item)}>
              <button type="button" className="picker-option" onClick={() => onSelect(item)}>
                {optionLabel(item)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {state.status === 'ready' && q.length >= 2 && state.data.data.length === 0 ? (
        <p className="hint">Sin resultados para «{q}».</p>
      ) : null}
    </div>
  );
}
