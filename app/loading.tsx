import Shell from '@/components/layout/Shell';
import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <Shell>
            <div className="flex flex-1 flex-col items-center justify-center p-8 h-full min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                <p className="mt-4 text-sm font-medium text-muted">Loading...</p>
            </div>
        </Shell>
    );
}
