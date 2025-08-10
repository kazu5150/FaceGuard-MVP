// MediaPipeの型定義
export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface Results {
  multiFaceLandmarks?: NormalizedLandmark[][];
  image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
}

export interface FaceDetectionResult {
  landmarks: NormalizedLandmark[];
  quality: number;
  features: number[];
}

export interface FaceDetectionOptions {
  maxNumFaces: number;
  refineLandmarks: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
}

// グローバルなMediaPipeインスタンス用の型定義
declare global {
  interface Window {
    FaceMesh: new (options: { locateFile: (file: string) => string }) => {
      setOptions: (options: Record<string, number | boolean>) => void;
      onResults: (callback: (results: unknown) => void) => void;
      send: (data: { image: HTMLVideoElement }) => Promise<void>;
      close: () => void;
    };
  }
}

type FaceMeshInstance = {
  setOptions: (options: Record<string, number | boolean>) => void;
  onResults: (callback: (results: unknown) => void) => void;
  send: (data: { image: HTMLVideoElement }) => Promise<void>;
  close: () => void;
};

export class FaceDetector {
  private faceMesh: FaceMeshInstance | null = null;
  private camera: { isActive: boolean } | null = null;
  private isInitialized = false;
  private onResultsCallback: ((results: FaceDetectionResult | null) => void) | null = null;

  constructor(private options: Partial<FaceDetectionOptions> = {}) {
    this.options = {
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      ...options,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // MediaPipeスクリプトの動的読み込み
      await this.loadMediaPipeScripts();
      
      // FaceMeshの初期化
      this.faceMesh = new window.FaceMesh({
        locateFile: (file: string) => 
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      this.faceMesh.setOptions({
        maxNumFaces: this.options.maxNumFaces!,
        refineLandmarks: this.options.refineLandmarks!,
        minDetectionConfidence: this.options.minDetectionConfidence!,
        minTrackingConfidence: this.options.minTrackingConfidence!,
      });

      this.faceMesh.onResults((results: unknown) => {
        this.handleResults(results as Results);
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('FaceDetector initialization failed:', error);
      throw new Error('顔検出システムの初期化に失敗しました');
    }
  }

  // MediaPipeスクリプトを動的に読み込む
  private async loadMediaPipeScripts(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 既に読み込み済みの場合はスキップ
      if (window.FaceMesh) {
        resolve();
        return;
      }

      const onScriptLoad = () => {
        console.log('MediaPipe FaceMesh script loaded');
        // 少し待ってからresolve（スクリプトが完全に初期化されるまで）
        setTimeout(() => {
          if (window.FaceMesh) {
            console.log('MediaPipe FaceMesh loaded successfully');
            resolve();
          } else {
            reject(new Error('FaceMesh class not available after script loading'));
          }
        }, 200);
      };

      const onScriptError = (error: Event | string) => {
        console.error('MediaPipe script loading error:', error);
        reject(new Error(`MediaPipeスクリプトの読み込みに失敗しました: ${error}`));
      };

      // 既に存在するスクリプトタグを削除（重複読み込み防止）
      const existingScripts = document.querySelectorAll('script[src*="mediapipe"]');
      existingScripts.forEach(script => script.remove());

      // Face Meshスクリプトのみを読み込む
      const faceMeshScript = document.createElement('script');
      faceMeshScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
      faceMeshScript.onload = onScriptLoad;
      faceMeshScript.onerror = onScriptError;
      document.head.appendChild(faceMeshScript);
    });
  }

  async startCamera(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.isInitialized || !this.faceMesh) {
      throw new Error('FaceDetectorが初期化されていません');
    }

    try {
      console.log('Starting camera with getUserMedia...');
      
      // getUserMediaを使用して直接カメラストリームを取得
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      videoElement.srcObject = stream;
      await new Promise((resolve) => {
        videoElement.onloadedmetadata = () => resolve(void 0);
      });

      console.log('Camera stream started successfully');

      // フレーム処理用のループを開始
      this.startFrameLoop(videoElement);

    } catch (error) {
      console.error('Camera start failed:', error);
      throw new Error(`カメラの開始に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private startFrameLoop(videoElement: HTMLVideoElement): void {
    const processFrame = async () => {
      try {
        if (this.faceMesh && videoElement.readyState === 4 && !videoElement.paused) {
          await this.faceMesh.send({ image: videoElement });
        }
      } catch (error) {
        console.error('Frame processing error:', error);
      }
      
      // 次のフレームを処理
      if (this.camera && this.camera.isActive) { // カメラが停止されていなければ続行
        requestAnimationFrame(processFrame);
      }
    };

    // フレーム処理を開始
    this.camera = { isActive: true }; // アクティブ状態を管理
    requestAnimationFrame(processFrame);
  }

  stopCamera(): void {
    console.log('Stopping camera...');
    
    // フレーム処理を停止
    this.camera = null;

    // ビデオ要素のストリームを停止
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      const stream = video.srcObject as MediaStream;
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => {
          console.log('Stopping track:', track.kind);
          track.stop();
        });
        video.srcObject = null;
      }
    });
    
    console.log('Camera stopped successfully');
  }

  onResults(callback: (results: FaceDetectionResult | null) => void): void {
    this.onResultsCallback = callback;
  }

  private handleResults(results: Results): void {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      this.onResultsCallback?.(null);
      return;
    }

    // 最初の顔のみを処理（maxNumFaces: 1のため）
    const landmarks = results.multiFaceLandmarks[0];
    const quality = this.calculateQuality(landmarks);
    const features = this.extractFeatures(landmarks);

    const result: FaceDetectionResult = {
      landmarks,
      quality,
      features,
    };

    this.onResultsCallback?.(result);
  }

  private extractFeatures(landmarks: NormalizedLandmark[]): number[] {
    // 主要な68点の特徴点を抽出
    // MediaPipeのface_meshは468点だが、顔認証に重要な点のみを選択
    const keyPointIndices = [
      // 顔の輪郭
      10, 151, 9, 8, 168, 6, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54,
      103, 67, 109, 10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400,
      377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
      // 左目
      33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
      // 右目  
      362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382,
      // 鼻
      1, 2, 5, 4, 6, 168, 8, 9, 10, 151, 195, 197, 196, 3, 51, 48, 115, 131, 134, 102, 48, 64,
      // 口
      11, 12, 13, 14, 15, 16, 17, 18, 200, 199, 175, 0, 269, 270, 267, 271, 272, 13, 82, 81, 80, 78
    ];

    return keyPointIndices.slice(0, 68).flatMap(index => {
      if (index < landmarks.length) {
        const point = landmarks[index];
        return [point.x, point.y, point.z || 0];
      }
      return [0, 0, 0]; // フォールバック
    });
  }

  private calculateQuality(landmarks: NormalizedLandmark[]): number {
    if (!landmarks || landmarks.length === 0) return 0;

    let qualityScore = 1.0;
    
    // 顔の向きをチェック
    const nose = landmarks[1]; // 鼻の先端
    const leftEye = landmarks[33]; // 左目の角
    const rightEye = landmarks[362]; // 右目の角
    
    if (!nose || !leftEye || !rightEye) return 0;

    // 顔の水平度をチェック（目の高さの差）
    const eyeHeightDiff = Math.abs(leftEye.y - rightEye.y);
    if (eyeHeightDiff > 0.05) {
      qualityScore *= 0.8; // 傾きがある場合はスコアを下げる
    }

    // 顔の中心度をチェック（鼻が中心にあるか）
    const eyeCenter = (leftEye.x + rightEye.x) / 2;
    const noseOffset = Math.abs(nose.x - eyeCenter);
    if (noseOffset > 0.05) {
      qualityScore *= 0.7; // 顔が横を向いている場合はスコアを下げる
    }

    // 顔のサイズをチェック（小さすぎるor大きすぎる場合）
    const faceWidth = Math.abs(leftEye.x - rightEye.x);
    if (faceWidth < 0.1 || faceWidth > 0.5) {
      qualityScore *= 0.6; // 顔が小さすぎるor大きすぎる場合
    }

    // Z座標による奥行きチェック（利用可能な場合）
    const avgZ = landmarks.reduce((sum, point) => sum + (point.z || 0), 0) / landmarks.length;
    if (Math.abs(avgZ) > 0.1) {
      qualityScore *= 0.8; // 奥行きが大きい場合
    }

    return Math.max(0, Math.min(1, qualityScore));
  }

  // 二つの特徴量ベクトル間のコサイン類似度を計算
  static calculateSimilarity(features1: number[], features2: number[]): number {
    if (features1.length !== features2.length) {
      throw new Error('特徴量ベクトルの長さが一致しません');
    }

    const dotProduct = features1.reduce((sum, a, i) => sum + a * features2[i], 0);
    const magnitude1 = Math.sqrt(features1.reduce((sum, a) => sum + a * a, 0));
    const magnitude2 = Math.sqrt(features2.reduce((sum, a) => sum + a * a, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  // 顔認証の閾値
  static readonly AUTHENTICATION_THRESHOLD = 0.8;
  
  // 最小品質スコア
  static readonly MIN_QUALITY_SCORE = 0.6;

  dispose(): void {
    this.stopCamera();
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
    this.isInitialized = false;
    this.onResultsCallback = null;
  }
}