import { Shield, Clock, Star, Check, Heart, Award } from 'lucide-react';

// Matches the icon dropdown in Admin > Pages > [page] > Trust Badges.
const TRUST_BADGE_ICONS = { shield: Shield, clock: Clock, star: Star, check: Check, heart: Heart, award: Award };

/**
 * "Why Book With Us" trust row — reusable across Home, Hotels, Activities,
 * Itineraries. Sources its copy from a page's `sections.trust_badges` (admin
 * editable), so it only renders once real content exists.
 */
const TrustStrip = ({ badges, className = '' }) => {
  const active = (badges || []).filter((b) => b?.title);
  if (active.length === 0) return null;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${className}`}>
      {active.map((badge, i) => {
        const Icon = TRUST_BADGE_ICONS[badge.icon] || Shield;
        return (
          <div key={i} className="flex items-center gap-3.5 bg-white rounded-2xl border border-neutral-100 shadow-card px-5 py-4">
            <span className="h-11 w-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-neutral-900 text-sm truncate">{badge.title}</p>
              {badge.subtitle && <p className="text-xs text-neutral-500 truncate">{badge.subtitle}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrustStrip;
