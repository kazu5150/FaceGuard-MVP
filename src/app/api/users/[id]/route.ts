import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createResponse, createErrorResponse, isValidName, isValidEmail, sanitizeInput } from '@/lib/utils';

// GET /api/users/[id] - 特定ユーザーの詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {

    if (!id) {
      return NextResponse.json(
        createErrorResponse('ユーザーIDが必要です'),
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        faceData: {
          select: {
            id: true,
            quality: true,
            createdAt: true,
          }
        },
        authLogs: {
          select: {
            id: true,
            success: true,
            similarity: true,
            timestamp: true,
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 10, // 最新10件のログのみ
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        createErrorResponse('ユーザーが見つかりません'),
        { status: 404 }
      );
    }

    // レスポンスデータを整形
    const responseData = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      hasFaceData: user.faceData.length > 0,
      faceData: user.faceData.map(face => ({
        id: face.id,
        quality: face.quality,
        createdAt: face.createdAt,
      })),
      recentAuthLogs: user.authLogs,
      stats: {
        totalAuthAttempts: user.authLogs.length,
        successfulAuths: user.authLogs.filter(log => log.success).length,
        lastAuthAt: user.authLogs.length > 0 ? user.authLogs[0].timestamp : null,
      }
    };

    return NextResponse.json(createResponse(responseData));

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      createErrorResponse('ユーザー情報の取得に失敗しました'),
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - ユーザー情報更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, email } = body;

    if (!id) {
      return NextResponse.json(
        createErrorResponse('ユーザーIDが必要です'),
        { status: 400 }
      );
    }

    // ユーザーの存在確認
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json(
        createErrorResponse('ユーザーが見つかりません'),
        { status: 404 }
      );
    }

    // 更新データを準備
    const updateData: { name?: string; email?: string } = {};

    // 名前の更新
    if (name !== undefined) {
      const sanitizedName = sanitizeInput(name);
      if (!isValidName(sanitizedName)) {
        return NextResponse.json(
          createErrorResponse('有効な名前を入力してください（1-50文字）'),
          { status: 400 }
        );
      }
      updateData.name = sanitizedName;
    }

    // メールアドレスの更新
    if (email !== undefined) {
      const sanitizedEmail = sanitizeInput(email);
      if (!isValidEmail(sanitizedEmail)) {
        return NextResponse.json(
          createErrorResponse('有効なメールアドレスを入力してください'),
          { status: 400 }
        );
      }

      // 他のユーザーが同じメールアドレスを使用していないかチェック
      if (sanitizedEmail !== existingUser.email) {
        const duplicateUser = await prisma.user.findUnique({
          where: { email: sanitizedEmail }
        });

        if (duplicateUser && duplicateUser.id !== id) {
          return NextResponse.json(
            createErrorResponse('このメールアドレスは既に他のユーザーが使用しています'),
            { status: 409 }
          );
        }
      }

      updateData.email = sanitizedEmail;
    }

    // 更新するデータがない場合
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        createErrorResponse('更新するデータが指定されていません'),
        { status: 400 }
      );
    }

    // ユーザー情報を更新
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        faceData: {
          select: {
            id: true,
          }
        }
      }
    });

    return NextResponse.json(
      createResponse({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        hasFaceData: updatedUser.faceData.length > 0,
      })
    );

  } catch (error) {
    console.error('Update user error:', error);

    // Prismaエラーハンドリング
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; message: string };
      
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          createErrorResponse('このメールアドレスは既に使用されています'),
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      createErrorResponse('ユーザー情報の更新に失敗しました'),
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - ユーザー削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {

    if (!id) {
      return NextResponse.json(
        createErrorResponse('ユーザーIDが必要です'),
        { status: 400 }
      );
    }

    // ユーザーの存在確認
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        faceData: true,
        authLogs: true,
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        createErrorResponse('ユーザーが見つかりません'),
        { status: 404 }
      );
    }

    // ユーザーとすべての関連データを削除（Cascadeにより自動削除される）
    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json(
      createResponse({
        message: `ユーザー「${existingUser.name}」が削除されました`,
        deletedUser: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
        },
        deletedData: {
          faceDataCount: existingUser.faceData.length,
          authLogCount: existingUser.authLogs.length,
        }
      })
    );

  } catch (error) {
    console.error('Delete user error:', error);

    // Prismaエラーハンドリング
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; message: string };
      
      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          createErrorResponse('ユーザーが見つかりません'),
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      createErrorResponse('ユーザーの削除に失敗しました'),
      { status: 500 }
    );
  }
}

// POST method is not allowed for individual users
export async function POST() {
  return NextResponse.json(
    createErrorResponse('個別ユーザーへのPOSTリクエストはサポートされていません'),
    { status: 405 }
  );
}