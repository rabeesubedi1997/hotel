<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice_number }}</title>
    <style>
        body { font-family: Helvetica, Arial, sans-serif; color: #1f2937; font-size: 12px; }
        .header { padding-bottom: 16px; border-bottom: 3px solid #005f50; margin-bottom: 24px; }
        .header h1 { font-size: 20px; margin: 0 0 4px; color: #005f50; }
        .header p { margin: 0; color: #6b7280; }
        .meta-table { width: 100%; margin-bottom: 24px; }
        .meta-table td { vertical-align: top; padding: 0; }
        .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
        .value { font-size: 13px; font-weight: bold; margin-top: 2px; }
        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; background: #ecfdf5; color: #047857; font-weight: bold; font-size: 11px; }
        .section-title { font-size: 13px; font-weight: bold; margin: 20px 0 8px; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        table.items td { padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
        .totals { width: 100%; margin-top: 12px; }
        .totals td { padding: 4px 0; }
        .totals .grand-total td { border-top: 2px solid #005f50; padding-top: 10px; font-size: 15px; font-weight: bold; color: #005f50; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 10px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Package Booking Invoice</h1>
        <p>Invoice #{{ $invoice_number }} &middot; Issued {{ $issued_at }}</p>
    </div>

    <table class="meta-table">
        <tr>
            <td width="33%">
                <div class="label">Billed To</div>
                <div class="value">{{ $customer_name ?? 'Guest' }}</div>
                <div>{{ $customer_email }}</div>
            </td>
            <td width="33%">
                <div class="label">Status</div>
                <div class="value"><span class="status-badge">{{ $status }}</span></div>
            </td>
            <td width="33%">
                <div class="label">Payment</div>
                <div class="value">{{ $payment_method }}</div>
                <div>{{ $payment_status }}</div>
            </td>
        </tr>
    </table>

    <div class="section-title">{{ $package_title }}</div>
    <p>Travel date: {{ $travel_date }} &nbsp;&bull;&nbsp; {{ $travelers }} traveler(s)</p>

    <table class="items">
        @foreach($items as $item)
        <tr>
            <td width="60%"><strong>{{ $item['name'] }}</strong></td>
            <td width="40%" align="right">{{ $item['detail'] }}</td>
        </tr>
        @endforeach
    </table>

    @if($special_requests)
    <p style="color:#6b7280;">Special requests: {{ $special_requests }}</p>
    @endif

    <table class="totals">
        <tr>
            <td>Package Price</td>
            <td align="right">${{ $subtotal }}</td>
        </tr>
        @if((float) str_replace(',', '', $discount_amount) > 0)
        <tr>
            <td>Discount</td>
            <td align="right">-${{ $discount_amount }}</td>
        </tr>
        @endif
        <tr class="grand-total">
            <td>Total</td>
            <td align="right">${{ $total_amount }}</td>
        </tr>
    </table>

    <div class="footer">
        This is a system-generated invoice. Please retain it for your records.
    </div>
</body>
</html>
