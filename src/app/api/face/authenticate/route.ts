import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createResponse, createErrorResponse, isValidFaceEmbedding } from '@/lib/utils';
import { FaceDetector } from '@/lib/face-detection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { faceEmbedding } = body;

    // バリデーション
    if (!isValidFaceEmbedding(faceEmbedding)) {
      return NextResponse.json(
        createErrorResponse('有効な顔特徴量データが必要です'),
        { status: 400 }
      );
    }

    // 登録済みの全ユーザーの顔データを取得
    const allFaceData = await prisma.faceData.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (allFaceData.length === 0) {
      // 認証失敗ログを記録
      await prisma.authLog.create({
        data: {
          userId: null,
          success: false,
          similarity: 0,
        }
      });

      return NextResponse.json(
        createResponse({
          success: false,
          user: null,
          similarity: 0,
          threshold: FaceDetector.AUTHENTICATION_THRESHOLD,
          message: '登録されたユーザーがいません'
        })
      );
    }

    // 最も類似度の高いユーザーを見つける
    let bestMatch: {
      user: { id: string; name: string; email: string } | null;
      similarity: number;
      faceDataId: string;
    } = {
      user: null,
      similarity: 0,
      faceDataId: ''
    };

    for (const faceData of allFaceData) {
      try {
        const storedEmbedding = JSON.parse(faceData.embedding) as number[];
        const similarity = FaceDetector.calculateSimilarity(faceEmbedding, storedEmbedding);
        
        console.log(`Face comparison for ${faceData.user.name}:`);
        console.log(`- Stored embedding length: ${storedEmbedding.length}`);
        console.log(`- Input embedding length: ${faceEmbedding.length}`);
        console.log(`- Similarity score: ${similarity}`);
        console.log(`- Current best match: ${bestMatch.user?.name || 'none'} (${bestMatch.similarity})`);
        
        if (similarity > bestMatch.similarity) {
          console.log(`- New best match: ${faceData.user.name} with similarity ${similarity}`);
          bestMatch = {
            user: faceData.user,
            similarity: similarity,
            faceDataId: faceData.id
          };
        }
      } catch (error) {
        console.error(`Failed to parse embedding for face data ${faceData.id}:`, error);
        continue;
      }
    }

    // 認証判定
    const isAuthenticated = bestMatch.similarity >= FaceDetector.AUTHENTICATION_THRESHOLD;
    
    // 認証ログを記録
    await prisma.authLog.create({
      data: {
        userId: isAuthenticated ? bestMatch.user?.id : null,
        success: isAuthenticated,
        similarity: bestMatch.similarity,
      }
    });

    // レスポンス作成
    const response = {
      success: isAuthenticated,
      user: isAuthenticated && bestMatch.user ? {
        id: bestMatch.user.id,
        name: bestMatch.user.name,
        email: bestMatch.user.email,
      } : null,
      similarity: bestMatch.similarity,
      threshold: FaceDetector.AUTHENTICATION_THRESHOLD,
      message: isAuthenticated && bestMatch.user
        ? `${bestMatch.user.name}さんとして認証されました` 
        : `類似度が閾値 ${(FaceDetector.AUTHENTICATION_THRESHOLD * 100).toFixed(1)}% を下回りました`
    };

    return NextResponse.json(createResponse(response));

  } catch (error) {
    console.error('Face authentication error:', error);

    // エラーログを記録
    await prisma.authLog.create({
      data: {
        userId: null,
        success: false,
        similarity: null,
      }
    }).catch(logError => {
      console.error('Failed to create error log:', logError);
    });

    return NextResponse.json(
      createErrorResponse('顔認証中にエラーが発生しました'),
      { status: 500 }
    );
  }
}

// GET method to retrieve authentication statistics (optional)
export async function GET() {
  try {
    // 認証統計を取得
    const stats = await prisma.authLog.aggregate({
      _count: {
        id: true,
      },
      _avg: {
        similarity: true,
      },
      where: {
        success: true,
      }
    });

    const recentLogs = await prisma.authLog.findMany({
      take: 10,
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json(
      createResponse({
        stats: {
          totalSuccessfulAuthentications: stats._count.id,
          averageSimilarity: stats._avg.similarity || 0,
        },
        recentLogs: recentLogs.map(log => ({
          id: log.id,
          success: log.success,
          similarity: log.similarity,
          timestamp: log.timestamp,
          user: log.user ? {
            name: log.user.name,
            email: log.user.email,
          } : null,
        }))
      })
    );
  } catch (error) {
    console.error('Failed to retrieve authentication stats:', error);
    return NextResponse.json(
      createErrorResponse('統計情報の取得に失敗しました'),
      { status: 500 }
    );
  }
}

// Other methods are not allowed
export async function PUT() {
  return NextResponse.json(
    createErrorResponse('このエンドポイントはPOSTまたはGETメソッドのみサポートしています'),
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    createErrorResponse('このエンドポイントはPOSTまたはGETメソッドのみサポートしています'),
    { status: 405 }
  );
}