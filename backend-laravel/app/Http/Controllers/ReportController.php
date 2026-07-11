<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * GET /admin/reports?date_from=&date_to=&course=&location=&status=
     * Flexible aggregate report over enrollments for a program's own needs.
     */
    public function summary(Request $request): JsonResponse
    {
        $query = $this->filtered($request);
        $enrollments = $query->get();

        return response()->json([
            'total_enrollments' => $enrollments->count(),
            'total_students'    => $enrollments->sum(fn ($e) => $e->trialStudents->count()),
            'total_revenue'     => $enrollments->where('is_paid', true)->sum('total_amount'),
            'by_status'         => $enrollments->groupBy('status')->map->count(),
            'by_course'         => $enrollments->flatMap(fn ($e) => $e->trialStudents->pluck('course'))->filter()->countBy(),
            'by_location'       => $enrollments->flatMap(fn ($e) => $e->trialStudents->pluck('location'))->filter()->countBy(),
        ]);
    }

    /**
     * GET /admin/reports/export.csv?date_from=&date_to=&course=&location=&status=
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $enrollments = $this->filtered($request)->get();

        $response = new StreamedResponse(function () use ($enrollments) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Enrollment ID', 'Parent Name', 'Parent Email', 'Status', 'Is Paid', 'Total Amount', 'Booking Date', 'Students']);
            foreach ($enrollments as $e) {
                $students = $e->trialStudents->map(fn ($s) => trim($s->first_name . ' ' . $s->last_name))->implode('; ');
                fputcsv($out, [$e->id, $e->parent_name, $e->parent_email, $e->status, $e->is_paid ? 'Yes' : 'No', $e->total_amount, $e->booking_date, $students]);
            }
            fclose($out);
        });

        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="enrollments-report.csv"');

        return $response;
    }

    private function filtered(Request $request)
    {
        $query = Enrollment::with('trialStudents');

        if ($request->filled('date_from')) {
            $query->whereDate('booking_date', '>=', $request->query('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('booking_date', '<=', $request->query('date_to'));
        }
        if ($request->filled('status') && $request->query('status') !== 'All') {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('course') || $request->filled('location')) {
            $query->whereHas('trialStudents', function ($q) use ($request) {
                if ($request->filled('course'))   $q->where('course', $request->query('course'));
                if ($request->filled('location')) $q->where('location', $request->query('location'));
            });
        }

        return $query;
    }
}
