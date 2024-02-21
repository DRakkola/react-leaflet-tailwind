import React, { useState, useEffect, useRef } from "react";
import backImage from "../../assets/back.jpg";
import logo from "../../assets/zxwlbvka.png";
import toast from "react-hot-toast";
const ScreenRecord = () => {
  const [stream, setStream] = useState(null);
  const [captureInitiated, setCaptureInitiated] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerId, setTimerId] = useState(null);
  const streamId = "test";
  const type = "image/png";
  const notify = () =>
    toast("Here is your toast.", {
      duration: 4000,
      position: "top-center",

      // Styling
      style: {},
      className: "",

      // Custom Icon
      icon: "👏",

      // Change colors of success/error/loading icon
      iconTheme: {
        primary: "#000",
        secondary: "#fff",
      },

      // Aria
      ariaProps: {
        role: "status",
        "aria-live": "polite",
      },
    });

  const intervalIdRef = useRef();
  useEffect(() => {
    let ws;
    let video;
    let canvas;

    const captureScreen = async () => {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { mediaSource: "screen" },
        });
        setStream(screenStream);
        sendFrames(screenStream);
      } catch (error) {
        console.error("Error accessing screen capture:", error);
      }
    };

    const sendFrames = (stream) => {
      ws = new WebSocket(`ws://127.0.0.1:80/stream/${streamId}`);
      const interval = 1000 / 30; // Adjust this to change the frame rate
      canvas = document.createElement("canvas");
      video = document.createElement("video");
      video.srcObject = stream;

      ws.onopen = async () => {
        setWsConnected(true);
        await video.play(); // Play the video once
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        intervalIdRef.current = setInterval(() => {
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas
              .getContext("2d")
              .drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL(type, 1);
            const binaryData = dataURItoBlob(imageData);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(binaryData);
              console.log("Sent frame");
            }
          }
        }, interval);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setWsConnected(false);
      };

      ws.onclose = () => {
        setWsConnected(false);
        clearInterval(intervalIdRef.current);
      };
    };

    if (captureInitiated) {
      captureScreen();

      const timer = setInterval(() => {
        setElapsedTime((prevTime) => prevTime + 1);
      }, 1000);
      setTimerId(timer);
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      clearInterval(intervalIdRef.current);
      if (ws) {
        ws.close();
      }
      if (timerId) {
        clearInterval(timerId);
        setElapsedTime(0);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      clearInterval(intervalIdRef.current);
      if (ws) {
        ws.close();
      }
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [captureInitiated]);

  // Function to convert base64 image data to a Blob
  function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: "image/png" }); // Adjust the type accordingly
  }

  const toggleCapture = () => {
    setCaptureInitiated(!captureInitiated);
  };

  const formatTime = (seconds) => {
    const pad = (num) => num.toString().padStart(2, "0");
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  };

  return (
    <div
      className={
        "bg-gray-800 min-h-screen flex flex-col items-center justify-center text-white h-full w-full"
      }
      style={{
        backgroundImage: `url(${backImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex flex-col items-center justify-center w-3/12 h-2/4 border-2 border-gray-400 rounded-md drop-shadow-2xl backdrop-blur-sm bg-white/20">
        <img src={logo} className="w-40 h-40 mb-8" />
        <button
          onClick={toggleCapture}
          className={`px-4 py-2 rounded-md text-lg font-medium shadow-md focus:outline-none ${
            captureInitiated
              ? "bg-red-600 hover:bg-red-700 animate-pulse"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {captureInitiated ? "Stop Streaming" : "Start Streaming"}
        </button>
        <div className="mt-4">
          Connection Status:{" "}
          <span
            className={`font-semibold ${
              wsConnected ? "text-green-400" : "text-red-400"
            }`}
          >
            {wsConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="mt-2">Streaming Time: {formatTime(elapsedTime)}</div>
        <div className="mt-2">
          Current Date and Time: {new Date().toLocaleString()}
        </div>
        {captureInitiated && (
          <div className="mt-4 px-4 py-2 bg-blue-600 rounded-md">
            Screen capturing in progress...
          </div>
        )}
      </div>
    </div>
  );
};

export default ScreenRecord;