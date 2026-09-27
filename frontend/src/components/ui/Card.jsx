const RADII = {
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
};

/**
 * Base card shell shared by hotel/activity/tour-guide/itinerary listing
 * cards. Handles the hover-lift shadow + rounded corners consistently; pass
 * `as={Link}` + `to="..."` to make the whole card clickable. `radius="3xl"`
 * for larger feature cards (the mockups mix both sizes).
 */
const Card = ({ as: Component = 'div', hoverLift = true, radius = '2xl', className = '', children, ...props }) => (
  <Component
    className={`group bg-white ${RADII[radius] || RADII['2xl']} shadow-card overflow-hidden border border-neutral-100
      ${hoverLift ? 'transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1' : ''}
      ${className}`}
    {...props}
  >
    {children}
  </Component>
);

export default Card;
