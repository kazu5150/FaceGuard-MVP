'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User } from '@/types';

interface UserListProps {
  users: User[];
  onDeleteUser: (userId: string) => Promise<void>;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

export default function UserList({ 
  users, 
  onDeleteUser, 
  onRefresh, 
  isLoading = false, 
  className = '' 
}: UserListProps) {
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 検索フィルター
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ユーザー削除処理
  const handleDeleteUser = async (user: User) => {
    const confirmMessage = `「${user.name}」を削除してもよろしいですか？\n\nこの操作は取り消せません。`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingUserId(user.id);
      await onDeleteUser(user.id);
    } catch (error) {
      console.error('User deletion failed:', error);
      alert('ユーザーの削除に失敗しました');
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* ヘッダー */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            ユーザー一覧 ({filteredUsers.length}人)
          </h2>
          <div className="flex space-x-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                title="更新"
              >
                <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            <Link
              href="/users/register"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
            >
              新規登録
            </Link>
          </div>
        </div>

        {/* 検索バー */}
        <div className="relative">
          <input
            type="text"
            placeholder="名前またはメールアドレスで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* ユーザーリスト */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            {searchTerm ? (
              <div>
                <p>「{searchTerm}」に一致するユーザーが見つかりません</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm underline"
                >
                  検索をクリア
                </button>
              </div>
            ) : (
              <div>
                <p>登録されたユーザーがありません</p>
                <Link
                  href="/users/register"
                  className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  最初のユーザーを登録
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      {/* ユーザーアバター */}
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-600">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {user.name}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">{user.email}</p>
                      </div>

                      {/* ステータスバッジ */}
                      <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.hasFaceData 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.hasFaceData ? '顔登録済み' : '顔未登録'}
                      </div>
                    </div>
                    
                    <div className="mt-1 text-xs text-gray-500">
                      登録日: {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                  
                  {/* アクションボタン */}
                  <div className="flex items-center space-x-2 ml-4">
                    {!user.hasFaceData && (
                      <Link
                        href={`/users/register?userId=${user.id}`}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1 px-3 rounded transition-colors"
                        title="顔データを登録"
                      >
                        顔登録
                      </Link>
                    )}
                    
                    <button
                      onClick={() => handleDeleteUser(user)}
                      disabled={deletingUserId === user.id}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-1 px-3 rounded transition-colors disabled:opacity-50"
                      title="ユーザーを削除"
                    >
                      {deletingUserId === user.id ? (
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>削除中</span>
                        </div>
                      ) : (
                        '削除'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* フッター統計 */}
      {!isLoading && users.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              総ユーザー数: {users.length}人
            </span>
            <span>
              顔登録済み: {users.filter(u => u.hasFaceData).length}人
            </span>
          </div>
        </div>
      )}
    </div>
  );
}