#!/usr/bin/env python3

import argparse
import subprocess
import os
import json
import shutil
import whisper
import srt
from datetime import timedelta
from googletrans import Translator

def ensure_tmp_folder():
    tmp_dir = "_tmp"
    if not os.path.exists(tmp_dir):
        os.makedirs(tmp_dir)
    return tmp_dir

def extract_audio(video_path, output_audio_path):
    if os.path.exists(output_audio_path):
        print(f"Audio extraction skipped (file exists): {output_audio_path}")
        return output_audio_path

    print(f"Extracting audio to {output_audio_path}...")
    cmd = ["ffmpeg", "-i", video_path, "-vn", "-acodec", "mp3", output_audio_path, "-y"]
    process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if process.returncode != 0:
        print(f"Error extracting audio:\n{process.stderr}")
    else:
        print("Audio extraction successful!")    
    
    return output_audio_path

def transcribe_audio(audio_path, transcript_path, source_lang="fa"):
    if os.path.exists(transcript_path):
        print(f"Transcription skipped (file exists): {transcript_path}")
        with open(transcript_path, "r", encoding="utf-8") as f:
            return json.load(f)

    print(f"Transcribing speech in {source_lang} to {transcript_path}...")
    model = whisper.load_model("large")
    result = model.transcribe(audio_path, language=source_lang)

    with open(transcript_path, "w", encoding="utf-8") as f:
        json.dump(result["segments"], f, ensure_ascii=False, indent=4)

    return result["segments"]

translator = Translator()

def translate_text(text, source_lang):
    return translator.translate(text, src=source_lang, dest='en').text

def generate_srt(segments, output_srt_path, translated_path, source_lang):
    if os.path.exists(translated_path):
        print(f"Translation skipped (file exists): {translated_path}")
        with open(translated_path, "r", encoding="utf-8") as f:
            translated_segments = json.load(f)
    else:
        print(f"Translating subtitles from {source_lang} to English in {translated_path}")
        translated_segments = []
        for segment in segments:
            translated_segments.append({
                "start": segment["start"],
                "end": segment["end"],
                "text": translate_text(segment["text"], source_lang)
            })

        with open(translated_path, "w", encoding="utf-8") as f:
            json.dump(translated_segments, f, ensure_ascii=False, indent=4)

    subtitles = []
    for i, segment in enumerate(translated_segments):
        start = timedelta(seconds=segment["start"])
        end = timedelta(seconds=segment["end"])
        subtitles.append(srt.Subtitle(index=i+1, start=start, end=end, content=segment["text"]))

    with open(output_srt_path, "w", encoding="utf-8") as f:
        f.write(srt.compose(subtitles))

    return output_srt_path

def cleanup_tmp_files(tmp_dir):
    if os.path.exists(tmp_dir):
        shutil.rmtree(tmp_dir)
        print("Temporary files deleted.")

def main():
    parser = argparse.ArgumentParser(description="Generate English subtitles from a video file")
    parser.add_argument("video", help="Path to the video file")
    parser.add_argument("--output", help="Output subtitle file (default: subtitles.srt)", default="subtitles.srt")
    parser.add_argument("--source-lang", help="Source language code (default: fa - Persian)", default="fa")
    parser.add_argument("--delete-tmp-files", action="store_true", default=False)

    args = parser.parse_args()
    
    tmp_dir = ensure_tmp_folder()
    base_name = os.path.splitext(os.path.basename(args.video))[0]
    audio_file = os.path.join(tmp_dir, f"{base_name}.mp3")
    transcript_file = os.path.join(tmp_dir, f"{base_name}_transcript.json")
    translated_file = os.path.join(tmp_dir, f"{base_name}_translated.json")

    audio_file = extract_audio(args.video, audio_file)
    segments = transcribe_audio(audio_file, transcript_file, args.source_lang)
    srt_file = generate_srt(segments, args.output, translated_file, args.source_lang)

    print(f"Subtitles saved to {srt_file}")
    
    if args.delete_tmp_files:
        cleanup_tmp_files(tmp_dir)

if __name__ == "__main__":
    main()
