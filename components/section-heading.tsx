interface SectionHeadingProps {
  title: string;
  subtitle?: string;
}

export function SectionHeading({ title, subtitle }: SectionHeadingProps) {
  return (
    <div>
      <h2 className="font-display text-xl tracking-wide text-cream">{title}</h2>
      {subtitle && (
        <p className="text-sm text-cream-40 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
