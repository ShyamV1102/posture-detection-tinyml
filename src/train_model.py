import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

feat_df = pd.read_csv("imu_features_all.csv")
feat_df["posture_label"] = (feat_df["posture"] == "bad").astype(np.int32)

feature_cols = [c for c in feat_df.columns if c not in ["posture", "activity", "posture_label"]]
X = feat_df[feature_cols].values
y = feat_df["posture_label"].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s = scaler.transform(X_test)

input_dim = X_train_s.shape[1]
print("Input dim:", input_dim)

model = tf.keras.Sequential([
    tf.keras.layers.Dense(32, activation="relu", input_shape=(input_dim,)),
    tf.keras.layers.Dense(16, activation="relu"),
    tf.keras.layers.Dense(1, activation="sigmoid")
])

model.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
              loss="binary_crossentropy",
              metrics=["accuracy"])

history = model.fit(
    X_train_s, y_train,
    validation_data=(X_test_s, y_test),
    epochs=40,
    batch_size=32,
    verbose=1
)

loss, acc = model.evaluate(X_test_s, y_test, verbose=0)
print("Test accuracy:", acc)

# Save scaler
np.savez("scaler_params.npz",
         mean=scaler.mean_.astype(np.float32),
         scale=scaler.scale_.astype(np.float32))

# Convert to TFLite
@tf.function(input_signature=[tf.TensorSpec(shape=[1, input_dim], dtype=tf.float32)])
def model_predict(x):
    return model(x, training=False)

converter = tf.lite.TFLiteConverter.from_concrete_functions(
    [model_predict.get_concrete_function()]
)
converter.optimizations = [tf.lite.Optimize.DEFAULT]

tflite_model = converter.convert()
with open("posture_model.tflite", "wb") as f:
    f.write(tflite_model)

print("TFLite size:", len(tflite_model))