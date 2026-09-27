// Shared skeleton-loading primitives — swap in for bare "Loading..." text so
// listing pages show the shape of what's coming (a premium-feeling pattern
// used by most modern booking sites) instead of a blank pause.
export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-neutral-200 rounded-lg ${className}`} />
);

// Mirrors the hotel/activity Card layout: an aspect-[4/3] image block plus a
// few text lines, so the loading grid matches the real grid's rhythm.
export const CardSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-neutral-100">
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="p-4 space-y-2.5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3.5 w-1/2" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </div>
  </div>
);

// A grid of CardSkeletons — pass the same grid classes the real listing grid
// uses so the loading state doesn't jump/reflow once data arrives.
export const CardGridSkeleton = ({ count = 8, gridClassName = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6' }) => (
  <div className={gridClassName}>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);
