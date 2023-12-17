import os
import numpy as np
import tensorflow as tf
from keras.utils import load_img, img_to_array

# Load the ML model
model = tf.keras.models.load_model('h5/model.h5')

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

# Load the image examples
absolute_path = os.path.abspath('./test_images')
image_paths = [os.path.join(absolute_path, image_path) for image_path in os.listdir('./test_images')]

# Predict all of the images
for image_path in image_paths:
    image = preprocess_image(image_path)
    prediction = predict_image(image)
    print(prediction)
