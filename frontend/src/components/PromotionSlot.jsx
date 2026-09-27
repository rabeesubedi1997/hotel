import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { publicAPI } from '../services/api';

// Renders active promotions for a given placement slot (see
// App\Models\Promotion::PLACEMENTS on the backend). Silently renders
// nothing if there are no active promotions for this slot or the request
// fails — this is marketing content, never a blocking dependency.
//
// variant: 'card' (stacked feature cards, e.g. listing sidebar / home strip),
// 'banner' (compact single-line announcement bar), or 'carousel' (a big,
// full-width rotating ad banner — one promotion at a time, auto-advancing,
// for a placement like home_hero that's meant to be the site's main ad slot).
const PromotionSlot = ({ placement, className = '', variant = 'card' }) => {
  const [promotions, setPromotions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    publicAPI.getPromotions(placement)
      .then((res) => {
        if (!cancelled) setPromotions(res.data || []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [placement]);

  useEffect(() => {
    if (variant !== 'carousel' || promotions.length < 2) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % promotions.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [variant, promotions.length]);

  const handleClick = (id) => {
    publicAPI.trackPromotionClick(id).catch(() => {});
  };

  if (promotions.length === 0) return null;

  const isExternal = (link) => /^https?:\/\//.test(link || '');

  const PromoCard = ({ promo, tall = false }) => (
    <div
      className={`relative ${tall ? 'min-h-[220px] sm:min-h-[280px]' : 'min-h-[140px]'} flex items-center bg-cover bg-center bg-gradient-to-r from-primary-900 to-primary-700`}
      style={promo.image ? { backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.15)), url(${promo.image})` } : undefined}
    >
      <div className="relative z-10 px-6 py-5 sm:px-10 sm:py-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full mb-3 text-xs font-medium text-white uppercase tracking-wide">
          <Megaphone className="h-3.5 w-3.5" />
          Promotion
        </div>
        <h3 className={`font-display ${tall ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'} font-bold text-white mb-1 leading-snug max-w-xl`}>
          {promo.title}
        </h3>
        {promo.subtitle && (
          <p className="text-neutral-200 text-sm sm:text-base mb-4 max-w-md">{promo.subtitle}</p>
        )}
        {promo.cta_text && (
          <span className="inline-flex items-center gap-1.5 text-white font-semibold text-sm group-hover:gap-2.5 transition-all">
            {promo.cta_text}
            <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );

  // Compact single-line announcement bar (used where a slot needs to stay
  // out of the way rather than compete visually, e.g. above a page header).
  const BannerLine = ({ promo }) => (
    <div className="flex items-center justify-center gap-2 flex-wrap text-center px-4">
      <Megaphone className="h-4 w-4 shrink-0 text-accent-300" />
      <span className="font-semibold">{promo.title}</span>
      {promo.subtitle && <span className="text-white/80 hidden sm:inline">— {promo.subtitle}</span>}
      {promo.cta_text && (
        <span className="inline-flex items-center gap-1 font-semibold underline underline-offset-2">
          {promo.cta_text}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );

  const wrapperClass = variant === 'banner'
    ? 'block bg-neutral-900 text-white text-sm py-2.5 hover:bg-neutral-800 transition-colors'
    : 'group relative block overflow-hidden rounded-3xl shadow-card hover:shadow-card-hover transition-shadow';

  const Content = ({ promo }) => (variant === 'banner' ? <BannerLine promo={promo} /> : <PromoCard promo={promo} tall={variant === 'carousel'} />);

  const Slide = ({ promo }) => {
    if (!promo.cta_link) {
      return (
        <div className={wrapperClass}>
          <Content promo={promo} />
        </div>
      );
    }
    if (isExternal(promo.cta_link)) {
      return (
        <a
          href={promo.cta_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleClick(promo.id)}
          className={wrapperClass}
        >
          <Content promo={promo} />
        </a>
      );
    }
    return (
      <Link to={promo.cta_link} onClick={() => handleClick(promo.id)} className={wrapperClass}>
        <Content promo={promo} />
      </Link>
    );
  };

  if (variant === 'carousel') {
    const promo = promotions[activeIndex] || promotions[0];
    return (
      <div className={`relative ${className}`}>
        <Slide key={promo.id} promo={promo} />
        {promotions.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActiveIndex((i) => (i - 1 + promotions.length) % promotions.length)}
              aria-label="Previous promotion"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((i) => (i + 1) % promotions.length)}
              aria-label="Next promotion"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {promotions.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Show promotion ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === activeIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={variant === 'banner' ? className : `space-y-4 ${className}`}>
      {promotions.map((promo) => (
        <Slide key={promo.id} promo={promo} />
      ))}
    </div>
  );
};

export default PromotionSlot;
