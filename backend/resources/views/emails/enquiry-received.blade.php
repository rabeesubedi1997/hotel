<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enquiry Received</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: #4f46e5;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background: #f9fafb;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-radius: 0 0 8px 8px;
        }
        .enquiry-details {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #4f46e5;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Enquiry Received</h1>
    </div>

    <div class="content">
        <p>Dear <strong>{{ $enquiry->name }}</strong>,</p>

        <p>Thank you for contacting us. We have received your enquiry and will get back to you as soon as possible.</p>

        <div class="enquiry-details">
            <h3>Your Enquiry Details</h3>
            <p><strong>Enquiry Number:</strong> {{ $enquiry->enquiry_number }}</p>
            <p><strong>Type:</strong> {{ ucfirst($enquiry->type) }}</p>
            <p><strong>Subject:</strong> {{ $enquiry->subject }}</p>
            <p><strong>Message:</strong></p>
            <p>{{ $enquiry->message }}</p>
        </div>

        <p>Please keep your enquiry number <strong>{{ $enquiry->enquiry_number }}</strong> for future reference.</p>

        <div class="footer">
            <p>Best regards,<br>
            <strong>Reserve Now Team</strong></p>
        </div>
    </div>
</body>
</html>
