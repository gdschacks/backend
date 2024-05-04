const recorder = require("node-record-lpcm16");
const speech = require("@google-cloud/speech");

const encoding = "LINEAR16";
const sampleRateHertz = 16000;
const languageCode = "en-US";

let recordingProcess = null;
let recordStream = null;

function startTranscription(io) {
  console.log("hello frmo startTranscription");
  const client = new speech.SpeechClient();

  const request = {
    config: {
      encoding: encoding,
      sampleRateHertz: sampleRateHertz,
      languageCode: languageCode,
    },
    interimResults: false,
  };

  if (!recordingProcess) {
    recordingProcess = client
      .streamingRecognize(request)
      .on("error", console.error)
      .on("data", (data) => {
        const transcript =
          data.results[0] && data.results[0].alternatives[0]
            ? `${data.results[0].alternatives[0].transcript}\n`
            : "\n\nReached transcription time limit, press Ctrl+C\n";

        // Emitting the transcription data to all connected clients
        io.emit("transcription", transcript);
      })
      .on("end", () => {});
  }

  if (!recordStream) {
    recordStream = recorder.record({
      sampleRateHertz: sampleRateHertz,
      threshold: 0,
      verbose: false,
      recordProgram: "rec",
      silence: "10.0",
    });
    recordStream.stream().on("error", console.error).pipe(recordingProcess);
  }
  io.emit("recordingStatus", { recording: true });
  console.log("Listening, press Ctrl+C to stop.");
}

function stopTranscription(io) {
  if (recordStream) {
    // WAIT till recordStream has finished processing
    recordStream.stream().on("end", () => {
      console.log("Recording stream finished.");

      if (recordingProcess) {
        recordingProcess.end();
        recordingProcess = null;
        io.emit("recordingStatus", { recording: false });
        console.log("Transcription process closed.");
      }
    });

    recordStream.stop();
    recordStream = null;
  } else {
    if (recordingProcess) {
      recordingProcess.end();
      recordingProcess = null;
      io.emit("recordingStatus", { recording: false });
      console.log("Transcription process closed.");
    }
  }

  console.log("Transcription stopping...");
}

module.exports = {
  startTranscription,
  stopTranscription,
};
