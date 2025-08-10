import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createResponse, createErrorResponse } from '@/lib/utils';
import { FaceDetector } from '@/lib/face-detection';
import { 
  checkRateLimit, 
  getClientIP, 
  validateFaceEmbedding, 
  validateQuality,
  getSecurityHeaders,
  detectSuspiciousActivity,
  logSecurityEvent
} from '@/lib/security';
import { 
  AppError, 
  withErrorHandler, 
  createValidationError, 
  createNotFoundError,
  createRateLimitError,
  log,
  LogLevel,
  PerformanceTimer
} from '@/lib/error-handler';

export async function POST(request: NextRequest) {
  const timer = new PerformanceTimer('face_register');
  const ip = getClientIP(request.headers);
  const userAgent = request.headers.get('user-agent') || '';
  
  try {
    // セキュリティチェック
    if (detectSuspiciousActivity(ip, userAgent, '/api/face/register')) {
      throw new AppError('Suspicious activity detected', 'SECURITY_VIOLATION' as any, 403);
    }

    // レート制限チェック
    const rateLimitResult = checkRateLimit(ip, { maxRequests: 5, windowMs: 60000 }); // 1分間に5回まで
    if (!rateLimitResult.allowed) {
      logSecurityEvent({
        type: 'rate_limit',
        ip,
        userAgent,
        timestamp: new Date(),
        details: { endpoint: '/api/face/register' }
      });
      throw createRateLimitError(rateLimitResult.resetTime);
    }

    const body = await request.json();
    const { userId, faceEmbedding, quality } = body;

    // バリデーション
    if (!userId || typeof userId !== 'string') {
      throw createValidationError('有効なユーザーIDが必要です', 'userId');
    }

    const faceValidation = validateFaceEmbedding(faceEmbedding);
    if (!faceValidation.valid) {
      throw createValidationError(faceValidation.error!, 'faceEmbedding');
    }

    const qualityValidation = validateQuality(quality);
    if (!qualityValidation.valid) {
      throw createValidationError(qualityValidation.error!, 'quality');
    }

    // 品質スコアの最小値チェック
    if (quality < FaceDetector.MIN_QUALITY_SCORE) {
      throw createValidationError(
        `品質スコアが最小値 ${FaceDetector.MIN_QUALITY_SCORE * 100}% を下回っています (現在: ${(quality * 100).toFixed(1)}%)`,
        'quality'
      );
    }

    // ユーザーの存在確認
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { faceData: true }
    });

    if (!existingUser) {
      throw createNotFoundError('ユーザー', userId);
    }

    // 既に顔データが登録されているかチェック
    if (existingUser.faceData.length > 0) {
      throw new AppError('このユーザーには既に顔データが登録されています', 'RESOURCE_ALREADY_EXISTS' as any, 409);
    }

    // 顔データを保存
    const faceData = await prisma.faceData.create({
      data: {
        userId: userId,
        embedding: JSON.stringify(faceEmbedding),
        quality: quality,
      }
    });

    // 成功ログを記録
    await prisma.authLog.create({
      data: {
        userId: userId,
        success: true,
        similarity: null, // 登録時なので類似度は記録しない
      }
    });

    // パフォーマンス計測終了
    timer.end();

    // 成功ログ
    log({
      level: LogLevel.INFO,
      message: 'Face data registered successfully',
      timestamp: new Date(),
      context: {
        userId,
        faceId: faceData.id,
        quality: quality.toFixed(3),
      },
      ip,
      userAgent,
    });

    const response = NextResponse.json(
      createResponse({
        faceId: faceData.id,
        message: '顔データが正常に登録されました'
      })
    );

    // セキュリティヘッダーを追加
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    timer.end();

    // AppErrorの場合
    if (error instanceof AppError) {
      log({
        level: LogLevel.WARN,
        message: 'Face registration validation error',
        timestamp: new Date(),
        error,
        context: { endpoint: '/api/face/register' },
        ip,
        userAgent,
      });

      const response = NextResponse.json(
        createErrorResponse(error.message),
        { status: error.statusCode }
      );
      
      const securityHeaders = getSecurityHeaders();
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    }

    // 予期しないエラー
    log({
      level: LogLevel.ERROR,
      message: 'Unexpected error in face registration',
      timestamp: new Date(),
      error: error as Error,
      context: { endpoint: '/api/face/register' },
      ip,
      userAgent,
    });

    const response = NextResponse.json(
      createErrorResponse('顔データの登録中にエラーが発生しました'),
      { status: 500 }
    );

    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
}

// GET method is not allowed
export async function GET() {
  return NextResponse.json(
    createErrorResponse('このエンドポイントはPOSTメソッドのみサポートしています'),
    { status: 405 }
  );
}

// Other methods are not allowed
export async function PUT() {
  return NextResponse.json(
    createErrorResponse('このエンドポイントはPOSTメソッドのみサポートしています'),
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    createErrorResponse('このエンドポイントはPOSTメソッドのみサポートしています'),
    { status: 405 }
  );
}