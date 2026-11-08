/**
 * Berdua mark: him (left) and her (right, with a bun), their shoulders forming
 * one heart. Same geometry as scripts/gen-icons.mjs. Uses currentColor; the
 * thin separating lines use the page background.
 */
export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  const cut = "var(--background)";
  return (
    <svg viewBox="60 50 392 440" className={className} fill="currentColor" aria-hidden>
      <path d="M256 300 C 240 262 210 236 172 236 C 126 236 98 270 98 314 C 98 366 150 408 256 472 C 362 408 414 366 414 314 C 414 270 386 236 340 236 C 302 236 272 262 256 300 Z" />
      <path d="M256 304 L256 468" stroke={cut} strokeWidth="12" strokeLinecap="round" />
      <circle cx="198" cy="166" r="48" />
      <circle cx="314" cy="166" r="48" />
      <circle cx="352" cy="124" r="25" />
      <path d="M150 218 Q 198 236 246 218" stroke={cut} strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M266 218 Q 314 236 362 218" stroke={cut} strokeWidth="10" fill="none" strokeLinecap="round" />
    </svg>
  );
}
