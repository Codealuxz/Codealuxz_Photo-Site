import os
from PIL import Image
import glob

# Configurations
PHOTOS_DIR = "photos"
THUMBNAIL_DIR = os.path.join(PHOTOS_DIR, "thumbnails")
THUMBNAIL_SIZE = (300, 300)  # Taille des miniatures en pixels

def create_thumbnail(image_path):
    try:
        with Image.open(image_path) as img:
            # Conserver le ratio d'aspect
            img.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
            
            # Créer le nom du fichier thumbnail
            filename = os.path.basename(image_path)
            thumbnail_path = os.path.join(THUMBNAIL_DIR, f"thumb_{filename}")
            
            # Sauvegarder la miniature
            img.save(thumbnail_path, quality=85, optimize=True)
            print(f"✓ Miniature créée : {thumbnail_path}")
    except Exception as e:
        print(f"❌ Erreur avec {image_path}: {str(e)}")

def main():
    # Créer le dossier thumbnails s'il n'existe pas
    os.makedirs(THUMBNAIL_DIR, exist_ok=True)
    
    # Chercher toutes les images
    image_extensions = ('*.jpg', '*.jpeg', '*.png', '*.gif')
    image_files = []
    for ext in image_extensions:
        image_files.extend(glob.glob(os.path.join(PHOTOS_DIR, ext)))
        image_files.extend(glob.glob(os.path.join(PHOTOS_DIR, ext.upper())))
    
    if not image_files:
        print("Aucune image trouvée dans le dossier photos/")
        return
    
    print(f"Génération des miniatures pour {len(image_files)} images...")
    
    # Créer les miniatures
    for image_path in image_files:
        create_thumbnail(image_path)
    
    print("\nTerminé ! Les miniatures ont été créées dans le dossier photos/thumbnails/")

if __name__ == "__main__":
    main() 