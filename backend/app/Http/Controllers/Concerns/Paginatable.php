<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;

/**
 * Shared "rows per page" contract for every list endpoint (admin + vendor
 * panels) — one place that owns the allowed page sizes and clamps
 * `per_page` so a crafted request can't force an unbounded query. Response
 * shape is Laravel's own paginator JSON (data/current_page/last_page/
 * per_page/total/...), unwrapped, matching every endpoint that already
 * paginated before this trait existed.
 */
trait Paginatable
{
    private const PAGE_SIZES = [20, 60, 100, 200];

    private function paginateQuery(Builder|Relation $query, Request $request, int $default = 20): LengthAwarePaginator
    {
        $perPage = (int) $request->query('per_page', $default);
        if (!in_array($perPage, self::PAGE_SIZES, true)) {
            $perPage = $default;
        }

        return $query->paginate($perPage);
    }
}
