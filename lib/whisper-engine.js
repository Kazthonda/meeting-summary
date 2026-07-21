const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const GPUDetector = require('./gpu-detector');
const CacheManager = require('./cache-manager');

/**
 * 高度な Whisper 音声認識エンジン
 * - GPU 自動検出
 * - キャッシング対応
 * - faster-whisper サポート
 */

class WhisperEngine {
  constructor(options = {}) {
    this.options = {
      model: process.env.WHISPER_MODEL || 'base',
      language: 'ja',
      outputFormat: 'json',
      useFasterWhisper: process.env.USE_FASTER_WHISPER === 'true',
      enableCache: process.env.ENABLE_CACHE !== 'false',
      ...options
    };

    this.gpuDetector = new GPUDetector();
    this.cacheManager = new CacheManager();
    this.gpuInfo = this.gpuDetector.detect();

    this.logInitialization();
  }

  /**
   * エンジン初期化情報をログ出力
   */
  logInitialization() {
    console.log('\n=== Whisper Engine Initialized ===');
    console.log(`GPU Device: ${this.gpuInfo.gpuType} (${this.gpuInfo.accelerated ? 'enabled' : 'disabled'})`);
    console.log(`Model: ${this.options.model}`);
    console.log(`Engine: ${this.options.useFasterWhisper ? 'faster-whisper' : 'openai-whisper'}`);
    console.log(`Cache: ${this.options.enableCache ? 'enabled' : 'disabled'}`);
    console.log(`Recommended Model: ${this.gpuDetector.getRecommendedModel()}`);
    console.log('==================================\n');
  }

  /**
   * 音声ファイルを認識
   * @param {string} filePath
   * @returns {Promise<string>}
   */
  async transcribe(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // キャッシュをチェック
    if (this.options.enableCache) {
      const cached = this.cacheManager.get(filePath);
      if (cached && cached.data.text) {
        console.log('📦 Using cached transcription');
        return cached.data.text;
      }
    }

    try {
      const transcript = this.options.useFasterWhisper
        ? await this.transcribeWithFasterWhisper(filePath)
        : await this.transcribeWithOpenaiWhisper(filePath);

      // 結果をキャッシュに保存
      if (this.options.enableCache) {
        this.cacheManager.set(filePath, { text: transcript });
      }

      return transcript;
    } catch (error) {
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * OpenAI Whisper CLI を使用して認識
   * @param {string} filePath
   * @returns {Promise<string>}
   */
  async transcribeWithOpenaiWhisper(filePath) {
    return new Promise((resolve, reject) => {
      const tempDir = path.dirname(filePath);
      const args = [
        '-m', 'whisper',
        filePath,
        '--model', this.options.model,
        '--language', this.options.language,
        '--output_format', this.options.outputFormat,
        '--output_dir', tempDir,
        ...this.gpuDetector.getWhisperArgs()
      ];

      const estimatedTime = this.gpuDetector.estimateProcessingTime(
        this.options.model,
        this.getAudioDuration(filePath)
      );
      console.log(`⏱️ Estimated processing time: ${estimatedTime}`);

      const whisper = spawn('python3', args);
      let stderr = '';
      let stdout = '';

      whisper.stdout?.on('data', (data) => {
        stdout += data.toString();
        console.log(`[Whisper] ${data.toString().trim()}`);
      });

      whisper.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      whisper.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Whisper process exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const jsonPath = filePath.replace(/\.[^/.]+$/, '.json');
          if (!fs.existsSync(jsonPath)) {
            throw new Error(`Output file not found: ${jsonPath}`);
          }

          const result = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          fs.unlinkSync(jsonPath); // JSON ファイルを削除

          resolve(result.text);
        } catch (error) {
          reject(new Error(`Failed to parse result: ${error.message}`));
        }
      });

      whisper.on('error', (error) => {
        reject(new Error(`Failed to spawn whisper: ${error.message}`));
      });
    });
  }

  /**
   * faster-whisper を使用して認識（高速化版）
   * Python スクリプトを呼び出し
   * @param {string} filePath
   * @returns {Promise<string>}
   */
  async transcribeWithFasterWhisper(filePath) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, 'faster-whisper-runner.py');

      const args = [
        pythonScript,
        '--file', filePath,
        '--model', this.options.model,
        '--language', this.options.language,
        '--device', this.gpuInfo.getDevice(),
        '--compute_type', this.options.computeType || 'auto'
      ];

      const estimatedTime = this.gpuDetector.estimateProcessingTime(
        this.options.model,
        this.getAudioDuration(filePath)
      );
      console.log(`⏱️ Estimated processing time: ${estimatedTime} (faster-whisper)`);

      const python = spawn('python', args);
      let output = '';
      let stderr = '';

      python.stdout?.on('data', (data) => {
        output += data.toString();
        const line = data.toString().trim();
        if (line) console.log(`[faster-whisper] ${line}`);
      });

      python.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`faster-whisper process exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(output.trim());
          resolve(result.text);
        } catch (error) {
          reject(new Error(`Failed to parse faster-whisper result: ${error.message}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to spawn python: ${error.message}`));
      });
    });
  }

  /**
   * 音声ファイルの長さを推定（秒）
   * ffprobe がなければ概算値を返す
   * @param {string} filePath
   * @returns {number}
   */
  getAudioDuration(filePath) {
    try {
      // ffprobe で正確に取得（インストールされている場合）
      const { execSync } = require('child_process');
      const output = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1:nokey=1 "${filePath}"`,
        { encoding: 'utf-8', timeout: 5000 }
      );
      return parseInt(output.trim());
    } catch (error) {
      // ffprobe が無い場合、ファイルサイズから概算
      const stats = fs.statSync(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      return Math.ceil(fileSizeInMB * 60 / 0.7); // 平均的な圧縮率から推定
    }
  }

  /**
   * キャッシュ統計を表示
   */
  showCacheStats() {
    const stats = this.cacheManager.getStats();
    console.log('\n=== Cache Statistics ===');
    console.log(`Files: ${stats.fileCount}`);
    console.log(`Size: ${stats.formattedSize}`);
    if (stats.items.length > 0) {
      console.log('\nRecent items:');
      stats.items.slice(-5).forEach(item => {
        console.log(`  - ${item.hash}... (${item.size} bytes)`);
      });
    }
    console.log('========================\n');
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.cacheManager.clear();
  }

  /**
   * GPU 情報を取得
   */
  getGPUInfo() {
    return this.gpuInfo;
  }

  /**
   * オプションを更新
   * @param {Object} options
   */
  updateOptions(options) {
    this.options = { ...this.options, ...options };
  }
}

module.exports = WhisperEngine;
