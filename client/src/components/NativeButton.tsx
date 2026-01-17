import React from 'react';
import { cn } from '@/lib/utils';

interface NativeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export default function NativeButton({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: NativeButtonProps) {
  const baseClasses = "relative overflow-hidden transition-all duration-75 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/20";

  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
    ghost: "hover:bg-muted/50 active:bg-muted/80",
    outline: "border border-border hover:bg-muted/50 active:bg-muted/80"
  };

  const sizeClasses = {
    sm: "px-3 py-2 text-sm rounded-lg",
    md: "px-4 py-3 text-base rounded-xl",
    lg: "px-6 py-4 text-lg rounded-2xl"
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}