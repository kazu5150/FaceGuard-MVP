import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            FaceGuard MVP
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            MediaPipeベース顔認証システム - 最小実行可能製品
          </p>
          
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              システム概要
            </h2>
            <ul className="text-left text-gray-600 space-y-2 mb-6">
              <li>• Webカメラによるリアルタイム顔検出</li>
              <li>• MediaPipeを使用した高精度認証</li>
              <li>• シンプルなユーザー管理</li>
              <li>• 最低限のセキュリティ対策</li>
            </ul>
          </div>

          <div className="space-y-4 max-w-sm mx-auto">
            <Link
              href="/authenticate"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              顔認証を開始
            </Link>
            
            <Link
              href="/users"
              className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              ユーザー管理
            </Link>
          </div>
        </div>

        <div className="mt-16 text-center text-sm text-gray-500">
          <p>MVP版 - デモ・検証目的</p>
        </div>
      </div>
    </div>
  );
}
