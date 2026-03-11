#include <Arduino_LSM9DS1.h>
#include <TensorFlowLite.h>
#include <ArduinoBLE.h>
#include "tensorflow/lite/micro/all_ops_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"
#include "posture_model_data.h"
#include "scaler_data.h"

// TFLite globals
const tflite::Model* model = nullptr;
tflite::MicroInterpreter* interpreter = nullptr;
TfLiteTensor* input = nullptr;
TfLiteTensor* output = nullptr;

constexpr int kTensorArenaSize = 8 * 1024;
uint8_t tensor_arena[kTensorArenaSize];

// Window config
const int WINDOW_SIZE = 100;  // 2s at 50Hz
// const int FEATURE_DIM = 14;   // 6*2 (mean+std) + 2 (acc_mag) + 2 (gyro_mag) - should match your model

// ***** NEW: model output config *****
// 8 outputs = posture+activity classes as described above
const int NUM_CLASSES = 8;

// ***** NEW: BLE definitions *****
BLEService postureService("12345678-1234-5678-1234-56789abcdef0");
BLEStringCharacteristic postureChar(
  "12345678-1234-5678-1234-56789abcdef1",
  BLERead | BLENotify,
  32  // max length of "jogging,good" etc.
);

float ax_buf[WINDOW_SIZE], ay_buf[WINDOW_SIZE], az_buf[WINDOW_SIZE];
float gx_buf[WINDOW_SIZE], gy_buf[WINDOW_SIZE], gz_buf[WINDOW_SIZE];
int buf_idx = 0;

// void setup() {
//   Serial.begin(115200);
//   delay(2000);  // Give time for Serial to stabilize

//   Serial.println("=== Posture Detector Starting ===");

//   Serial.println("Initializing IMU...");
//   if (!IMU.begin()) {
//     Serial.println("ERROR: Failed to initialize IMU!");
//     while (1) {
//       delay(1000);
//     }
//   }
//   Serial.println("IMU OK");

//   Serial.println("Loading TFLite model...");
//   model = tflite::GetModel(posture_model_tflite);
//   if (model->version() != TFLITE_SCHEMA_VERSION) {
//     Serial.println("ERROR: Model schema mismatch!");
//     Serial.print("Model version: ");
//     Serial.println(model->version());
//     Serial.print("Expected: ");
//     Serial.println(TFLITE_SCHEMA_VERSION);
//     while (1) {
//       delay(1000);
//     }
//   }
//   Serial.println("Model loaded OK");

//   Serial.println("Setting up interpreter...");
//   static tflite::AllOpsResolver resolver;
//   static tflite::MicroInterpreter static_interpreter(
//       model, resolver, tensor_arena, kTensorArenaSize);
//   interpreter = &static_interpreter;

//   Serial.println("Allocating tensors...");
//   TfLiteStatus allocate_status = interpreter->AllocateTensors();
//   if (allocate_status != kTfLiteOk) {
//     Serial.println("ERROR: AllocateTensors() failed!");
//     Serial.print("Status code: ");
//     Serial.println(allocate_status);
//     while (1) {
//       delay(1000);
//     }
//   }
//   Serial.println("Tensors allocated OK");

//   input = interpreter->input(0);
//   output = interpreter->output(0);

//   Serial.print("Input shape: ");
//   Serial.println(input->dims->data[1]);
//   Serial.print("Expected features: ");
//   Serial.println(FEATURE_DIM);

//   Serial.println("\n=== Setup Complete ===");
//   Serial.println("Collecting data...\n");
// }
void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("=== Posture Detector Starting ===");

  Serial.println("Initializing IMU...");
  if (!IMU.begin()) {
    Serial.println("ERROR: Failed to initialize IMU!");
    while (1) { delay(1000); }
  }
  Serial.println("IMU OK");

  Serial.println("Loading TFLite model...");
  model = tflite::GetModel(posture_model_tflite);
  if (model->version() != TFLITE_SCHEMA_VERSION) {
    Serial.println("ERROR: Model schema mismatch!");
    while (1) { delay(1000); }
  }
  Serial.println("Model loaded OK");

  Serial.println("Setting up interpreter...");
  static tflite::AllOpsResolver resolver;
  static tflite::MicroInterpreter static_interpreter(
    model, resolver, tensor_arena, kTensorArenaSize);
  interpreter = &static_interpreter;

  Serial.println("Allocating tensors...");
  TfLiteStatus allocate_status = interpreter->AllocateTensors();
  if (allocate_status != kTfLiteOk) {
    Serial.println("ERROR: AllocateTensors() failed!");
    while (1) { delay(1000); }
  }
  Serial.println("Tensors allocated OK");

  input = interpreter->input(0);
  output = interpreter->output(0);

  Serial.print("Input shape: ");
  Serial.println(input->dims->data[1]);
  Serial.print("Expected features: ");
  Serial.println(FEATURE_DIM);

  // ***** NEW: BLE init *****
  Serial.println("Starting BLE...");
  if (!BLE.begin()) {
    Serial.println("ERROR: starting BLE failed!");
    while (1) { delay(1000); }
  }

  BLE.setDeviceName("PostureBand");
  BLE.setLocalName("PostureBand");
  BLE.setAdvertisedService(postureService);

  postureService.addCharacteristic(postureChar);
  BLE.addService(postureService);

  postureChar.writeValue("booting");
  BLE.advertise();
  Serial.println("BLE advertising started");

  Serial.println("\n=== Setup Complete ===");
  Serial.println("Collecting data...\n");
}


void loop() {
  BLE.poll();

  if (IMU.accelerationAvailable() && IMU.gyroscopeAvailable()) {
    float ax, ay, az, gx, gy, gz;
    IMU.readAcceleration(ax, ay, az);
    IMU.readGyroscope(gx, gy, gz);

    ax_buf[buf_idx] = ax;
    ay_buf[buf_idx] = ay;
    az_buf[buf_idx] = az;
    gx_buf[buf_idx] = gx;
    gy_buf[buf_idx] = gy;
    gz_buf[buf_idx] = gz;

    buf_idx++;

    if (buf_idx >= WINDOW_SIZE) {
      // Compute features
      float features[FEATURE_DIM];
      compute_features(features);

      // Run inference
      for (int i = 0; i < FEATURE_DIM; i++) {
        input->data.f[i] = features[i];
      }

      // if (interpreter->Invoke() != kTfLiteOk) {
      //   Serial.println("Invoke failed");
      //   return;
      // }

      // float bad_posture_prob = output->data.f[0];

      // Serial.print("Bad posture probability: ");
      // Serial.println(bad_posture_prob);

      // if (bad_posture_prob > 0.7) {
      //   Serial.println("⚠️  SLOUCHING DETECTED!");
      // } else {
      //   Serial.println("✓ Good posture");
      // }

      // new code
      if (interpreter->Invoke() != kTfLiteOk) {
        Serial.println("Invoke failed");
        return;
      }

      // ----- NEW: find best class -----
      int best_idx = 0;
      float best_prob = output->data.f[0];
      for (int i = 1; i < NUM_CLASSES; i++) {
        float p = output->data.f[i];
        if (p > best_prob) {
          best_prob = p;
          best_idx = i;
        }
      }

      const char* activity_str = "unknown";
      const char* posture_str = "unknown";

      // Map class index to (activity, posture)
      switch (best_idx) {
        case 0:
          activity_str = "sitting";
          posture_str = "bad";
          break;
        case 1:
          activity_str = "sitting";
          posture_str = "good";
          break;
        case 2:
          activity_str = "standing";
          posture_str = "bad";
          break;
        case 3:
          activity_str = "standing";
          posture_str = "good";
          break;
        case 4:
          activity_str = "walking";
          posture_str = "bad";
          break;
        case 5:
          activity_str = "walking";
          posture_str = "good";
          break;
        case 6:
          activity_str = "jogging";
          posture_str = "bad";
          break;
        case 7:
          activity_str = "jogging";
          posture_str = "good";
          break;
        default:
          break;
      }

      Serial.print("Class idx: ");
      Serial.print(best_idx);
      Serial.print("  prob: ");
      Serial.println(best_prob);

      Serial.print("Activity: ");
      Serial.print(activity_str);
      Serial.print(" | Posture: ");
      Serial.println(posture_str);

      if (BLE.connected()) {
        String msg = String(activity_str) + "," + posture_str;  // e.g. "walking,bad"
        postureChar.writeValue(msg);
      }
      // new code end

      buf_idx = WINDOW_SIZE / 2;  // 50% overlap
      // Shift buffer
      for (int i = 0; i < WINDOW_SIZE / 2; i++) {
        ax_buf[i] = ax_buf[i + WINDOW_SIZE / 2];
        ay_buf[i] = ay_buf[i + WINDOW_SIZE / 2];
        az_buf[i] = az_buf[i + WINDOW_SIZE / 2];
        gx_buf[i] = gx_buf[i + WINDOW_SIZE / 2];
        gy_buf[i] = gy_buf[i + WINDOW_SIZE / 2];
        gz_buf[i] = gz_buf[i + WINDOW_SIZE / 2];
      }
    }
  }
}

void compute_features(float* features) {
  // Mean and std for each axis (12 features)
  features[0] = compute_mean(ax_buf, WINDOW_SIZE);
  features[1] = compute_std(ax_buf, WINDOW_SIZE, features[0]);
  features[2] = compute_mean(ay_buf, WINDOW_SIZE);
  features[3] = compute_std(ay_buf, WINDOW_SIZE, features[2]);
  features[4] = compute_mean(az_buf, WINDOW_SIZE);
  features[5] = compute_std(az_buf, WINDOW_SIZE, features[4]);
  features[6] = compute_mean(gx_buf, WINDOW_SIZE);
  features[7] = compute_std(gx_buf, WINDOW_SIZE, features[6]);
  features[8] = compute_mean(gy_buf, WINDOW_SIZE);
  features[9] = compute_std(gy_buf, WINDOW_SIZE, features[8]);
  features[10] = compute_mean(gz_buf, WINDOW_SIZE);
  features[11] = compute_std(gz_buf, WINDOW_SIZE, features[10]);

  // Acc and gyro magnitude (4 features: acc_mean, acc_std, gyro_mean, gyro_std)
  float acc_mag_sum = 0, acc_mag_sq_sum = 0;
  float gyro_mag_sum = 0, gyro_mag_sq_sum = 0;

  for (int i = 0; i < WINDOW_SIZE; i++) {
    float acc_mag = sqrt(ax_buf[i] * ax_buf[i] + ay_buf[i] * ay_buf[i] + az_buf[i] * az_buf[i]);
    float gyro_mag = sqrt(gx_buf[i] * gx_buf[i] + gy_buf[i] * gy_buf[i] + gz_buf[i] * gz_buf[i]);
    acc_mag_sum += acc_mag;
    acc_mag_sq_sum += acc_mag * acc_mag;
    gyro_mag_sum += gyro_mag;
    gyro_mag_sq_sum += gyro_mag * gyro_mag;
  }

  float acc_mag_mean = acc_mag_sum / WINDOW_SIZE;
  float gyro_mag_mean = gyro_mag_sum / WINDOW_SIZE;

  features[12] = acc_mag_mean;
  features[13] = sqrt(acc_mag_sq_sum / WINDOW_SIZE - acc_mag_mean * acc_mag_mean);
  features[14] = gyro_mag_mean;                                                        // Added
  features[15] = sqrt(gyro_mag_sq_sum / WINDOW_SIZE - gyro_mag_mean * gyro_mag_mean);  // Added

  // Apply scaling (normalize)
  for (int i = 0; i < FEATURE_DIM; i++) {
    features[i] = (features[i] - scaler_mean[i]) / scaler_scale[i];
  }
}

float compute_mean(float* data, int len) {
  float sum = 0;
  for (int i = 0; i < len; i++) sum += data[i];
  return sum / len;
}

float compute_std(float* data, int len, float mean) {
  float sum_sq = 0;
  for (int i = 0; i < len; i++) {
    float diff = data[i] - mean;
    sum_sq += diff * diff;
  }
  return sqrt(sum_sq / len);
}
