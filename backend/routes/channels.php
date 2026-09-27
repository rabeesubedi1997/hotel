<?php

use App\Models\Conversation;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Only the conversation's own participants (customer, the specific vendor,
// or any admin-level user for a 'support' conversation) may subscribe.
Broadcast::channel('conversation.{id}', function ($user, $id) {
    $conversation = Conversation::find($id);
    return $conversation && $conversation->isParticipant($user);
});
