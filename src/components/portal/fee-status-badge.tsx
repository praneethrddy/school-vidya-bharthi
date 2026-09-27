import { Badge } from '@/components/ui/badge'

type FeeStatus = 'PAID' | 'OUTSTANDING' | 'PARTIAL' | 'OVERPAID'

export function FeeStatusBadge({ status }: { status: FeeStatus }) {
  switch (status) {
    case 'PAID':
      return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100/80 cursor-default">Paid</Badge>
    case 'OUTSTANDING':
      return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100/80 cursor-default">Outstanding</Badge>
    case 'PARTIAL':
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100/80 cursor-default">Partial</Badge>
    case 'OVERPAID':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100/80 cursor-default">Overpaid</Badge>
    default:
      return null
  }
}
