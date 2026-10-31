import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden transition-all',
          className
        )
      )}
      {...props}
    >
      {header && <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">{header}</div>}
      <div className="p-6">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">{footer}</div>}
    </div>
  );
};
