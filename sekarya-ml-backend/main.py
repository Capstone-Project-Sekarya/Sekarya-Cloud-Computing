from flask import Flask, request, jsonify
from waitress import serve
import os
import numpy as np
import tensorflow as tf
from keras.utils import load_img, img_to_array
import json

# Load the ML model
model = tf.keras.models.load_model('./h5/vgg19_model.h5')

# Image labels
labels = {0: 'AI_GENERATED',
          1: "NON_AI_GENERATED"}

# Used to preprocess images into array before predicting them
def preprocess_image(image_path):
    image = load_img(image_path, target_size=(224, 224))
    image = img_to_array(image)
    image = image.reshape((1, image.shape[0], image.shape[1], image.shape[2]))
    return image

# Used to predict the images' class
def predict_image(image):
    prediction = model.predict(image, verbose=0)
    return labels.get(prediction[0, 0])

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1000 * 1000

@app.route("/predict", methods=['POST'])
def index():
    if request.method == 'POST':
        # Mengambil Kunci API dari Request Header
        key = request.headers.get('api-key')
        # Jika Kunci API Benar
        if (key == api_key):
            # Try (jika request valid)
            try:
                image_file = request.files['image']
                image_file.save('uploaded_image.jpg')

                image = preprocess_image('uploaded_image.jpg')
                prediksi_label = predict_image(image)

                result = {'predicted_class': prediksi_label}
                return jsonify(result)
            # catch (jika request tidak valid)
            except:
                return jsonify({"status": "bad request"})
        # Jika Kunci API Salah
        else:
            return jsonify({"status": "unauthorized"})


# Memulai Server
if __name__ == "__main__":
    with open('./private/key.json', 'r') as fileKey:
        api_key = json.load(fileKey).get('key')

    print("Server: http://0.0.0.0:8080")
    serve(app, host="0.0.0.0", port=8080)
