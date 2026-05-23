export default function Loading() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand [animation-delay:200ms]" />
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand [animation-delay:400ms]" />
      </div>
    </div>
  );
}
