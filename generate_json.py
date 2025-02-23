import os
import json
import google.generativeai as genai

# Configuration de l'API Gemini avec votre clé
genai.configure(api_key="AIzaSyDLyCHNlwrtbcpAPXcRNsYueX0Tk5v8u50")

def upload_to_gemini(path, mime_type=None):
    """
    Upload un fichier vers Gemini et retourne l'objet fichier.
    """
    file = genai.upload_file(path, mime_type=mime_type)
    print(f"Fichier '{file.display_name}' uploadé avec URI: {file.uri}")
    return file

# Configuration du modèle Gemini
generation_config = {
    "temperature": 0.9,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=generation_config,
)

def analyze_image_with_gemini(image_path):
    """
    Analyse une image via l'API Gemini.
    Upload l'image, envoie un prompt pour extraire les objets présents
    et retourne la liste des tags/labels extraits.
    """
    # Upload de l'image (ici supposée en JPEG, adapter si besoin)
    file = upload_to_gemini(image_path, mime_type="image/jpeg")
    
    # Construction du prompt avec un exemple de format attendu
    prompt = [
        "Extraire les objets présents dans l'image et lister ces objets par ordre alphabétique.",
        "Image: ",
        file,
        "Liste des Objets:",
    ]
    
    response = model.generate_content(prompt)
    print("Réponse du modèle:", response.text)
    
    # Extraction des tags : chaque ligne débutant par '-' est considérée comme un tag
    tags = []
    for line in response.text.split("\n"):
        line = line.strip()
        if line.startswith("-"):
            tag = line.lstrip("-").strip()
            if tag:
                tags.append(tag)
    return tags

def main():
    photos_dir = "photos"
    json_path = "photos.json"
    
    # Charger les données existantes si le fichier photos.json existe déjà
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        data = {}
    
    # Récupération de tous les fichiers image dans le dossier "photos"
    image_files = [f for f in os.listdir(photos_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp'))]
    
    for filename in image_files:
        image_path = os.path.join(photos_dir, filename)
        print(f"Analyse de l'image {filename}...")
        try:
            tags = analyze_image_with_gemini(image_path)
            # Mise à jour ou création de l'entrée pour l'image dans le JSON
            data[filename] = {
                "filename": filename,
                "tags": tags
            }
        except Exception as e:
            print(f"Erreur lors de l'analyse de {filename} : {e}")
    
    # Sauvegarde des résultats dans photos.json
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Analyse terminée. Les résultats ont été sauvegardés dans", json_path)

if __name__ == "__main__":
    main()
