<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Append-only audit trail for privileged mutations (admin actions, order state
 * changes). Uses the query builder so it never depends on a specific model.
 */
class AuditLogger
{
    /**
     * @param  Model|class-string<Model>|null  $subject
     * @param  array<string, mixed>  $meta
     */
    public static function log(
        string $action,
        Model|string|null $subject = null,
        array $meta = [],
        ?int $actorId = null,
        ?int $subjectId = null,
    ): void {
        try {
            if ($subject instanceof Model) {
                $subjectId = $subjectId ?? $subject->getKey();
                $subjectType = $subject::class;
            } else {
                $subjectType = $subject;
            }

            DB::table('audit_logs')->insert([
                'actor_id' => $actorId ?? auth()->id(),
                'action' => $action,
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'meta' => $meta === [] ? null : json_encode($meta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'ip_address' => request()->ip(),
                'user_agent' => substr((string) request()->userAgent(), 0, 255),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // Auditing must never break the business operation, but it must be visible.
            Log::error('audit_log_failed', ['action' => $action, 'error' => $e->getMessage()]);
        }
    }
}
