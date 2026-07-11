<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Company extends Model
{
    protected $fillable = [
        'name',
        'code',
        'contact_email',
        'discount_coupon_id',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function discountCoupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class, 'discount_coupon_id');
    }
}
