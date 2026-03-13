import React from 'react';

export default class ErrorBoundary extends React.Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-1 flex items-center justify-center px-6 py-20">
                    <div className="text-center p-8 rounded-2xl bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 max-w-sm w-full">
                        <span className="material-symbols-outlined text-5xl text-red-400 mb-4 block">error</span>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            문제가 발생했습니다
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">
                            일시적인 오류가 발생했어요. 다시 시도해 주세요.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2.5 rounded-xl bg-[#057a1b] hover:bg-[#046616] text-white text-sm font-bold transition-colors"
                        >
                            <span className="material-symbols-outlined text-base align-middle mr-1">refresh</span>
                            다시 시도
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
