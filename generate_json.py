import os
import json
from google.cloud import vision

# Assurez-vous d'avoir configuré l'authentification Google Cloud (par exemple via la variable d'environnement GOOGLE_APPLICATION_CREDENTIALS)
genai.configure(api_key="AIzaSyDLyCHNlwrtbcpAPXcRNsYueX0Tk5v8u50")
# Chemin vers le dossier photos
photos_dir = "photos"

# Liste tous les fichiers jpg, jpeg, png dans le dossier
image_files = [f for f in os.listdir(photos_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

# Initialisation du client de l'API Cloud Vision
client = vision.ImageAnnotatorClient()

# Dictionnaire pour stocker les tags par image
images_with_tags = {}

# Parcours de chaque image et appel de l'API pour récupérer les labels
for filename in image_files:
    path = os.path.join(photos_dir, filename)
    with open(path, "rb") as image_file:
        content = image_file.read()

    image = vision.Image(content=content)
    response = client.label_detection(image=image)

    # Vérifie s'il y a une erreur dans la réponse
    if response.error.message:
        raise Exception(f"Erreur lors de la détection pour {filename}: {response.error.message}")

    # Récupère la liste des labels
    tags = [label.description for label in response.label_annotations]
    images_with_tags[filename] = tags

# Sauvegarde le dictionnaire dans un fichier JSON formaté
with open(os.path.join(photos_dir, "images.json"), "w", encoding="utf-8") as f:
    json.dump(images_with_tags, f, ensure_ascii=False, indent=4)

print(f"Trouvé {len(image_files)} images avec des tags ajoutés")
