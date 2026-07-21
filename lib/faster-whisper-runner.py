#!/usr/bin/env python3
"""
faster-whisper ランナースクリプト
Node.js から Python の faster-whisper を実行するためのブリッジ
"""

import argparse
import json
import sys
import os

def main():
    parser = argparse.ArgumentParser(description='faster-whisper runner')
    parser.add_argument('--file', required=True, help='Audio file path')
    parser.add_argument('--model', default='base', help='Model size')
    parser.add_argument('--language', default='ja', help='Language')
    parser.add_argument('--device', default='auto', help='Device (auto/cpu/cuda/mps)')
    parser.add_argument('--compute_type', default='auto', help='Compute type')

    args = parser.parse_args()

    try:
        # faster-whisper をインポート
        from faster_whisper import WhisperModel

        # デバイスの決定
        device = args.device
        if device == 'auto':
            device = 'cuda' if is_gpu_available() else 'cpu'

        print(f"Loading model: {args.model} (device: {device})", file=sys.stderr)

        # モデルをロード
        model = WhisperModel(
            args.model,
            device=device,
            compute_type=args.compute_type if args.compute_type != 'auto' else 'default'
        )

        # 音声を認識
        print(f"Transcribing: {args.file}", file=sys.stderr)
        segments, info = model.transcribe(
            args.file,
            language=args.language,
            beam_size=5,
            best_of=5,
            temperature=0.0,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        # セグメントをテキストに変換
        text = '\n'.join([segment.text for segment in segments])

        # JSON で結果を出力
        result = {
            'text': text,
            'language': info.language,
            'duration': info.duration,
            'word_count': len(text.split())
        }

        print(json.dumps(result, ensure_ascii=False))

    except ImportError:
        print(
            json.dumps({
                'error': 'faster-whisper not installed',
                'message': 'pip install faster-whisper を実行してください'
            }),
            file=sys.stderr
        )
        sys.exit(1)

    except Exception as e:
        print(
            json.dumps({
                'error': str(type(e).__name__),
                'message': str(e)
            }),
            file=sys.stderr
        )
        sys.exit(1)


def is_gpu_available():
    """GPU の利用可能性を確認"""
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False


if __name__ == '__main__':
    main()
