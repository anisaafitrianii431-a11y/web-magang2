<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PeriodeMagang;

class PeriodeController extends Controller
{
    public function index()
    {
        $periodes = PeriodeMagang::with(['pendaftarans.user', 'pendaftarans.pembimbing'])->get();
        return response()->json(['data' => $periodes]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date',
        ]);

        $nama = $request->nama_periode ?: ('Periode ' . date('Y', strtotime($request->tanggal_mulai)));

        $periode = PeriodeMagang::create([
            'nama_periode' => $nama,
            'tanggal_mulai' => $request->tanggal_mulai,
            'tanggal_selesai' => $request->tanggal_selesai,
        ]);

        return response()->json(['data' => $periode]);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date',
        ]);

        $periode = PeriodeMagang::findOrFail($id);
        $nama = $request->nama_periode;
        if (!$nama) {
            $isRawDates = $periode->nama_periode === ($periode->tanggal_mulai . ' s/d ' . $periode->tanggal_selesai);
            $nama = (!$periode->nama_periode || $isRawDates) ? ('Periode ' . date('Y', strtotime($request->tanggal_mulai))) : $periode->nama_periode;
        }
        $periode->nama_periode = $nama;
        $periode->tanggal_mulai = $request->tanggal_mulai;
        $periode->tanggal_selesai = $request->tanggal_selesai;
        $periode->save();

        return response()->json(['data' => $periode, 'message' => 'Periode berhasil diperbarui']);
    }

    public function destroy($id)
    {
        $periode = PeriodeMagang::findOrFail($id);
        $periode->delete();
        return response()->json(['message' => 'Periode berhasil dihapus']);
    }
}
