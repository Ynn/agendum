import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type UiInputSize = 'sm' | 'md' | 'touch';

type UiInputProps = InputHTMLAttributes<HTMLInputElement> & {
  uiSize?: UiInputSize;
};

export const UiInput = forwardRef<HTMLInputElement, UiInputProps>(function UiInput(
  {
    className,
    uiSize = 'md',
    ...props
  },
  ref,
) {
  return (
    <input
      ref={ref}
      className={clsx(
        'ui-input',
        uiSize === 'sm' && 'ui-input-sm',
        uiSize === 'touch' && 'ui-input-touch',
        className,
      )}
      {...props}
    />
  );
});
