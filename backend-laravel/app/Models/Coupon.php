<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $fillable = [
        'code',
        'discount_type',
        'discount_value',
        'min_amount',
        'max_uses',
        'used_count',
        'expires_at',
        'active',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'min_amount'     => 'decimal:2',
        'expires_at'     => 'date',
        'active'         => 'boolean',
    ];

    public function isValidFor(float $amount): bool
    {
        if (!$this->active) {
            return false;
        }
        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }
        if ($this->max_uses !== null && $this->used_count >= $this->max_uses) {
            return false;
        }
        if ($amount < (float) $this->min_amount) {
            return false;
        }
        return true;
    }

    public function discountFor(float $amount): float
    {
        $discount = $this->discount_type === 'percent'
            ? $amount * ((float) $this->discount_value / 100)
            : (float) $this->discount_value;

        return round(min($discount, $amount), 2);
    }
}
