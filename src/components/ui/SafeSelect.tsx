import * as React from "react";

/**
 * SafeSelect — minimal controlled select that avoids ref callback churn.
 * Drop-in stopgap for shadcn/Radix <Select> to eliminate setRef loops.
 *
 * Props:
 *  - value, onValueChange (same API surface you used)
 *  - children: <option value="..">..</option> inside
 */
export interface SafeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  value?: string;
  onValueChange?: (val: string) => void;
}

const SafeSelect = React.memo(React.forwardRef<HTMLSelectElement, SafeSelectProps>(
  ({ value, onValueChange, children, className, ...rest }, ref) => {
    const handle = React.useCallback<React.ChangeEventHandler<HTMLSelectElement>>(
      (e) => onValueChange?.(e.currentTarget.value),
      [onValueChange]
    );
    return (
      <select
        ref={ref}
        value={value}
        onChange={handle}
        className={className}
        {...rest}
      >
        {children}
      </select>
    );
  }
));
SafeSelect.displayName = "SafeSelect";

export default SafeSelect;
