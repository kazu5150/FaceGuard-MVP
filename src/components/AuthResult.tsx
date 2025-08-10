'use client';

interface AuthResultProps {
  result: {
    success: boolean;
    user?: {
      id: string;
      name: string;
      email: string;
    };
    similarity: number;
    threshold: number;
  };
  onRetry?: () => void;
  className?: string;
}

export default function AuthResult({ result, onRetry, className = '' }: AuthResultProps) {
  const { success, user, similarity, threshold } = result;

  return (
    <div className={`p-6 rounded-lg ${className}`}>
      {/* 結果アイコンとメッセージ */}
      <div className="text-center mb-6">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
          success 
            ? 'bg-green-100 text-green-600' 
            : 'bg-red-100 text-red-600'
        }`}>
          {success ? (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        
        <h3 className={`text-2xl font-bold mb-2 ${
          success ? 'text-green-800' : 'text-red-800'
        }`}>
          {success ? '認証成功' : '認証失敗'}
        </h3>
        
        <p className={`text-lg ${
          success ? 'text-green-700' : 'text-red-700'
        }`}>
          {success 
            ? 'ユーザーが正常に認証されました' 
            : '一致するユーザーが見つかりませんでした'
          }
        </p>
      </div>

      {/* ユーザー情報 */}
      {success && user && (
        <div className="bg-white border border-green-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">認証されたユーザー</h4>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-sm text-gray-600 w-16">名前:</span>
              <span className="text-sm font-medium">{user.name}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 w-16">メール:</span>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
          </div>
        </div>
      )}

      {/* 類似度情報 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">認証詳細</h4>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600">類似度スコア</span>
              <span className={`text-sm font-semibold ${
                similarity >= threshold ? 'text-green-600' : 'text-red-600'
              }`}>
                {(similarity * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  similarity >= threshold ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ width: `${similarity * 100}%` }}
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">認証閾値</span>
            <span className="font-medium">{(threshold * 100).toFixed(1)}%</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">判定</span>
            <span className={`font-semibold ${
              similarity >= threshold ? 'text-green-600' : 'text-red-600'
            }`}>
              {similarity >= threshold ? '認証成功' : '認証失敗'}
            </span>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="space-y-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            再認証
          </button>
        )}
        
        {/* アドバイス */}
        {!success && (
          <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="font-medium text-yellow-800 mb-1">認証のコツ:</div>
            <ul className="space-y-1 text-yellow-700">
              <li>• 正面を向いてカメラを見る</li>
              <li>• 十分な明度を確保する</li>
              <li>• カメラから適度な距離を保つ</li>
              <li>• 登録時と同じような角度で撮影する</li>
            </ul>
          </div>
        )}
      </div>

      {/* タイムスタンプ */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          認証時刻: {new Date().toLocaleString('ja-JP')}
        </p>
      </div>
    </div>
  );
}