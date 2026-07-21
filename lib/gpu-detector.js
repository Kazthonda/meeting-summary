const { execSync } = require('child_process');
const os = require('os');

/**
 * GPU 自動検出モジュール
 * NVIDIA CUDA, Apple Silicon (Metal), AMD ROCm を検出
 */

class GPUDetector {
  constructor() {
    this.gpuType = null;
    this.isAvailable = false;
    this.detected = false;
  }

  /**
   * GPU の検出を実行
   * @returns {Object} { gpuType, isAvailable, device }
   */
  detect() {
    if (this.detected) {
      return this.getStatus();
    }

    const platform = os.platform();

    try {
      if (platform === 'win32') {
        this.detectNVIDIA();
      } else if (platform === 'darwin') {
        this.detectAppleSilicon();
      } else if (platform === 'linux') {
        this.detectNVIDIA();
      }
    } catch (error) {
      console.log('GPU detection skipped:', error.message);
      this.gpuType = 'cpu';
      this.isAvailable = false;
    }

    if (!this.gpuType) {
      this.gpuType = 'cpu';
      this.isAvailable = false;
    }

    this.detected = true;
    return this.getStatus();
  }

  /**
   * NVIDIA CUDA の検出
   */
  detectNVIDIA() {
    try {
      const output = execSync('nvidia-smi --query-gpu=name --format=csv,noheader', {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();

      if (output) {
        this.gpuType = 'nvidia';
        this.isAvailable = true;
        console.log(`✅ NVIDIA GPU detected: ${output}`);
      }
    } catch (error) {
      // nvidia-smi not found or failed
    }
  }

  /**
   * Apple Silicon (Metal) の検出
   */
  detectAppleSilicon() {
    try {
      const output = execSync('sysctl -n machdep.cpu.brand_string', {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();

      if (output.includes('Apple') || output.includes('arm64')) {
        this.gpuType = 'metal';
        this.isAvailable = true;
        console.log(`✅ Apple Silicon GPU detected: ${output}`);
      }
    } catch (error) {
      // Not Apple Silicon or command failed
    }
  }

  /**
   * AMD ROCm の検出
   */
  detectAMD() {
    try {
      const output = execSync('rocm-smi', {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();

      if (output.length > 0) {
        this.gpuType = 'rocm';
        this.isAvailable = true;
        console.log(`✅ AMD GPU detected`);
      }
    } catch (error) {
      // rocm-smi not found
    }
  }

  /**
   * GPU 検出結果を取得
   * @returns {Object}
   */
  getStatus() {
    return {
      gpuType: this.gpuType,
      isAvailable: this.isAvailable,
      device: this.getDevice(),
      accelerated: this.isAvailable
    };
  }

  /**
   * Whisper/PyTorch 用のデバイス文字列を生成
   * @returns {string}
   */
  getDevice() {
    if (!this.isAvailable) {
      return 'cpu';
    }

    switch (this.gpuType) {
      case 'nvidia':
        return 'cuda';
      case 'metal':
        return 'mps';
      case 'rocm':
        return 'rocm';
      default:
        return 'cpu';
    }
  }

  /**
   * Whisper CLI オプションを生成
   * @returns {Array}
   */
  getWhisperArgs() {
    if (!this.isAvailable) {
      return ['--device', 'cpu'];
    }

    switch (this.gpuType) {
      case 'nvidia':
        return ['--device', 'cuda'];
      case 'metal':
        return ['--device', 'cpu']; // Metal は CLI で未対応、PyTorch では自動
      case 'rocm':
        return ['--device', 'rocm'];
      default:
        return ['--device', 'cpu'];
    }
  }

  /**
   * 推奨モデルを取得（GPU に応じた最適モデル）
   * @returns {string}
   */
  getRecommendedModel() {
    if (!this.isAvailable) {
      return 'tiny'; // CPU のみの場合は tiny
    }

    switch (this.gpuType) {
      case 'nvidia':
        return 'base'; // 十分な VRAM があれば small も可
      case 'metal':
        return 'base';
      case 'rocm':
        return 'tiny';
      default:
        return 'tiny';
    }
  }

  /**
   * 推定処理時間を返す（モデルと GPU 種別に基づく）
   * @param {string} model - Whisper モデル
   * @param {number} duration - 音声長（秒）
   * @returns {string}
   */
  estimateProcessingTime(model = 'base', duration = 1800) {
    const estimates = {
      // CPU
      cpu: {
        tiny: duration / 60 * 0.3,
        base: duration / 60 * 1.0,
        small: duration / 60 * 3.0,
        medium: duration / 60 * 6.0,
        large: duration / 60 * 10.0
      },
      // NVIDIA CUDA
      nvidia: {
        tiny: duration / 60 * 0.1,
        base: duration / 60 * 0.3,
        small: duration / 60 * 0.8,
        medium: duration / 60 * 1.5,
        large: duration / 60 * 2.5
      },
      // Apple Silicon
      metal: {
        tiny: duration / 60 * 0.15,
        base: duration / 60 * 0.4,
        small: duration / 60 * 1.0,
        medium: duration / 60 * 2.0,
        large: duration / 60 * 3.5
      }
    };

    const device = this.isAvailable ? this.gpuType : 'cpu';
    const time = estimates[device]?.[model] || estimates.cpu.base;

    return this.formatDuration(time);
  }

  /**
   * 秒数を人間が読みやすい形式に変換
   * @param {number} seconds
   * @returns {string}
   */
  formatDuration(seconds) {
    if (seconds < 60) {
      return `${Math.ceil(seconds)}秒`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}分`;
  }
}

module.exports = GPUDetector;
