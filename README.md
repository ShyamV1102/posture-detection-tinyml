# PostureSense — TinyML Posture Detection

A full end-to-end posture monitoring system that runs a TensorFlow Lite model directly on an **Arduino Nano 33 BLE**, classifies posture and activity in real time, and streams results over Bluetooth to an **Android mobile app** that stores and displays your session history.

---

## How It Works

```
IMU (LSM9DS1)
     │
     ▼
 100-sample window (2s at 50Hz)
     │
     ▼
 16 statistical features
 (mean + std per axis, acc/gyro magnitude)
     │
     ▼
 StandardScaler normalization
     │
     ▼
 TFLite model (on-device inference)
     │
     ▼
 6-class output → best class selected
 e.g. "sitting, bad" / "walking, good"
     │
     ▼
 BLE notification (string) → Android App
     │
     ▼
 Supabase (auth + readings database)
```

---

## Repository Structure

```
posture-detection-tinyml/
│
├── arduino/posture_inference/      # Arduino sketch + model + scaler headers
│   ├── posture_inference.ino       # Main sketch — IMU reading, inference, BLE broadcast
│   ├── posture_model_data.h        # TFLite model exported as C byte array
│   └── scaler_data.h               # StandardScaler mean + scale values (16 features)
│
├── data/                           # Raw IMU sensor recordings (CSV)
│
├── models/                         # Exported .tflite model files
│
├── notebooks/                      # Google Colab training notebook
│   └── posture_model.ipynb         # Data loading → feature engineering → training → export
│
├── src/                            # Python utilities (data collection, preprocessing)
│
├── mobile-app/                     # React + Capacitor Android app
│   ├── src/
│   │   ├── App.jsx                 # Full app — auth, BLE, dashboard, history, profile
│   │   ├── supabase.js             # Supabase client (not committed — see setup)
│   │   └── main.jsx
│   ├── android/                    # Native Android project (Capacitor)
│   ├── .env.example                # Environment variable template
│   ├── capacitor.config.json
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## Classes

The model outputs 8 classes representing combinations of activity and posture:

| Index | Activity | Posture |
|-------|----------|---------|
| 0 | sitting | bad |
| 1 | sitting | good |
| 2 | standing | bad |
| 3 | standing | good |
| 4 | walking | bad |
| 5 | walking | good |
| 6 | jogging | bad |
| 7 | jogging | good |

---

## Features

**16 statistical features** are computed per 2-second window:

- Mean and standard deviation for each IMU axis: ax, ay, az, gx, gy, gz (12 features)
- Accelerometer magnitude mean + std (2 features)
- Gyroscope magnitude mean + std (2 features)

All features are normalized using a StandardScaler fitted on training data, with the mean and scale values exported to `scaler_data.h`.

---

## BLE Protocol

| Property | Value |
|----------|-------|
| Device name | `PostureBand` |
| Service UUID | `12345678-1234-5678-1234-56789abcdef0` |
| Characteristic UUID | `12345678-1234-5678-1234-56789abcdef1` |
| Mode | BLERead + BLENotify |
| Format | UTF-8 string e.g. `sitting,good` or `walking,bad` |
| Cadence | Every ~2 seconds (50% window overlap) |

---

## Mobile App

Built with **React + Vite + Capacitor** for Android. Uses the `@capacitor-community/bluetooth-le` plugin for native BLE and **Supabase** for authentication and data storage.

### Screens

- **Auth** — email/password login and registration, persistent sessions
- **BLE** — scan and connect to PostureBand
- **Dashboard** — live posture status, activity label, session timer, posture score, alert count, live timeline chart
- **History** — per-session breakdown and weekly posture score trend, all loaded from Supabase
- **Profile** — lifetime stats (overall score, total time monitored, sessions, alerts)

### Database Schema (Supabase)

```sql
create table readings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  session_id text not null,
  activity text not null,
  posture text not null,
  recorded_at timestamp with time zone default now()
);

alter table readings enable row level security;
create policy "Users see own readings" on readings
  for all using (auth.uid() = user_id);
```

---

## Setup

### Arduino

1. Install libraries in Arduino IDE: `Arduino_LSM9DS1`, `TensorFlowLite`, `ArduinoBLE`
2. Open `arduino/posture_inference/posture_inference.ino`
3. Flash to Arduino Nano 33 BLE

### Mobile App

```bash
cd mobile-app
npm install

# Copy and fill in your Supabase credentials
cp .env.example .env
# Edit .env with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm run build
npx cap sync
npx cap open android    # opens Android Studio
```

From Android Studio, hit **Run** to sideload to your phone or **Build → Build APK** for a distributable file.

### Training Your Own Model

Open `notebooks/posture_model.ipynb` in Google Colab. The notebook covers:

1. Loading raw IMU CSV recordings from `data/`
2. Windowing and feature extraction (matching the Arduino implementation exactly)
3. StandardScaler fitting and export to `scaler_data.h`
4. Model training and evaluation
5. TFLite conversion and export to `posture_model_data.h`

---

## Hardware

- Arduino Nano 33 BLE
- Worn on upper back or chest strap for best posture signal

---

## Stack

| Layer | Technology |
|-------|------------|
| Sensor | Arduino Nano 33 BLE (LSM9DS1 IMU) |
| On-device ML | TensorFlow Lite Micro |
| Wireless | Bluetooth Low Energy (ArduinoBLE) |
| Mobile | React, Vite, Capacitor |
| BLE plugin | @capacitor-community/bluetooth-le |
| Auth + Database | Supabase |
| Training | Python, TensorFlow, Google Colab |
