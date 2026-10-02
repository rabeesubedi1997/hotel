import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';
import { Select } from './Input';

export const PAGE_SIZES = [20, 60, 100, 200];

const getPageNumbers = (current, last) => {
  const pages = [];
  for (let i = Math.max(1, current - 2); i <= Math.min(last, current + 2); i += 1) {
    pages.push(i);
  }
  return pages;
};

/**
 * Shared "rows per page + prev/next" footer for every server-paginated list
 * in the admin/vendor panels — extracted from what Activities.jsx,
 * Itineraries.jsx, AuditLog.jsx and EnquiriesManagement.jsx had each
 * independently reimplemented. Pair with the `usePagination` hook.
 */
const Pagination = ({ pagination, onPageChange, onPerPageChange, itemLabel = 'items', pageSizes = PAGE_SIZES }) => {
  const { current_page = 1, last_page = 1, per_page = pageSizes[0], total = 0 } = pagination || {};

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-card gap-4">
      <p className="text-neutral-600 text-sm">
        {total === 0
          ? `No ${itemLabel}`
          : `Showing ${((current_page - 1) * per_page + 1).toLocaleString()}–${Math.min(current_page * per_page, total).toLocaleString()} of ${total.toLocaleString()} ${itemLabel}`}
      </p>
      {/* Wraps on phones — the single row used to run off both screen edges. */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-neutral-600 text-sm whitespace-nowrap">
            <span className="hidden sm:inline">Rows per page:</span>
            <span className="sm:hidden">Per page:</span>
          </span>
          <Select
            value={per_page}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="w-20"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </Select>
        </div>

        {last_page > 1 && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(current_page - 1)}
              disabled={current_page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {getPageNumbers(current_page, last_page).map((page) => (
              <Button
                key={page}
                variant={page === current_page ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onPageChange(page)}
                aria-current={page === current_page ? 'page' : undefined}
                // Phones show only current ±1 so the row fits.
                className={`!px-3 sm:!px-4 ${Math.abs(page - current_page) > 1 ? 'hidden sm:inline-flex' : ''}`}
              >
                {page}
              </Button>
            ))}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(current_page + 1)}
              disabled={current_page === last_page}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pagination;
