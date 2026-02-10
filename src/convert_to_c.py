# Convert TFLite model to C header + scaler to C header

import pathlib

# 1. Convert TFLite model to C array
path = pathlib.Path("posture_model.tflite")
data = path.read_bytes()

with open("posture_model_data.h", "w") as f:
    f.write('#ifndef POSTURE_MODEL_DATA_H\n')
    f.write('#define POSTURE_MODEL_DATA_H\n\n')
    f.write('#include <cstdint>\n\n')

    f.write('alignas(8) const unsigned char posture_model_tflite[] = {\n')
    for i, b in enumerate(data):
        if i % 12 == 0:
            f.write('  ')
        f.write(f'0x{b:02x}')
        if i < len(data) - 1:
            f.write(', ')
        if i % 12 == 11:
            f.write('\n')
    f.write('\n};\n\n')
    f.write(f'const unsigned int posture_model_tflite_len = {len(data)};\n\n')
    f.write('#endif\n')

print(f"Generated posture_model_data.h ({len(data)} bytes)")

# 2. Convert scaler params to C header
scaler_data = np.load("scaler_params.npz")
mean = scaler_data["mean"]
scale = scaler_data["scale"]

with open("scaler_data.h", "w") as f:
    f.write("#ifndef SCALER_DATA_H\n")
    f.write("#define SCALER_DATA_H\n\n")
    f.write(f"const int FEATURE_DIM = {len(mean)};\n\n")
    f.write("const float scaler_mean[] = {")
    f.write(", ".join([f"{m:.6f}f" for m in mean]))
    f.write("};\n\n")
    f.write("const float scaler_scale[] = {")
    f.write(", ".join([f"{s:.6f}f" for s in scale]))
    f.write("};\n\n")
    f.write("#endif\n")

print("Generated scaler_data.h")

# 3. Download both header files
from google.colab import files
files.download("posture_model_data.h")
files.download("scaler_data.h")
