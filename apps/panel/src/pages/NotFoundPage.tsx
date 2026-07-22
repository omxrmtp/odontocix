import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="max-w-sm w-full text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-bold text-muted-foreground">404</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Página no encontrada</p>
          <Button onClick={() => navigate('/')}>Volver al dashboard</Button>
        </CardContent>
      </Card>
    </div>
  )
}
