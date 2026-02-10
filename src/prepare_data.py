import pandas as pd
import numpy as np

def load_and_label(filename, posture, activity):
    df = pd.read_csv(filename)
    df["posture"] = posture
    df["activity"] = activity
    return df

# List ALL your files (add new people here too)
files = [
    ("good_posture_jogging.csv", "good", "jogging"),
    ("bad_posture_jogging.csv",  "bad",  "jogging"),
    ("good_posture_walking.csv", "good", "walking"),
    ("bad_posture_walking.csv",  "bad",  "walking"),
    ("good_posture_sitting.csv", "good", "sitting"),
    ("bad_posture_sitting.csv",  "bad",  "sitting"),
    # person2_xxx.csv, person3_xxx.csv, ...
]

fs = 50.0
window_size = int(2 * fs)
step_size = int(1 * fs)

feature_rows = []

for fname, posture, activity in files:
    df = pd.read_csv(fname)
    df = df.sort_values("timestamp").reset_index(drop=True)

    for start in range(0, len(df) - window_size + 1, step_size):
        end = start + window_size
        w = df.iloc[start:end]

        dt = (w["timestamp"].iloc[-1] - w["timestamp"].iloc[0]) / 1000.0
        if dt < 1.5 or dt > 2.5:
            continue

        feats = {}
        for col in ["ax", "ay", "az", "gx", "gy", "gz"]:
            feats[f"{col}_mean"] = w[col].mean()
            feats[f"{col}_std"] = w[col].std()

        acc_mag = np.sqrt(w["ax"]**2 + w["ay"]**2 + w["az"]**2)
        gyro_mag = np.sqrt(w["gx"]**2 + w["gy"]**2 + w["gz"]**2)

        feats["acc_mag_mean"] = acc_mag.mean()
        feats["acc_mag_std"] = acc_mag.std()
        feats["gyro_mag_mean"] = gyro_mag.mean()
        feats["gyro_mag_std"] = gyro_mag.std()

        feats["posture"] = posture
        feats["activity"] = activity

        feature_rows.append(feats)

feat_df = pd.DataFrame(feature_rows)
print("Windows:", len(feat_df))
print(feat_df["posture"].value_counts())
feat_df.to_csv("imu_features_all.csv", index=False)