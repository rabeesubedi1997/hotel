<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Response to Your Enquiry</title>
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
        .response-box {
            background: #ecfdf5;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #10b981;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #6b7280;
            font-size: 14px;
        }
        .btn {
            display: inline-block;
            background: #4f46e5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Response to Your Enquiry</h1>
    </div>

    <div class="content">
        <p>Dear <strong>{{ $enquiry->name }}</strong>,</p>

        <p>Thank you for contacting us. We have received your enquiry and here's our response:</p>

        <div class="enquiry-details">
            <h3>Your Original Enquiry</h3>
            <p><strong>Enquiry Number:</strong> {{ $enquiry->enquiry_number }}</p>
            <p><strong>Subject:</strong> {{ $enquiry->subject }}</p>
            <p><strong>Message:</strong></p>
            <p>{{ $enquiry->message }}</p>
        </div>

        <div class="response-box">
            <h3>Our Response</h3>
            <p>{{ $response }}</p>
        </div>

        <p style="margin-top: 30px;">If you have any further questions, please don't hesitate to contact us again.</p>

        <div class="footer">
            <p>Best regards,<br>
            <strong>Reserve Now Team</strong></p>
            <p style="font-size: 12px; color: #9ca3af;">
                This is an automated response. Please do not reply directly to this email.
            </p>
        </div>
    </div>
</body>
</html>
