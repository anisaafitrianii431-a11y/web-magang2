<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MasterPenilaian extends Model
{
    protected $table = 'master_penilaian';

    protected $fillable = [
        'kode',
        'pertanyaan',
        'bobot',
        'urutan',
        'aktif',
    ];

    protected $casts = [
        'bobot' => 'float',
        'urutan' => 'integer',
        'aktif' => 'boolean',
    ];
}
