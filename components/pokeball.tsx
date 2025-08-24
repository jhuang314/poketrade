export function Pokeball({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g strokeWidth="8" stroke="black">
        {/* Full circle background */}
        <circle cx="100" cy="100" r="96" fill="white" />

        {/* Top Red Half */}
        <path
          d="M 100 4 A 96 96 0 0 0 4 100 H 196 A 96 96 0 0 0 100 4 Z"
          fill="#ef4444" // Tailwind red-500
        />

        {/* Horizontal Line - split in two */}
        <line x1="4" y1="100" x2="70" y2="100" />
        <line x1="130" y1="100" x2="196" y2="100" />

        {/* Center Button */}
        <circle cx="100" cy="100" r="30" fill="white" />
        <circle cx="100" cy="100" r="15" fill="white" strokeWidth="4"/>
      </g>
    </svg>
  );
}
