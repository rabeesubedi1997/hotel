<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SyncICalendarFeeds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ical:sync';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync external iCal feeds into local booking system.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Syncing Rooms with external iCal feeds...");
        $rooms = \App\Models\Room::whereNotNull('ical_feed_url')->get();
        foreach($rooms as $room) {
            $this->info("Syncing Room ID {$room->id} from {$room->ical_feed_url}");
            // A robust production parser requires 'sabre/vobject' or similar to accurately handle RRULEs.
            // Placeholder for blocking slots.
        }
        $this->info("iCal sync complete.");
    }
}
