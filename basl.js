(function () {
  var win = this;
  if (!win.hasOwnProperty("basl")) {
    win.BASL_WEB = (options) => {
      const canvas = document.createElement("canvas");
      canvas.id = "basl_output_canvas";
      canvas.className = "monitorscreen";
      canvas.width = 1280;
      canvas.height = 720;
      canvas.style.transform = "rotateY(180deg)";
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.right = "0";
      canvas.style.height = "144px";
      canvas.style.width = "256px";
      canvas.style.border = "2px dashed rgb(52, 222, 59)";
      canvas.style.padding = "4px";
      const canvasCtx = canvas.getContext("2d");
      const videoElement = document.createElement("video");
      const button = document.createElement("button");
      button.id = "basl_button";
      button.disabled = true;
      button.innerHTML = "Getting dependencies<br>for BASL...";
      button.style.position = "absolute";
      button.style.bottom = "20%";
      button.style.left = "50vw";
      button.style.padding = "16px";
      const appElement = document.createElement("div");
      const pointer = document.createElement("div");
      pointer.setAttribute("v-bind:style", "pointerStyle");
      appElement.id = "basl_app";
      document.body.appendChild(canvas);
      document.body.appendChild(appElement);
      appElement.appendChild(pointer);
      document.body.appendChild(button);
      let buttonOn = true;

      videoElement.width = 1280;
      videoElement.height = 720;
      videoElement.autoplay = true;

      function loadScript(url) {
        return new Promise(function (resolve, reject) {
          var newScript = document.createElement("script");
          newScript.onerror = function (err) {
            reject(err, s);
          };
          newScript.onload = function () {
            resolve();
          };
          document.head.appendChild(newScript);
          newScript.src = url;
        });
      }

      const dependencies = [
        "https://cdnjs.cloudflare.com/ajax/libs/tensorflow/3.2.0/tf.min.js",
        "https://unpkg.com/@tensorflow/tfjs-converter@3.2.0/dist/tf-converter.js",
        "https://cdn.jsdelivr.net/npm/vue@2",
        "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
        "https://cdn.plot.ly/plotly-latest.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/brain.js/2.0.0-beta.1/brain-browser.min.js",
        "https://unpkg.com/@tensorflow-models/handpose@0.0.7/dist/handpose.js",
      ];

      Promise.all(dependencies.map(loadScript)).then((x) => {
        button.disabled = false;
        button.innerText = "Start BASL";
        button.addEventListener("click", () => {
          button.innerHTML = "Loading BASL...<br>Please wait";
          start();
        });

        var instance = new Vue({
          el: "#basl_app",
          data: {
            recordingData: [],
            runGestureModel: false,
            captureTimeFrameLength: 21,
            normalizeData: true,
            showPlotAfterRecognition: false,
            predictedGesture: {
              circle: 0.0,
              idle: 0.0,
            },
            predictionText: "",
            networkLoaded: false,
            pointerSize: 48,
            pointerLocation: [0, 0],
            pointerColor: "#34de3b",
            net: new brain.NeuralNetworkGPU(), // Fallback to CPU?
            handModel: null,
            options: {
              boundElement: options.boundElement,
              onPredictionComplete: options.onPredictionComplete,
              plotElement: options.plotElement,
              outputElement: options.outputElement,
            },
          },
          computed: {
            pointerStyle() {
              return {
                height: `${this.pointerSize}px`,
                width: `${this.pointerSize}px`,
                position: "absolute",
                "background-color": this.pointerColor,
                "border-radius": "50%",
                "z-index": 1,
                left: `${this.pointerLocation[0]}px`,
                top: `${this.pointerLocation[1]}px`,
              };
            },
            circleConfidence() {
              return `Circle: ${
                parseFloat(this.predictedGesture.circle).toFixed(2) + "%"
              }`;
            },
            idleConfidence() {
              return `Idle ${
                parseFloat(this.predictedGesture.idle).toFixed(2) + "%"
              }`;
            },
          },
          methods: {
            loadNetwork: function () {
              fetch("./45_Idle_Circle.json")
                .then((response) => {
                  return response.json();
                })
                .then((json) => {
                  this.net.fromJSON(json);
                  this.networkLoaded = true;
                });
            },
            runNetwork: function () {
              this.predictedGesture = this.net.run(
                this.getFlattenedNormalizedData()
              );
              if (this.showPlotAfterRecognition) {
                this.plot();
              }
              this.recordingData = [];
            },
            getFlattenedNormalizedData: function () {
              let flattenedArray = this.getTwoDimensionData().reduce(
                (arr, curr) => {
                  arr.push(curr[0]);
                  arr.push(curr[1]);
                  return arr;
                },
                []
              );
              return flattenedArray;
            },
            getTwoDimensionData: function () {
              return this.normalizeData
                ? this.recordingData.map((coord) => [
                    scale(0, 1280, 0.0, 1.0, coord[0]),
                    scale(0, 720, 0.0, 1.0, coord[1]),
                  ])
                : this.recordingData;
            },
            getRecordedDataPoints: function () {
              let data = { x: [], y: [], z: [] };
              let dataSet = this.getTwoDimensionData();
              dataSet.forEach((coord, index) => {
                data.x.push(coord[0]);
                data.y.push(coord[1]);
                data.z.push(index);
              });
              return data;
            },
            plot: function () {
              let coordData = this.getRecordedDataPoints();
              var data = [
                {
                  x: coordData.x,
                  y: coordData.y,
                  z: coordData.z,
                  mode: "lines",
                  type: "scatter3d",
                  line: {
                    color: "rgb(23, 190, 207)",
                    size: 2,
                  },
                },
              ];
              var layout = {
                autosize: true,
                height: 350,
                scene: {
                  aspectratio: {
                    x: 1,
                    y: 1,
                    z: 1,
                  },
                  camera: {
                    center: {
                      x: 0,
                      y: 0,
                      z: 0,
                    },
                    eye: {
                      x: 1.25,
                      y: 1.25,
                      z: 1.25,
                    },
                    up: {
                      x: 0,
                      y: 1,
                      z: 0,
                    },
                  },
                  xaxis: {
                    type: "linear",
                    zeroline: false,
                    range: [0, 1],
                  },
                  yaxis: {
                    type: "linear",
                    zeroline: false,
                    range: [0, 1],
                  },
                  zaxis: {
                    type: "linear",
                    zeroline: false,
                  },
                },
                title: "Captured temporal spatial data",
                width: 350,
              };

              Plotly.react(this.options.plotElement, data, layout);
            },
          },
        });

        const LANDMARKS = {
          WRIST: 0,
          THUMB_FIRST_JOINT: 1,
          THUMB_SECOND_JOINT: 2,
          THUMB_THIRD_JOIN: 3,
          THUMB_POINT: 4,
          INDEX_FIRST_JOINT: 5,
          INDEX_SECOND_JOINT: 6,
          INDEX_THIRD_JOIN: 7,
          INDEX_POINT: 8,
          MIDDLE_FIRST_JOINT: 9,
          MIDDLE_SECOND_JOINT: 10,
          MIDDLE_THIRD_JOINT: 11,
          MIDDLE_POINT: 12,
          RING_FIRST_JOINT: 13,
          RING_SECOND_JOINT: 14,
          RING_THIRD_JOIN: 15,
          RING_POINT: 16,
          PINKY_FIRST_JOINT: 17,
          PINKY_SECOND_JOINT: 18,
          PINKY_THIRD_JOIN: 19,
          PINKY_POINT: 20,
        };

        const scale = (
          input_start,
          input_end,
          output_start,
          output_end,
          input
        ) => {
          let slope =
            (1.0 * (output_end - output_start)) / (input_end - input_start);
          let output = output_start + slope * (input - input_start);
          return output;
        };

        const pointsTouch = (landmarks, idx1, idx2) => {
          let xy1 = landmarks[idx1];
          let xy2 = landmarks[idx2];
          return distance(xy1[0], xy1[1], xy2[0], xy2[1]) < 80;
        };

        const debounce = (func, wait, immediate) => {
          var timeout;
          return function () {
            var context = this,
              args = arguments;
            var later = function () {
              timeout = null;
              if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
          };
        };

        const distance = (x1, y1, x2, y2) =>
          Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

        const onClick = (element) => {
          instance.pointerColor = "rgba(52, 222, 59, 0.2);";
          setTimeout(() => {
            instance.pointerColor = "#34de3b";
          }, 100);
          if (element && element.click) {
            element.click();
          }
        };

        const onClickDebounce = debounce(onClick, 250, true);

        var isWithin = function (elem, x, y) {
          if (elem === null) return false;
          var bounding = elem.getBoundingClientRect();
          return (
            y >= bounding.top &&
            x >= bounding.left &&
            y <= bounding.bottom &&
            x <= bounding.right
          );
        };

        async function main() {
          canvasCtx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          const predictions = await instance.handModel.estimateHands(
            videoElement,
            true
          );
          if (predictions.length > 0) {
            if (
              instance.recordingData.length <= instance.captureTimeFrameLength
            ) {
              instance.recordingData.push(
                predictions[0].landmarks[LANDMARKS.THUMB_POINT]
              );
            }
            if (
              instance.runGestureModel &&
              instance.recordingData.length >= instance.captureTimeFrameLength
            ) {
              instance.runNetwork();
              if (instance.predictedGesture.circle > 0.6) {
                instance.predictionText = "Circle";
                instance.options.onPredictionComplete(videoElement);
                instance.runGestureModel = false;
              } else {
                instance.predictionText = "Idle";
              }
            }
            const palm = predictions[0].landmarks[LANDMARKS.THUMB_POINT];
            instance.pointerLocation = palm;

            if (
              !isWithin(instance.options.boundElement, palm[0], palm[1]) &&
              pointsTouch(
                predictions[0].landmarks,
                LANDMARKS.INDEX_POINT,
                LANDMARKS.THUMB_POINT
              )
            ) {
              onClickDebounce(document.elementFromPoint(palm[0], palm[1]));
            } else if (
              isWithin(instance.options.boundElement, palm[0], palm[1])
            ) {
              instance.options.boundElement.style.border = "1px solid yellow";
              instance.pointerSize -= 1;
              if (instance.pointerSize < 10) {
                document.elementFromPoint(palm[0], palm[1]).click();
              }
            } else {
              instance.pointerSize = 48;
              instance.options.boundElement.style.border = "1px solid";
            }
          }
        }

        const camera = new Camera(videoElement, {
          onFrame: async () => {
            if (buttonOn) {
              document.body.removeChild(button);
              buttonOn = false;
            }
            main();
            if (instance.options.outputElement) {
              instance.options.outputElement.innerHTML =
                instance.predictionText;
            }
          },
          width: 1280,
          height: 720,
        });

        async function start() {
          try {
            instance.loadNetwork();
            await tf.setBackend("webgl");
            instance.handModel = await handpose.load();
            camera.start();
          } catch (e) {
            console.log(e);
            button.innerHTML =
              "Error starting BASL.<br>Sometimes not all dependencies have been loaded.<br>Try again.";
            button.addEventListener("click", () => document.location.reload());
          }
        }
        win.BASL_instance = instance;
      });
    };
  }
}.call(this));
