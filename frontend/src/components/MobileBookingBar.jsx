import { useEffect, useState } from 'react';
import { Button } from './ui';

// On phones the booking card sits at the very bottom of a long detail page
// (below rooms, amenities, calendar and reviews). This bar keeps the price
// and a "book" button in reach, and scrolls to the card on tap. It hides
// while the card itself is on screen or has been scrolled past.
export const scrollToBookingCard = (ref) => {
  if (window.innerWidth >= 1024 || !ref.current) return; // desktop: card is already beside the content
  ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const MobileBookingBar = ({ targetRef, price, unit, ctaLabel = 'Check availability' }) => {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setHidden(entry.isIntersecting || entry.boundingClientRect.top < 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetRef]);

  if (hidden) return null;

  return (
    // pr-20 leaves room for the floating chat bubble in the bottom-right corner.
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-neutral-200 shadow-[0_-4px_16px_rgba(20,28,40,0.08)] pl-4 pr-20 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-neutral-500">From</p>
        <p className="font-bold text-neutral-900 truncate">
          {price} <span className="text-xs font-normal text-neutral-500">{unit}</span>
        </p>
      </div>
      <Button size="md" onClick={() => scrollToBookingCard(targetRef)} className="shrink-0">
        {ctaLabel}
      </Button>
    </div>
  );
};

export default MobileBookingBar;
