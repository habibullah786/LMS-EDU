<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    protected $fillable = [
        'payment_id',
        'enrollment_id',
        'invoice_number',
        'amount',
        'method',
        'purchase_order_number',
        'status',
        'due_date',
        'parent_name',
        'parent_email',
        'paid_at',
    ];

    protected $casts = [
        'amount'  => 'decimal:2',
        'due_date'=> 'date',
        'paid_at' => 'datetime',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }
}
