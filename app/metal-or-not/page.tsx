"use client";

import { useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import {
  create,
  SpeechCommandRecognizer,
} from "@tensorflow-models/speech-commands";

import Loading from "./loading";

export default function Home() {
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [recognizer, setRecognizer] = useState<SpeechCommandRecognizer>(
    create(
      "BROWSER_FFT",
      undefined,
      "http://localhost:3000/tf_model/metal-or-not/model.json",
      "http://localhost:3000/tf_model/metal-or-not/metadata.json"
    )
  );
  const [labels, setLabels] = useState<string[]>([]);
  const [predictionResult, setPredictionResult] = useState<{}>({});
  const [stream, setStream] = useState<MediaStream | null>(null);

  // モデルをtfjsで読み込む
  useEffect(() => {
    tf.setBackend("webgl");
    (async () => {
      await recognizer.ensureModelLoaded();
      setRecognizer(recognizer);
      setLabels(recognizer.wordLabels());
    })();
  }, [recognizer]);

  // オーディオインプットの許可を求める
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        setStream(stream);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // audio inputの読み込み、モデルの読み込みが完了したら推論スタート
  useEffect(() => {
    if (recognizer === null || stream === null) {
      return;
    }
    try {
      if (recognizer.isListening()) {
        return;
      }
      recognizer.listen(
        async (result) => {
          const scores = result.scores;
          setPredictionResult((prev) => ({ ...prev, ...result.scores }));
        },
        {
          includeSpectrogram: true, // in case listen should return result.spectrogram
          probabilityThreshold: 0.75,
          invokeCallbackOnNoiseAndUnknown: true,
          overlapFactor: 0.5, // probably want between 0.5 and 0.75. More info in README
        }
      );
    } catch (e) {
      console.error(e);
    }
    // Stop the recognition in 5 seconds.
    setTimeout(() => recognizer.stopListening(), 5000);
  }, [labels, recognizer, stream]);

  return (
    <>
      <h1>Metal🤘 or not🎹</h1>
      {recognizer && stream ? (
        <div>
          <h2>Ready to evaluate.</h2>
          <table>
            <thead>
              <tr>
                <th>label</th>
                <th>probability</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((label, i) => (
                <tr key={i}>
                  <td>{label}</td>
                  <td>
                    <div
                      style={{
                        width: predictionResult[i] * 100 + "%",
                        height: "40px",
                        backgroundColor: "red",
                      }}
                    ></div>
                    <div>{Math.round(predictionResult[i] * 10000) / 100} %</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Loading />
      )}
    </>
  );
}
