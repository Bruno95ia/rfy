import { Card, CardContent } from '@/components/ui/card';

export default function DiagnosticoLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
      <div className="space-y-4">
        <div className="h-10 w-40 animate-pulse rounded bg-slate-100" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map((key) => (
            <Card key={key}>
              <CardContent className="space-y-3 pt-6">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

