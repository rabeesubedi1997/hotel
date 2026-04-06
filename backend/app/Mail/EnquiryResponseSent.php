<?php

namespace App\Mail;

use App\Models\Enquiry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EnquiryResponseSent extends Mailable
{
    use Queueable, SerializesModels;

    public $enquiry;

    public function __construct(Enquiry $enquiry)
    {
        $this->enquiry = $enquiry;
    }

    public function build()
    {
        return $this->subject('Re: ' . $this->enquiry->subject)
                    ->view('emails.enquiry-response')
                    ->with([
                        'enquiry' => $this->enquiry,
                        'response' => $this->enquiry->admin_response,
                    ]);
    }
}
