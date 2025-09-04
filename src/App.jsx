import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const API_URL = "https://amberflux-backend.onrender.com/api/recordings";

function App() {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [videoURL, setVideoURL] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [timer, setTimer] = useState(0);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Fetch recordings list from backend
  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const res = await axios.get(API_URL);
      setRecordings(res.data);
    } catch (err) {
      console.error("Error fetching recordings", err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoURL(url);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setTimer(0);

      // Timer interval
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev >= 180) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error starting recording", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const downloadRecording = () => {
    if (!videoURL) return;
    const a = document.createElement("a");
    a.href = videoURL;
    a.download = "recording.webm";
    a.click();
  };

  const uploadRecording = async () => {
    if (!chunksRef.current.length) return;

    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    const formData = new FormData();
    formData.append("video", blob, "recording.webm");

    try {
      await axios.post(API_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Uploaded successfully ✅");
      fetchRecordings();
    } catch (err) {
      console.error("Upload failed", err.response?.data || err.message);
      alert("Upload failed ❌");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎥 MERN Screen Recorder</h1>

      {/* Controls */}
      <div className="mb-4">
        {!recording ? (
          <button
            onClick={startRecording}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Stop Recording
          </button>
        )}
        <span className="ml-4 font-mono">
          ⏱ {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
        </span>
      </div>

      {/* Preview */}
      {videoURL && (
        <div className="mb-4">
          <video src={videoURL} controls className="w-full border rounded" />
          <div className="mt-2 flex gap-2">
            <button
              onClick={downloadRecording}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              Download
            </button>
            <button
              onClick={uploadRecording}
              className="px-3 py-1 bg-purple-600 text-white rounded"
            >
              Upload
            </button>
          </div>
        </div>
      )}

      {/* Uploaded list */}
      <h2 className="text-xl font-semibold mb-2">📂 Uploaded Recordings</h2>
      <ul className="space-y-2">
        {recordings.map((rec) => (
          <li key={rec.id} className="border p-2 rounded flex justify-between">
            <span>{rec.filename}</span>
            <a
              href={`${API_URL}/${rec.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              Play
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
