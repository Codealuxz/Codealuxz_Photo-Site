class Gallery {
    constructor() {
        this.currentIndex = 0;
        this.images = [];
        this.gallery = document.getElementById('galerie');
        this.loadImagesFromJson();
    }

    async loadImagesFromJson() {
        try {
            const response = await fetch('photos/images.json');
            const data = await response.json();
            this.images = data;
            this.setupLightbox();
            this.loadImages();
            this.setupKeyboardNavigation();
        } catch (error) {
            console.error('Erreur lors du chargement des images:', error);
        }
    }

    async loadImages() {
        this.images.forEach(async (image, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'image-container';

            const img = new Image();
            img.src = `photos/${image}`;

            img.onload = async () => {
                try {
                    // Calculer les dimensions pour un recadrage carré centré
                    const size = Math.min(img.width, img.height);
                    const sourceX = (img.width - size) / 2;
                    const sourceY = (img.height - size) / 2;

                    // Créer une version bitmap de l'image recadrée
                    const bitmap = await createImageBitmap(img, sourceX, sourceY, size, size, {
                        resizeWidth: 300,
                        resizeHeight: 300,
                        resizeQuality: 'high'
                    });

                    // Créer le canvas et dessiner la version réduite
                    const canvas = document.createElement('canvas');
                    canvas.width = 300;
                    canvas.height = 300;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(bitmap, 0, 0, 300, 300);

                    // Créer la miniature
                    const thumbnail = document.createElement('img');
                    thumbnail.src = canvas.toDataURL('image/jpeg', 0.7);
                    thumbnail.className = 'thumbnail';
                    thumbnail.dataset.index = index;
                    thumbnail.addEventListener('click', () => this.openLightbox(index));

                    imgContainer.appendChild(thumbnail);
                    this.gallery.appendChild(imgContainer);

                    // Libérer la mémoire
                    bitmap.close();
                } catch (error) {
                    console.error('Erreur de traitement de l\'image:', error);
                }
            };
        });
    }

    setupLightbox() {
        const lightboxHtml = `
            <div id="lightbox" class="lightbox">
                <button class="close-btn">&times;</button>
                <button class="nav-btn prev-btn">&lt;</button>
                <div class="lightbox-content">
                    <img src="" alt="" id="lightbox-img">
                </div>
                <button class="nav-btn next-btn">&gt;</button>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', lightboxHtml);

        document.querySelector('.close-btn').onclick = () => this.closeLightbox();
        document.querySelector('.prev-btn').onclick = () => this.navigate(-1);
        document.querySelector('.next-btn').onclick = () => this.navigate(1);
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('lightbox').classList.contains('active')) return;

            switch (e.key) {
                case 'Escape':
                    this.closeLightbox();
                    break;
                case 'ArrowLeft':
                    this.navigate(-1);
                    break;
                case 'ArrowRight':
                    this.navigate(1);
                    break;
            }
        });
    }

    openLightbox(index) {
        this.currentIndex = index;
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightbox-img');

        // Charger l'image en taille réelle
        lightboxImg.src = `photos/${this.images[index]}`;
        lightbox.classList.add('active');
    }

    closeLightbox() {
        document.getElementById('lightbox').classList.remove('active');
    }

    navigate(direction) {
        this.currentIndex = (this.currentIndex + direction + this.images.length) % this.images.length;
        this.openLightbox(this.currentIndex);
    }
}

// Initialiser la galerie
document.addEventListener('DOMContentLoaded', () => {
    new Gallery();
});