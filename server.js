const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const mammoth = require('mammoth');
const PDFDocument = require('pdfkit');
const WhisperEngine = require('./lib/whisper-engine');
const GPUDetector = require('./lib/gpu-detector');

const app = express();
const PORT = process.env.PORT || 3000;

// Anthropic API
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Whisper エンジンの初期化
const whisperEngine = new WhisperEngine({
    model: process.env.WHISPER_MODEL || 'base',
    useFasterWhisper: process.env.USE_FASTER_WHISPER === 'true',
    enableCache: process.env.ENABLE_CACHE !== 'false'
});

// ファイルストレージ設定
const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        cb(null, `${timestamp}_${file.originalname}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.mp3', '.m4a', '.wav', '.flac'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('対応していないファイル形式です'));
        }
    }
});

// ガイドラインを読み込み
const GUIDELINES = fs.readFileSync(
    path.join(__dirname, 'input/Rule for meeting summary.txt'),
    'utf-8'
);

app.use(express.static(__dirname));

// 議事録生成ガイドラインテンプレート
const MEETING_SUMMARY_PROMPT = `You are a professional meeting minutes generator for global projects.

Your task is to convert meeting transcripts into well-structured meeting minutes following the provided guidelines.

GUIDELINES:
${GUIDELINES}

Your job is to:
1. Extract the transcript from the audio transcription provided
2. Identify all participants and classify them (Japan side, North America side, IBM side)
3. Extract the agenda items from the meeting
4. Extract decision items organized by agenda
5. Extract action items with owners and deadlines in table format
6. Summarize the meeting content for each agenda item
7. Add supplementary notes

IMPORTANT:
- All output must be in Japanese
- Follow the exact Markdown template provided in the guidelines
- Use accurate date formats (consider time zones for global meetings)
- Organize everything by agenda items
- Be precise with participant names and roles
- Extract specific deadlines and owners for action items

Please generate the meeting minutes in Markdown format.`;

// APIエンドポイント
app.post('/api/process', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'ファイルがアップロードされていません' });
        }

        const filePath = req.file.path;
        const format = req.body.format || 'markdown';

        // ステップ1: 音声認識（Whisper API）
        const transcript = await transcribeAudio(filePath);

        if (!transcript) {
            throw new Error('音声認識に失敗しました');
        }

        // ステップ2: Claude APIで議事録生成
        const meetingMinutes = await generateMeetingMinutes(transcript);

        // ステップ3: ファイル形式に変換
        let outputFilename;
        let outputPath;

        switch (format) {
            case 'docx':
                outputFilename = generateFilename('docx');
                outputPath = path.join(outputDir, outputFilename);
                await markdownToDocx(meetingMinutes, outputPath);
                break;
            case 'pdf':
                outputFilename = generateFilename('pdf');
                outputPath = path.join(outputDir, outputFilename);
                await markdownToPdf(meetingMinutes, outputPath);
                break;
            default:
                outputFilename = generateFilename('md');
                outputPath = path.join(outputDir, outputFilename);
                fs.writeFileSync(outputPath, meetingMinutes);
        }

        // クリーンアップ
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            content: meetingMinutes,
            filename: outputFilename,
            format
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ダウンロードエンドポイント
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(outputDir, filename);

    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'ファイルが見つかりません' });
    }

    res.download(filepath, () => {
        // ダウンロード後にファイルを削除
        fs.unlinkSync(filepath);
    });
});

// Admin API - GPU情報を取得
app.get('/api/admin/gpu-info', (req, res) => {
    const gpuInfo = whisperEngine.getGPUInfo();
    res.json({
        gpuType: gpuInfo.gpuType,
        available: gpuInfo.isAvailable,
        device: gpuInfo.device,
        recommendedModel: whisperEngine.gpuDetector.getRecommendedModel(),
        estimatedTime30min: whisperEngine.gpuDetector.estimateProcessingTime('base', 1800)
    });
});

// Admin API - キャッシュ統計を取得
app.get('/api/admin/cache-stats', (req, res) => {
    const stats = whisperEngine.cacheManager.getStats();
    res.json(stats);
});

// Admin API - キャッシュをクリア
app.post('/api/admin/cache-clear', (req, res) => {
    whisperEngine.clearCache();
    res.json({ success: true, message: 'Cache cleared' });
});

// Admin API - Whisper エンジン設定を取得
app.get('/api/admin/engine-info', (req, res) => {
    res.json({
        model: whisperEngine.options.model,
        useFasterWhisper: whisperEngine.options.useFasterWhisper,
        enableCache: whisperEngine.options.enableCache,
        language: whisperEngine.options.language,
        gpu: whisperEngine.gpuInfo
    });
});

// 音声認識関数（最適化版 - GPU 自動検出 + キャッシング）
async function transcribeAudio(filePath) {
    try {
        console.log(`🎙️ Transcribing: ${path.basename(filePath)}`);
        console.log(`GPU Info: ${whisperEngine.gpuInfo.gpuType} (${whisperEngine.gpuInfo.isAvailable ? 'enabled' : 'disabled'})`);

        const transcript = await whisperEngine.transcribe(filePath);
        console.log(`✅ Transcription completed`);
        return transcript;
    } catch (error) {
        console.error('Transcription error:', error);
        throw new Error('音声認識に失敗しました: ' + error.message);
    }
}

// 議事録生成関数（Claude API）
async function generateMeetingMinutes(transcript) {
    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            messages: [
                {
                    role: 'user',
                    content: `${MEETING_SUMMARY_PROMPT}\n\nTranscript:\n\n${transcript}`
                }
            ]
        });

        return message.content[0].type === 'text' ? message.content[0].text : '';
    } catch (error) {
        console.error('Generation error:', error);
        throw new Error('議事録生成に失敗しました: ' + error.message);
    }
}

// Markdown to DOCX変換
async function markdownToDocx(markdown, outputPath) {
    try {
        // シンプルなMarkdown to DOCX変換
        // npm install: markdown-to-docx または pandoc を使用
        const { markdownToDOCX } = require('./lib/markdown-to-docx');
        await markdownToDOCX(markdown, outputPath);
    } catch (error) {
        console.error('DOCX conversion error:', error);
        // フォールバック: Markdown出力
        fs.writeFileSync(outputPath.replace('.docx', '.md'), markdown);
        throw new Error('DOCX変換に失敗しました（Markdown形式で出力）');
    }
}

// Markdown to PDF変換
async function markdownToPdf(markdown, outputPath) {
    try {
        const doc = new PDFDocument({ bufferPages: true });
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        // Markdownを簡易的にPDFに変換
        const lines = markdown.split('\n');
        let inCodeBlock = false;

        for (const line of lines) {
            if (line.startsWith('# ')) {
                doc.fontSize(24).text(line.substring(2), { continued: false });
                doc.moveDown();
            } else if (line.startsWith('## ')) {
                doc.fontSize(16).text(line.substring(3), { continued: false });
                doc.moveDown();
            } else if (line.startsWith('### ')) {
                doc.fontSize(12).text(line.substring(4), { continued: false });
                doc.moveDown();
            } else if (line.startsWith('| ')) {
                // テーブル行
                doc.fontSize(10).text(line, { continued: false });
            } else if (line.trim()) {
                doc.fontSize(11).text(line, { continued: false });
                doc.moveDown(0.5);
            }
        }

        doc.end();

        return new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });
    } catch (error) {
        console.error('PDF conversion error:', error);
        throw new Error('PDF変換に失敗しました');
    }
}

// ファイル名生成
function generateFilename(format) {
    const now = new Date();
    const date = now.toISOString().split('T')[0].replace(/-/g, '');
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const ext = format === 'md' ? 'md' : (format === 'docx' ? 'docx' : 'pdf');
    return `${date}_議事録_${time}.${ext}`;
}

// エラーハンドリング
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || '予期しないエラーが発生しました' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
