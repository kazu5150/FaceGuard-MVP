import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createResponse, createErrorResponse, isValidEmail, isValidName, sanitizeInput } from '@/lib/utils';

// GET /api/users - ユーザー一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 検索条件を構築
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ]
    } : {};

    // ユーザー一覧を取得
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          faceData: {
            select: {
              id: true,
            }
          },
          _count: {
            select: {
              authLogs: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where })
    ]);

    // レスポンスデータを整形
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      hasFaceData: user.faceData.length > 0,
      authLogCount: user._count.authLogs,
    }));

    return NextResponse.json(
      createResponse({
        users: formattedUsers,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        }
      })
    );

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      createErrorResponse('ユーザー一覧の取得に失敗しました'),
      { status: 500 }
    );
  }
}

// POST /api/users - 新規ユーザー作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = body;

    // 入力値のサニタイズ
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = sanitizeInput(email);

    // バリデーション
    if (!isValidName(sanitizedName)) {
      return NextResponse.json(
        createErrorResponse('有効な名前を入力してください（1-50文字）'),
        { status: 400 }
      );
    }

    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        createErrorResponse('有効なメールアドレスを入力してください'),
        { status: 400 }
      );
    }

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail }
    });

    if (existingUser) {
      return NextResponse.json(
        createErrorResponse('このメールアドレスは既に登録されています'),
        { status: 409 }
      );
    }

    // ユーザー作成
    const newUser = await prisma.user.create({
      data: {
        name: sanitizedName,
        email: sanitizedEmail,
      },
    });

    return NextResponse.json(
      createResponse({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
        hasFaceData: false,
      }),
      { status: 201 }
    );

  } catch (error) {
    console.error('Create user error:', error);
    
    // Prismaエラーハンドリング
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; message: string };
      
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          createErrorResponse('このメールアドレスは既に登録されています'),
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      createErrorResponse('ユーザーの作成に失敗しました'),
      { status: 500 }
    );
  }
}

// Other methods are not allowed
export async function PUT() {
  return NextResponse.json(
    createErrorResponse('このエンドポイントはGETまたはPOSTメソッドのみサポートしています'),
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    createErrorResponse('このエンドポイントはGETまたはPOSTメソッドのみサポートしています'),
    { status: 405 }
  );
}