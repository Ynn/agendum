import { forwardRef, type SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type UiSelectSize = 'sm' | 'md' | 'touch';

type UiSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  uiSize?: UiSelectSize;
};

export const UiSelect = forwardRef<HTMLSelectElement, UiSelectProps>(function UiSelect(
  {
    className,
    uiSize = 'md',
    children,
    ...props
  },
  ref,
) {
  return (
    <select
      ref={ref}
      className={clsx(
        'ui-select',
        uiSize === 'sm' && 'ui-select-sm',
        uiSize === 'touch' && 'ui-select-touch',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
