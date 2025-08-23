// src/components/ui/Button.tsx
import React from 'react';
export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, children, ...props }, ref) => {
  return <button className={`w-full px-4 py-2 font-bold text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-gray-400 ${className}`} ref={ref} {...props}>{children}</button>;
});
Button.displayName = "Button";
