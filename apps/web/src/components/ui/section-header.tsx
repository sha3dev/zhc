export function SectionHeader({ label }: { label: string }) {
  return (
    <p className="font-code text-2xs text-muted-foreground tracking-widest overflow-hidden whitespace-nowrap select-none">
      {/* Mobile: compact — just brackets */}
      <span className="sm:hidden">
        [{' '}
        <span className="text-primary" style={{ textShadow: 'var(--glow-primary-sm)' }}>
          {label}
        </span>
        {' ]'}
      </span>
      {/* Desktop: full ASCII bar */}
      <span className="hidden sm:inline">
        {'===================='}[{' '}
        <span className="text-primary" style={{ textShadow: 'var(--glow-primary-sm)' }}>
          {label}
        </span>
        {' ]'}
        {'/'.repeat(4)}
        {'='.repeat(20)}
      </span>
    </p>
  );
}
