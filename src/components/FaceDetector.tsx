'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { FaceDetector as FaceDetectorClass, FaceDetectionResult } from '@/lib/face-detection';

export interface FaceDetectorProps {
  mode: 'register' | 'authenticate';
  onFaceDetected?: (result: FaceDetectionResult) => void;
  onError?: (error: string) => void;
  onQualityChange?: (quality: number) => void;
  className?: string;
}

export interface FaceDetectorRef {
  capturePhoto: () => Promise<FaceDetectionResult | null>;
  startDetection: () => void;
  stopDetection: () => void;
}

const FaceDetectorComponent = forwardRef<FaceDetectorRef, FaceDetectorProps>(({
  mode,
  onFaceDetected,
  onError,
  onQualityChange,
  className = ''
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceDetectorRef = useRef<FaceDetectorClass | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentResult, setCurrentResult] = useState<FaceDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // FaceDetectorの初期化
  useEffect(() => {
    const initializeDetector = async () => {
      try {
        faceDetectorRef.current = new FaceDetectorClass({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7
        });

        await faceDetectorRef.current.initialize();
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '顔検出システムの初期化に失敗しました';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    initializeDetector();

    // クリーンアップ
    return () => {
      if (faceDetectorRef.current) {
        faceDetectorRef.current.dispose();
      }
    };
  }, [onError]);

  // 顔検出結果の処理
  const handleFaceDetection = (result: FaceDetectionResult | null) => {
    setCurrentResult(result);
    
    if (result) {
      onFaceDetected?.(result);
      onQualityChange?.(result.quality);
    } else {
      onQualityChange?.(0);
    }
  };

  // カメラ開始
  const startDetection = async () => {
    if (!isInitialized || !faceDetectorRef.current || !videoRef.current) {
      setError('システムが初期化されていません');
      return;
    }

    try {
      // 結果コールバックを設定
      faceDetectorRef.current.onResults(handleFaceDetection);
      
      // カメラを開始
      await faceDetectorRef.current.startCamera(videoRef.current);
      setIsDetecting(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'カメラの開始に失敗しました';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  // カメラ停止
  const stopDetection = () => {
    if (faceDetectorRef.current) {
      faceDetectorRef.current.stopCamera();
    }
    setIsDetecting(false);
  };

  // 写真キャプチャ（カメラは停止しない）
  const capturePhoto = async (): Promise<FaceDetectionResult | null> => {
    if (!currentResult || !videoRef.current || !canvasRef.current) {
      return null;
    }

    // 品質チェック
    if (currentResult.quality < FaceDetectorClass.MIN_QUALITY_SCORE) {
      setError(`顔の品質スコアが低すぎます (${(currentResult.quality * 100).toFixed(1)}%)`);
      return null;
    }

    // Canvasに現在のフレームを描画
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const video = videoRef.current;

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // カメラは停止せず、継続して検出を行う
    return currentResult;
  };

  // 外部からアクセス可能なメソッドを公開
  useImperativeHandle(ref, () => ({
    capturePhoto,
    startDetection,
    stopDetection,
  }));

  // 品質スコアに基づく表示色
  const getQualityColor = (quality: number) => {
    if (quality >= 0.8) return 'text-green-600';
    if (quality >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 品質スコアに基づくボーダー色
  const getBorderColor = (quality: number) => {
    if (quality >= 0.8) return 'border-green-500';
    if (quality >= 0.6) return 'border-yellow-500';
    return 'border-red-500';
  };

  return (
    <div className={`relative ${className}`}>
      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* ビデオプレビュー */}
      <div className={`relative rounded-lg overflow-hidden bg-gray-200 ${
        currentResult ? getBorderColor(currentResult.quality) : 'border-gray-300'
      } border-4`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-64 object-cover"
          style={{ transform: 'scaleX(-1)' }} // 鏡像効果
        />
        
        {/* オーバーレイ情報 */}
        {isDetecting && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm">検出中</span>
            </div>
            
            {currentResult && (
              <div className="mt-2 space-y-1">
                <div className={`text-xs ${getQualityColor(currentResult.quality)}`}>
                  品質: {(currentResult.quality * 100).toFixed(1)}%
                </div>
                {mode === 'register' && currentResult.quality < FaceDetectorClass.MIN_QUALITY_SCORE && (
                  <div className="text-xs text-yellow-300">
                    品質を向上させてください
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 顔検出フレーム */}
        {currentResult && isDetecting && (
          <div className="absolute inset-0 pointer-events-none">
            {/* 顔の輪郭を表示するための簡単な四角形 */}
            <div className={`absolute border-2 ${getBorderColor(currentResult.quality)} rounded-lg`}
                 style={{
                   left: '20%',
                   top: '15%',
                   width: '60%',
                   height: '70%',
                 }}>
            </div>
          </div>
        )}

        {/* 検出待機状態 */}
        {!isDetecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50">
            <div className="text-white text-center">
              <div className="text-lg font-semibold mb-2">
                {mode === 'register' ? '顔登録' : '顔認証'}
              </div>
              <div className="text-sm opacity-75">
                「検出開始」ボタンを押してください
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 隠しcanvas（写真キャプチャ用） */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />

      {/* コントロールボタン */}
      <div className="mt-4 space-y-2">
        {!isDetecting ? (
          <button
            onClick={startDetection}
            disabled={!isInitialized}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInitialized ? '検出開始' : '初期化中...'}
          </button>
        ) : (
          <button
            onClick={stopDetection}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            検出停止
          </button>
        )}

        {/* 使用方法のヒント */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>• 正面を向いてカメラを見てください</div>
          <div>• 十分な明度を確保してください</div>
          <div>• カメラから適度な距離を保ってください</div>
          {mode === 'register' && (
            <div>• 品質スコアが60%以上になったら撮影できます</div>
          )}
        </div>
      </div>
    </div>
  );
});

FaceDetectorComponent.displayName = 'FaceDetector';

export default FaceDetectorComponent;