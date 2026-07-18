<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'enrollment_id',
        'user_id',
        'amount',
        'currency',
        'payment_method',
        'transaction_id',
        'status',
        'processed_at',
        'metadata',
        'gateway_order_id',
        'expires_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'metadata' => 'json',
        'processed_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function markAsCompleted(string $transactionId = null, array $metadata = []): void
    {
        $this->update([
            'status' => 'completed',
            'transaction_id' => $transactionId,
            'processed_at' => now(),
            'metadata' => $metadata,
        ]);
    }

    public function markAsFailed(string $reason = null): void
    {
        $this->update([
            'status' => 'failed',
            'processed_at' => now(),
            'metadata' => ['error' => $reason],
        ]);
    }
}
