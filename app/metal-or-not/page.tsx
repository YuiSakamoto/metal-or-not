"use client";

import { useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import {
  create,
  SpeechCommandRecognizer,
} from "@tensorflow-models/speech-commands";

import Loading from "./loading";

interface PredictResult {
  [key: number]: Float32Array;
}

export default function Home() {
  const fqdn = process.env.VERCEL_URL || "http://localhost:3000";
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [recognizer, setRecognizer] = useState<SpeechCommandRecognizer>(
    create(
      "BROWSER_FFT",
      undefined,
      `${fqdn}/tf_model/metal-or-not/model.json`,
      `${fqdn}/tf_model/metal-or-not/metadata.json`
    )
  );
  const [labels, setLabels] = useState<string[]>([]);
  const [predictionResult, setPredictionResult] = useState<PredictResult>({
    0: new Float32Array(0),
    1: new Float32Array(0),
    2: new Float32Array(0),
  });
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
          const scores = result.scores as PredictResult;
          setPredictionResult((prev) => ({ ...prev, ...scores }));
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
    setTimeout(() => recognizer.stopListening(), 60000);
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
                        width: (predictionResult[i] as any) * 100 + "%",
                        height: "40px",
                        backgroundColor: "red",
                      }}
                    ></div>
                    <div>
                      {Math.round((predictionResult[i] as any) * 10000) / 100} %
                    </div>
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
