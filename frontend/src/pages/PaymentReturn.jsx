import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';
import { paymentsAPI } from '../services/api';
import { Button, Card, Container } from '../components/ui';

/**
 * Where an online payment provider (Khalti / Stripe / PayPal / …) sends the
 * customer back to. Nothing in the URL is trusted: we only use the payment
 * id to ask OUR server to verify with the provider, and the booking is
 * confirmed server-side only if the provider says it was really paid.
 */
const PaymentReturn = () => {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment');
  const cancelled = searchParams.get('cancelled') === '1';

  // verifying | completed | pending | failed | cancelled
  const [state, setState] = useState(cancelled ? 'cancelled' : 'verifying');
  const [message, setMessage] = useState('');
  const started = useRef(false);

  const verify = useCallback(async () => {
    setState('verifying');
    try {
      const response = await paymentsAPI.verify(paymentId);
      setState(response.data.status === 'completed' ? 'completed' : 'pending');
      setMessage(response.data.message || '');
    } catch (error) {
      const data = error.response?.data;
      if (error.response?.status === 202 || data?.status === 'pending') {
        setState('pending');
      } else {
        setState('failed');
      }
      setMessage(data?.message || 'We could not confirm your payment.');
    }
  }, [paymentId]);

  useEffect(() => {
    if (cancelled || started.current) return;
    started.current = true;

    if (!paymentId) {
      setState('failed');
      setMessage('This payment link is missing its reference.');
      return;
    }
    verify();
  }, [cancelled, paymentId, verify]);

  const view = {
    verifying: { Icon: Loader2, tone: 'text-primary-600', spin: true, title: 'Confirming your payment…', body: 'Please wait — do not close this page.' },
    completed: { Icon: CheckCircle, tone: 'text-green-600', title: 'Payment successful', body: message || 'Your booking is confirmed.' },
    pending: { Icon: Clock, tone: 'text-amber-500', title: 'Payment not completed yet', body: message || 'The payment provider has not confirmed this payment yet.' },
    failed: { Icon: XCircle, tone: 'text-red-600', title: 'Payment failed', body: message || 'The payment was not completed. You have not been charged for a confirmed booking.' },
    cancelled: { Icon: XCircle, tone: 'text-neutral-500', title: 'Payment cancelled', body: 'You cancelled the payment. Your booking is saved and still waiting for payment.' },
  }[state];

  return (
    <Container className="py-12">
      <Card hoverLift={false} className="max-w-lg mx-auto p-8 text-center">
        <view.Icon className={`h-14 w-14 mx-auto mb-4 ${view.tone} ${view.spin ? 'animate-spin' : ''}`} />
        <h1 className="font-display text-2xl font-bold text-neutral-900 mb-2">{view.title}</h1>
        <p className="text-neutral-600 mb-6">{view.body}</p>

        {state !== 'verifying' && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {state === 'pending' && (
              <Button variant="primary" onClick={verify}>Check again</Button>
            )}
            <Button as={Link} to="/bookings" variant={state === 'pending' ? 'secondary' : 'primary'}>
              Go to My Bookings
            </Button>
          </div>
        )}
      </Card>
    </Container>
  );
};

export default PaymentReturn;
