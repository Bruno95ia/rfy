import { Card, CardContent } from '@/components/ui/card';

export default function MaturidadeLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="flex h-[320px] items-center justify-center">
            <div className="h-48 w-48 animate-pulse rounded-full bg-slate-100" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
