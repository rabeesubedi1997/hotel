<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\EnquiryResponseSent;
use App\Models\Enquiry;
use App\Services\DevEmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class EnquiryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Enquiry::with(['user', 'responder']);
        
        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        
        // Filter by type
        if ($request->has('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }
        
        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%")
                  ->orWhere('enquiry_number', 'like', "%{$search}%");
            });
        }
        
        $enquiries = $query->orderBy('created_at', 'desc')->paginate(20);
        
        return response()->json($enquiries);
    }

    public function show(Enquiry $enquiry): JsonResponse
    {
        $enquiry->load(['user', 'responder']);
        return response()->json($enquiry);
    }

    public function respond(Request $request, Enquiry $enquiry): JsonResponse
    {
        $validated = $request->validate([
            'response' => 'required|string',
        ]);

        $enquiry->update([
            'admin_response' => $validated['response'],
            'responded_by' => $request->user()->id,
            'responded_at' => now(),
            'status' => 'responded',
        ]);

        // Send email to user
        $emailPath = null;
        try {
            Mail::to($enquiry->email)->send(new EnquiryResponseSent($enquiry));
            
            // Fallback: also save as HTML file for dev environment
            $emailPath = DevEmailService::saveEmailAsHtml(
                $enquiry->email,
                'Re: ' . $enquiry->subject,
                'emails.enquiry-response',
                ['enquiry' => $enquiry, 'response' => $enquiry->admin_response]
            );
        } catch (\Exception $e) {
            \Log::error('Failed to send enquiry response email: ' . $e->getMessage());
            
            // Even if mail fails, save as HTML so dev can "receive" it
            try {
                $emailPath = DevEmailService::saveEmailAsHtml(
                    $enquiry->email,
                    'Re: ' . $enquiry->subject,
                    'emails.enquiry-response',
                    ['enquiry' => $enquiry, 'response' => $enquiry->admin_response]
                );
            } catch (\Exception $e2) {
                \Log::error('Failed to save email as HTML: ' . $e2->getMessage());
            }
        }

        return response()->json([
            'message' => 'Response sent successfully',
            'enquiry' => $enquiry->fresh(['responder']),
            'dev_email_path' => $emailPath ? url('/admin/dev-email?file=' . basename($emailPath)) : null,
        ]);
    }

    public function updateStatus(Request $request, Enquiry $enquiry): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:new,in_progress,responded,closed,spam',
        ]);

        $enquiry->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Status updated successfully',
            'enquiry' => $enquiry,
        ]);
    }

    public function devEmails(Request $request): JsonResponse
    {
        $emails = DevEmailService::getRecentEmails(20);
        return response()->json([
            'emails' => $emails,
            'storage_path' => storage_path('app/emails'),
        ]);
    }

    public function destroy(Enquiry $enquiry): JsonResponse
    {
        $enquiry->delete();

        return response()->json([
            'message' => 'Enquiry deleted successfully',
        ]);
    }
}
