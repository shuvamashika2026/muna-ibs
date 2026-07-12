"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Square, Volume2, Waves } from "lucide-react";

type SoundTrack = {
  id: string;
  title: string;
  src: string;
};

const tracks: SoundTrack[] = [
  { id: "gentle-rain", title: "Gentle Rain", src: "/audio/gentle-rain.mp3" },
  { id: "ocean-waves", title: "Ocean Waves", src: "/audio/ocean-waves.mp3" },
  { id: "forest-calm", title: "Forest Calm", src: "/audio/forest-calm.mp3" },
  { id: "soft-instrumental", title: "Soft Instrumental", src: "/audio/soft-instrumental.mp3" },
];

const selectedTrackKey = "munaSoundSpaceTrack";
const volumeKey = "munaSoundSpaceVolume";

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function MunaSoundSpace() {
  const [selectedTrackId, setSelectedTrackId] = useState(tracks[0].id);
  const [volume, setVolume] = useState(0.55);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) || tracks[0],
    [selectedTrackId]
  );

  useEffect(() => {
    const savedTrack = localStorage.getItem(selectedTrackKey);
    const savedVolume = Number(localStorage.getItem(volumeKey));

    if (savedTrack && tracks.some((track) => track.id === savedTrack)) {
      setSelectedTrackId(savedTrack);
    }

    if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) {
      setVolume(savedVolume);
    }
  }, []);

  useEffect(() => {
    const audio = new Audio(selectedTrack.src);
    audio.preload = "metadata";
    audio.volume = volume;
    audioRef.current = audio;
    setIsPlaying(false);
    setIsUnavailable(false);
    setCurrentTime(0);
    setDuration(0);

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setIsPlaying(false);
      setIsUnavailable(true);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [selectedTrack.src]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }

    localStorage.setItem(volumeKey, String(volume));
  }, [volume]);

  function selectTrack(trackId: string) {
    audioRef.current?.pause();
    setSelectedTrackId(trackId);
    localStorage.setItem(selectedTrackKey, trackId);
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      setIsUnavailable(false);
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
      setIsUnavailable(true);
    }
  }

  function stopPlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }

  function updateProgress(value: number) {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    audio.currentTime = value;
    setCurrentTime(value);
  }

  const progressPercent = duration ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

  return (
    <section className="mx-auto mt-6 w-full max-w-5xl rounded-[2rem] bg-white/80 p-5 shadow-[0_18px_60px_rgba(15,118,110,0.10)] ring-1 ring-emerald-100 backdrop-blur md:p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#ECFDF5] text-[#0F766E]">
          <Waves className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-2xl font-black tracking-normal text-[#0F172A]">MUNA Sound Space</h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            Optional calming audio for relaxation and awareness. This is a wellbeing feature, not
            medical treatment.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.15fr] lg:items-end">
        <label className="grid gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
          Track
          <select
            value={selectedTrackId}
            onChange={(event) => selectTrack(event.target.value)}
            className="min-h-12 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-base font-black normal-case tracking-normal text-[#0F172A] outline-none focus:border-[#0F766E] focus:ring-4 focus:ring-emerald-100"
          >
            {tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.title}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3 text-sm font-black text-slate-500">
            <span>{selectedTrack.title}</span>
            <span>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-emerald-50 ring-1 ring-emerald-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0F766E] to-[#10B981]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="1"
            value={duration ? currentTime : 0}
            onChange={(event) => updateProgress(Number(event.target.value))}
            className="h-2 w-full accent-[#0F766E]"
            aria-label="Audio progress"
          />
        </div>
      </div>

      {isUnavailable ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-900 ring-1 ring-amber-100">
          Audio coming soon
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-[auto_auto_1fr] sm:items-center">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={togglePlayback}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(15,118,110,0.22)]"
          >
            {isPlaying ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={stopPlayback}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#0F766E] shadow-sm ring-1 ring-emerald-100"
          >
            <Square className="h-5 w-5" aria-hidden="true" />
            Stop
          </button>
        </div>

        <div className="hidden h-10 w-px bg-emerald-100 sm:block" />

        <label className="flex items-center gap-3 text-sm font-black text-slate-500">
          <Volume2 className="h-5 w-5 text-[#0F766E]" aria-hidden="true" />
          <span className="sr-only">Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="w-full accent-[#0F766E]"
            aria-label="Volume"
          />
          <span className="min-w-10 text-right">{Math.round(volume * 100)}%</span>
        </label>
      </div>
    </section>
  );
}
