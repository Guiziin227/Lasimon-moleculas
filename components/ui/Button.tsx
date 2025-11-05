import type React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "secondary";
};

export const Button = ({
  children,
  className = "",
  size = "md",
  variant = "default",
  ...props
}: ButtonProps) => {
  const sizeClass =
    size === "lg"
      ? "px-4 py-2 text-base"
      : size === "sm"
      ? "px-2 py-1 text-sm"
      : "px-3 py-1.5";
  const variantClass =
    variant === "secondary"
      ? "bg-slate-700 hover:bg-slate-600 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white";

  return (
    <button className={`${sizeClass} ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
};
