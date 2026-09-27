export const Container = ({ className = '', children }) => (
  <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);

/**
 * Consistent section eyebrow + heading + subheading, used across Home's
 * "Featured Hotels" / "Featured Adventures" style sections and the new
 * Itineraries pages.
 */
export const SectionHeading = ({ eyebrow, title, description, align = 'center', className = '' }) => (
  <div className={`${align === 'center' ? 'text-center mx-auto' : ''} max-w-2xl mb-10 ${className}`}>
    {eyebrow && (
      <span className="text-primary-600 font-semibold uppercase text-sm tracking-wide">{eyebrow}</span>
    )}
    <h2 className="font-display text-3xl md:text-4xl font-bold text-neutral-900 mt-2">{title}</h2>
    {description && <p className="text-neutral-600 mt-4">{description}</p>}
  </div>
);

export default Container;
