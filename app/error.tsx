'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-bg p-6 text-center">
            <div className="bg-surface border border-border rounded-2xl p-8 max-w-md w-full shadow-lg">
                <h2 className="text-xl font-bold text-text mb-3">Something went wrong!</h2>
                <p className="text-muted text-sm mb-6">
                    An unexpected error has occurred in the application. You can try recovering by clicking the button below, or refreshing the page.
                </p>
                <button
                    onClick={() => reset()}
                    className="bg-primary text-white font-medium rounded-lg px-6 py-2.5 transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full sm:w-auto"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
