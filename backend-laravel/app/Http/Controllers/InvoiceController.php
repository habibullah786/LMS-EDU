<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;

class InvoiceController extends Controller
{
    public function __construct(private NotificationService $notifications) {}

    /**
     * Public: view/print an invoice by its number.
     */
    public function show(string $invoiceNumber): JsonResponse
    {
        $invoice = Invoice::with('enrollment')->where('invoice_number', $invoiceNumber)->first();

        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found'], 404);
        }

        return response()->json($invoice);
    }

    // ─── Admin ──────────────────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        return response()->json(Invoice::with('enrollment')->orderBy('created_at', 'desc')->get());
    }

    public function markPaid(Invoice $invoice): JsonResponse
    {
        if ($invoice->status === 'paid') {
            return response()->json(['message' => 'Already paid', 'data' => $invoice]);
        }

        $invoice->update(['status' => 'paid', 'paid_at' => now()]);

        $payment = $invoice->payment;
        $payment->markAsCompleted('MANUAL-' . $invoice->invoice_number, ['method' => $invoice->method]);

        $enrollment = $invoice->enrollment;
        $enrollment->update(['is_paid' => true, 'status' => 'confirmed']);

        $this->notifications->enrollmentConfirmed([
            'parentName'  => $enrollment->parent_name,
            'parentEmail' => $enrollment->parent_email,
            'parentPhone' => $enrollment->parent_phone,
            'childName'   => $enrollment->parent_name,
            'className'   => '',
            'location'    => '',
        ]);

        return response()->json(['message' => 'Invoice marked as paid', 'data' => $invoice->fresh()]);
    }
}
