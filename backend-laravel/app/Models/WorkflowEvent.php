<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkflowEvent extends Model
{
    protected $fillable = ['key', 'label', 'description', 'sort_order'];
}
