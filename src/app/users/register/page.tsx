'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FaceDetector, { FaceDetectorRef } from '@/components/FaceDetector';
import { FaceDetectionResult } from '@/lib/face-detection';
import { ApiResponse } from '@/types';

function UserRegisterContent() {
  const router = useRouter();
  const [existingUserId, setExistingUserId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const faceDetectorRef = useRef<FaceDetectorRef>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  
  const [step, setStep] = useState<'form' | 'face' | 'complete'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentFaceResult, setCurrentFaceResult] = useState<FaceDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // クライアント側でのみURLパラメータを読み取る
  useEffect(() => {
    setIsClient(true);
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    setExistingUserId(userId);
    setCurrentUserId(userId);
    // ユーザーIDがある場合は顔登録ステップに直接進む
    if (userId) {
      setStep('face');
    }
  }, []);

  // フォーム入力処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ユーザー基本情報登録
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('名前とメールアドレスは必須です');
      return;
    }

    // 既存ユーザーの場合は顔登録ステップに直接移動
    if (existingUserId) {
      setStep('face');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 新規ユーザー作成API呼び出し
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
        }),
      });

      const result: ApiResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'ユーザーの作成に失敗しました');
      }

      setCurrentUserId(result.data.id);
      setStep('face');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザー登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 顔検出結果処理
  const handleFaceDetected = (result: FaceDetectionResult) => {
    setCurrentFaceResult(result);
  };

  // 顔登録処理
  const handleFaceRegistration = async () => {
    if (!currentUserId || !currentFaceResult) {
      setError('ユーザーIDまたは顔データが不足しています');
      return;
    }

    try {
      // 高品質の顔写真をキャプチャ
      const captureResult = await faceDetectorRef.current?.capturePhoto();
      
      if (!captureResult) {
        setError('顔写真のキャプチャに失敗しました');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      // 顔登録API呼び出し
      const response = await fetch('/api/face/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId,
          faceEmbedding: captureResult.features,
          quality: captureResult.quality,
        }),
      });

      // レスポンスの状態確認
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Response Error:', response.status, errorText);
        throw new Error(`サーバーエラー (${response.status}): ${errorText || '顔データの登録に失敗しました'}`);
      }

      // JSONパースのエラーハンドリング
      let result: ApiResponse;
      try {
        const responseText = await response.text();
        if (!responseText) {
          throw new Error('サーバーからの応答が空です');
        }
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        throw new Error('サーバーからの応答の解析に失敗しました');
      }

      if (!result.success) {
        throw new Error(result.error || '顔データの登録に失敗しました');
      }

      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : '顔データの登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 完了処理
  const handleComplete = () => {
    router.push('/users');
  };

  // クライアント側の初期化が完了していない場合のローディング表示
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {existingUserId ? '顔データ登録' : '新規ユーザー登録'}
          </h1>
          
          {/* 進捗インジケーター */}
          <div className="flex justify-center items-center space-x-4 mb-8">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step === 'form' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <div className="w-8 h-1 bg-gray-300"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step === 'face' 
                ? 'bg-blue-600 text-white' 
                : step === 'complete'
                ? 'bg-green-600 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <div className="w-8 h-1 bg-gray-300"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step === 'complete' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-300 text-gray-600'
            }`}>
              ✓
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
          {step === 'form' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                基本情報入力
              </h2>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    名前
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="田中太郎"
                    disabled={isSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="example@email.com"
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? '登録中...' : '次へ'}
                </button>
              </form>
            </div>
          )}

          {step === 'face' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                顔データ登録
              </h2>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* FaceDetector コンポーネント */}
              <FaceDetector
                ref={faceDetectorRef}
                mode="register"
                onFaceDetected={handleFaceDetected}
                onError={(error) => setError(error)}
                className="mb-6"
              />


              {/* 顔登録ボタン */}
              {currentFaceResult && currentFaceResult.quality >= 0.6 && (
                <button
                  onClick={handleFaceRegistration}
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 mb-4"
                >
                  {isSubmitting ? '登録中...' : '顔データを登録'}
                </button>
              )}

              {/* 品質が不十分な場合の警告 */}
              {currentFaceResult && currentFaceResult.quality < 0.6 && (
                <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-lg text-sm">
                  顔の品質スコア: {(currentFaceResult.quality * 100).toFixed(1)}%
                  <br />
                  品質スコアが60%以上になったら登録ボタンが表示されます。
                </div>
              )}
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                登録完了！
              </h2>
              
              <p className="text-gray-600 mb-6">
                {existingUserId ? '顔データの登録が完了しました。' : 'ユーザー登録と顔データの登録が完了しました。'}
                <br />
                顔認証をご利用いただけます。
              </p>

              <button
                onClick={handleComplete}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                ユーザー一覧に戻る
              </button>
            </div>
          )}
        </div>

        {/* ナビゲーション */}
        <div className="mt-8 text-center space-x-4">
          <Link
            href="/users"
            className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            ユーザー一覧に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UserRegisterPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return <UserRegisterContent />;
}