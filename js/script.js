class Gallery {
    constructor() {
        this.gallery = document.getElementById('galerie');
        this.imageData = {};
        this.loadQueue = [];
        this.currentlyLoading = 0;
        this.maxConcurrent = 5; // Augmenté pour plus de parallélisation
        this.otherButton = document.getElementById('other');
        this.tagsMenu = document.createElement('div');
        this.tagsMenu.id = 'tags-menu';
        this.tagsMenu.className = 'tags-menu';
        document.body.appendChild(this.tagsMenu);
        this.selectedTags = new Set();
        this.allTags = new Set();
        this.tagFrequency = new Map();
        this.loadImagesFromJson();
        this.setupGenericFilters();
        this.setupOtherMenu();
    }

    async loadImagesFromJson() {
        try {
            const response = await fetch('photos.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.imageData = await response.json();

            // Calculer la fréquence des tags
            this.tagFrequency.clear();
            Object.values(this.imageData).forEach(imageInfo => {
                if (imageInfo.tags) {
                    imageInfo.tags.forEach(tag => {
                        const tagLower = tag.toLowerCase();
                        this.tagFrequency.set(
                            tagLower,
                            (this.tagFrequency.get(tagLower) || 0) + 1
                        );
                        this.allTags.add(tagLower);
                    });
                }
            });

            this.displayImages();
        } catch (error) {
            console.error('Erreur de chargement:', error);
            this.gallery.innerHTML = 'Erreur de chargement des images';
        }
    }

    /**
     * Affiche les images dont les noms sont passés en paramètre.
     * Si aucun tableau n'est fourni, toutes les images de imageData seront affichées.
     */
    displayImages(filteredFilenames = null) {
        // Si aucun filtre n'est défini, on affiche toutes les images
        const filenames = filteredFilenames || Object.keys(this.imageData);
        this.gallery.innerHTML = '';
        this.loadQueue = [...filenames];
        this.currentlyLoading = 0;

        // Créer tous les conteneurs d'images immédiatement
        filenames.forEach(filename => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'image-container loading';
            imgContainer.innerHTML = `
                <div class="placeholder">
                    <div class="spinner"></div>
                </div>`;
            imgContainer.dataset.filename = filename;
            this.gallery.appendChild(imgContainer);
        });

        // Démarrer le chargement des images
        this.processQueue();
    }

    async processQueue() {
        if (this.loadQueue.length === 0 || this.currentlyLoading >= this.maxConcurrent) return;

        const filename = this.loadQueue.shift();
        this.currentlyLoading++;
        await this.loadImage(filename);

        this.processQueue();
    }

    loadImage(filename) {
        return new Promise((resolve) => {
            const container = this.gallery.querySelector(`[data-filename="${filename}"]`);
            const img = new Image();

            img.onload = () => {
                try {
                    // Utiliser directement la miniature
                    const thumbnail = document.createElement('img');
                    thumbnail.src = img.src;
                    thumbnail.alt = filename;

                    // Ajouter l'événement de clic sur le conteneur
                    container.addEventListener('click', () => this.openFullImage(filename));
                    container.style.cursor = 'pointer';

                    container.innerHTML = '';
                    container.appendChild(thumbnail);
                    container.classList.remove('loading');
                } catch (error) {
                    console.error('Erreur lors du traitement de l\'image:', error);
                    container.innerHTML = 'Erreur de traitement';
                    container.classList.add('error');
                } finally {
                    this.currentlyLoading--;
                    resolve();
                }
            };

            img.onerror = () => {
                container.innerHTML = 'Erreur de chargement';
                container.classList.remove('loading');
                container.classList.add('error');
                this.currentlyLoading--;
                resolve();
            };

            // Charger la miniature au lieu de l'image originale
            img.src = `photos/thumbnails/thumb_${filename}`;
        });
    }

    setupGenericFilters() {
        const filters = document.querySelectorAll('.filter');
        filters.forEach(filter => {
            if (filter.id === 'all') {
                filter.addEventListener('click', () => this.resetTags());
            } else {
                const tag = filter.textContent.toLowerCase();
                this.allTags.add(tag);
                filter.addEventListener('click', () => {
                    this.resetTags();
                    this.toggleTag(tag);
                    filters.forEach(f => f.classList.remove('selected'));
                    filter.classList.add('selected');
                });
            }
        });
    }

    resetTags() {
        this.selectedTags.clear();
        document.querySelectorAll('.filter, .tag').forEach(el => {
            el.classList.remove('selected');
        });
        document.getElementById('all').classList.add('selected');
        this.filterImages();
        this.createTagsMenu();
    }

    createTagsMenu() {
        this.tagsMenu.innerHTML = `
            <div class="tags-header">
                <span>Tous les tags disponibles</span>
                <button class="reset-tags">Réinitialiser</button>
            </div>
            <div class="tags-container"></div>
        `;

        const tagsContainer = this.tagsMenu.querySelector('.tags-container');

        // Obtenir les images filtrées actuelles
        const currentImages = this.getCurrentFilteredImages();

        // Calculer la fréquence des tags pour les images filtrées
        const currentTagFrequency = new Map();
        currentImages.forEach(filename => {
            const imageTags = this.imageData[filename].tags || [];
            imageTags.forEach(tag => {
                const tagLower = tag.toLowerCase();
                currentTagFrequency.set(
                    tagLower,
                    (currentTagFrequency.get(tagLower) || 0) + 1
                );
            });
        });

        // Trier les tags par fréquence
        const sortedTags = Array.from(currentTagFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => ({ tag, count }));

        sortedTags.forEach(({ tag, count }) => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag';
            if (this.selectedTags.has(tag)) {
                tagElement.classList.add('selected');
            }
            tagElement.innerHTML = `${tag}<span class="tag-count">(${count})</span>`;

            tagElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTag(tag);
                tagElement.classList.toggle('selected');
            });

            tagsContainer.appendChild(tagElement);
        });

        const resetButton = this.tagsMenu.querySelector('.reset-tags');
        resetButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetTags();
        });
    }

    getCurrentFilteredImages() {
        if (this.selectedTags.size === 0) {
            return Object.keys(this.imageData);
        }

        return Object.entries(this.imageData)
            .filter(([_, data]) => {
                const imageTags = new Set(data.tags.map(tag => tag.toLowerCase()));
                return Array.from(this.selectedTags)
                    .every(selectedTag =>
                        Array.from(imageTags).some(imageTag =>
                            imageTag.toLowerCase() === selectedTag.toLowerCase()
                        )
                    );
            })
            .map(([filename]) => filename);
    }

    toggleTag(tag) {
        // Désélectionner le filtre "ALL"
        document.getElementById('all').classList.remove('selected');

        if (this.selectedTags.has(tag)) {
            this.selectedTags.delete(tag);
        } else {
            this.selectedTags.add(tag);
        }

        this.filterImages();
        this.createTagsMenu(); // Recréer le menu avec les tags mis à jour
    }

    openFullImage(filename) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        const filteredImages = this.getCurrentFilteredImages();
        const currentIndex = filteredImages.indexOf(filename);

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-image-container">
                    <img src="photos/${filename}" alt="${filename}" class="zoomable">
                </div>
            </div>
            <button class="modal-nav prev">&#10094;</button>
            <button class="modal-nav next">&#10095;</button>
        `;

        const img = modal.querySelector('.zoomable');
        let isZoomed = false;
        let scale = 1;
        let translateX = 0;
        let translateY = 0;

        // Gestion du zoom
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isZoomed) {
                scale = 2;
                isZoomed = true;
            } else {
                scale = 1;
                isZoomed = false;
                translateX = 0;
                translateY = 0;
            }
            img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
        });

        // Gestion du déplacement de l'image zoomée
        let isDragging = false;
        let startX, startY;

        img.addEventListener('mousedown', (e) => {
            if (isZoomed) {
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                e.preventDefault();
            }
        });

        modal.addEventListener('mousemove', (e) => {
            if (isDragging && isZoomed) {
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
            }
        });

        modal.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Navigation entre les images
        const prevBtn = modal.querySelector('.prev');
        const nextBtn = modal.querySelector('.next');

        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newIndex = (currentIndex - 1 + filteredImages.length) % filteredImages.length;
            this.openFullImage(filteredImages[newIndex]);
            modal.remove();
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newIndex = (currentIndex + 1) % filteredImages.length;
            this.openFullImage(filteredImages[newIndex]);
            modal.remove();
        });

        // Gestion des touches clavier
        const handleKeyPress = (e) => {
            if (e.key === 'ArrowLeft') prevBtn.click();
            if (e.key === 'ArrowRight') nextBtn.click();
            if (e.key === 'Escape') modal.remove();
        };
        document.addEventListener('keydown', handleKeyPress);

        // Fermeture du modal
        modal.addEventListener('click', () => {
            document.removeEventListener('keydown', handleKeyPress);
            modal.remove();
        });

        document.body.appendChild(modal);
    }

    filterImages() {
        if (this.selectedTags.size === 0) {
            this.displayImages();
            return;
        }

        const filteredImages = Object.entries(this.imageData)
            .filter(([_, data]) => {
                const imageTags = new Set(data.tags.map(tag => tag.toLowerCase()));
                return Array.from(this.selectedTags)
                    .every(selectedTag =>
                        Array.from(imageTags).some(imageTag =>
                            imageTag.toLowerCase() === selectedTag.toLowerCase()
                        )
                    );
            })
            .map(([filename]) => filename);

        this.displayImages(filteredImages);
    }

    setupOtherMenu() {
        this.otherButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = this.tagsMenu.style.display === 'block';
            this.tagsMenu.style.display = isVisible ? 'none' : 'block';

            if (!isVisible) {
                this.createTagsMenu();

                // Positionner le menu sous le bouton "Other"
                const buttonRect = this.otherButton.getBoundingClientRect();
                this.tagsMenu.style.top = `${buttonRect.bottom + 10}px`;
                this.tagsMenu.style.left = `${buttonRect.left - this.tagsMenu.offsetWidth + buttonRect.width}px`;
            }
        });

        // Fermer le menu si on clique ailleurs
        document.addEventListener('click', (e) => {
            if (!this.tagsMenu.contains(e.target) && e.target !== this.otherButton) {
                this.tagsMenu.style.display = 'none';
            }
        });
    }
}

// Initialiser la galerie et le module de recherche quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    const gallery = new Gallery();
    const searchInput = document.getElementById('search');
    const searchButton = document.createElement('button');
    searchButton.textContent = 'Rechercher';
    searchButton.id = 'search-button';
    searchInput.parentNode.insertBefore(searchButton, searchInput.nextSibling);

    // Fonction de recherche
    const performSearch = async () => {
        const query = searchInput.value.trim();
        // Si le champ est vide, réafficher toutes les images
        if (query === "") {
            gallery.displayImages();
            return;
        }

        const keywords = query.split(',').map(s => s.trim()).filter(s => s !== "");

        try {
            const response = await fetch('https://lee-valuable-italiano-financing.trycloudflare.com/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords })
            });
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            const data = await response.json();
            gallery.displayImages(data.images);
        } catch (error) {
            console.error('Erreur lors de la recherche :', error);
        }
    };

    // Écouteur d'événement pour le bouton de recherche
    searchButton.addEventListener('click', performSearch);

    // Écouteur d'événement pour la touche Entrée
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
});
