'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import UserList from '@/components/UserList';
import { User, ApiResponse } from '@/types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ユーザー一覧取得
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/users');
      const result: ApiResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'ユーザー一覧の取得に失敗しました');
      }

      setUsers(result.data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザー一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ユーザー削除
  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'ユーザーの削除に失敗しました');
      }

      // ユーザー一覧を更新
      setUsers(users.filter(user => user.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザーの削除に失敗しました');
      throw err; // UserListコンポーネントでエラー処理するために再スロー
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ユーザー管理
          </h1>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-8 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg max-w-4xl mx-auto">
            <p>{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-2 bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded transition-colors"
            >
              再読み込み
            </button>
          </div>
        )}

        {/* UserListコンポーネント */}
        <UserList
          users={users}
          onDeleteUser={handleDeleteUser}
          onRefresh={fetchUsers}
          isLoading={isLoading}
          className="max-w-4xl mx-auto"
        />

        {/* ナビゲーション */}
        <div className="mt-8 text-center space-x-4">
          <Link
            href="/"
            className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            ホームに戻る
          </Link>
          <Link
            href="/authenticate"
            className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            顔認証
          </Link>
        </div>
      </div>
    </div>
  );
}