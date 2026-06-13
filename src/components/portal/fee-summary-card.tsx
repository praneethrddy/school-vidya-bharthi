import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/fee-utils'

interface FeeSummary {
  total_fees: number
  total_concessions: number
  total_paid: number
  total_balance: number
}

export function FeeSummaryCard({ summary }: { summary: FeeSummary }) {
  const { total_fees, total_concessions, total_paid, total_balance } = summary
  
  const net_fees = Math.max(0, total_fees - total_concessions)
  const isFullyPaid = total_balance <= 0
  const progressPercent = net_fees > 0 ? Math.min(100, Math.max(0, (total_paid / net_fees) * 100)) : 100
  
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-muted-foreground">Outstanding Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-6">
          <div>
            <div className={`text-4xl font-bold tracking-tight ${isFullyPaid ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(total_balance)}
            </div>
            {isFullyPaid && total_fees > 0 && (
              <p className="text-sm font-medium text-green-600 mt-2">All fees paid! 🎉</p>
            )}
            {total_balance < 0 && (
              <p className="text-sm font-medium text-blue-600 mt-2">Overpaid by {formatCurrency(Math.abs(total_balance))}</p>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-8 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">Total Fees</div>
              <div className="font-semibold text-lg">{formatCurrency(total_fees)}</div>
            </div>
            {total_concessions > 0 ? (
              <div>
                <div className="text-muted-foreground mb-1">Concessions</div>
                <div className="font-semibold text-lg text-emerald-600">-{formatCurrency(total_concessions)}</div>
              </div>
            ) : (
                <div>
                  <div className="text-muted-foreground mb-1">Concessions</div>
                  <div className="font-semibold text-lg text-muted-foreground">{formatCurrency(0)}</div>
                </div>
            )}
            <div>
              <div className="text-muted-foreground mb-1">Total Paid</div>
              <div className="font-semibold text-lg">{formatCurrency(total_paid)}</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground font-medium">
            <span>Payment Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className={`h-2 ${isFullyPaid ? '[&>div]:bg-green-600' : '[&>div]:bg-primary'}`} />
        </div>
      </CardContent>
    </Card>
  )
}
