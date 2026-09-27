<?php

namespace App\Http\Controllers\Api;

use App\Events\NewChatMessage;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Notifications\ChatMessageReceived;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    /**
     * Public entry point for an anonymous visitor's floating-chat widget.
     * Finds or creates a lightweight guest User (real Sanctum-auth
     * identity, `is_guest` flag only) keyed by the email they give, issues
     * a token scoped to guest chat, then reuses the same support-thread
     * logic authenticated users get — no parallel chat stack to maintain.
     */
    public function guestStart(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255',
            'phone' => 'nullable|string|max:20',
            'message' => 'required|string|max:5000',
        ]);

        $user = User::firstOrCreate(
            ['email' => $validated['email'], 'is_guest' => true],
            [
                'name' => $validated['name'],
                'password' => Hash::make(Str::random(40)),
                'phone' => $validated['phone'] ?? null,
                'role' => User::ROLE_CUSTOMER,
                'status' => User::STATUS_ACTIVE,
            ]
        );

        // A returning guest might give a different name on a later visit —
        // keep the identity's display name current.
        if ($user->name !== $validated['name']) {
            $user->update(['name' => $validated['name']]);
        }

        $token = $user->createToken('guest-chat')->plainTextToken;

        $conversation = Conversation::firstOrCreate([
            'type' => Conversation::TYPE_SUPPORT,
            'customer_id' => $user->id,
            'vendor_id' => null,
            'subject_type' => null,
            'subject_id' => null,
        ]);

        $message = $this->postMessage($conversation, $user, $validated['message']);

        return response()->json([
            'token' => $token,
            'conversation' => $conversation->fresh(['customer:id,name,avatar']),
            'sent' => $message,
        ], 201);
    }

    /**
     * Conversations visible to the current user: their own (as customer),
     * ones a vendor owns, or — for admin-level users — every 'support'
     * conversation (since those aren't tied to one specific admin).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Conversation::with(['customer:id,name,avatar', 'vendor:id,name,company_name,avatar', 'latestMessage'])
            ->withCount(['messages as unread_count' => function ($q) use ($user) {
                $q->whereNull('read_at')->where('sender_id', '!=', $user->id);
            }]);

        if ($user->isAdminLevel()) {
            $query->where(function ($q) use ($user) {
                $q->where('type', Conversation::TYPE_SUPPORT)
                    ->orWhere('customer_id', $user->id)
                    ->orWhere('vendor_id', $user->id);
            });
        } elseif ($user->isVendor()) {
            $query->where('vendor_id', $user->id);
        } else {
            $query->where('customer_id', $user->id);
        }

        $conversations = $query->orderByDesc('last_message_at')
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json($conversations);
    }

    /**
     * Start a new conversation, or return the existing one for the same
     * customer+vendor+subject (or customer+support) pairing rather than
     * creating duplicates every time someone clicks "Message host" again.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:vendor_inquiry,support',
            'vendor_id' => 'required_if:type,vendor_inquiry|nullable|integer|exists:users,id,role,vendor',
            'subject_type' => 'nullable|string|in:hotel,activity,tour_guide',
            'subject_id' => 'nullable|integer',
            'message' => 'required|string|max:5000',
        ]);

        $user = $request->user();
        $subjectClass = match ($validated['subject_type'] ?? null) {
            'hotel' => \App\Models\Hotel::class,
            'activity' => \App\Models\Activity::class,
            'tour_guide' => \App\Models\TourGuide::class,
            default => null,
        };

        $lookup = [
            'type' => $validated['type'],
            'customer_id' => $user->id,
            'vendor_id' => $validated['type'] === 'vendor_inquiry' ? $validated['vendor_id'] : null,
            'subject_type' => $subjectClass,
            'subject_id' => $subjectClass ? ($validated['subject_id'] ?? null) : null,
        ];

        $conversation = Conversation::firstOrCreate($lookup);

        $message = $this->postMessage($conversation, $user, $validated['message']);

        return response()->json([
            'message' => 'Message sent.',
            'conversation' => $conversation->fresh(['customer:id,name,avatar', 'vendor:id,name,company_name,avatar']),
            'sent' => $message,
        ], 201);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        if (!$conversation->isParticipant($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $conversation->load([
            'customer:id,name,avatar',
            'vendor:id,name,company_name,avatar',
            'messages.sender:id,name,avatar',
        ]);

        return response()->json($conversation);
    }

    public function sendMessage(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        if (!$conversation->isParticipant($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate(['body' => 'required|string|max:5000']);

        $message = $this->postMessage($conversation, $user, $validated['body']);

        return response()->json([
            'message' => 'Message sent.',
            'sent' => $message,
        ], 201);
    }

    public function markRead(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        if (!$conversation->isParticipant($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $conversation->messages()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $user->id)
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Marked as read.']);
    }

    /**
     * Shared by store() (first message of a new conversation) and
     * sendMessage() — creates the message, updates last_message_at,
     * broadcasts it live to the open thread, and notifies whoever isn't
     * currently looking at it.
     */
    private function postMessage(Conversation $conversation, User $sender, string $body): Message
    {
        $message = $conversation->messages()->create([
            'sender_id' => $sender->id,
            'body' => $body,
        ]);
        $message->setRelation('sender', $sender);

        $conversation->update(['last_message_at' => now()]);

        broadcast(new NewChatMessage($message))->toOthers();

        $this->notifyRecipients($conversation, $sender, $message);

        return $message;
    }

    private function notifyRecipients(Conversation $conversation, User $sender, Message $message): void
    {
        if ($conversation->type === Conversation::TYPE_SUPPORT && $sender->id === $conversation->customer_id) {
            // No single fixed recipient for support conversations —
            // notify every admin-level user.
            User::whereIn('role', ['admin', 'manager', 'super_admin'])->get()->each(
                fn (User $admin) => $admin->notify(new ChatMessageReceived($message, "/admin/messages/{$conversation->id}"))
            );
            return;
        }

        $recipient = $conversation->otherParticipant($sender);
        if (!$recipient) {
            return;
        }

        $actionUrl = match (true) {
            $recipient->isAdminLevel() => "/admin/messages/{$conversation->id}",
            $recipient->isVendor() => "/vendor/messages/{$conversation->id}",
            default => "/messages/{$conversation->id}",
        };

        $recipient->notify(new ChatMessageReceived($message, $actionUrl));
    }
}
