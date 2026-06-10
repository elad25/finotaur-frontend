// src/components/macro/MacroSubNav.tsx
// =====================================================
// MACRO SECTION — Sub-section segmented control
// =====================================================
// Reusable pill-group nav for switching sub-sections
// within a macro tab. Styled identically to the
// Compare.tsx timeframe pill group.
// =====================================================

export interface MacroSubNavItem {
  key: string;
  label: string;
}

export interface MacroSubNavProps {
  items: MacroSubNavItem[];
  active: string;
  onChange: (key: string) => void;
}

export function MacroSubNav({ items, active, onChange }: MacroSubNavProps): JSX.Element {
  return (
    <div className="flex rounded-[6px] border border-border-ds-subtle overflow-hidden">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`px-ds-3 py-1 text-xs font-medium transition-colors ${
            active === item.key
              ? 'bg-gold-primary/20 text-gold-bright'
              : 'text-ink-tertiary hover:text-ink-secondary'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default MacroSubNav;
