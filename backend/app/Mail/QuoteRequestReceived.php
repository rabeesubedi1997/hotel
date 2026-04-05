<?php

namespace App\Mail;

use App\Models\Quote;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class QuoteRequestReceived extends Mailable
{
    use Queueable, SerializesModels;

    public $quote;

    public function __construct(Quote $quote)
    {
        $this->quote = $quote;
    }

    public function build()
    {
        return $this->subject('New Package Quote Request - ' . $this->quote->quote_number)
                    ->view('emails.quote-received')
                    ->with(['quote' => $this->quote]);
    }
}
