import React from "react";

export interface PickaxeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function PickaxeIcon({ size = 20, className, ...props }: PickaxeIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Pickaxe arched head */}
      <path d="M21 3C16.5 3.5 9 7.5 4 17.5" />
      <path d="M20 7C17.5 9 16 11 15 13" />
      {/* Handle */}
      <path d="m14.5 9.5-9 9a2.12 2.12 0 0 0 3 3l9-9" />
      <path d="M19.5 4.5l-3 3" />
    </svg>
  );
}
