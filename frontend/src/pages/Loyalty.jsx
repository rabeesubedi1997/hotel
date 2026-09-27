import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award, Loader2, TrendingUp, TrendingDown, Settings2 } from 'lucide-react';
import { loyaltyAPI } from '../services/api';
import SEO from '../components/SEO';
import { Container, Card, Badge } from '../components/ui';

const TYPE_META = {
  earn: { label: 'Earned', tone: 'success', icon: TrendingUp },
  redeem: { label: 'Redeemed', tone: 'accent', icon: TrendingDown },
  expire: { label: 'Reversed', tone: 'neutral', icon: TrendingDown },
  adjust: { label: 'Adjusted', tone: 'info', icon: Settings2 },
};

const Loyalty = () => {
  const [account, setAccount] = useState(null);
  const [pointsPerDollar, setPointsPerDollar] = useState(100);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loyaltyAPI.getAccount()
      .then((res) => {
        setAccount(res.data.account);
        setPointsPerDollar(res.data.points_per_dollar || 100);
        setTransactions(res.data.recent_transactions || []);
      })
      .catch((err) => console.error('Error fetching loyalty account:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const dollarValue = ((account?.points_balance || 0) / pointsPerDollar).toFixed(2);

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      <SEO title="Rewards & Points" description="Track your loyalty points balance and redemption history." canonical="/loyalty" />

      <div className="relative bg-neutral-900 py-14 sm:py-20 overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />
        <Container className="relative text-center text-white">
          <Award className="h-10 w-10 mx-auto text-primary-300 mb-3" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">Rewards & Points</h1>
          <p className="text-neutral-300 max-w-xl mx-auto">
            Earn points on every confirmed booking, then redeem them for a discount at checkout.
          </p>
        </Container>
      </div>

      <Container className="pt-10">
        <Card hoverLift={false} className="p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-sm text-neutral-500 uppercase tracking-wide">Your Balance</p>
            <p className="font-display text-4xl font-bold text-primary-600 mt-1">{account?.points_balance || 0} pts</p>
            <p className="text-sm text-neutral-500 mt-1">≈ ${dollarValue} in redemption value</p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-neutral-900">{account?.lifetime_points_earned || 0}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Lifetime Earned</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{account?.lifetime_points_redeemed || 0}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Lifetime Redeemed</p>
            </div>
          </div>
        </Card>

        <h2 className="font-display text-lg font-bold text-neutral-900 mb-4">Recent Activity</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl shadow-card">
            <Award className="h-12 w-12 mx-auto text-neutral-300 mb-3" />
            <p className="text-neutral-500">No activity yet — book something to start earning points.</p>
            <Link to="/hotels" className="text-primary-600 hover:underline font-medium mt-2 inline-block">Browse Hotels</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const meta = TYPE_META[tx.type] || TYPE_META.adjust;
              const Icon = meta.icon;
              return (
                <div key={tx.id} className="flex items-center justify-between bg-white rounded-2xl shadow-card px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-neutral-600" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {tx.note && <span className="text-sm text-neutral-600">{tx.note}</span>}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${tx.points > 0 ? 'text-green-600' : 'text-neutral-500'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
};

export default Loyalty;
