'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import FaceDetector, { FaceDetectorRef } from '@/components/FaceDetector';
import AuthResult from '@/components/AuthResult';
import { FaceDetectionResult } from '@/lib/face-detection';
import { ApiResponse } from '@/types';

interface AuthenticationResult {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  similarity: number;
  threshold: number;
  message?: string;
}

export default function AuthenticatePage() {
  const faceDetectorRef = useRef<FaceDetectorRef>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [currentFaceResult, setCurrentFaceResult] = useState<FaceDetectionResult | null>(null);
  const [authResult, setAuthResult] = useState<AuthenticationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 顔検出結果処理
  const handleFaceDetected = (result: FaceDetectionResult) => {
    setCurrentFaceResult(result);
    setError(null);
  };

  // 認証処理
  const handleAuthenticate = async () => {
    if (!currentFaceResult) {
      setError('顔が検出されていません');
      return;
    }

    try {
      // 高品質の顔写真をキャプチャ
      const captureResult = await faceDetectorRef.current?.capturePhoto();
      
      if (!captureResult) {
        setError('顔写真のキャプチャに失敗しました');
        return;
      }

      setIsAuthenticating(true);
      setError(null);
      setAuthResult(null);

      // 顔認証API呼び出し
      const response = await fetch('/api/face/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          faceEmbedding: captureResult.features,
        }),
      });

      const result: ApiResponse<AuthenticationResult> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || '認証処理に失敗しました');
      }

      setAuthResult(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '認証処理中にエラーが発生しました');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 認証リセット
  const resetAuthentication = () => {
    setAuthResult(null);
    setCurrentFaceResult(null);
    setError(null);
    setIsAuthenticating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            顔認証
          </h1>

          {/* 認証結果が表示されていない場合はFaceDetectorを表示 */}
          {!authResult && (
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto mb-8">
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* FaceDetector コンポーネント */}
              <FaceDetector
                ref={faceDetectorRef}
                mode="authenticate"
                onFaceDetected={handleFaceDetected}
                onError={(error) => setError(error)}
                className="mb-6"
              />

              {/* 認証ボタン */}
              {currentFaceResult && !isAuthenticating && (
                <button
                  onClick={handleAuthenticate}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-4"
                >
                  認証実行
                </button>
              )}

              {/* 認証中表示 */}
              {isAuthenticating && (
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <span className="ml-3 text-gray-600">認証中...</span>
                </div>
              )}
            </div>
          )}

          {/* 認証結果表示 */}
          {authResult && (
            <div className="bg-white rounded-lg shadow-lg max-w-lg mx-auto mb-8">
              <AuthResult 
                result={{
                  success: authResult.success,
                  user: authResult.user,
                  similarity: authResult.similarity,
                  threshold: authResult.threshold
                }}
                onRetry={resetAuthentication}
              />
            </div>
          )}

          {/* ナビゲーション */}
          <div className="mt-8 space-x-4">
            <Link
              href="/"
              className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              ホームに戻る
            </Link>
            <Link
              href="/users"
              className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              ユーザー管理
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}