import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);

        // Auto-reload on deployment version mismatch (chunk load failure)
        if (error.message.includes("Failed to fetch dynamically imported module") ||
            error.message.includes("Importing a module script failed")) {
            console.log("Chunk load error detected. Reloading page...");
            window.location.reload();
        }
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6 border border-gray-100">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-black text-gray-900">
                                {this.state.error?.message.includes("Failed to fetch") ? "업데이트가 완료되었습니다" : "앗! 문제가 발생했어요"}
                            </h1>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                {this.state.error?.message.includes("Failed to fetch")
                                    ? "새로운 버전의 앱이 배포되었습니다. 최신 버전을 적용하기 위해 새로고침합니다."
                                    : "앱을 실행하는 도중 예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."}
                            </p>
                        </div>

                        {/* Dev only: Show error message */}
                        {import.meta.env.DEV && this.state.error && (
                            <div className="bg-gray-100 p-4 rounded-xl text-left overflow-auto max-h-40">
                                <p className="text-xs font-mono text-red-600 break-all">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <Button
                            onClick={this.handleReload}
                            className="w-full h-12 rounded-xl bg-gray-900 text-white hover:bg-gray-800 font-bold text-base transition-all active:scale-95"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            앱 다시 시작하기
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
