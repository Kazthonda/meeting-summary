const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * キャッシング管理モジュール
 * 同じ音声ファイルの重複処理を回避
 */

class CacheManager {
  constructor(cacheDir = path.join(__dirname, '../.cache')) {
    this.cacheDir = cacheDir;
    this.initCache();
  }

  /**
   * キャッシュディレクトリを初期化
   */
  initCache() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      console.log(`✓ Cache directory created: ${this.cacheDir}`);
    }
  }

  /**
   * ファイルのハッシュ値を計算
   * @param {string} filePath
   * @returns {string}
   */
  computeFileHash(filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      return hashSum.digest('hex');
    } catch (error) {
      throw new Error(`Failed to compute hash: ${error.message}`);
    }
  }

  /**
   * キャッシュファイルパスを生成
   * @param {string} fileHash
   * @returns {string}
   */
  getCachePath(fileHash) {
    return path.join(this.cacheDir, `${fileHash}.json`);
  }

  /**
   * キャッシュに保存されているかチェック
   * @param {string} filePath
   * @returns {Object|null}
   */
  get(filePath) {
    try {
      const hash = this.computeFileHash(filePath);
      const cachePath = this.getCachePath(hash);

      if (fs.existsSync(cachePath)) {
        const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));

        // TTL チェック（24時間）
        const ttl = 24 * 60 * 60 * 1000;
        const age = Date.now() - cached.timestamp;

        if (age < ttl) {
          console.log(`✓ Cache hit: ${hash.substring(0, 8)}...`);
          return cached;
        } else {
          // TTL 期限切れ - キャッシュを削除
          fs.unlinkSync(cachePath);
          console.log(`✓ Cache expired: ${hash.substring(0, 8)}...`);
        }
      }

      return null;
    } catch (error) {
      console.warn('Cache get error:', error.message);
      return null;
    }
  }

  /**
   * キャッシュに保存
   * @param {string} filePath
   * @param {Object} data
   */
  set(filePath, data) {
    try {
      const hash = this.computeFileHash(filePath);
      const cachePath = this.getCachePath(hash);

      const cacheData = {
        hash,
        filePath,
        timestamp: Date.now(),
        data,
        ttl: 24 * 60 * 60 * 1000 // 24時間
      };

      fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
      console.log(`✓ Cache saved: ${hash.substring(0, 8)}...`);
    } catch (error) {
      console.warn('Cache set error:', error.message);
    }
  }

  /**
   * キャッシュを削除
   * @param {string} filePath
   */
  delete(filePath) {
    try {
      const hash = this.computeFileHash(filePath);
      const cachePath = this.getCachePath(hash);

      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
        console.log(`✓ Cache deleted: ${hash.substring(0, 8)}...`);
      }
    } catch (error) {
      console.warn('Cache delete error:', error.message);
    }
  }

  /**
   * すべてのキャッシュをクリア
   */
  clear() {
    try {
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        files.forEach(file => {
          fs.unlinkSync(path.join(this.cacheDir, file));
        });
        console.log(`✓ All cache cleared (${files.length} files removed)`);
      }
    } catch (error) {
      console.warn('Cache clear error:', error.message);
    }
  }

  /**
   * キャッシュの統計情報を取得
   * @returns {Object}
   */
  getStats() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        return { totalSize: 0, fileCount: 0, items: [] };
      }

      const files = fs.readdirSync(this.cacheDir);
      let totalSize = 0;
      const items = [];

      files.forEach(file => {
        const filePath = path.join(this.cacheDir, file);
        const stat = fs.statSync(filePath);
        totalSize += stat.size;

        try {
          const cached = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          items.push({
            hash: cached.hash.substring(0, 8),
            size: stat.size,
            timestamp: new Date(cached.timestamp).toISOString(),
            file: cached.filePath
          });
        } catch (error) {
          // Skip invalid cache files
        }
      });

      return {
        totalSize,
        fileCount: files.length,
        formattedSize: this.formatBytes(totalSize),
        items
      };
    } catch (error) {
      console.warn('Cache stats error:', error.message);
      return { totalSize: 0, fileCount: 0, items: [] };
    }
  }

  /**
   * バイト数を人間が読みやすい形式に変換
   * @param {number} bytes
   * @returns {string}
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * 古いキャッシュファイルをクリーンアップ
   * @param {number} maxAge - 最大年齢（ミリ秒）
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000) {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        return;
      }

      const files = fs.readdirSync(this.cacheDir);
      let deleted = 0;

      files.forEach(file => {
        const filePath = path.join(this.cacheDir, file);
        const stat = fs.statSync(filePath);
        const age = Date.now() - stat.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      });

      if (deleted > 0) {
        console.log(`✓ Cleanup: ${deleted} old cache files removed`);
      }
    } catch (error) {
      console.warn('Cache cleanup error:', error.message);
    }
  }
}

module.exports = CacheManager;
