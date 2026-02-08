import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type UiButtonVariant = 'default' | 'primary' | 'ghost';
type UiButtonSize = 'sm' | 'md' | 'touch';

type UiButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: UiButtonVariant;
  size?: UiButtonSize;
};

export const UiButton = forwardRef<HTMLButtonElement, UiButtonProps>(function UiButton(
  {
    className,
    variant = 'default',
    size = 'md',
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'ghost' && 'ui-btn-ghost',
        size === 'sm' && 'ui-btn-sm',
        size === 'touch' && 'ui-btn-touch',
        className,
      )}
      {...props}
    />
  );
});
