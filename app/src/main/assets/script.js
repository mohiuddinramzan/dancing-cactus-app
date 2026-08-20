(() => {
  "use strict";

  const cactus = document.getElementById("cactus");
  const cactusWrap = document.getElementById("cactusWrap");
  const recordBtn = document.getElementById("recordBtn");
  const recordIcon = document.getElementById("recordIcon");
  const recordLabel = document.getElementById("recordLabel");
  const danceBtn = document.getElementById("danceBtn");
  const statusPill = document.getElementById("statusPill");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const sparkleLayer = document.getElementById("sparkleLayer");
  const hint = document.getElementById("hint");

  const RECORD_MS = 4000;      // max recording length
  const FUNNY_RATE = 1.55;     // playback speed/pitch bump — gives that squeaky toy-cactus voice
  const DANCE_MS = 1600;       // how long a tap-triggered dance lasts

  let mediaRecorder = null;
  let audioChunks = [];
  let lastAudioURL = null;
  let isRecording = false;
  let recordTimeout = null;
  let danceTimeout = null;
  let stream = null;

  // ---------- status pill ----------
  function setStatus(mode, text) {
    statusPill.classList.remove("listening", "speaking");
    if (mode) statusPill.classList.add(mode);
    statusText.textContent = text;
  }

  // ---------- dancing ----------
  function startDance(duration) {
    cactus.classList.add("dancing");
    clearTimeout(danceTimeout);
    if (duration) {
      danceTimeout = setTimeout(stopDance, duration);
    }
  }
  function stopDance() {
    cactus.classList.remove("dancing");
  }

  function burstSparkles() {
    const emojis = ["✨", "🌟", "💫"];
    const rect = cactusWrap.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const el = document.createElement("span");
      el.className = "sparkle";
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      const x = 20 + Math.random() * 60; // percent-ish across width
      const y = 15 + Math.random() * 55;
      el.style.left = x + "%";
      el.style.top = y + "%";
      el.style.animationDelay = (Math.random() * 0.15) + "s";
      sparkleLayer.appendChild(el);
      setTimeout(() => el.remove(), 900);
    }
  }

  function touchReact() {
    burstSparkles();
    startDance(DANCE_MS);
    if (lastAudioURL) {
      playFunny(lastAudioURL);
    } else {
      setStatus(null, "আরে, একটু নাচলাম! এবার আমাকে কিছু বলো 🎤");
      setTimeout(() => setStatus(null, "ছুঁয়ে দেখো আমাকে"), 1800);
    }
  }

  cactusWrap.addEventListener("click", touchReact);
  cactusWrap.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      touchReact();
    }
  });
  danceBtn.addEventListener("click", touchReact);

  // ---------- recording ----------
  async function startRecording() {
    if (isRecording) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus(null, "এই ব্রাউজারে মাইক্রোফোন সমর্থিত নয় 😢");
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setStatus(null, "মাইক্রোফোনের অনুমতি পাওয়া যায়নি 🎙️❌");
      hint.textContent = "সেটিংস থেকে মাইক্রোফোনের অনুমতি দাও, তারপর আবার চেষ্টা করো।";
      return;
    }

    audioChunks = [];
    const mimeType = pickSupportedMimeType();
    try {
      mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch (err) {
      mediaRecorder = new MediaRecorder(stream);
    }

    mediaRecorder.addEventListener("dataavailable", (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    });

    mediaRecorder.addEventListener("stop", () => {
      if (audioChunks.length) {
        const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
        if (lastAudioURL) URL.revokeObjectURL(lastAudioURL);
        lastAudioURL = URL.createObjectURL(blob);
        setStatus("speaking", "শুনলাম! এবার মজার গলায় বলছি...");
        playFunny(lastAudioURL, true);
      } else {
        setStatus(null, "ছুঁয়ে দেখো আমাকে");
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
    });

    mediaRecorder.start();
    isRecording = true;
    recordBtn.classList.add("active");
    recordIcon.textContent = "⏺️";
    recordLabel.textContent = "শুনছি...";
    setStatus("listening", "কথা বলো, শুনছি...");
    hint.textContent = "কথা শেষ হলে আবার বোতাম চাপো, নাহলে " + (RECORD_MS / 1000) + " সেকেন্ড পর নিজে থেকেই থামবে।";

    recordTimeout = setTimeout(stopRecording, RECORD_MS);
  }

  function stopRecording() {
    if (!isRecording) return;
    clearTimeout(recordTimeout);
    isRecording = false;
    recordBtn.classList.remove("active");
    recordIcon.textContent = "🎙️";
    recordLabel.textContent = "কথা বলো";
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  }

  function pickSupportedMimeType() {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return null;
    return candidates.find((c) => MediaRecorder.isTypeSupported(c)) || null;
  }

  recordBtn.addEventListener("click", () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  // ---------- funny playback ----------
  function playFunny(url, alsoDance) {
    const audio = new Audio(url);
    audio.playbackRate = FUNNY_RATE;
    // preservesPitch = false lets playbackRate also shift pitch up -> squeaky toy voice
    audio.preservesPitch = false;
    audio.mozPreservesPitch = false;
    audio.webkitPreservesPitch = false;

    cactus.classList.add("talking");
    if (alsoDance) startDance(0); // dance for the whole talk duration, stop on 'ended'

    audio.addEventListener("ended", () => {
      cactus.classList.remove("talking");
      if (alsoDance) stopDance();
      setStatus(null, "ছুঁয়ে দেখো আমাকে");
      hint.textContent = "আমাকে আবার ছুঁয়ে দাও — শেষবারের কথাটা আবার বলবো, আর নাচবো!";
    });
    audio.addEventListener("error", () => {
      cactus.classList.remove("talking");
      if (alsoDance) stopDance();
      setStatus(null, "ছুঁয়ে দেখো আমাকে");
    });

    audio.play().catch(() => {
      cactus.classList.remove("talking");
      if (alsoDance) stopDance();
      setStatus(null, "প্লে করতে সমস্যা হয়েছে, আবার চেষ্টা করো");
    });
  }
})();
