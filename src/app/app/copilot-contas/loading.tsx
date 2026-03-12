import { Card, CardContent } from '@/components/ui/card';

export default function CopilotContasLoading() {
  return (
    <div className="space-y-8">
      <div className="h-8 w-72 animate-pulse rounded bg-slate-200" />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
          <div className="flex gap-4">
            <div className="h-10 flex-1 animate-pulse rounded bg-slate-100" />
            <div className="h-10 w-40 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-9 w-44 animate-pulse rounded bg-slate-100" />
        </CardContent>
      </Card>
    </div>
  );
}
