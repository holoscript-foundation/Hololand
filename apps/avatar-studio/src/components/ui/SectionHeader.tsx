interface SectionHeaderProps {
  title: string;
  description?: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-studio-text">{title}</h3>
      {description && (
        <p className="text-xs text-studio-muted mt-0.5">{description}</p>
      )}
    </div>
  );
}
